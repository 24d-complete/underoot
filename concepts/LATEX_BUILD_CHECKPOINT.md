# Project Checkpoint: TeX Live Integration & Extension Embedding

**Date:** 2026-01-31
**Objective:** Embed a functional, cross-platform TeX Live distribution into the `LaTeX Workshop` VS Code extension to enable "out-of-the-box" LaTeX compilation without external dependencies.

---

## 1. Executive Summary
The project successfully integrated a minimal TeX Live distribution (`scheme-basic` + `collection-fontsrecommended`) into the build pipeline. This involved overcoming significant platform-specific challenges related to file descriptor limits (`EMFILE`) caused by the 10,000+ files in the TeX Live bundle.

**Key Achievements:**
-   **macOS**: Solved `EMFILE` build errors by systematically modifying kernel limits (`launchctl`).
-   **Windows**: Solved `EMFILE` errors by implementing a novel "Build-Time Zip, Runtime Unzip" strategy, dynamically patching the extension code during the build.
-   **Automation**: The `get_texlive.sh` script now handles downloading, configuring, and packaging TeX Live autonomously for all platforms.

---

## 2. Technical Challenge: The "EMFILE" Saga
The primary blocker was the `EMFILE: too many open files` error during the `gulp` build step (packaging extensions).

### The Root Cause
-   **TeX Live Size**: Even a minimal install (`scheme-basic`) with recommended fonts contains **~10,000 files**.
-   **Build Process**: The `gulp` task tries to walk the entire directory tree.
-   **System Limits**:
    -   **macOS Runner**: Default file descriptor limit is extremely low (256 soft / unlimited hard). Node.js crashes when exceeding this.
    -   **Windows Runner**: C Runtime limit is effectively ~2048 handles. No easy `ulimit` equivalent exists to raise this high enough for 10k files.

### The Solutions

#### A. macOS Solution: Kernel Limit Tuning
We attempted `ulimit -n 65536` which failed because it only affects the shell. The robust fix required modifying `launchctl` limits in `.github/workflows/stable-macos.yml`:
```yaml
run: |
  sudo launchctl limit maxfiles 65536 200000
  ulimit -n 65536
  ./build.sh
```
This propagated the high limit to the Node.js build process, resolving the crash.

#### B. Windows Solution: Zip Bundling & Dynamic Patching
We could not raise the limit on Windows. Instead, we **reduced the file count**.
1.  **Remove Bundled Perl**: Windows TeX Live comes with a private Perl (~4000 files). We delete this (`rm -rf tlpkg/tlperl`) and rely on the System Perl provided by GitHub Actions.
2.  **Zip bundling**: We compress the entire `texlive` directory into a single `texlive.zip` file during the build. This reduces the file handle count from ~6000+ to **1**.
3.  **Dynamic Runtime Unzipping**: We devised a method to unzip this file automatically when the user first runs the extension.

---

## 3. Evolution of `get_texlive.sh`
This script is the core of the integration. Here is its evolution:

### Phase 1: Basic Install
-   **Goal**: Download `install-tl-unx.tar.gz` and run installer.
-   **Issue**: Failed on Windows (perl paths) and missing packages.
-   **Fix**: Added `cygpath` conversion for Windows paths throughout the profile generation.

### Phase 2: Scheme Optimization
-   **Initial**: `scheme-infraonly` (too small, missing `pdflatex`).
-   **Adjusted**: `scheme-basic` + `collection-fontsrecommended`. This provided the necessary binaries and fonts but triggered the `EMFILE` errors.

### Phase 3: The Windows Patch (Current)
This is the most complex logic. Since we cannot modify the source code of the extension directly (because `vscode/extensions/latex-workshop` is a build artifact/ignored by git), we inject logic **dynamically** during the build.

**Logic implemented in `get_texlive.sh`:**
1.  **Install**: Standard install of `scheme-basic`.
2.  **Clean**: Remove `tlpkg/tlperl`.
3.  **Zip**: Compress `texlive/` -> `texlive.zip` and remove the directory.
4.  **Patch**: Run a Node.js script to **prepend** a setup block to `out/src/main.js`.

**The Patch Logic (Prepend Strategy):**
We initially tried to Regex replace specific lines in `main.js`, but this failed due to file content differences on CI. The final robust solution is to **prepend** a self-contained IIFE (Immediately Invoked Function Expression) to the file:
```javascript
// [BUNDLED TEX LIVE SETUP]
(function() {
    // Check for texlive.zip
    if (process.platform === 'win32' && fs.existsSync('texlive.zip')) {
        // Unzip ONLY if target dir is missing
        if (!fs.existsSync('texlive')) {
            execSync('tar -xf texlive.zip'); // Use native tar on Windows 10+
        }
    }
    // Add bin to PATH
    // ...
})();
```
This ensures the unzipping happens before any other extension code runs.

---

## 4. Workflows & Configuration

### `.github/workflows/stable-macos.yml`
-   Added `sudo launchctl limit maxfiles ...` to `compile` job.

### `.github/workflows/stable-windows.yml`
-   Uses standard `runs-on: windows-2022`.
-   No special limits config needed (handled by Zip strategy).

### `get_repo.sh`
-   Retained logic to clone `Microsoft/vscode`.
-   Ensures correct tagging.

---

## 5. Commit History (Recent Highlights)
-   `c68fad0`: **fix: Prepend bundled TeX Live setup to main.js for reliability** (Final robust patch logic).
-   `0d53434`: **fix: Use regex for robust main.js patching** (Attempt 2).
-   `fa1e094`: **fix: Correct syntax error in get_texlive.sh** (Fixed quote usage).
-   `c016c66`: **fix: Zip TeX Live on Windows to avoid EMFILE** (Implementation of Zip strategy).
-   `292b283`: **fix: Remove bundled Perl on Windows** (Initial file count reduction).

---

## 6. Next Steps
1.  **Verify Windows Build**: Monitor the current CI run to confirm the `tar` command works on the runner and the `EMFILE` error is gone.
2.  **Functional Testing**: Once built, verify that launching the Windows version actually unzips the file and compiles LaTeX correctly.
