---
description: Add documentation entry to history.md
---

This workflow helps you quickly add a new entry to the `concepts/dev_changes/history.md` file.

# Steps

1.  **Identify Changes**
    Explain what you want to document (e.g., "Added new feature X", "Fixed bug Y").

2.  **Read History File**
    Read `/Users/akhilhothi/Documents/underoot/concepts/dev_changes/history.md` to see the current state.

3.  **Append Entry**
    Add a new bullet point under the appropriate section (or create a new section if needed) describing the change. ensuring you follow the existing format.

    *   **Format:**
        ```markdown
        - **`CommitHash` (Optional)**: Description of change.
        ```
    *   If you don't have a commit hash, just use a bolded title or date.

4.  **Confirm**
    Show the user the diff or the updated file content.
