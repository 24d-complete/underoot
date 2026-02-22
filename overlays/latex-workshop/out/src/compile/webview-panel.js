const vscode = require('vscode');
const lw_1 = require('../lw');

const logger = lw_1.lw.log('Underoot', 'WebviewPanel');
let currentPanel = null;
let configChangeDisposable = null;

function show(extensionContext) {
    if (currentPanel) { currentPanel.reveal(); sendCurrentState(); return; }
    currentPanel = vscode.window.createWebviewPanel(
        'latexManager', 'LaTeX Manager', vscode.ViewColumn.One,
        { enableScripts: true, retainContextWhenHidden: true }
    );
    currentPanel.webview.html = getHtmlForWebview();
    currentPanel.webview.onDidReceiveMessage(async (m) => {
        const config = vscode.workspace.getConfiguration('latex-workshop');
        switch (m.command) {
            case 'ready': await sendCurrentState(); break;
            case 'setRecipeDefault': await config.update('latex.recipe.default', m.value, true); break;
            case 'setAutoClean': await config.update('latex.autoClean.run', m.value, true); break;
            case 'setAutoDownloader': extensionContext.globalState.update('underoot.autoDownloader', m.value); break;
            case 'checkUpdates': {
                postMessage({ command: 'updateStatus', phase: 'running' });
                const proc = lw_1.lw.external.spawn('tlmgr', ['update', '--self', '--all'], { env: process.env });
                proc.stdout?.on('data', d => postMessage({ command: 'updateLog', text: d.toString() }));
                proc.stderr?.on('data', d => postMessage({ command: 'updateLog', text: d.toString() }));
                proc.on('exit', c => postMessage({ command: 'updateStatus', phase: c === 0 ? 'done' : 'error' }));
                break;
            }
            case 'reinstallTinyTeX': {
                await require('./tinytex-installer').installTinyTeX();
                await sendCurrentState();
                break;
            }
        }
    });
    configChangeDisposable = vscode.workspace.onDidChangeConfiguration(ev => {
        if (ev.affectsConfiguration('latex-workshop')) sendCurrentState();
    });
    currentPanel.onDidDispose(() => { currentPanel = null; configChangeDisposable?.dispose(); });
}

function postMessage(m) { if (currentPanel) currentPanel.webview.postMessage(m); }

async function sendCurrentState() {
    const config = vscode.workspace.getConfiguration('latex-workshop');
    let texEnvInfo = { texDistro: 'unknown', binPath: null, hasLatexmk: false, hasPdflatex: false, hasXelatex: false, hasLualatex: false, hasTlmgr: false };
    try { texEnvInfo = await require('./tex-environment').detectTexEnvironment(); } catch { }
    postMessage({
        command: 'setState',
        recipes: config.get('latex.recipes', []).map(r => ({ name: r.name, tools: Array.isArray(r.tools) ? r.tools.join(' → ') : String(r.tools) })),
        recipeDefault: config.get('latex.recipe.default', 'first'),
        autoClean: config.get('latex.autoClean.run', 'never'),
        texDistro: texEnvInfo.texDistro,
        binPath: texEnvInfo.binPath,
        hasLatexmk: texEnvInfo.hasLatexmk,
        hasPdflatex: texEnvInfo.hasPdflatex,
        hasXelatex: texEnvInfo.hasXelatex,
        hasLualatex: texEnvInfo.hasLualatex,
        hasTlmgr: texEnvInfo.hasTlmgr,
    });
}

