# Implementation Plan: TeX Distribution Manager

**Status**: Planning
**Goal**: Implement a "batteries-included" experience by detecting, downloading, and configuring a TeX environment automatically, without requiring user intervention in system settings.

## 1. User Experience (UX)

### A. First Run Experience (Welcome View)
We will override or extend the default VS Code Welcome walkthrough.
*   **Step 1**: Check for `pdflatex` in `PATH`.
*   **Case Found**: Show "✅ TeX Live 2024 found." -> [Continue]
*   **Case Missing**: Show "⚠️ No LaTeX distribution found." -> [Install Recommended (TeX Live Basic)] or [Choose Another].

### B. The "SDK Manager" UI
A simplified settings UI (Webview or Custom Editor settings page) to manage the distribution later.
*   **Features**:
    *   Show current active distribution path.
    *   "Check for Updates" (runs `tlmgr update`).
    *   "Reinstall/Switch" (swaps between Portable TeX Live and System).

## 2. Technical Architecture

### A. Backend: The `TeXService`
A new service in the main process (or a dedicated internal extension) responsible for:
1.  **Detection**: Scanning standard paths (`/usr/local/texlive`, `C:\texlive`, `C:\Program Files\MikTex`).
2.  **Acquisition**:
    *   Downloads a `bootstrapper` (e.g., our own wrapper script or `install-tl`).
    *   Executes the installer in `portable` mode to `~/.underoot/tools/texlive`.
3.  **Activation**: The core logic that makes the tools visible to the editor.

### B. "Session Injection" (Environment Management)
We will NOT modify the persistent System `PATH` (registry) to avoid permission issues and conflicts.
Instead, we modify the process environment at runtime.

**Mechanism:**
*   Files: `src/vs/platform/environment/node/environmentService.ts` (or similar startup entry point).
*   **Logic**:
    1.  Read `~/.underoot/config.json` to find the configured TeX path.
    2.  Prepend this path to `process.env.PATH` *before* the Extension Host starts.
    3.  Extensions (like LaTeX Workshop) inherit this modified environment automatically.

## 3. Implementation Steps

### Phase 1: Detection & Injection (Proof of Concept)
*Goal: Manually place a portable TeX Live in `~/.underoot` and make VS Code see it.*
1.  [ ] Create `TeXEnvironmentService` in the workbench.
2.  [ ] Implement logic to prepend a test path to `PATH`.
3.  [ ] Verify LaTeX Workshop picks it up.

### Phase 2: The Installer (Downloader)
*Goal: Automate the acquisition.*
1.  [ ] Write a Node.js script (running in the automated process) to download `install-tl-windows.exe`.
2.  [ ] Create a `texlive.profile` for non-interactive minimal install.
3.  [ ] Wire up a "Download" command in the Command Palette.

### Phase 3: UI Integration
1.  [ ] Add a "Setup LaTeX" tile to the Welcome screen.
2.  [ ] Connect the UI buttons to the Phase 2 installer logic.

## 4. Dependencies & Risks
*   **Download Size**: TeX Live Basic is ~100MB+, Full is ~4GB. We must handle network interruptions.
*   **Platform Differences**: Windows vs Linux install scripts are completely different. (Focus on **Windows** first as per current user OS).

## 5. Next Actions
*   Start **Phase 1**: Verify we can inject a custom path into the Extension Host environment.
