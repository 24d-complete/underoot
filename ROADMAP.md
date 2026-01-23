# Underoot Project Roadmap

This document outlines the development phases for **Underoot**, a portable, privacy-focused LaTeX IDE based on VSCodium.

## Stage 0: Base Infrastructure
*Goal: Establish a working build pipeline for a vanilla VSCodium base.*

- [ ] **Source Import**: Import build scripts and structure from `VSCodium/vscodium`.
- [ ] **CI/CD Setup**: Configure GitHub Actions to build portable binaries/executables automatically.
- [ ] **Release Automation**: Automatically publish "Version 0" (Pre-alpha) assets upon successful build.

## Stage 0.1: Branding
*Goal: Establish the new identity.*

- [ ] **Rebranding**: Rename application from "VSCodium" to "**Underoot**".
- [ ] **Visual Identity**: Replace application icons and logos.

## Stage 0.2: Minimalization
*Goal: Reduce visual clutter for a focused writing environment.*

- [ ] **Activity Bar**: Remove "Run and Debug" and "Source Control" icons from the primary interface.
- [ ] **Menu Cleanup**: Hide non-essential developer tools by default.

## Stage 1: Basic LaTeX Functionality
*Goal: Create a "batteries-included" LaTeX environment.*

### Phase 1: Environment & Core Tools
- [ ] **Integrated Extension**: Bundle the "LaTeX Workshop" extension by default.
- [ ] **Embedded Distribution**: Automatically download and configure a lightweight TeX Live distribution on first launch.
- [ ] **Zero-Config Setup**: Ensure Underoot can compile `.tex` files immediately without manual path configuration.

### Phase 2: User Experience
- [ ] **Welcome Experience**: Redesign the generic VS Code welcome screen to focus on creating/opening LaTeX projects.
- [ ] **Template Browser**: Implement an integrated browser for official templates (similar to Overleaf).
