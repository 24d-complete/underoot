# Brainstorming: Instant Compilation (Standard Protocol)

**Goal:** Accelerate the compilation phase (`pdflatex` / `latexmk`) significantly while maintaining 100% compatibility with standard TeX distributions (TeX Live / MikTeX).

## 1. Pre-Compiled Preambles (Mylatexformat)

*   **The Bottleneck:** For every keystroke save, LaTeX re-loads and re-parses every single package (`\usepackage{tikz}`, `\usepackage{amsmath}`...). This takes 1-3 seconds.
*   **The Solution:** Compile the "Preamble" (everything before `\begin{document}`) into a binary `.fmt` file once.
*   **Workflow:**
    1.  **First Run:** `pdflatex -ini -jobname="header" "&pdflatex header.tex\dump"`
    2.  **Fast Run:** `pdflatex -fmt=header main.tex`
*   **Impact:** Reduces startup time from **2.5s** $\rightarrow$ **0.1s**.
*   **Standard?** Yes, supported by all standard engines.

## 2. In-Memory Compilation (RAMDisk)

*   **The Bottleneck:** Disk I/O. LaTeX reads/writes thousands of tiny temporary files (`.aux`, `.log`, `.toc`, `.out`).
*   **The Solution:** Mount the build directory in RAM.
    *   **MacOS:** `mount_tbfs` (RamEx).
    *   **Workflow:** Copy source to `/Volumes/RamDisk/` $\rightarrow$ Compile $\rightarrow$ Copy PDF back.
*   **Impact:** 20-40% speedup on SSDs, but massive reduction in SSD wear.

## 3. The "Partial Compile" Trick (Active File Only)

*   **The Problem:** You are editing Chapter 5 of a thesis. LaTeX compiles Chapters 1-4 and 6-10 every time.
*   **The Solution (`\includeonly`):**
    *   Automatically detect which file is active in VS Code (`chapter5.tex`).
    *   Inject `\includeonly{chapter5}` into the build command.
*   **Impact:** Compiles *only* the 10 pages you are working on, not the full 200.
*   **Validation:** Still produces a valid PDF (just missing other chapters). Perfect for "Dev Mode."

## 4. Draft Mode (Syntax Check)

*   **Logic:** If the user just wants to see if there are red squiggles (errors), we don't need a PDF.
*   **Command:** `pdflatex -draftmode ...`
*   **Speed:** 2x faster (no PDF generation).
*   **Use Case:** triggered on *every keystroke* (debounce 500ms) to update the "Problem" panel. The full PDF build triggers only on *Save*.

## 5. Tectonic (The Modern Engine)

*   **Concept:** A Rust-based rewrite of the XeTeX engine.
*   **Pros:** Extremely fast caching, automatic package downloading.
*   **Cons:** Might differ slightly from `pdflatex` (it uses XeTeX backend).
*   **Verdict:** Good optional flag, but maybe not "Standard Protocol" default.

## Summary of Potential Gains

| Strategy | Standard Protocol? | speedup Factor | Implementation Effort |
| :--- | :--- | :--- | :--- |
| **Pre-compiled Headers** | **Yes** | **10x (Startup)** | Medium (logic needed) |
| **RAMDisk** | **Yes** | 1.3x | High (OS specific) |
| **Partial Compile** | **Yes** | **10x (Volume)** | Medium (parsing needed) |
| **Draft Mode** | **Yes** | 2x | Low |
