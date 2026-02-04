---
description: Run local build with separate terminals for watch and launch
---

This workflow starts the development environment by running the watch process and the launch command in separate terminals.

# Steps

1.  **Start Watch Process**
    Open a terminal and run the watch command to compile changes in real-time.
    ```bash
    npm run watch
    ```

2.  **Launch Application**
    Open a **new, separate terminal** (wait for the previous command to finish) and launch the application.
    *   **On macOS/Linux:**
        ```bash
        ./code.sh
        ```
    *   **On Windows:**
        ```bash
        .\code.bat
        ```

> **Note to Agent:** When executing this, use `run_command` twice. The first one for `npm run watch` should have a small `WaitMsBeforeAsync` (e.g., 2000ms) so it runs in the background. Then immediately run the second command in a new API call (which naturally simulates a new process).