function getHtmlForWebview() {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>
    *, *::before, *::after { box-sizing: border-box; }

    body {
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size);
        color: var(--vscode-foreground);
        background: var(--vscode-editor-background);
        display: flex;
        height: 100vh;
        margin: 0;
        overflow: hidden;
    }

    /* ── Sidebar ─────────────────────────────────────────────────── */
    nav {
        width: 220px;
        min-width: 220px;
        background: var(--vscode-sideBar-background);
        border-right: 1px solid var(--vscode-panel-border);
        display: flex;
        flex-direction: column;
        padding: 8px 0;
        overflow-y: auto;
    }

    .nav-group-label {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--vscode-sideBarSectionHeader-foreground, var(--vscode-foreground));
        opacity: 0.7;
        padding: 12px 16px 4px 16px;
    }

    .nav-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 16px;
        cursor: pointer;
        font-size: 13px;
        color: var(--vscode-sideBar-foreground, var(--vscode-foreground));
        user-select: none;
    }

    .nav-item:hover {
        background: var(--vscode-list-hoverBackground);
    }

    .nav-item.active {
        background: var(--vscode-list-activeSelectionBackground);
        color: var(--vscode-list-activeSelectionForeground);
    }

    .nav-item .nav-icon {
        font-size: 15px;
        opacity: 0.85;
        width: 16px;
        text-align: center;
    }

    /* ── Main Content ─────────────────────────────────────────────── */
    main {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
    }

    .section { display: none; }
    .section.active { display: flex; flex-direction: column; height: 100%; }

    .section-header {
        padding: 16px 28px 12px 28px;
        border-bottom: 1px solid var(--vscode-panel-border);
        background: var(--vscode-editor-background);
    }

    .section-header h1 {
        font-size: 16px;
        font-weight: 600;
        margin: 0 0 2px 0;
        color: var(--vscode-foreground);
    }

    .section-header p {
        font-size: 12px;
        margin: 0;
        color: var(--vscode-descriptionForeground);
    }

    .section-body {
        padding: 0 0 32px 0;
        flex: 1;
        overflow-y: auto;
    }

    /* ── Setting rows (like VS Code settings editor) ─────────────── */
    .settings-group-title {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--vscode-settings-headerForeground, var(--vscode-foreground));
        opacity: 0.7;
        padding: 18px 28px 6px 28px;
    }

    .setting-row {
        display: flex;
        align-items: flex-start;
        gap: 24px;
        padding: 12px 28px;
        border-bottom: 1px solid var(--vscode-settings-rowHoverBackground, transparent);
    }

    .setting-row:hover {
        background: var(--vscode-settings-rowHoverBackground, var(--vscode-list-hoverBackground));
    }

    .setting-info {
        flex: 1 1 0;
        min-width: 200px;
    }

    .setting-title {
        font-size: 13px;
        font-weight: 500;
        color: var(--vscode-foreground);
        margin-bottom: 3px;
    }

    .setting-desc {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        line-height: 1.5;
    }

    .setting-control {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        gap: 6px;
        padding-top: 2px;
    }

    select {
        background: var(--vscode-settings-dropdownBackground);
        color: var(--vscode-settings-dropdownForeground);
        border: 1px solid var(--vscode-settings-dropdownBorder);
        padding: 3px 24px 3px 8px;
        font-family: var(--vscode-font-family);
        font-size: 13px;
        width: 180px;
        max-width: 200px;
        outline: none;
        appearance: auto;
        cursor: pointer;
    }

    select:focus {
        border-color: var(--vscode-focusBorder);
        outline: 1px solid var(--vscode-focusBorder);
        outline-offset: -1px;
    }

    /* ── Buttons ─────────────────────────────────────────────────── */
    .btn {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 12px;
        font-family: var(--vscode-font-family);
        font-size: 13px;
        color: var(--vscode-button-foreground);
        background: var(--vscode-button-background);
        border: 1px solid transparent;
        cursor: pointer;
        text-align: center;
        white-space: nowrap;
    }

    .btn:hover { background: var(--vscode-button-hoverBackground); }
    .btn:focus { outline: 1px solid var(--vscode-focusBorder); outline-offset: -1px; }

    .btn-secondary {
        color: var(--vscode-button-secondaryForeground);
        background: var(--vscode-button-secondaryBackground);
        border-color: var(--vscode-button-secondaryBackground);
    }
    .btn-secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }

    .btn-danger {
        color: var(--vscode-inputValidation-errorForeground, var(--vscode-button-foreground));
        background: var(--vscode-inputValidation-errorBackground, #be1100);
        border-color: transparent;
    }

    /* ── Status / Distribution Cards ─────────────────────────────── */
    .distro-card {
        margin: 16px 28px;
        padding: 16px;
        background: var(--vscode-settings-checkboxBackground, var(--vscode-editorWidget-background));
        border: 1px solid var(--vscode-panel-border);
    }

    .distro-name {
        font-size: 15px;
        font-weight: 600;
        margin-bottom: 4px;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .distro-path {
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
        font-family: var(--vscode-editor-font-family, monospace);
        word-break: break-all;
        margin-top: 4px;
        margin-bottom: 12px;
    }

    .tool-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
    }

    .badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        padding: 2px 8px;
        border: 1px solid var(--vscode-panel-border);
        color: var(--vscode-foreground);
        background: var(--vscode-editor-background);
    }

    .badge.ok {
        border-color: var(--vscode-testing-iconPassed, #4a9c5d);
        color: var(--vscode-testing-iconPassed, #4a9c5d);
    }

    .badge.missing {
        border-color: var(--vscode-testing-iconFailed, #c94c4c);
        color: var(--vscode-testing-iconFailed, #c94c4c);
        opacity: 0.7;
    }

    .distro-actions {
        display: flex;
        gap: 8px;
        margin-top: 14px;
        padding-top: 14px;
        border-top: 1px solid var(--vscode-panel-border);
    }

    /* ── Log terminal ─────────────────────────────────────────────── */
    .log-area {
        margin: 0 28px 20px 28px;
        border: 1px solid var(--vscode-panel-border);
        display: none;
        flex-direction: column;
    }

    .log-title-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 4px 10px;
        background: var(--vscode-terminal-background, var(--vscode-editorWidget-background));
        border-bottom: 1px solid var(--vscode-panel-border);
        font-size: 11px;
        color: var(--vscode-terminal-foreground, var(--vscode-foreground));
    }

    .log-content {
        font-family: var(--vscode-editor-font-family, 'Cascadia Code', 'Courier New', monospace);
        font-size: 12px;
        color: var(--vscode-terminal-foreground, #ccc);
        background: var(--vscode-terminal-background, #1e1e1e);
        padding: 10px 12px;
        max-height: 220px;
        overflow-y: auto;
        white-space: pre-wrap;
        word-break: break-word;
        line-height: 1.5;
    }

    #updateSpinner {
        display: none;
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        margin-left: 4px;
    }

    /* ── Recipe list ─────────────────────────────────────────────── */
    .recipe-list {
        margin: 0 28px;
        border: 1px solid var(--vscode-panel-border);
    }

    .recipe-row {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        border-bottom: 1px solid var(--vscode-panel-border);
        gap: 10px;
        font-size: 12px;
    }
    .recipe-row:last-child { border-bottom: none; }

    .recipe-row.is-default {
        background: var(--vscode-list-activeSelectionBackground);
        color: var(--vscode-list-activeSelectionForeground);
    }

    .recipe-name {
        font-weight: 500;
        flex: 0 0 auto;
        min-width: 140px;
    }

    .recipe-tools {
        color: var(--vscode-descriptionForeground);
        font-family: var(--vscode-editor-font-family, monospace);
        font-size: 11px;
        flex: 1;
    }

    .recipe-row.is-default .recipe-tools {
        color: var(--vscode-list-activeSelectionForeground);
        opacity: 0.85;
    }

    .tag-default {
        font-size: 10px;
        padding: 1px 6px;
        border: 1px solid currentColor;
        opacity: 0.8;
        flex-shrink: 0;
    }
</style>
</head>
<body>

<nav>
    <div class="nav-group-label">LaTeX Manager</div>
    <div class="nav-item active" data-tab="engines">
        <span class="nav-icon">⚙</span> Engines &amp; Recipes
    </div>
    <div class="nav-item" data-tab="distro">
        <span class="nav-icon">⬡</span> Distribution
    </div>
    <div class="nav-item" data-tab="packages">
        <span class="nav-icon">⬇</span> Packages
    </div>
</nav>

<main>
    <!-- ── Engines Tab ────────────────────────────────────────── -->
    <section id="engines" class="section active">
        <div class="section-header">
            <h1>Engines &amp; Recipes</h1>
            <p>Configure the default recipe used to compile your LaTeX documents.</p>
        </div>
        <div class="section-body">
            <div class="settings-group-title">Build Settings</div>

            <div class="setting-row">
                <div class="setting-info">
                    <div class="setting-title">Default Recipe</div>
                    <div class="setting-desc">The recipe LaTeX Workshop uses when building. Choose "First" to always use the first recipe in your list.</div>
                </div>
                <div class="setting-control">
                    <select id="recipeSelect">
                        <option value="first">⊙ First Recipe</option>
                        <option value="lastUsed">↺ Last Used</option>
                    </select>
                </div>
            </div>

            <div class="setting-row">
                <div class="setting-info">
                    <div class="setting-title">Auto Clean</div>
                    <div class="setting-desc">Automatically remove auxiliary files (.aux, .log, etc.) after a build.</div>
                </div>
                <div class="setting-control">
                    <select id="cleanSelect">
                        <option value="never">Never</option>
                        <option value="onFailed">On Failed</option>
                        <option value="onBuilt">On Built</option>
                    </select>
                </div>
            </div>

            <div class="settings-group-title">Configured Recipes</div>
            <div id="recipeList" class="recipe-list">
                <div class="recipe-row" style="color: var(--vscode-descriptionForeground); font-style: italic;">Loading recipes...</div>
            </div>
        </div>
    </section>

    <!-- ── Distribution Tab ───────────────────────────────────── -->
    <section id="distro" class="section">
        <div class="section-header">
            <h1>Distribution</h1>
            <p>View and manage your TeX distribution (TinyTeX, TeX Live, MiKTeX).</p>
        </div>
        <div class="section-body">
            <div id="distroCard" class="distro-card">
                <div class="distro-name" id="distroName">Detecting...</div>
                <div class="distro-path" id="distroPath">—</div>
                <div class="tool-badges" id="toolBadges"></div>
                <div class="distro-actions">
                    <button class="btn" id="updateBtn">↑ Update All (tlmgr)</button>
                    <button class="btn btn-secondary" id="reinstallBtn">↺ Reinstall TinyTeX</button>
                    <span id="updateSpinner">Running...</span>
                </div>
            </div>
            <div id="updateLogArea" class="log-area">
                <div class="log-title-bar">
                    <span>tlmgr output</span>
                    <span id="logStatus"></span>
                </div>
                <div id="updateLog" class="log-content"></div>
            </div>
        </div>
    </section>

    <!-- ── Packages Tab ───────────────────────────────────────── -->
    <section id="packages" class="section">
        <div class="section-header">
            <h1>Package Auto-Downloader</h1>
            <p>Underoot can automatically detect and install missing LaTeX packages before each build.</p>
        </div>
        <div class="section-body">
            <div class="settings-group-title">Behavior</div>
            <div class="setting-row">
                <div class="setting-info">
                    <div class="setting-title">Auto-Install Missing Packages</div>
                    <div class="setting-desc">When enabled, Underoot scans your .tex file for <code>\\usepackage</code> calls and installs any missing packages via <code>tlmgr</code> before compilation starts. Transitive dependencies (from document classes) are also caught and installed automatically on build failure.</div>
                </div>
                <div class="setting-control">
                    <select id="autoDownloaderSelect">
                        <option value="enabled">Enabled</option>
                        <option value="disabled">Disabled</option>
                    </select>
                </div>
            </div>
        </div>
    </section>
</main>

<script>
const vscode = acquireVsCodeApi();

// ── Tab navigation ────────────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        item.classList.add('active');
        document.getElementById(item.dataset.tab).classList.add('active');
    });
});

