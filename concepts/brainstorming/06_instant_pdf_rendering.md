# Brainstorming: "Instant" PDF Rendering

**Goal:** Make PDF rendering feel real-time or instant to the user, eliminating perceived latency.

## 1. Perceived Performance Techniques (The "Illusion" of Speed)

*   **Optimistic UI / Skeleton Loading:**
    *   Immediately display a "skeleton" of the page layout (white background, gray blocks for text/images) while the actual content renders.
    *   Use metadata (page size, approximate text blocks) to generate a layout shell instantly.
*   **Low-Res Placeholders (Blur-up):**
    *   Cache generic thumbnails or generate extremely low-res bitmaps of pages during idle time.
    *   Display the blurry version immediately upon navigation, then sharpen to the high-res render.
    *   *Analogy:* Similar to how Medium or progressive JPEGs load.
*   **Keep-Alive & Caching:**
    *   **LRU Cache for Rendered Canvases:** Do not destroy the DOM/Canvas elements when scrolling away or switching tabs. Keep the last $N$ pages fully rendered in memory.
    *   **Snapshotting:** When a document is closed, save a screenshot of the last visible state. On re-opening, show the screenshot immediately overlaying the viewer until the engine initializes.

## 2. Rendering Pipeline Optimizations

*   **Viewport Prioritization (Tiling):**
    *   **Concept:** Render *only* the visible viewport first. Divide the page into a grid of tiles.
    *   **Loading Priority:**
        1.  **Center Tiles:** The specific area the user is currently looking at or zooming into. Render this immediately.
        2.  **Edge Tiles:** The remaining visible parts of the viewport.
        3.  **Adjacent Pages:** Off-screen content (buffer).
    *   **Concrete Example:**
        > Imagine a detailed architectural blueprint (A0 size). The user zooms in to inspect a specific room in the center.
        > Instead of waiting for the *entire* large blueprint to render (which might take 500ms+), the system divides the view into a grid (e.g., 5x5 tiles).
        > It identifies that the user's viewport is currently over Tile (2,2) and Tile (2,3).
        > It prioritizes rendering *just* these two tiles immediately (taking ~30ms).
        > **Result:** The user sees the room details *instantly*. The rest of the blueprint (the edges) fills in a split-second later, but the user doesn't notice the delay because their focus is already served.
*   **Page-Level Prioritization (The Hierarchy of Needs):**
    *   **Concept:** Strict ordering of *which* pages to process.
    *   **Priority 1 (Critical):** The **Current Page ($n$)**. This must be actionable immediately.
    *   **Priority 2 (High):** The **Adjacent Pages ($n-1, n+1$)**. Users usually scroll sequentially.
    *   **Priority 3 (Medium):** **Linked Pages**. If the current page has a link to Page 45, Page 45 gets bumped up.
    *   **Priority 4 (Low):** The rest of the document (buffered linearly or lazily).

## 6. The "No-Flash" Refresh (Smart Double Buffering)

