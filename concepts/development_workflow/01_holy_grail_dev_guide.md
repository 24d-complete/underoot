# Dev Guide: "Holy Grail" PDF Rendering Implementation

This guide outlines the development workflow to upgrade the `latex-workshop` PDF viewer from the current "Screenshot Mask" system to a true "Double Buffered" engine with Viewport Prioritization.

## 1. Baseline Analysis (Current Implementation)

*   **Location:** `extensions/latex-workshop/out/viewer/components/refresh.js`
*   **Current Logic:**
    *   `addMasks()`: Takes a screenshot (`canvas.toDataURL()`) of the *current* view.
    *   Overlay: Creates a `div` with these images on top of the viewer.
    *   `PDFViewerApplication.load(doc)`: Destroys the old PDF structure and reloads.
    *   `wait`: Waits for `pagerendered` events for visible pages.
    *   `removeMasks()`: Fades out the screenshot.
*   **Limitation:**
    *   **Text Selection:** Attempting to select text during the refresh (when the mask is up) will fail or select the image, breaking the illusion.
    *   **"Live" Feel:** It is not a true "background update". The user sees a static screenshot for ~200ms-500ms while the engine re-initializes.
    *   **Confusion:** Users often confuse "Compilation Time" (working on old PDF) with "Refresh Time" (the swap). The "Frozen" state only applies to the specific *Refresh* phase.

## 2. Reality Check: Compilation vs. Rendering (The Numbers)

You are correct: **Compilation is usually the bottleneck.** However, the *rendering* phase is what causes the "glitch/flash" that annoys users.

| Document Size | Compilation Time (`pdflatex`) | Rendering Time (Naive) | Rendering Time (Holy Grail) | **User Experience** |
| :--- | :--- | :--- | :--- | :--- |
| **Simple (1 pg)** | ~500ms | ~100ms | **~10ms** | **Slightly Snappier** |
| **Article (20 pg)** | ~2.0s | ~800ms (Flash) | **~20ms** (Instant) | **No Flicker (Smooth)** |
| **Thesis (200 pg)** | ~15.0s | ~5.0s (Freeze) | **~20ms** (Instant) | **Game Changer** |

**How effective is it?**
*   **Total Wait Time:** We cannot reduce the 15s compilation time (unless we switch compilers).
*   **Disruption:** We reduce the *Disruption* from 5s to 0ms.
*   **Result:** The user waits 15s, but *never loses context*. In a standard viewer, after 15s of waiting, the screen goes white and jumps around for 5s. In our viewer, it just "updates" silently.

## 3. Development Phase 1: The "Dual-Viewer" Architecture

We need to instantiate *two* complete PDF viewer instances in the DOM, running in parallel.

### 2.1. DOM Restructuring (`viewer.html`)
**Goal:** Create two containers, swapping visibility using CSS classes.

*   [ ] **Action:** Modify `viewer.html`
    ```html
    <!-- Current -->
    <div id="viewerContainer">
      <div id="viewer" class="pdfViewer"></div>
    </div>

    <!-- Proposed -->
    <div id="viewer-wrapper">
      <div id="viewerContainer-primary" class="viewer-layer visible">
         <div id="viewer-primary" class="pdfViewer"></div>
      </div>
      <div id="viewerContainer-buffer" class="viewer-layer hidden">
         <div id="viewer-buffer" class="pdfViewer"></div>
      </div>
    </div>
    ```

### 2.2. Viewer Controller (`latexworkshop.js`)
**Goal:** Manage two `PDFViewerApplication` instances (or hijack the internal `pdfViewer`).
*   *Correction Reference:* `viewer.js` (PDF.js default) relies heavily on `PDFViewerApplication` singleton. Refactoring this to support two instances is **extremely hard**.
*   **Alternative Strategy (Context Preservation):** Instead of two full apps, we maintain two `PDFPageView` arrays?
*   **Selected Strategy:** **"Ghost Rendering"**.
    *   Create an off-screen `<canvas>` worker pool.
    *   Render the *new* PDF pages to these off-screen canvases using `pdf.js` API (`pdfDoc.getPage(n).render(...)`) manually, bypassing the `PDFViewerApplication` logic for the buffering phase.
    *   Once the "Viewport Tiles" are ready, we inject them into the main viewer.

