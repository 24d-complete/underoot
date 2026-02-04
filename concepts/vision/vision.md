# Underoot: The Next-Generation Scientific Writing Ecosystem

## 1. Executive Summary
Underoot is a local-first, open-source scientific writing platform designed to bridge the gap between heavy desktop environments and collaborative web tools. By stripping away the bloat of traditional IDEs (like VS Code) and enhancing the accessibility of LaTeX, Underoot provides a lightweight, AI-integrated environment for researchers, developers, and academic teams.

## 2. System Architecture & Core Experience

### 2.1 Hybrid Local-First Architecture
- **Browser-Based Desktop Bridge:** Underoot operates via a "write once, run anywhere" browser mode. Unlike traditional web apps, the browser interface connects directly to a local desktop agent (similar to Figma’s architecture).
- **Function:** The application runs on underoot.com but utilizes the local machine’s file system and resources. localhost is bypassed in favor of a secure local bridge.
- **Lightweight Editor Core:** Built on a streamlined architecture that strips unnecessary features from standard IDEs (e.g., VS Code), focusing solely on performance and writing tools.
- **TeXLive on the Fly:** Eliminates complex installation procedures. The necessary TeX packages are fetched and managed automatically in the background.

### 2.2 Universal Compatibility & Conversion
**Format Agnosticism:** Seamless two-way conversion tools:
- **Word to Standard/Conference LaTeX:** Convert .docx files directly into clean LaTeX code.
- **PDF to LaTeX:** Intelligent parsing to reverse-engineer PDFs into editable LaTeX source code.
- **LaTex to Word**
- **Overleaf to Underoot:** One-click migration tool to pull projects from cloud silos to the local environment.

**Smart Visualization (Dark Mode 2.0):** Advanced rendering that goes beyond text color. The engine intelligently inverts diagrams, PNGs, and embedded PDFs to match dark mode themes without losing clarity (e.g., removing white backgrounds from plots).

## 3. User Personas & Feature Sets

### 3.1 The Power Researcher (Core User)

**The "Reviewer 2" Simulator (AI Agent):**
- **Concept:** An adversarial AI agent designed to critique papers pre-submission.
- **Functionality:** Users select a persona (e.g., "Pedantic IEEE Reviewer," "Grumpy Thesis Committee Member"). The local LLM scans the text for logical fallacies, undefined acronyms, weak argumentation, and missing citations.

**Semantic Reference Graphing & "Live RAG":**
- **Concept:** Moving beyond flat bibliographies.
- **Functionality:**
    - **Visual Node Graph:** Maps citation relationships (similar to ResearchRabbit).
    - **Contextual Research Assistant (Live RAG):**
        - **Local Privacy Filter:** The editor uses a tiny local NLP model (on your CPU) to extract *generic keywords* from your paragraph (e.g., "Transformers", "context window").
        - **Anonymous Query:** It sends *only* these keywords to Semantic Scholar (not your sentence).
        - **Traffic:** To Semantic Scholar, you look like a user searching for "Transformers", not someone writing a specific paper.
        - **Option 2 (Air-Gapped RAG):**
            - *Strict Privacy:* You can turn off the API entirely.
            - *The Brain:* We use a **Local SLM (Small Language Model)** like Gemma 2B or Llama 3 8B running purely on your CPU/NPU.
            - *Source:* The RAG engine will *only* search your local **Zotero Library** or a designated folder of PDFs on your hard drive.
            - *Trade-off:* You won't discover *new* papers from the internet, but you will find connections *within* the papers you already own (Zero network traffic).
            - *Trade-off:* You won't discover *new* papers from the internet, but you will find connections *within* the papers you already own (Zero network traffic).
        - **Local RAG:** It downloads abstracts to the local machine, vectorizes them on-the-fly, and offers "Ghost Completions" or sidebar suggestions with real citations.
        - **But is it powerful enough? (The Two-Tier Strategy):**
            - **Tier 1 (Local - Free):** A 7B model (Llama/Gemma) is "dumb" at creative writing but *expert* at "Editing" (Grammar, Rephrase, Find Citation). It's perfect for the loop of writing.
                - *Installation:* **One-Click Download**. On first run, Underoot asks "Download Privacy Core (4GB)?". It runs in the background. No Python/Conda knowledge needed.
            - **Tier 2 (Cloud Burst - Paid):** If you need a "Reasoning Engine" (e.g., "Critique my entire logic flow"), local isn't enough. That's when you hit the "Cloud Burst" button to offload to a 70B+ Model (costing $0.10).

