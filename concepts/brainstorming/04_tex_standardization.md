# Brainstorming: TeX Standardization & Reproducibility

## The Problem: "It works on my machine" (but fonts are different)
As discovered in `../PDF_DIFFERENCES.md`, LaTeX compilation is not deterministic if the environment differs.
*   **Overleaf**: Renders with `Linux Libertine` (correct).
*   **Underoot (Local)**: Renders with `Computer Modern` (fallback) because `acmart.cls` gracefully handles missing fonts.

This creates a **trust gap**. Users cannot trust the local preview if it reflows text, changes page counts, or looks "cheaper" than the final submission.

## How Others Do It

### 1. Overleaf (The "Fat Server" Model)
Overleaf ensures standardization by brute force:
*   **Monolithic Images**: They use essentially `scheme-full`. Everything is installed.
*   **Version Pinning**: You select "TeX Live 2023" or "TeX Live 2024". This maps to a frozen Docker image or snapshot on their servers.
*   **No "On-the-fly"**: They don't typically download packages mid-compile; they just have everything pre-loaded.

### 2. arXiv (The "Strict" Model)
arXiv is the ultimate gatekeeper.
*   **Frozen TeX Live**: They run a specific year (currently TL 2023 or 2024).
*   **Strict Compilation**: If your upload fails to compile on their standard rig, it is rejected. They do not auto-install missing packages from the internet during compilation.

### 3. Tectonic (The "Modern" Model)
[Tectonic](https://tectonic-typesetting.github.io/) is a rewrite of the XeTeX engine in Rust.
*   **Network-First**: It downloads exactly the packages needed for a document from a reliable CDN.
*   **Reproducible**: Ideally, `tectonic document.tex` produces the exact same PDF byte-for-byte on generic Linux, macOS, and Windows.
*   **Self-Contained**: No external `tlmgr` management needed.

### 4. Docker (The "Container" Model)
Developers often use `registry.gitlab.com/islandoftex/images/texlive:latest`.
*   **Pros**: Guaranteed identical environment.
*   **Cons**: Requires User to have Docker installed; massive download (4GB+).

## Brainstorming Solutions for Underoot

We need a middle ground. We can't ship a 5GB installer (User Experience nightmare), but we can't accept broken fonts (Trust nightmare).

### Idea A: "Strict Mode" Compilation
We could inject a "Strict Compliance" configuration.
*   **How**: Prepend a check script to the user's LaTeX or parse logs aggressively.
*   **Action**: If `acmart` warns "libertine package not installed", we **fail the build** or **pause and prompt**.
*   **Benefit**: Users are alerted immediately that their preview is non-standard.
*   **Drawback**: Annoying if they just want a quick draft.

### Idea B: The "Gold Standard" Profile
Extend `get_texlive.sh` to support profiles.
*   **Default**: `scheme-basic` + auto-install (current).
*   **Gold**: A preset list of "Must Have" packages for academic writing (`acmart`, `libertine`, `newtx`, `biblatex`, `pgfplots`).
*   We could prompt the user: *"We detected you are writing an ACM paper. Recommended fonts are missing. Install 'Academic Font Pack' (~200MB)?"*

### Idea C: Adopting Tectonic?
Could Underoot switch to (or offer) Tectonic as the backend?
*   **Pros**: Solves the "missing package" problem forever. Solves the `EMFILE` problem (Rust handles I/O better).
*   **Cons**: Might not support every obscure package; moving away from standard `pdflatex`/`latexmk` workflow might break some user scripts.
*   **Viability**: High. It compiles `acmart` perfectly and handles font downloads automatically.


### Idea D: Hybrid / "Shim" Verification
Run a "Pre-flight Check" (like a linter) that scans the `.tex` file for known classes (`\documentclass{acmart}`) and verifies the presence of their dependencies *before* compiling.
*   `acmart` detected -> Check for `libertine.sty`, `inconsolata.sty`, `newtxmath.sty`.
*   If missing -> Explicitly trigger `tlmgr install` for them.

---

## Brainstorming: The "Underoot Turbo Fetcher" (Custom Solution)

The user identified two critical flaws in existing tools:
1.  **Slowness:** `texliveonfly` is $O(N)$. It compiles, fails, installs *one* package, restarts. If you need 10 packages, you compile 10 times and run `tlmgr` (which updates its DB) 10 times.
2.  **Ignorance:** It ignores "soft" dependencies (fonts) that only trigger warnings.

### Proposed Architecture: "Scan, Batch, Install"

Instead of "Fail & Retry", we build a "Look Ahead" tool.

#### 1. Fast Static Scan (The "Grep" Phase)
Before invoking `latexmk`, we run a fast scanner (written in Rust/Go or even efficient Node.js) over the `.tex` files.
*   **Regex**: Extract `\usepackage{...}`, `\documentclass{...}`, `\input{...}`.
*   **Recursive**: Follow `\input` files.
*   **Performance**: < 100ms for a large project.

#### 2. The Dependency Graph (The "Brain")
We need a mapping of `Latex Package Name` -> `TeX Live Package Name`.
*   *Most* are 1:1 (`\usepackage{listings}` -> `listings`).
*   *Some* are bundled (`\usepackage{tikz}` -> `pgf`).
*   *Critical*: **Hardcoded "Soft" Dependencies**.
    *   We maintain a curated JSON list of "Implicit Dependencies".
    *   Entry: `"acmart": ["libertine", "inconsolata", "newtx"]`.
    *   Entry: `"beamer": ["translator"]`.

#### 3. Batch Installation (The "Speed")
Most of `tlmgr`'s time is startup overhead (checking GPG keys, update mirrors).
*   **Strategy**: Collect *ALL* candidates from the Scan + Graph.
*   **Filter**: Check which are already installed (check `kpsewhich package.sty`).
*   **Execute**: Run `tlmgr install pkg1 pkg2 pkg3 ... pkgN` **once**.
*   **Result**: 1 network call, 1 DB update. Blazing fast.

### Can we skip `tlmgr` (CTAN Direct)?
`tlmgr` effectively just downloads a `.tar.xz` from a CTAN mirror and unpacks it.
*   **Crazy Idea**: We could reimplement a "light" `tlmgr` that skips the database locking and GPG checks (optional).
*   **Risk**: Dependencies. `tlmgr` knows that if you install `foo`, you also need `bar`. If we just download `foo.sty` from CTAN, we miss `bar` and break things.
*   **Verdict**: Stick to `tlmgr`, but use it *efficiently* (Batching).

### Comparison
| Feature | `texliveonfly` | Tectonic | **Underoot Turbo** |
| :--- | :--- | :--- | :--- |
| **Speed** | Slow (Iterative) | Fast (Network Native) | **Fastest** (Local + Batch) |
| **Logic** | "Did it crash?" | "Fetch on demand" | **"Predict & Pre-load"** |
| **Soft Deps** | Ignored (Broken Fonts) | Handled (if programmed) | **Handled** (via Curated List) |
| **Control** | Low | Low (Rust opaque) | **High** (User Scriptable) |

### Implementation Path
1.  **Scanner**: Simple Node.js script using Regex.
2.  **Mapper**: A `known_dependencies.json` file in the extension.
3.  **Installer**: A wrapper around `tlmgr --no-auto-remove install <list>`.