// ── Message handling ─────────────────────────────────────────────────
window.addEventListener('message', e => {
    const m = e.data;

    if (m.command === 'setState') {
        // -- Engines tab --
        const sel = document.getElementById('recipeSelect');
        const prev = sel.value;
        // keep first two static options
        while (sel.options.length > 2) sel.remove(2);
        m.recipes.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r.name;
            opt.textContent = r.name;
            sel.appendChild(opt);
        });
        sel.value = m.recipeDefault || 'first';
        if (!sel.value) sel.value = 'first';

        document.getElementById('cleanSelect').value = m.autoClean || 'never';

        // recipe list
        const list = document.getElementById('recipeList');
        if (m.recipes.length === 0) {
            list.innerHTML = '<div class="recipe-row" style="color:var(--vscode-descriptionForeground);font-style:italic;">No recipes configured</div>';
        } else {
            list.innerHTML = m.recipes.map(r => {
                const isDefault = m.recipeDefault === r.name ||
                    (m.recipeDefault === 'first' && m.recipes.indexOf(r) === 0);
                return \`<div class="recipe-row \${isDefault ? 'is-default' : ''}">
                    <span class="recipe-name">\${r.name}</span>
                    <span class="recipe-tools">\${r.tools}</span>
                    \${isDefault ? '<span class="tag-default">active</span>' : ''}
                </div>\`;
            }).join('');
        }

        // -- Distribution tab --
        const distroLabels = { tinytex: 'TinyTeX', texlive: 'TeX Live', miktex: 'MiKTeX', none: 'No Distribution Detected', unknown: 'Unknown' };
        document.getElementById('distroName').textContent = distroLabels[m.texDistro] || m.texDistro;
        document.getElementById('distroPath').textContent = m.binPath || 'Path not found';

        const badges = [
            { key: 'hasLatexmk',  label: 'latexmk'  },
            { key: 'hasPdflatex', label: 'pdflatex'  },
            { key: 'hasXelatex',  label: 'xelatex'   },
            { key: 'hasLualatex', label: 'lualatex'  },
            { key: 'hasTlmgr',    label: 'tlmgr'     },
        ];
        document.getElementById('toolBadges').innerHTML = badges.map(b =>
            \`<span class="badge \${m[b.key] ? 'ok' : 'missing'}">\${m[b.key] ? '✔' : '✖'} \${b.label}</span>\`
        ).join('');
    }

    if (m.command === 'updateLog') {
        const logArea = document.getElementById('updateLogArea');
        const log = document.getElementById('updateLog');
        logArea.style.display = 'flex';
        log.textContent += m.text;
        log.scrollTop = log.scrollHeight;
    }

    if (m.command === 'updateStatus') {
        const spinner = document.getElementById('updateSpinner');
        const statusEl = document.getElementById('logStatus');
        if (m.phase === 'running') {
            spinner.style.display = 'inline';
            statusEl.textContent = 'Updating...';
        } else {
            spinner.style.display = 'none';
            statusEl.textContent = m.phase === 'done' ? '✔ Done' : '✖ Error';
        }
    }
});

// ── Controls ──────────────────────────────────────────────────────────
document.getElementById('recipeSelect').addEventListener('change', e =>
    vscode.postMessage({ command: 'setRecipeDefault', value: e.target.value }));

document.getElementById('cleanSelect').addEventListener('change', e =>
    vscode.postMessage({ command: 'setAutoClean', value: e.target.value }));

document.getElementById('autoDownloaderSelect').addEventListener('change', e =>
    vscode.postMessage({ command: 'setAutoDownloader', value: e.target.value }));

document.getElementById('updateBtn').addEventListener('click', () => {
    document.getElementById('updateLog').textContent = '';
    document.getElementById('updateLogArea').style.display = 'none';
    vscode.postMessage({ command: 'checkUpdates' });
});

document.getElementById('reinstallBtn').addEventListener('click', () =>
    vscode.postMessage({ command: 'reinstallTinyTeX' }));

vscode.postMessage({ command: 'ready' });
</script>
</body>
</html>`;
}

module.exports = { show };
