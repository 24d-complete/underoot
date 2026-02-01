# Brainstorming: Integrating "Turbo Fetcher" with LaTeX Workshop

**Goal:** Seamlessly inject our "Scan & Batch Install" logic into the embedded `latex-workshop` extension without forking the entire codebase or making maintenance impossible.

## The Constraints
1.  **Code Access:** We are working with the *compiled* `main.js` (webpacked) of the extension, not the source.
2.  **Update Safety:** We want to be able to upgrade LaTeX Workshop versions without rewriting complex logic every time.
3.  **User Experience:** It should happen automatically when they click "Build" or standard save-to-build triggers.

## Strategy A: The "Trojan Horse" Wrapper (Recommended)

Instead of modifying the extension's logic, we modify the **tools** it calls.
LaTeX Workshop is configured to call `latexmk` by default. We can trick it into calling **our wrapper** instead.

### How it works:
1.  **The Wrapper Script (`turbo_latexmk.sh`)**:
    We ship a script in the `bin/` folder or alongside `latexmk` that does:
    ```bash
    #!/bin/bash
    # 1. Run the Turbo Scanner (Node.js script or binary)
    node "$TEX_ROOT/scripts/turbo_scanner.js" "$1" 
    
    # 2. Forward arguments to the real latexmk
    latexmk "$@"
    ```

2.  **Configuration Injection**:
    We already patch `product.json` or `config` to set defaults. We can set the default path for the `latexmk` tool in VS Code settings to point to our wrapper.
    *   *Challenge:* LW might hardcode `latexmk` command or expect it in PATH.
    *   *Fix:* We prepend our `bin` folder to the `PATH` in the initialization patch we already have in `main.js`. If our wrapper is named `latexmk` (shadowing the real one) and placed earlier in PATH, LW will call it unknowingly.

### Strategy B: The "Pre-Build" Hook (Patching `main.js`)

We are already injecting a startup script into `main.js` to unzip TeX Live. We could extend this to "monkey patch" the build command.

*   **Logic:** Find the function responsible for `buildRootFile` or recipe execution and wrap it.
*   **Pros:** Access to VS Code APIs (Output Channel, Progress Bars, Notifications). Better UX ("Installing missing fonts...").
*   **Cons:** Very brittle. Webpacked functions are often renamed (`e.g., const t = __webpack_require__(...)`). Finding the "Build" function reliably across versions is hard.

### Strategy C: The "Second Extension"
We ship a *second* extension ("Underoot Core") that declares a `task` provider.
*   **Logic:** Users configure LW to run a "Task" before building.
*   **Cons:** Requires user configuration. Not "Out of the Box".

## Implementation Detail: The "Turbo Scanner" Code

Where does the JS code for the scanner live?

### Location
We should place a dedicated `scripts/` folder inside the extension directory during our `get_texlive.sh` build process.
`resources/app/extensions/latex-workshop/scripts/turbo_scan.js`

### The Logic (`turbo_scan.js`)
```javascript
const fs = require('fs');
const { execSync } = require('child_process');

// 1. Load Hardcoded "Soft" Deps
const SHIMS = {
    "acmart": ["libertine", "inconsolata", "newtx"],
    "beamer": ["translator"],
     // ...
};

// 2. Scan .tex file (Regex for \usepackage, \documentclass)
const content = fs.readFileSync(process.argv[2], 'utf8');
const packages = extractPackages(content); // Implement regex

// 3. Resolve Dependencies
let toInstall = [];
packages.forEach(pkg => {
    if (SHIMS[pkg]) toInstall.push(...SHIMS[pkg]);
    toInstall.push(pkg); // Also add the package itself
});

// 4. Filter against installed (kpsewhich)
const missing = toInstall.filter(p => !isInstalled(p));

// 5. Batch Install
if (missing.length > 0) {
    console.log(`[Turbo] Detected missing packages: ${missing.join(', ')}`);
    execSync(`tlmgr install ${missing.join(' ')}`);
}
```

## Integrating with our Build Pipeline (`get_texlive.sh`)

We need to update `get_texlive.sh` to:
1.  **Copy** the `turbo_scan.js` into the extension folder.
2.  **Create** the `latexmk` wrapper script (Strategy A) acting as a shim.
3.  **Ensure** the PATH injection in `main.js` puts our wrapper directory *first*.

## Verdict
**Strategy A (Shadowing `latexmk`)** is the most robust.
1.  It is **agnostic** to VS Code / LW versions.
2.  It works even if the user runs `latexmk` from the terminal recursively.
3.  It keeps the `main.js` patch simple (just ENV vars).

**Refinement:** We rename the real binary to `latexmk_original` and name our wrapper `latexmk`.
