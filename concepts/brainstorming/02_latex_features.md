# Stage 1: Basic LaTeX Functionality Brainstorming

## 1. The Core Extension: LaTeX Workshop
*   **Decision**: We will bundle [James-Yu/LaTeX-Workshop](https://github.com/James-Yu/LaTeX-Workshop).
*   **Implementation**:
    *   Can we build it into the `defaultExtensions` of VSCodium?
    *   Or do we include the `.vsix` file and install it on first launch?
    *   *Preference*: Built-in if possible, to avoid "installing" delay.

## 2. The TeX Distribution (The Hard Part)
LaTeX requires a TeX distribution (pdflatex, tectonic, etc.).

### Option A: Bundle Full TeX Live
*   **Pros**: Truly offline, guaranteed to work.
*   **Cons**: Huge size (several GBs). Makes the installer massive.

### Option B: Download on First Launch (Recommended)
*   **Workflow**:
    1.  User installs Underoot (small size).
    2.  First launch -> "Setting up LaTeX Environment..."
    3.  Downloads a lightweight distribution (e.g., TeX Live Basic or purely portable MicroTeX).
    4.  Extracts to `app/data/texlive`.
*   **Pros**: Friendly initial download.
*   **Cons**: Requires internet for first run.

### Option C: Dependency Check
*   Ask user to point to existing installation. (Defeats the "Batteries Included" purpose).

## 3. Configuration & Paths
*   Underoot must set environment variables (PATH) so that `pdflatex` is visible to the extension without the user editing settings.
*   We need a `startup.js` or shell script wrapper to inject these paths before VS Code starts.

## 4. PDF Viewer
*   LaTeX Workshop has an internal PDF viewer.
*   We previously worked on improving it (pdfium).
*   **Goal**: Ensure this viewer is the default for `.pdf` files.
