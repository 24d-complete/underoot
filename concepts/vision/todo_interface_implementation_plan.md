# Implementation Plan: Todo Interface & Modifications

This document outlines the phased approach to implementing the features described in `todo_interface.md`.

## Phase 1: Foundation, Cleanup & Quick Wins (Est. 1-2 Days)
**Goal:** fast visual decluttering and setting defaults.

### 1.1 Status Bar Cleanup
- **Objective:** Minimalist status bar.
- **Actions:**
  - Modify `StatusbarPart` (or configuration) to hide:
    - distinct space/tab selector
    - encoding indicator
    - LF/CRLF indicator
    - Feedback smileys
  - Ensure only `Line/Col`, `Language Mode`, and `Notifications` remain visible by default.

### 1.2 Explorer & Editor Visuals
- **Objective:** Reduce noise in the file explorer.
- **Actions:**
  - Update `product.json` or default settings to:
    - Hide file extensions in Explorer (`"explorer.fileExtensions": false` if available, or CSS/patch).
    - Add default `files.exclude` patterns for: `.bbl`, `.aux`, `.fdb_latexmk`, `.fls`, `.log`, `.out`, `.synctex.gz`.
  - **Zen Mode:**
    - Inject "Zen Mode" button into the title bar (modifying `TitlebarPart` or `EditorTitle`).
    - Hide Minimap by default (`"editor.minimap.enabled": false`).

### 1.3 Branding Basics
- **Objective:** Apply "Underoot" identity.
- **Actions:**
  - Rename `webstorm theme` to **Underoot Theme**.
  - Set default themes:
    - Light: `Underoot Light` (was Webstorm Light)
    - Dark: `Underoot Darker` (was Webstorm Darker)

---

## Phase 2: Explorer & Layout Restructuring (Est. 1-2 Days)
**Goal:** Structural changes to the IDE layout to match the "Underoot" vision.

### 2.1 Outline & Timeline Migration
- **Objective:** Prioritize Outline and consolidate views.
- **Actions:**
  - **Explorer Container:**
    - Reorder views programmatically: Ensure "Outline" view is at the top (index 0), followed by "Folders" (Project view).
  - **Timeline:**
    - Move `Timeline` pane from Explorer container to the **Bottom Panel** (merged with Terminal/Problems).
  - **Extension Views:**
    - Move `Latex-Workshop` Snippet/Command views to the Bottom Panel.

### 2.2 Explorer Defaults
- **Objective:** Streamline the primary sidebar.
- **Actions:**
  - Remove/Hide **PORTS** view by default.
  - Set Quick Input default position to **Center**.

---

## Phase 3: Advanced Outline Redesign (Est. 2-3 Days)
**Goal:** A richer, structure-aware Outline view tailored for LaTeX.

### 3.1 Outline Visualization
- **Objective:** Replace generic symbol list with structure-rich view.
- **Actions:**
  - **Option A (Preferred):** Adapt `Latex-Workshop`'s "Structure" view logic to replace the default VS Code Outline for `.tex` files.
    - requires modifying `OutlinePane` to consume custom providers or creating a new ViewPane that mimics the Outline but uses extension APIs.
  - **Option B (Patch):** Style the existing Outline to show numbers/sections if possible via data attributes, or intercept the `DocumentSymbolProvider` result to include section numbers in names.
  - **Deliverable:** "Outline" view in Explorer that reflects the hierarchical LaTeX structure (Section 1, 1.1, etc.) rather than just flat symbol lists.

### 3.2 Breadcrumbs
- **Objective:** Consistent structure in navigation.
- **Actions:**
  - Ensure Editor Breadcrumbs for `.tex` files reflect the same hierarchy/icons as the new Outline.

---

## Phase 4: PDF Viewer & SyncTeX Deep Dive (Est. 2-3 Days)
**Goal:** Seamless PDF integration.

### 4.1 SyncTeX Improvements
- **Objective:** Fix "Jump to PDF" and "Jump to Source" precision.
- **Actions:**
  - **Forward Sync:** Investigate `synctex` coordinate mapping in `latex-workshop` extension. Fix offset issues where jump lands on the line start instead of the specific word.
  - **Backward Sync:** Fix horizontal scrolling. Ensure the editor not only scrolls vertically to the line but also horizontally to reveal the specific column/word.

### 4.2 PDF Viewer UI
- **Objective:** Clean reading experience.
- **Actions:**
  - **Breadcrumbs:** Hide breadcrumbs specifically for the PDF Viewer editor tabs (CSS or `editor.display.breadcrumbs` context key).
  - **Progress:** Implement a visual progress bar for PDF rendering and background package installation (hook into `latex-workshop` build events).

---

## Phase 5: Extension Integration (Est. 1-2 Days)
**Goal:** Tight integration between Core and Latex Workshop.

### 5.1 Status Bar Metrics
- **Objective:** Show document stats.
- **Actions:**
  - Add custom Status Bar Items:
    - **PDF Page Count**
    - **TeX Word Count**
  - These must update dynamically by listening to `latex-workshop` events or parsing the output logs/aux files.
