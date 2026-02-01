# Holy Grail Implementation: Instant PDF Rendering in LaTeX Workshop

This document details the microscopic implementation steps to achieve the "Holy Grail" of PDF rendering: **Zero-latency feel, No-Flash updates, and Real-time syncing.**

**Target Architecture:**
*   **Host:** VS Code Extension Host (Node.js)
*   **Client:** VS Code Webview (Electron/Chromium)
*   **Engine:** PDF.js (Mozilla)

---

## 1. The "No-Flash" Double Buffering System

**Concept:** Never destroy the active canvas. Always render to a hidden layer, then hot-swap.

### A. DOM Structure
Modify the viewer's HTML (likely `viewer.html` or dynamically injected) to support two parallel viewer containers.

```html
<div id="viewer-container">
    <!-- The ACTIVE layer (Visible) -->
    <div id="layer-primary" class="pdfViewer visible"></div>
    
    <!-- The BUFFER layer (Hidden, Pointer Events = None) -->
    <div id="layer-buffer" class="pdfViewer hidden"></div>
</div>

<style>
  .visible { opacity: 1; z-index: 2; }
  .hidden { opacity: 0; z-index: 1; pointer-events: none; }
  /* Optional: Add a 50ms transition for a smooth 'morph' effect */
  .pdfViewer { transition: opacity 0.05s ease-in-out; position: absolute; top:0; left:0; }
</style>
```

### B. The Swap Logic (TypeScript)
When a `refresh` event is triggered:

1.  **Identify Roles:**
    *   `currentLayer` = The one with class `.visible`.
    *   `nextLayer` = The one with class `.hidden`.
2.  **Sync State:**
    *   Copy `scrollTop`, `scrollLeft`, and `scale` (zoom level) from `currentLayer` to `nextLayer` *exactly*.
    *   **Crucial:** Ensure `nextLayer` DOM is fully built with blank pages matching the new PDF structure before rendering starts.
3.  **Render Buffer:**
    *   Trigger `pdf.js` render on `nextLayer`.
    *   **Optimization:** Only render the *currently visible viewport* of `nextLayer` (see Section 2). Do not render page 50 if user is on page 1.
4.  **The Atomic Swap:**
    *   Listen for the `render-success` event of the *viewport pages*.
    *   Once the visible area is drawn:
        ```javascript
        requestAnimationFrame(() => {
            nextLayer.classList.replace('hidden', 'visible');
            currentLayer.classList.replace('visible', 'hidden');
        });
        ```
    *   **Result:** The user sees the old text $\rightarrow$ instant switch to new text. No white flash.

---

## 2. Viewport Prioritization (The Render Loop)

**Concept:** Hijack PDF.js's standard render queue to prioritize the user's gaze.

### A. The "Gaze Detection" Algorithm
In the extension's `viewer.js`, implement a function to calculate exactly which pages/tiles are in view.

```javascript
function getPrioritizedPages() {
    const container = document.getElementById('viewer-container');
    const views = pdfViewer.getPagesWithVisibility(); // Native PDF.js method
    
    // Sort by visibility percentage (descending)
    // The page taking up 80% of the screen is Priority #1
    return views.sort((a, b) => b.percent - a.percent).map(v => v.id);
}
```

### B. The Custom Render Queue`
Standard PDF.js renders linear (1, 2, 3...). We need a priority queue.

1.  **Queue Structure:** `[ { pageNum: 5, priority: 'CRITICAL' }, { pageNum: 6, priority: 'HIGH' }, ... ]`
2.  **Queue Population Logic:**
    *   **CRITICAL:** Pages currently in viewport (from `getPrioritizedPages`).
    *   **HIGH:** Adjacent pages (+1, -1 from viewport).
    *   **LOW:** Everything else.
3.  **Interrupt Mode:**
    *   If the user scrolls while `Level: LOW` pages are rendering, **CANCEL** those render tasks immediately using `renderTask.cancel()`.
    *   Clear the queue.
    *   Push new `Level: CRITICAL` pages for the new scroll position.

### C. Tiling (Micro-Optimization)
For zoom levels > 150%, enable tiling.
*   **Grid:** Split viewport into $512 \times 512$ pixel tiles.
*   **Spiral Out:** Render the tile closest to the center of the viewport first, then spiral outwards.

---

## 3. Auto-Render & Debouncing (The "Real-Time" Feel)

**Concept:** Don't wait for explicit saves. Render as the user types, but safely.

### A. The Debounce Timer
In the Extension Host (`extension.ts`):

```typescript
let buildTimeout;
const DEBOUNCE_DELAY = 400; // ms

workspace.onDidChangeTextDocument((e) => {
    if (e.document === activeTexDoc) {
        // Cancel previous timer
        clearTimeout(buildTimeout); 
        
        // Set new timer
        buildTimeout = setTimeout(() => {
            triggerFastBuild(); 
        }, DEBOUNCE_DELAY);
    }
});
```
*   **Logic:** If user stops typing for 400ms, we assume a "thought pause" and trigger a build.

### B. Fast Build Configuration (`latexmk`)
We cannot afford a 5-second compile.
1.  **Draft Mode:** Use `-draftmode` for intermediate checks (no PDF generated) if just checking syntax, OR:
2.  **Interaction Batch:** Use `-interaction=batchmode` to suppress console output overhead. 
3.  **SyncTeX:** Ensure `-synctex=1` is enabled so the viewer can maintain scroll position accurately.

### C. The "Dirty" Check
Before sending the new PDF to the viewer:
1.  Calculate MD5 hash of the generated PDF.
2.  Compare with the MD5 of the currently displayed PDF.
3.  **If Match:** Do nothing (save CPU).
4.  **If Different:** Trigger the "Double Buffer Swap" (Section 1).

---

## 4. Implementation Checklist

1.  [ ] **Modify `viewer.html`**: Add duplicate container `#viewer-buffer`.
2.  [ ] **Patch `viewer.js`**:
    *   Implement `class DoubleBufferingController`.
    *   Override `pdfViewer.refresh()` to write to buffer -> swap.
3.  [ ] **Update `pdf.js` config**:
    *   Set `disableAutoFetch = true` (Load chunks only as needed).
    *   Set `disableStream = true` (We want the whole file stable).
4.  [ ] **Extension Host**:
    *   Implement `HotReloadWatcher` with 400ms debounce.
    *   Connect `onDidSave` -> `rebuild` -> `postMessage('refresh_pdf')`.

---

**Outcome:**
When implemented, the user can type a sentence, pause for half a second, and see the change appear in the right pane *instantly* without the document flickering, jumping, or reloading. It feels like a standard WYSIWYG editor.