**Adaptive Document Export ("Thesis Splitter"):**
- **Concept:** Single-source publishing.
- **Functionality:** Users maintain one master file (e.g., a Thesis). The engine can "emit" specific chapters as standalone conference papers (e.g., "Export Chapter 4 as IEEE Conference Paper"), automatically stripping thesis formatting while preserving citation integrity.

**Reproducible "Smart Figures":**
- **Concept:** Code-driven graphics.
- **Functionality:** Instead of pasting static PNGs, users write Python/R code blocks directly in the editor. Figures are generated at compile time; updating the underlying CSV automatically updates the graph in the final PDF.

### 3.2 The Developer & Hacker

**Typst Mode (The Speed Layer):**
- **Concept:** Modern syntax for rapid drafting.
- **Functionality:** Users draft in Typst (a Rust-based, high-speed LaTeX alternative) for velocity. Underoot handles the "Transpilation" to standard LaTeX for final submission, satisfying conference requirements while improving the drafting experience.

**Native Keybinding Integration ("God Mode"):**
- **Concept:** True environment emulation.
- **Functionality:** Rather than emulating Vim/Emacs, Underoot bridges to the user's local configuration. It utilizes existing .vimrc or Neovim configs via the local bridge.

**Visual Version Control:**
- **Concept:** Git made accessible.
- **Functionality:** A "Time Travel" UI slider allows users to scroll through the document's history. Features a visual "Blame" view to identify authorship of specific paragraphs without using the command line.

### 3.3 The Collaborative Lab (Ed-Tech)
- **P2P Collaboration:** A decentralized, peer-to-peer real-time editing engine.
    - **Speed:** Updates stream directly between peers (30-50ms latency), often faster than cloud servers.
    - **Experience:** Includes **Live Cursors**, selection highlights, and presence avatars ("Alice is typing..."), indistinguishable from Google Docs.
    - **Privacy:** Data flows directly peer-to-peer; no server sees your keystrokes.
- **Async Rich-Media Huddles:**
    - **Functionality:** Users can select text and leave 30-second video or audio annotations (e.g., "This equation needs correcting because... [screen drawing]"). These assets are stored within the project's P2P folder structure.
- **"Lab Bench" Variables:**
    - **Functionality:** A shared global configuration file for research teams.
    - **Use Case:** If a dataset size changes ($n=500 \rightarrow n=600$), updating the central variable automatically reflects the change across all connected papers and thesis drafts within the lab.
- **PDF & Editor Collaboration:** Add functionality to highlight and comment on pdf and editor both like overleaf does.

### 3.4 Technical Risks & Trade-offs (Transparent Analysis)

> **Technical Glossary:**
> *   **STUN (Session Traversal Utilities for NAT)**: A lightweight protocol that tells your computer "User B is at IP 1.2.3.4". It connects you directly. Cost: Free.
> *   **TURN (Traversal Using Relays around NAT)**: A "middleman" server used when direct connection is blocked. Traffic goes User A -> TURN Server -> User B. Cost: Bandwidth ($).
> *   **Symmetric NAT**: The specific firewall configuration used by universities (Eduroam) that blocks direct P2P connections, forcing us to use TURN.

**Risk 1: The "Offline Peer" Problem**
- *Misconception*: "If the owner goes offline, I get locked out."
- *Reality*: **No.** Use *do* have your own full local copy (Local-First). You can keep writing forever.
- *The Risk*: You cannot *receive updates* from the owner until they return.
- *Mitigation 1 (Real-Time)*: **Mesh Networking**. If Collaborator A and B are both online, they sync directly.
- *Mitigation 2 (Async)*: **"Magic Git" Relay**.
    - Underoot can silently "push" encrypted updates to a dummy Git repo (GitHub/GitLab) in the background.
    - When your partner wakes up, they "pull" from this repo automatically.
    - *Result*: You get async collaboration (Time Zones) without needing a central "Underoot Server". You just use the Git infrastructure you already have.

