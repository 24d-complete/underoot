# Integration Plan: Bundling LaTeX Workshop

**Status**: Planning
**Objective**: Bundle the LaTeX Workshop extension (`James-Yu.latex-workshop`) directly into the Underoot installer so it is available immediately upon first launch, without requiring a separate install step or internet connection.

## 1. Technical Mechanism
VS Code (and by extension VSCodium/Underoot) supports "Built-in Extensions". These are defined in `product.json`. When the application builds, it downloads these extensions and packages them into the `resources/app/extensions` directory.

Our target is to inject a new entry into the `builtInExtensions` array in `product.json` during the `prepare_vscode.sh` phase.

## 2. Required Metadata
To bundle an extension, `product.json` requires specific fields. We cannot just point to the Marketplace page; we need the direct VSIX asset link and its checksum.

**Fields required:**
*   `name`: `James-Yu.latex-workshop` (or similar identifier)
*   `version`: The specific version we are locking to (e.g., `10.4.0`)
*   `sha256`: The SHA-256 hash of the VSIX file for integrity verification.
*   `repo`: URL to the GitHub repository (optional but good practice).
*   `metadata`:
    *   `id`: The unique extension UUID (e.g., `james-yu.latex-workshop` ID from marketplace).
    *   `publisherId`: UUID of the publisher.
    *   `publisherDisplayName`: "James Yu"

## 3. Implementation Workflow

### Step A: Metadata Retrieval
We need to fetch the latest stable release info manually or via script.
1.  **Source**: OpenVSX Registry or GitHub Releases.
    *   *Preference*: OpenVSX is safer for VSCodium-based builds to ensure license compatibility, though LaTeX Workshop is MIT, so GitHub/Marketplace is fine too.
2.  **Action**: Download the `.vsix` temporarily to calculate the SHA256 if not provided by the API.

### Step B: Build Script Modification (`prepare_vscode.sh`)
We will modify updating `product.json` in `prepare_vscode.sh`.

**Current Logic:**
The script currently merges `src/vscode/product.json` with our `product.json`.

**Proposed Logic:**
We will use `jq` to append our extension configuration to the `builtInExtensions` array.

```bash
# Pseudocode for prepare_vscode.sh addition
LATEX_WORKSHOP_CONFIG='{
    "name": "James-Yu.latex-workshop",
    "version": "X.Y.Z",
    "sha256": "...",
    "repo": "https://github.com/James-Yu/LaTeX-Workshop",
    "metadata": {
        "id": "...",
        "publisherId": { ... },
        "publisherDisplayName": "James Yu"
    }
}'

# Append to Product.json
jq --argjson newExt "$LATEX_WORKSHOP_CONFIG" '.builtInExtensions += [$newExt]' product.json > product.json.tmp && mv product.json.tmp product.json
```

### Step C: Verification
1.  **Build**: Run the build script (`build.sh` or `prepare_vscode.sh`).
2.  **Inspect**: Check `vscode/extensions` (or `resources/app/extensions` in the built binary) to see if `james-yu.latex-workshop` exists.
3.  **Run**: Launch Underoot and verify the extension is active and recognized as "Built-in".

## 4. Maintenance Strategy
*   **Updates**: Since we are hardcoding the version/SHA, we will need a process to update this.
*   **Automation**: Ideally, we write a helper script `update_extension_manifest.py` that queries the API for the latest version and updates our build config automatically. This stays in the `dev/` folder.

## 5. Potential Pitfalls
*   **Download Failures**: If the build machine cannot reach the VSIX url, the build will fail.
*   **License**: LaTeX Workshop is MIT. No conflict.
*   **Bloat**: The VSIX is roughly ~2-5MB? (Need to verify). This is acceptable.

## 6. Action Items
1.  [ ] Create `dev/get_extension_metadata.py` to fetch valid JSON for `product.json`.
2.  [ ] Run script to get data for LaTeX Workshop.
3.  [ ] Modify `prepare_vscode.sh` to inject this data.

## 7. Lifecycle Management: Updates & Rollbacks
A key concern is how a "hardcoded" built-in extension interacts with the VS Code marketplace.

### Updates
*   **User-Side**: Users **CAN** update a built-in extension if a newer version is available in the configured marketplace (OpenVSX or MS Marketplace).
*   **Mechanism**: The updated version is downloaded to the user's local extensions directory (`~/.underoot/extensions`). This "shadows" the built-in version.
*   **App Updates**: When we release a new version of Underoot, we should bump the bundled extension version.

### Rollbacks
*   **Revert to Built-in**: If a user "uninstalls" the extension in the UI, VS Code does not remove it completely. Instead, it removes the user-local update and reverts to the **Built-in** version.
*   **Downgrade**: Users can still use "Install Specific Version..." to install an older version than what we bundle.

*Summary*: Bundling provides a "Safe Baseline". It does not lock the user into that specific version forever.