## 3. Development Phase 2: Viewport Prioritization (Hijacking the Queue)

**Goal:** Ensure the page the user is looking at renders *first*.

### 3.1. Priority Queue Implementation (The "Concentric Batching" Strategy)

We will use a **"Spiral Out"** algorithm to prioritize rendering, ensuring immediate feedback for the user's focus area while progressively stabilizing the rest of the document.

*   **File:** Create `components/priority_scheduler.js`
*   **The Algorithm:**
    1.  **Batch 1 (Critical):** The **Viewport**. (e.g., Page 5, bottom half). Render & Swap immediately. (`Time: ~30ms`)
    2.  **Batch 2 (Context):** **Current Page + Adjacent Pairs** ($n, n \pm 1, n \pm 2$). (e.g., Pages 3, 4, 5, 6, 7). Render & Update.
    3.  **Batch 3 (Expansion):** **Next Block** ($n \pm 4, n \pm 8$).
    4.  **Batch 4 (Cleanup):** Linear fill of the remaining document (0 to $N$).

*   **Logic:**
    *   **Interruptible:** If user scrolls to Page 50 during Batch 2, **ABORT** Batch 2 immediately.
    *   **Restart:** New Batch 1 becomes Page 50.

### 3.2. Compiler vs. Renderer (Clarification)
*   **The Compiler (`pdflatex`/`latexmk`):** Unfortunately, LaTeX compilers generally produce the *entire* PDF file at once (Monolithic). We cannot easily "compile just page 5" without complex tricks.
*   **The Renderer (`pdf.js`):** This is where we apply the magic. Even if `pdflatex` gives us a 100-page file, we **do not need to read it all**.
*   **Optimization:** We use `pdf.js`'s `disableAutoFetch` to read *only* the byte-range of the file corresponding to Page 5.

## 4. Development Phase 3: The "Atomic Swap" (Connecting it all)

### 4.1. Why `lockCurrentView()` beats `addMasks()`?
*   **`addMasks` (Current):** Takes a screenshot (PNG). The UI is **Dead**. You cannot select text, click hyperlinks, or scroll smoothly. It is a fake image.
*   **`lockCurrentView` (New):** Keeps the **Old DOM** alive.
    *   **Interactive:** User can still copy-paste text from the old version while the new one loads.
    *   **Scrollable:** User can scroll to look for something else while the render happens.
    *   **Seamless:** The swap happens at the *element level*, preserving scroll position and focus.

**Goal:** Modify `refresh.js` to use the new engine.

*   [ ] **Step 1:** In `refresh.js`, replace `addMasks()` (Screenshot) with logic to simply *keep the secondary container visible*.
*   [ ] **Step 2:** Disable `PDFViewerApplication.load()`'s default behavior of clearing the DOM.
*   [ ] **Step 3 (`Ghost Render`):**
    *   Parse new PDF in background (`pdfjsLib.getDocument(...)`).
    *   Identify visible pages (e.g., Page 5).
    *   Render Page 5 to an off-screen canvas.
*   [ ] **Step 4 (`Hot Swap`):**
    *   Find the existing `div.page[data-page-number="5"]`.
    *   Replace its `canvas` with the new off-screen canvas.
    *   Update text layer (HTML).
*   [ ] **Step 5:** Let the standard PDF.js logic fill in the rest of the non-visible pages.

## 5. Verification Plan

### 5.1. Performance Benchmarking
*   **Metrics:** Time from `refresh()` call to "Pixels Updated".
*   **Tool:** Chrome DevTools Performance Tab (in the Webview).
*   **Target:** < 50ms for the "Swap".

### 5.2. Visual Regression
*   Ensure no "White Flash" occurs.
*   Ensure text selection remains active (if we manage to keep the text layer).