*   **The Problem:** Standard viewers (like Overleaf's basic mode) clear the canvas (white flash) $\rightarrow$ download new PDF $\rightarrow$ render new canvas. This feels like a "reload."
*   **The Solution (Double Buffering):**
    1.  **Old State:** Keep the *existing* PDF canvas visible on screen (locked).
    2.  **Background Render:** Load the new PDF and render the updated page to an *off-screen* (hidden) canvas.
    3.  **The Swap:** Once the hidden canvas is ready, place it exactly on top of the old one.
    4.  **Transition:** Use a CSS `cross-fade` or simply swap the `z-index` instantly.
    5.  **Result:** The user sees the text "morph" or update in place without the background ever turning white. It feels stable.

## 7. Estimated Performance Impact (Comparison)

| Strategy | 10 Page Doc (Latency) | 100 Page Doc (Latency) | 1,000 Page Doc (Latency) | Perceived Feel |
| :--- | :--- | :--- | :--- | :--- |
| **Naive Render** (Render All) | ~200ms | ~2s (Freeze) | ~20s (Crash/Freeze) | Sluggish |
| **Lazy Loading** (On Scroll) | ~50ms | ~50ms | ~50ms | Good, but flickers on scroll |
| **Viewport Prioritization** | **< 30ms** | **< 30ms** | **< 30ms** | **Instant** |
| **Smart Refresh** (Update) | 0ms (Old view) $\rightarrow$ Morph | 0ms (Old view) $\rightarrow$ Morph | 0ms (Old view) $\rightarrow$ Morph | **Magic / Live** |
| **Pre-rendering** (Prediction)| 0ms (Already done) | 0ms (If predicted right) | 0ms (If predicted right) | Clairvoyant |

## 8. Clarifications & Definitions

*   **How Smart Refresh *Actually* Works (The Timing):**
    *   Yes, rendering the new file still takes time (e.g., 200ms).
    *   *However*, the user **does not wait** in a blank state.
    *   **Timeline:**
        *   `T=0ms`: User saves file. Old PDF is still visible.
        *   `T=0ms` to `T=200ms`: Background worker renders the new PDF. User still sees Old PDF.
        *   `T=201ms`: New PDF is ready. System swaps Old for New.
        *   **User Perception:** "I was looking at the old file, and suddenly it just updated." The "wait" period is masked by the old content.

*   **What is Lazy Loading?**
    *   **Definition:** Loading rendering resources *only* when they are needed (just-in-time), rather than all at once (up-front).
    *   **In PDFs:** Instead of rendering all 50 pages when you open the document (which freezes the app), you render *only* Page 1. You render Page 2 only when the user starts scrolling towards it.

## 9. The "Holy Grail" Combination

*   **The Idea:** Combine **Viewport Prioritization** + **Smart Refresh** + **Auto-Render**.
*   **Workflow:**
    1.  **Auto-Render:** User types in LaTeX editor $\rightarrow$ File saves automatically.
    2.  **Smart Trigger:** The viewer detects the change but **keeps the old view locked**.
    3.  **Viewport Priority:** The renderer asks: "Where is the user looking? Page 3, bottom paragraph?"
    4.  **Targeted Render:** It renders *only* that specific tile on Page 3 in the background (Fast! ~20ms).
    5.  **Instant Swap:** It swaps *just* that rendered tile immediately.
    6.  **Backfill:** It then leisurely renders the rest of the page/document in the background.
    *   **Result:** The specific paragraph you are editing updates effectively instantly (real-time), with zero flash, zero loading bars, and zero waiting.

*   **Off-Main-Thread Rendering (Web Workers):**
    *   Ensure all parsing and rasterization happens in a Web Worker to prevent UI thread blocking.
    *   The main thread should only handle the final `putImageData` or canvas composition.
*   **Progressive Rendering:**
    *   If using PDF.js, enable `rangeChunkSize` and progressive loading/streaming.
    *   Render text layers (HTML overlay) *before* the canvas graphics if possible, so text is readable instantly even if images/vectors lag.

## 3. Anticipatory Actions (Pre-fetching)

*   **Predictive Pre-rendering:**
    *   If the user hovers over a file in the file explorer, start a low-priority render job in the background.
    *   "Next Page" prediction: Always have the next page ($n+1$) and previous page ($n-1$) fully rendered in an off-screen buffer.
*   **Idle-Time Speculation:**
    *   Use `requestIdleCallback` to process heavy rendering tasks for pages likely to be visited (e.g., linked pages from the table of contents).

## 4. Alternative Technical Approaches

*   **Native Acceleration (if applicable):**
    *   Investigate if VS Code (Electron) APIs allow delegating PDF rendering to the OS (macOS generic PDF engine is very fast).
*   **WASM-based Engines:**
    *   Evaluate compiled-to-WASM engines (like MuPDF) which might outperform pure JS implementations (like PDF.js) for raw rasterization speed, though integration cost is higher.
*   **SVG vs. Canvas:**
    *   For simple text-heavy documents, SVG rendering might initially appear faster or crisper at any zoom level without re-rasterizing, though complex documents can cause DOM slowness.

## 5. User Feedback Loops

*   **Micro-interactions:**
    *   Use subtle animations (e.g., a smooth slide transition) to mask the 50-100ms render time. The eye follows the movement, missing the rendering snap-in.
    *   Instant feedback on click (button state change) even if the render takes a moment.

## Action Plan Selection
*   [ ] **Quick Win:** Implement **Skeleton Loading** or ensure **Next Page Pre-rendering** is active.
*   [ ] **Investigation:** Profile current `pdf.js` (if used) configuration for existing bottlenecks.
