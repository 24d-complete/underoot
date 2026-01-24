# TeXService: Main Process Architecture

**Problem**: The Renderer process (UI) is sandboxed and cannot easily spawn external installers or write to arbitrary `~/.underoot` paths without restrictions.
**Solution**: Move the "Heavy Lifting" (Download & Install) to the **Shared Process** or **Main Process**.

## 1. Architecture

*   **Interface**: `ITeXService` (Common) - used by UI.
*   **Proxy**: `TeXService` (Renderer) - calls the backend via IPC.
*   **Backend**: `TeXMainService` (Main/Shared) - executes the actual logic.

## 2. File Structure

*   `src/vs/platform/tex/common/tex.ts`: Shared Interfaces & IPC Channel names.
*   `src/vs/platform/tex/electron-main/texMainService.ts`: The backend implementation.
    *   Imports `https` for downloading.
    *   Imports `child_process` for running `install-tl`.
*   `src/vs/platform/tex/electron-sandbox/texService.ts`: The frontend proxy.

## 3. The "Download & Install" Workflow

1.  **Download**:
    *   Target URL: `https://mirror.ctan.org/systems/texlive/tlnet/install-tl-windows.exe` (or similar).
    *   Target Path: `os.tmpdir() / install-tl.exe`.
2.  **Profile Creation**:
    *   Generate `texlive.profile` on the fly in `tmpdir`.
    *   Key settings: `selected_scheme scheme-basic`, `TEXDIR ~/.underoot/tools/texlive`.
3.  **Execution**:
    *   Run: `install-tl.exe -profile texlive.profile`.
4.  **Verification**:
    *   Check for `pdflatex.exe`.

## 4. Proposed changes
We need to register a new platform service.

### Step 1: Define the IPC Logic
We will stick to the existing `ITeXService` but register it as a "Main" service that is exposed via `IPCServer`.

*(Self-Correction)*: VS Code has a complex service registration. A simpler approach for this "Underoot" MVP might be adding commands to the **SharedProcess**, which is designed for long-running node tasks like this.

## 5. Revised Plan (Shared Process)
We will implement `ITeXService` in the Shared Process.
1.  **Register Channel**: `tex` channel in `sharedProcessMain.ts`.
2.  **Service**: `TeXSharedProcessService`.