**Risk 2: Initial Connection Speed (NAT Traversal)**
- *Challenge*: Connecting two laptops behind strict university firewalls is hard.
- *Mitigation*: We use standard STUN servers (free) for 90% of cases. For strict firewalls, we fall back to a low-bandwidth TURN relay (cost), but data remains end-to-end encrypted.

**Risk 3: Conflict Resolution**
- *Comparison*: Overleaf uses "Operational Transformation" (Centralized). Underoot uses **Yjs CRDTs** (Decentralized).
- *Downside (Interleaved Text)*: If User A types "ABCD" and User B types "1234" at the exact same nanosecond in the same spot, a remote peer might see "A1B2C3D4" (mixing them up). This is theoretically possible but practically rare with modern CRDTs like Yjs.
- *Benefit*: CRDTs never "lock" the document or show "Connection Lost" errors; they always merge eventually.

### 3.5 Security vs. Comfort: The Trade-off Matrix

We are **upgrading Security** while **redefining Comfort**.

| Dimension | Overleaf (Centralized) | Underoot (P2P) | Analysis |
| :--- | :--- | :--- | :--- |
| **Data Security** | **Vulnerable**. A hack on Overleaf exposes everyone's papers. | **Fortress**. Data is End-to-End Encrypted (E2EE). Only you and your peer hold the keys. | **Underoot Wins** (Zero Trust Architecture). |
| **Availability (Comfort)** | **High**. Doc is always there, even if owner is asleep. | **Variable**. Owner must be online (or use Lab Bench Node/Cloud Burst). | **Overleaf Wins** (Convenience). |
| **Speed (Comfort)** | **Medium**. Typing lags (server RTT). | **Instant**. Typing is local (0ms). | **Underoot Wins** (UX). |

> **The "Comfort" Compromise Mitigation**:
> To solve the "Offline Owner" issue, we offer **Underoot Cloud Burst (Hosting)**. Users can *choose* to pay $2/mo to host an encrypted "Always-On Peer" in our cloud. This brings Overleaf-level comfort without sacrificing E2EE privacy (we still can't read it).

> **Why don't Overleaf/Prism use P2P?**
> 1.  **Data Harvesting**: They *need* your data on their servers to train their next model (Prism) or sell "Enterprise" licenses (Overleaf). P2P makes data harvesting impossible.
> 2.  **Engineering Simplicity**: Centralized servers (Operational Transformation) are easier to build than decentralized CRDTs. They chose the "easy" path; we chose the "private" path.

## 4. Services & Revenue Model

**Philosophy:** Underoot is open-source and local-first. Monetization focuses on "Convenience" and "Compute," avoiding feature gatekeeping.

### 4.1 Underoot Cloud Burst
- **Problem:** Compiling massive documents (200+ page theses with high-res medical imaging) or running 70B parameter local LLMs is taxing on consumer hardware.
- **Service:** Offload compilation and AI inference to Underoot’s cloud infrastructure for a micropayment (e.g., $0.10/task).

### 4.2 Verified Template Marketplace
- **Problem:** Public repositories (like Overleaf gallery) are often plagued by broken or deprecated templates.
- **Service:** A curated store where universities and conferences release "Verified" templates (e.g., "Official IIT Bombay Thesis Template – Verified 2026").

### 4.3 Underoot.pub (Pre-Print Hosting)
- **Problem:** PDFs are not mobile-friendly.
- **Service:** One-click publishing to a responsive HTML5 web view. This transforms static papers into interactive web pages with zoomable graphs and mobile readability, ideal for sharing on social media (LinkedIn/X) prior to official publication.

### 4.4 Human-in-the-Loop Marketplace
- **Service:** Integrated access to professional proofreading and editing services for final polish.
