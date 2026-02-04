---
description: Build the Underoot project (VS Code + TeX Live + Compilation)
---

This workflow automates the full build process for the Underoot project, ensuring all components from VS Code to TeX Live are prepared and compiled.

# Steps

1.  **Prepare VS Code Base**
    Run the preparation script to set up the VS Code environment.
    ```bash
    ./prepare_vscode.sh
    ```

2.  **Setup TeX Live**
    // turbo
    Run the TeX Live setup script to bundle the LaTeX environment.
    ```bash
    ./get_texlive.sh
    ```

3.  **Compile Project**
    // turbo
    Run the main build script.
    ```bash
    ./build.sh
    ```

4.  **Verify Output**
    Check if the build was successful (e.g., look for output in `VSCode-darwin-arm64` or equivalent).
