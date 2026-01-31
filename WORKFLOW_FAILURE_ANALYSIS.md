# Investigation of Workflow Failures

## Summary
The GitHub Actions workflows for Linux, macOS, and Windows have failed due to multiple issues in the TeX Live bundling process:

1. **Broken Symlinks** (Original Issue): The TeX Live installer creates `man` and `info` symlinks pointing to non-existent documentation folders.
2. **Mirror Timeout** (Linux): The CTAN mirror redirector times out during download.
3. **Missing Perl Module** (Windows): The system Perl on Windows lacks `Pod::Usage`, which is required by the installer.

## Detailed Error Analysis
The build logs for all platforms show the same specific error during the `compile-extensions-build` Gulp task:

**Linux:**
```text
[20:03:36] Error: ENOENT: no such file or directory, stat '/home/runner/work/underoot/underoot/vscode/extensions/latex-workshop/texlive/bin/x86_64-linux/man'
```

**macOS:**
```text
[20:16:25] Error: ENOENT: no such file or directory, stat '/Users/runner/work/underoot/underoot/vscode/extensions/latex-workshop/texlive/bin/universal-darwin/man'
```

This error comes from `vscode/build/lib/extensions.ts`, where the build script recursively traverses the extension directory to verify and bundle files. When it encounters a broken symbolic link, `fs.statSync` fails because the link points to a file or directory that does not exist.

## Root Cause
The chain of events leading to this failure is as follows:

1.  **Documentation Disabled**: The `get_texlive.sh` script configures the TeX Live installer to skip installing documentation files to save space (`tlpdbopt_install_docfiles 0`).
2.  **Symlink Creation**: The TeX Live installer automatically creates symbolic links named `man` and `info` inside the binary directory (e.g., `bin/x86_64-linux/`). These links are intended to point to the documentation directories (e.g., `../../texmf-dist/doc/man`).
3.  **Missing Target**: Because documentation installation was disabled, the target `doc` directories were never created. This leaves the `man` and `info` symlinks pointing to nothing (dangling/broken symlinks).
4.  **Build System Crash**: When VS Code's build system tries to bundle the `latex-workshop` extension, it encounters these files. It attempts to resolve the symlinks to get file statistics (`stat`), fails because the target is missing, and throws a fatal error.

## Comparisons
- **Commit b29d465 (Current - Failed)**: This commit introduced `get_texlive.sh` and the bundling of TeX Live, which created these broken symlinks.
- **Commit d34cb9e (Previous - Success)**: This commit did not include TeX Live bundling, so the directory structure was clean, and the build succeeded.

## Recommended Fix
We must modify `get_texlive.sh` to remove these broken symbolic links immediately after the installation completes.

**Patch for `get_texlive.sh`:**

```bash
# ... after installation and before tlmgr usage ...

echo ">>> TeX Live installed to $TARGET_DIR"

# [FIX] Remove broken symlinks causing build failures
# The installer creates man/info symlinks in bin/ pointing to non-existent doc folders
echo ">>> Cleaning up broken symlinks (man, info)..."
find "$TARGET_DIR/bin" -type l -name "man" -delete
find "$TARGET_DIR/bin" -type l -name "info" -delete

# Find tlmgr...
```
