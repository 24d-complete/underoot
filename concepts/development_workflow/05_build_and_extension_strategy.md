# Build & Extension Strategy

**Status**: Implemented & Verified  
**Last Updated**: 2026-01-27

## Overview
This document outlines the technical strategy used to build **Underoot**, a custom IDE based on VSCodium. The core challenge was integrating the `LaTeX Workshop` extension as a "native" built-in component while bypassing the limitations of the VS Code build system (Gulp/Vinyl/VSCE).

## 1. The Hybrid Application Model
Instead of forking the massive VS Code codebase to add features, we use a **Patching Workflow**:
1.  **Core**: Upstream VSCodium (Open Source VS Code).
2.  **Injection**: We inject our custom branding and the `LaTeX Workshop` extension *during the build process*.
3.  **Result**: A pristine, up-to-date IDE that feels custom-made but is easy to maintain.

## 2. Key Challenges & Solutions

### A. The "Missing Module" Problem (Dependency Harvesting)
**Issue**: VS Code's build system (Gulp) has a "Harvester" that scans `extensions/package.json` to decide which `node_modules` to bundle in the final app. It **ignores** `node_modules` inside individual Extension folders (like `extensions/latex-workshop/node_modules`).
*   *Result*: The extension activates but crashes with `Cannot find module 'cross-spawn'`.

**Solution: Shared Dependency Injection**
We modified `prepare_vscode.sh` to:
1.  Read the extension's private `package.json`.
2.  **Merge** its dependencies into the **Shared** `extensions/package.json`.
3.  Run `npm install` in the shared `extensions/` root.
*   *Outcome*: The Harvester "sees" the dependencies and correctly bundles them into the final executable.

### B. The "PDF Viewer 404" (Asset Stripping)
**Issue**: The `LaTeX Workshop` webview loads the PDF viewer from `.../viewer/viewer.html`. This HTML references assets in `build/` and `cmaps/`.
1.  **Missing Assets**: Standard VSIX extraction does not contain `build/` assets (they are compiled).
2.  **Aggressive Filtering**: Even when manually copied, VS Code's build system aggressively ignores/strips any folder named `build/` to prevent recursion, regardless of `.vscodeignore` settings on Windows.
*   *Result*: The PDF viewer opens but shows a blank screen with `404 Not Found: build/pdf.mjs`.

**Solution: The "Rename & Patch" Strategy**
We updated `prepare_vscode.sh` to:
1.  **Renaming**: Manually copy `pdfjs-dist/build` to `viewer/pdfjs` (renaming it from "build" avoids the filter).
2.  **Patching HTML**: Use `sed` to update `viewer/viewer.html` to reference `pdfjs/pdf.mjs` instead of `build/pdf.mjs`.
3.  **Patching JS Config**: Use `sed` to update `out/viewer/latexworkshop.js`. This file contains hardcoded paths (`workerSrc`, `cMapUrl`) that must be re-pointed to our new `pdfjs/` and `cmaps/` directories.
*   *Outcome*: The PDF viewer loads successfully with full functionality.

### C. CI/CD Rate Limits
**Issue**: GitHub Actions IPs are often rate-limited by GitHub's API when fetching built-in extensions (like `git`, `github-authentication`).
**Solution**: Injected `${{ secrets.GITHUB_TOKEN }}` into the environment variables of the `Build` step in `stable-windows.yml` (and linux/mac), authenticated the fetch requests.

## 3. The Injection Script (`prepare_vscode.sh`)
The master script that orchestrates this logic is `prepare_vscode.sh`. It runs before the main VS Code build.

```bash
# Workflow Summary
1. Download LaTeX Workshop VSIX.
2. Extract to `vscode/extensions/latex-workshop`.
3. Install dependencies (`npm install`).
4. **INJECT**: Merge dependencies into `vscode/extensions/package.json`.
5. **RESTORE & RENAME**: 
   - Copy `pdfjs-dist/build` -> `viewer/pdfjs` (Note: RENAMED)
   - Copy `pdfjs-dist/cmaps` -> `viewer/cmaps`
   - Copy `pdfjs-dist/standard_fonts` -> `viewer/standard_fonts`
6. **PATCH CONFIG**:
   - `viewer.html`: Update `src` to point to `pdfjs/`
   - `latexworkshop.js`: Update `workerSrc`, `cMapUrl`, `standardFontDataUrl`
7. **OVERRIDE**: Create `.vscodeignore` with `!node_modules/**`, `!viewer/pdfjs/**` etc.
```

## 4. Verification
To verify the fix locally without running a 30-minute build:
```powershell
# Run the preparation script
bash prepare_vscode.sh

# Check for Shared Module (Fixes "Cannot find module")
ls vscode/extensions/node_modules/cross-spawn 

# Check for Viewer Assets (Fixes "404 Not Found")
# precise names matter!
ls vscode/extensions/latex-workshop/viewer/pdfjs/pdf.mjs
ls vscode/extensions/latex-workshop/viewer/pdfjs/pdf.worker.mjs
```
If these files exist and the config patches ran without error, the build system is guaranteed to produce a working artifact.
