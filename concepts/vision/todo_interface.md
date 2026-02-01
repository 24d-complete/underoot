# Interface Changes (To-Do)

## Layout & Explorer
- **Outline Priority:** Move Outline to the top by default in the "Explorer" window, with the file structure displayed below it.
- **Timeline Migration:** Move the timeline from the explorer to the Panel at the bottom (where terminal, problems, etc. are located).
- **Default Options:** Remove the **PORTS** option by default.
- **Extension View Consolidation:** Move the commands and snippet view from the `latex-workshop` extension in the primary activity bar to the same bottom panel.
- **Explorer Visuals:**
    - Hide file name extensions by default in the file view in the explorer.
    - Hide non-user-relevant files (e.g., `.bbl`, `.aux`, `.fdb_latexmk`, `.fls`, `.log`, `.out`, `.synctex.gz`) from the explorer file view.

## Outline Redesign
- **Structure View:** Redesign the Outline to resemble the `Latex-Workshop` extension's structure view (currently shows icons before text, unlike extensions' useful numbers).
- **Implementation:**
    - The structure view should probably be moved to the explorer panel itself and keep calling it **Outline** instead of Structure, or implement the same logic as the extension for the outline view.
    - Ensure this is implemented on the `.tex` file tab’s breadcrumb which also shows icons as of now.

## Editor & Tabs
- **PDF Viewer:** Hide the VSCode breadcrumbs from the PDF viewer tab/windows (keep them for `.tex` and other files).
- **Zen Mode:** Show a **Zen Mode** button next to (to the left of) the customize layout button on the top title bar at the top right corner.
- **User Interface:** Hide the minimap by default.
- **Quick Input:** Default Quick input position should be set to **Center**.

## Theme & Branding
- **Underoot Theme:** Use `webstorm theme` extension — rebrand it as **Underoot Theme**.
- **Defaults:** Keep `webstorm light` as the default light version and `webstorm darker` as the default dark version.

## Status Bar
- **Cleanup:** Remove space/tab selector, encoding, and lf-crlf indicators.
- **Essential Items:** Only keep line/column, language mode, and notifications.
- **New Metrics:** Add the **PDF page count** and **tex word count** at the bottom right, before (to the left of) the line/column indicator.

## Feedback & Progress
- **Visual Feedback:** Show progress bar while rendering the PDF, and downloading/installing packages etc.

## Known Issues (SyncTeX)
- **Forward SyncTeX (Cmd/Ctrl + J):** Jump to PDF doesn't seem to hit the exact word; it shows the starting point of the whole editor line on the corresponding last line on the PDF.
- **Backward SyncTeX:** Puts cursor on the right position in the editor, but horizontal scrolling to focus the word/cursor is not working (only vertical scrolling works).
