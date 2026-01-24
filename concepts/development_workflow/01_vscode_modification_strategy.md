# VS Code Modification Strategy (The "Big Repo" Problem)

## The Challenge
The core `vscode` repository is massive (hundreds of MBs of history).
1.  **Gitignore**: We cannot commit the entire `vscode` source to `underoot` because it would bloat our repository and duplicate upstream history.
2.  **Ephemerality**: The `get_repo.sh` scripts fetch a fresh copy of `vscode` during build time (CI/CD). Any direct changes made to the `vscode/` folder locally are **lost** if not captured.

## The Solution: A Patch-Based Workflow
Instead of forking the entire repo, we maintain a set of small **patches** (diffs) that are applied on top of the fresh `vscode` source every time we build.

### Workflow: How to Make Changes
1.  **Initialize**: Run `./get_repo.sh` to fetch the vanilla `vscode` source into the `vscode/` directory.
2.  **Local Git (Optional but Recommended)**:
    *   Initialize a temporary git repo inside `vscode/` (`cd vscode && git init && git add . && git commit -m "base"`).
    *   This allows you to track your own experimental changes.
3.  **Modify**: Make your code changes inside `vscode/` (e.g., editing branding files, changing UI logic).
4.  **Create Patch**:
    *   Once happy, generate a patch file:
        ```bash
        git diff > ../patches/my-new-feature.patch
        ```
5.  **Commit the Patch**:
    *   Add `patches/my-new-feature.patch` to the **Underoot** repository.
    *   Commit and push *that patch file* to GitHub.

### How CI/CD Handles It
Our build scripts (specifically `prepare_vscode.sh`) do the following automatically:
1.  Clones `vscode`.
2.  Iterates through the `patches/` directory.
3.  Applies every `.patch` file to the source.
4.  Builds the result.

### Summary
*   **Do we push `vscode/`?** NO.
*   **Do we push changes?** YES, but only as `.patch` files in the `patches/` folder.
*   **Can we use git locally?** YES, use it inside `vscode/` to manage your work, but extracting the diff is the final step.

## Git Repository Separation
You might wonder: *How do we have a git repo inside another git repo?*

1.  **The Parent (`underoot`)**:
    *   This is the main repository you are currently in.
    *   It tracks `build scripts`, `patches`, `docs`, and `assets`.
    *   **Crucially**, it contains a `.gitignore` file with the line:
        ```gitignore
        /vscode*
        ```
    *   This tells the parent git to **completely ignore** the existence of the `vscode/` directory. It doesn't care if it's a file, a folder, or another git repo.

2.  **The Child (`vscode`)**:
    *   When you run `get_repo.sh` (or `git init` inside `vscode/`), a new `.git` folder is created at `underoot/vscode/.git`.
    *   Because the parent ignores this folder, the two repositories operate independently.
    *   Commands run in `underoot/` affect the parent.
    *   Commands run in `underoot/vscode/` affect the child.

### Best Practice
Always treat `vscode/` as a **scratchpad**. It can be deleted and recreated at any time by the build scripts. Your "real" work is only safe once it is saved as a `.patch` in the parent `underoot` repo.

## Local Development (Running the Code)
To test your changes locally without running the full CI/CD pipeline:

1.  **Navigate to Child**: `cd vscode`
2.  **Install Dependencies**:
    *   **Use `yarn`**, NOT `npm`.
    *   **Why?**: Microsoft's VS Code repository uses `yarn.lock`. Using `npm install` will generate a `package-lock.json` and cause conflicts or missing dependencies.
    *   Command: `yarn`
3.  **Start Compilation**:
    *   Command: `yarn watch`
    *   This runs the Transpiler (TypeScript -> JavaScript) in watch mode. Wait until it says "finished with 0 errors".
4.  **Launch**:
    *   **Windows**: `.\scripts\code.bat`
    *   **Mac/Linux**: `./scripts/code.sh`
    *   This launches the Electron instance with your local source code.

## CI/CD Branding Configuration
When rebranding the application (e.g., from "VSCodium" to "Underoot"), it is critical to update the CI/CD pipeline environment variables to match.

### Key Variables
*   **`APP_NAME`**: The display name of the application (e.g., `Underoot`). Used for shortcuts, installer names, and the executable file description.
*   **`BINARY_NAME`**: The internal name of the executable (e.g., `underoot`). This determines the filename (e.g., `underoot.exe`, `underoot` binary).

### Where to Update
These variables are defined in the GitHub Actions workflow files:
*   `.github/workflows/stable-windows.yml`
*   `.github/workflows/stable-linux.yml`
*   `.github/workflows/stable-macos.yml`

### Common Pitfalls
*   **Hardcoded Values**: Build scripts (like `build/windows/msi/build.sh`) often default to "VSCodium" if `APP_NAME` is not explicitly set or if the script ignores the environment variable. Ensure scripts use `${APP_NAME:-Underoot}`.
*   **WiX Installer (Windows)**: The `vscodium.xsl` file generates IDs based on file names. If `BINARY_NAME` changes, the harvest process will see `Underoot.exe` instead of `VSCodium.exe`. The XSL transformation logic must align with these dynamic names to avoid "Unresolved reference" errors.
