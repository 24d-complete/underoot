# Underoot Economic Analysis: Micro & Macro

This document outlines the economic framework for Underoot, balancing its open-source, local-first philosophy with sustainable revenue generation.

## 1. Executive Summary

Underoot's economic model differs from traditional SaaS (Subscription as a Service). Instead of gatekeeping features behind a monthly subscription (rent-seeking), Underoot monetizes **convenience, compute, and connectivity**.

*   **Core Logic**: Since the core product is a local executable (Electron/Browser-Desktop Bridge), the baseline cost is near zero.
*   **Revenue Driver**: Services that require cloud resources (AI, Compilation offloading) or transaction facilitation (Marketplace).

---

## 2. Micro Economics (Unit Economics)

### 2.1 Cost Structure (Per User)

Since the core product is a local executable (Electron/Browser-Desktop Bridge), the baseline cost is low but not zero.

| Cost Item | Description | Estimated Monthly Cost (Active Free User) |
| :--- | :--- | :--- |
| **Compute/Hosting** | User uses own hardware. | $0.00 |
| **Updates (CDN)** | Bandwidth for Electron updates (75MB x 1/mo @ $0.05/GB). | ~ $0.004 |
| **RAG Context Engine** | Semantic Scholar API (Free) + Local Embedding (User CPU). | $0.00 |
| **Signaling Server** | Minimal WebSocket server for P2P collab handshakes. | < $0.001 |
| **Telemetry/Auth** | Basic usage stats & auth (e.g., Supabase/Firebase). | < $0.005 |
| **Total Baseline Cost** | | **~ $0.01 / user / month** |

**Hidden Infrastructure Costs**:
*   **Domain & DNS**: ~$20/year.
*   **Update Server**: Using GitHub Releases (Free) or S3+CloudFront for scale.
*   **Signaling Server**: ~$10/mo VPS for initial scale (handling thousands of concurrent socket connections).

**Implication**: We can sustain millions of free users with minimal capital, unlike Overleaf which pays for containerized compilation environments for every active session.

### 2.2 Revenue Streams & Unit Profitability

#### A. Hybrid AI Strategy (Gemini 2.5 Flash-Lite)
*   **Pivot**: Instead of purely local LLMs (which require high RAM), we default to **Gemini 2.5 Flash-Lite** via Google Cloud Vertex AI with **Zero Data Retention (ZDR)** enabled.
*   **The "Privacy-First Wrapper"**: unlike using ChatGPT/Prism directly, Underoot acts as a firewall. We continually flush the context and opt-out of training data usage.
*   **Unit Calculation**:
    *   **Cost**: ~$0.10 per 1 Million Tokens (Input).
    *   **Avg User Load**: ~100k tokens/month (Drafting mode).
    *   **Cost per User**: **$0.01 / month**.
    *   **Strategy**: Subsidize this cost for all users. It is cheaper to pay $0.01/user than to lose them to Prism.

#### B. Verified Template Marketplace (Growth Lever)
*   **Strategy**: "Official High-Quality Templates" (Universities, Journals) provided for **Free**.
*   **Economic Impact**:
    *   **User Acquisition**: High quality, free templates lower the barrier to entry, driving user growth.
    *   **CAC Reduction**: "Come for the templates, stay for the editor."
    *   **Direct Revenue**: $0.00 (Loss Leader strategy to build Network Effects).


---

### 2.3 Customer Acquisition Cost (CAC) Analysis

Underoot operates on a **Product-Led Growth (PLG)** model, targeting a near-zero CAC.

| Channel | Cost Strategy | Estimated CAC |
| :--- | :--- | :--- |
| **Viral Loop (The Lab Effect)** | A Professor adopting Underoot forces the whole lab to switch. | $0.00 |
| **SEO (Underoot.pub)** | Papers hosted on Underoot.pub index high on Google, driving traffic back to the editor. | < $0.05 (Server costs) |
| **Direct Sales** | None. No sales team. | $0.00 |
| **Blended CAC** | **Average across all users** | **~ $0.01 - $0.02** |

**Why is CAC so low?**
1.  **Frustration-Based Migration (Validated)**:
    *   **The "Timeout" Problem**: Free Overleaf users face a ~10-second compile timeout. Research (Reddit, StackExchange) shows frequent complaints about timeouts on large theses or complex TikZ diagrams.
    *   **Pricing Sensitivity**: At ~$21/month (Standard), students often seek free alternatives like VS Code + LaTeX Workshop. Underoot offers this "Pro" power for free.
    *   *Search Trend*: "Overleaf alternatives" is an actively searched keyword cluster, indicating a ready-to-switch audience.

