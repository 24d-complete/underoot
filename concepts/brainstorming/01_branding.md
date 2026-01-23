# Stage 0.1: Branding & Identity Brainstorming

## 1. Naming & Identity
*   **Current Name**: VSCodium / OSS Code
*   **New Name**: **Underoot** (Confirmed)
*   **Tagline**: *Privacy-focused, offline-capable LaTeX IDE*?

## 2. Visual Assets (Logos & Icons)
To fully rebrand, we need to replace the standard blue/codium icons.

*   **Requirements**:
    *   Windows: `.ico` (multiple sizes)
    *   macOS: `.icns`
    *   Linux: `.png`
*   **Design Concept**:
    *   Since the name is "Underoot", maybe something related to roots, earth, or a stylized 'U'?
    *   Or a connection to LaTeX (e.g., braces `{ }` combined with nature)?
    *   *Question for User*: Do you have a logo concept in mind or an image I should generate?

## 3. Technical Implementation (`product.json`)
The `product.json` file controls the branding validation.
*   **Fields to Change**:
    *   `nameShort`: "Underoot"
    *   `nameLong`: "Underoot IDE"?
    *   `applicationName`: "underoot"
    *   `win32MutexName`: "underoot"
    *   `dataFolderName`: ".underoot" (This impacts where user data is stored. Important for portability!)

## 4. UI Text
*   Scanning the codebase for "Visual Studio Code", "VSCodium", "OSS" and replacing where appropriate.
*   *Note*: Some references might need to stay for compatibility, but user-facing text should change.
