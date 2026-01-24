# Tex Distribution Management Strategy

**Drafted**: 2026-01-24
**Status**: Brainstorming

## Core Philosophy
*   **"Batteries-Included" Experience**: User shouldn't have to leave the app to get compiling.
*   **Not "Bloat-Included"**: The base installer should remain lightweight (~100MB).
*   **Choice**: Support Full TeX Live, Basic TeX Live, MikTeX, etc.
*   **Seamlessness**: Distribution management should feel like installing an Android SDK or a VS Code extension.

## 1. The "SDK Manager" Concept
Instead of a simple "Download" button, we propose a **TeX Environment Manager** built into Underoot (likely as a Webview or Custom Editor within the welcome experience).

### Proposed User Flow
1.  **First Launch**: Checks for existing LaTeX tools (`pdflatex`, etc.) in `PATH`.
2.  **Detection**:
    *   **Found**: Show "We found TeX Live 2024 at /usr/local/texlive... Use this?" -> [Yes/No]
    *   **Not Found**: Show "No LaTeX distribution found. Let's set one up."
3.  **Selection Wizard**:
    *   **Recommended**: "TeX Live (Basic)" - Quickest start, installs packages on-the-fly (if using MikTeX) or standard basic set.
    *   **Power User**: "TeX Live (Full)" - The "I want everything" option (~4GB+).
    *   **Custom**: "MikTeX" or manual path selection.
4.  **Installation**:
    *   Download progress bar shown *inside* VS Code.
    *   Background process handles extraction and configuration.

## 2. Technical Implementation: The Bootstrap Process

### Handling Different Installers
This is the complex part. We need robust wrappers for each distro.

#### **A. TeX Live**
*   **Method**: Use the `install-tl` script (Perl-based) provided by TUG.
*   **Windows**: Download `install-tl-windows.exe`.
*   **Profile**: customized `texlive.profile` file to auto-accept license and set paths to user-writable directories (e.g., `~/.underoot/texlive/`).
*   **Portable Mode**: Ensure `portable 1` is set in the profile so it doesn't mess with system registry uninvited.

#### **B. MikTeX**
*   **Method**: Download the MikTeX portable installer.
*   **Pros**: Excellent "install-on-the-fly" package management creates a smaller initial footprint.
*   **Cons**: Repository connection issues can be common.

### Environment & Path Management
We should avoid messing with the global System `PATH` if possible, to avoid conflicts and permission prompts.

**Strategy: "Session Injection"**
1.  Underoot launches.
2.  Startup script (or the Extension host) detects the managed distribution path (e.g., `AppData/Roaming/Underoot/tools/texlive/bin/windows`).
3.  **Inject**: Prepend this path to `process.env.PATH` *within the Underoot instance*.
4.  **Result**: Terminals and Extensions inside Underoot see the tools, but the rest of the OS is untouched.
5.  **Option**: "Add to System PATH" button for users who want to use CLI outside Underoot.

## 3. Integration with LaTeX Workshop
We must automatically sync our "Managed Distribution" with the extension's settings.

*   **Config**: `latex-workshop.latex.tools`
*   **Action**: When a distribution is selected/installed, programmatically update the `latex-workshop` configuration JSON to point explicitly to the binaries OR rely on the modified `PATH`.
    *   *Preference*: Rely on `PATH` modification (Session Injection) as it's cleaner and less brittle than hardcoding paths in JSON.

## 4. Open Questions
1.  **Network Resilience**: Downloading 4GB (Full TeX Live) often fails. We need a download manager with **Resume** capability.
    *   *Solution*: Perhaps use `aria2` or a robust Node.js downloader library?
2.  **Perl Dependency**: `install-tl` on Windows technically requires a working Perl environment sometimes, though the `.exe` wrapper usually handles it. We need to verify this doesn't introduce another dependency chain.
3.  **Permissions**: Installing to `Program Files` requires Admin. Installing to `AppData` (User) does not.
    *   *Decision*: Default to User Scope (`AppData`/`~/.local`) to avoid permission headaches.
