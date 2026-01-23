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
