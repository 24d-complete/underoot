"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function (o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function () { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function (o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function (o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function (o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function (o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initialize = initialize;
const vscode = __importStar(require("vscode"));
const lw_1 = require("../lw");

const logger = lw_1.lw.log('Underoot', 'EngineManager');
let statusBarItem;

function initialize(extensionContext) {
    logger.log('Initializing Engine Manager...');
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
    statusBarItem.command = 'underoot.selectEngine';
    statusBarItem.tooltip = 'Select LaTeX Engine';
    extensionContext.subscriptions.push(statusBarItem);

    extensionContext.subscriptions.push(vscode.commands.registerCommand('underoot.selectEngine', () => showEngineSelector()));
    extensionContext.subscriptions.push(vscode.commands.registerCommand('underoot.manageEngines', () => {
        vscode.commands.executeCommand('underoot.openLaTeXManager');
    }));
    extensionContext.subscriptions.push(vscode.commands.registerCommand('underoot.openLaTeXManager', () => {
        const webviewPanel = require('./webview-panel');
        webviewPanel.show(extensionContext);
    }));

    updateStatusBar();
    extensionContext.subscriptions.push(vscode.workspace.onDidChangeConfiguration((ev) => {
        if (ev.affectsConfiguration('latex-workshop.latex.recipe.default') || ev.affectsConfiguration('latex-workshop.latex.recipes')) {
            updateStatusBar();
        }
    }));
}

function updateStatusBar() {
    const configuration = vscode.workspace.getConfiguration('latex-workshop');
    const defaultRecipe = configuration.get('latex.recipe.default', 'first');
    const recipes = configuration.get('latex.recipes', []);
    let displayName = (defaultRecipe === 'first') ? (recipes.length > 0 ? recipes[0].name : 'No recipes') : (defaultRecipe === 'lastUsed' ? 'Last Used' : (recipes.find(r => r.name === defaultRecipe)?.name || defaultRecipe));
    statusBarItem.text = `$(gear) ${displayName}`;
    statusBarItem.show();
}

async function showEngineSelector() {
    const configuration = vscode.workspace.getConfiguration('latex-workshop');
    const recipes = configuration.get('latex.recipes', []);
    if (recipes.length === 0) return vscode.window.showWarningMessage('No LaTeX recipes configured.');

    const recipeItems = recipes.map(r => ({ label: `     ${r.name}`, recipeName: r.name }));
    const specialItems = [
        { label: '$(settings-gear) Use First Recipe', recipeName: '__first__' },
        { label: '$(history) Use Last Used Recipe', recipeName: '__lastUsed__' }
    ];
    const manageItem = { label: '$(tools) Manage Engines & Recipes...', recipeName: '__manage__' };
    const texEnvItem = { label: '$(cloud-download) Install / Update TinyTeX...', recipeName: '__installTex__' };
    const separator = { label: '', kind: vscode.QuickPickItemKind.Separator };

    const selected = await vscode.window.showQuickPick([...recipeItems, separator, ...specialItems, separator, texEnvItem, manageItem], { title: 'LaTeX Engine Manager' });
    if (!selected) return;

    if (selected.recipeName === '__manage__') return vscode.commands.executeCommand('underoot.openLaTeXManager');
    if (selected.recipeName === '__installTex__') return require('./tinytex-installer').installTinyTeX();

    const newDefault = selected.recipeName === '__first__' ? 'first' : (selected.recipeName === '__lastUsed__' ? 'lastUsed' : selected.recipeName);
    await configuration.update('latex.recipe.default', newDefault, vscode.ConfigurationTarget.Global);
}
