# Integrated Extensions Architecture

This document serves as a checkpoint for the "Working Built-in Extension" feature, specifically documenting the integration of **LaTeX Workshop** into the Underoot build process.

## 1. Objective
To bundle the LaTeX Workshop extension directly into the VS Code / VSCodium build proper, making it a "native" part of the editor rather than a separate installation, while ensuring all its dependencies and assets (specifically PDF.js) function correctly.

## 2. Implementation Details

The core logic is implemented in `prepare_vscode.sh`.

### A. Extension Retrieval & Extraction
- **Manual Download**: We download the specific version (`10.12.2`) of the VSIX from OpenVSX.
- **Extraction**: We use Python's `zipfile` module to robustly extract the VSIX content into `vscode/extensions/latex-workshop`. This bypasses potential `unzip`/`tar` incompatibilities across platforms.

### B. Dependency Injection (The "Harvester" Fix)
VS Code's build system (Gulp) is aggressive about stripping `node_modules`. It typically only includes dependencies explicitly listed in the root `extensions/package.json`.
- **Problem**: Dependencies inside our local `extensions/latex-workshop/node_modules` were being stripped or ignored during the final packaging.
- **Solution**: We implemented a script to **merge dependencies**.
    - It reads `extensions/latex-workshop/package.json`.
    - It injects these dependencies into the shared `vscode/extensions/package.json`.
    - It runs `npm install` in the shared `extensions` folder.
    - This tricks the build system's "harvester" into treating these packages as first-class citizens, ensuring they are included in the final product.

### C. PDF.js Viewer Assets
LaTeX Workshop uses a custom PDF viewer based on PDF.js.
- **Asset Relocation**: We manually copy the `build` and `cmaps` directories from `pdfjs-dist` into `viewer/pdfjs` and `viewer/cmaps`.
- **Path Patching**: The `viewer.html` file references `build/pdf.mjs`. We use `sed` to patch this path to `pdfjs/pdf.mjs` to match our custom structure.
    - *Note*: We added a check for macOS (`sed -i ''`) vs Linux (`sed -i`) syntax to ensure cross-platform compatibility.

### D. Build Configuration Overrides
- **.vscodeignore**: We overwrite the extension's `.vscodeignore` to explicitly **include** (`!pattern`) the `node_modules` and `viewer` directories, preventing them from being filtered out by the packaging process.

## 3. macOS Specifics (Gatekeeper & Signing)
- **Problem**: The ARM64 build was failing with "App is damaged" on macOS.
- **Root Cause**: The app was being quarantined by Gatekeeper.
- **Fix**:
    - We enabled `spctl --assess` in `prepare_assets.sh` to strictly verify the signature during the build.
    - We added `codesign -dv --verbose=4` to log detailed signing information.
    - **Usage**: Users must run `xattr -cr Underoot.app` to remove the quarantine attribute if running the app locally without formal Apple Notarization.

## 4. Current Status
- **Branch**: `macos`
- **Verification**:
    - [x] Extension loads built-in.
    - [x] Dependencies (`cross-spawn`, etc.) are resolved correctly.
    - [x] PDF Viewer works (PDF.js assets loaded).
    - [x] macOS ARM64 build runs successfully (after `xattr` fix).