2.  **Institutional Adoption (High Friction, High Reward)**:
    *   *Reality Check*: Direct partnerships are hard B2B sales cycles (6-18 months).
    *   *Strategy*: Instead of selling "seats" (top-down), we target the "official template" list (bottom-up). If a department chair lists an Underoot template as "Recommended", we gain an entire cohort for free. This is a content strategy, not a sales strategy.

---

## 3. Macro Economics (Market Dynamics)

### 3.1 Total Addressable Market (TAM)

*   **Segment 1: Academic Researchers**: ~100 Million worldwide (approx).
*   **Segment 2: STEM Students**: ~200 Million.
*   **Segment 3: Technical Writers/Developers**: ~50 Million.
*   **Total Users**: ~350 Million potential seats.

**Serviceable Obtainable Market (SOM)**:
*   Focus on "Frustrated Overleaf Users" and "VS Code LaTeX users".
*   Estimate: 5% of TAM = **17.5 Million Users**.

### 3.2 Network Effects & Moats

1.  **The "Lab Bench" Viral Loop**:
    *   One PI (Principal Investigator) sets up a "Lab Bench" config (shared variables, bibliography).
    *   Requires all PhD students in the lab to adopt Underoot for compatibility.
    *   **K-factor > 1**: High viral coefficient within academic clusters.

2.  **Two-Sided Marketplace (Templates)**:
    *   **Free, Verified Templates**: Solves the "broken template" issue on other platforms.
    *   **Standardization**: Journals and Universities officially support Underoot templates because they generate perfect output, driving institutional adoption.
    *   *Moat*: High-quality, free content creates a high barrier for competitors to replicate without significant investment.

3.  **The "Live RAG" Data Moat**:
    *   By indexing Open Access papers (Semantic Scholar) *locally* on the user's machine, we build a specialized "Research Vector Store" that is private to the user.
    *   Prism cannot offer this without ingesting your private data into their cloud index.
    *   *Result*: "The more you write, the smarter your local assistant gets."

4.  **Data Gravity (Underoot.pub)**:
    *   Publishing interactive HTML5 pre-prints creates a lock-in.
    *   If a paper is hosted on `underoot.pub` with interactive graphs, shifting to a static PDF workflow feels like a downgrade.

### 3.3 Competitive Advantage (The "Post-Prism" Landscape)

With the release of **OpenAI Prism (Jan 2026)**, the market has shifted. Prism commoditizes "AI in the Cloud." Underoot's moat shifts strictly to **Data Sovereignty**.

| Feature | Overleaf (Legacy) | OpenAI Prism (New Threat) | Underoot (Our Niche) |
| :--- | :--- | :--- | :--- |
| **Architecture** | Cloud (Centralized) | Cloud (Centralized) | **Local-First (Decentralized)** |
| **Privacy** | Medium | **Low** (Training Data risk) | **High** (Gemini ZDR / Local) |
| **Cost** | High ($$) | Free (Data farming) | **Free** (Subsidized by services) |
| **Offline** | No | No | **Yes** |
| **Primary User** | Collab Teams | General AI users | **Privacy-Conscious / Power Users** |

**The "Anti-Prism" Positioning**:
*   "Don't let OpenAI train on your unpublished breakthrough."
*   **Gemini 2.5 Hybrid**: We provide the same intelligence level as Prism but via an **enterprise-grade Zero Data Retention pipe**. Prism reads your draft to train GPT-6; Underoot deletes your data after inference.

---

## 4. Financial Projections (Napkin Math)

**Scenario: 100,000 Active Users**

1.  **AI Subsidy Cost (New Line Item)**:
    *   100,000 users * $0.01/mo (Gemini API) = **($1,000) / month**.
    
2.  **Cloud Burst Revenue (Heavy Tasks)**:
    *   (Re-focused on Compilation/Rendering only, as AI is now free/hybrid)
    *   $2,500 / month.

3.  **Verified Templates & Services**:
    *   **$0.00** (Growth).

**Total Monthly Revenue**: ~$2,500
**Total Infrastructure Cost**: ~$1,500 (Base) + $1,000 (AI Subsidy) = $2,500.
**Net Profit**: **~Breakeven ($0)**.

*Strategic Note*: We run at breakeven to block Prism's dominance, then monetize via "Enterprise/Lab Bench" licenses or higher-tier Cloud Burst features.

*Note: This model scales efficiently. For visual projections and 3-year growth charts, please refer to the automated models in [`concepts/business_logic/market_projections.py`](file:///Users/akhilhothi/Documents/underoot/concepts/business_logic/market_projections.py).*

## 5. Conclusion

Underoot's macro-economic strategy leverages **disruption of cost structure**. By pushing compute to the edge (user's machine), we eliminate the biggest cost center of competitors (Overleaf). This allows us to offer "Premium" features (like Templates) for free to drive massive user acquisition, while capturing value from **high-margin compute services** (Cloud Burst) for power users.
