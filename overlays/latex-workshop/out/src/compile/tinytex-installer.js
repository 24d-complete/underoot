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
exports.promptInstallTinyTeX = promptInstallTinyTeX;
exports.installTinyTeX = installTinyTeX;
const vscode = __importStar(require("vscode"));
const child_process = __importStar(require("child_process"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const lw_1 = require("../lw");
const tex_environment_1 = require("./tex-environment");

const logger = lw_1.lw.log('Underoot', 'TinyTexInstaller');

async function promptInstallTinyTeX(extensionContext) {
    if (extensionContext?.globalState?.get('underoot.texEnvironment.dismissed')) return;
    const selection = await vscode.window.showInformationMessage(
        "No LaTeX engine detected. Install TinyTeX (~150MB) to get started?",
        "Install", "Configure Manually", "Dismiss"
    );
    if (selection === "Install") await installTinyTeX();
    else if (selection === "Dismiss") extensionContext?.globalState?.update('underoot.texEnvironment.dismissed', true);
}

async function installTinyTeX() {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Installing TinyTeX",
        cancellable: false
    }, async (progress) => {
        progress.report({ message: "Downloading installer..." });
        const installDir = (process.platform === 'win32')
            ? path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'TinyTeX')
            : (process.platform === 'darwin')
                ? path.join(os.homedir(), 'Library', 'TinyTeX')
                : path.join(os.homedir(), '.TinyTeX');

        if (fs.existsSync(installDir)) try { fs.rmSync(installDir, { recursive: true, force: true }); } catch { }

        const installScript = process.platform === 'win32' ? 'install-bin-windows.bat' : 'install-unx.sh';
        const url = `https://yihui.org/tinytex/${installScript}`;
        const scriptPath = path.join(os.tmpdir(), installScript);

        const downloadCmd = process.platform === 'win32' ? `powershell -Command "Invoke-WebRequest -Uri ${url} -OutFile ${scriptPath}"` : `curl -L ${url} -o ${scriptPath}`;
        child_process.execSync(downloadCmd);

        progress.report({ message: "Running installer (this may take a few minutes)..." });
        const execCmd = process.platform === 'win32' ? scriptPath : `sh ${scriptPath}`;
        child_process.execSync(execCmd);

        progress.report({ message: "Wrapping up..." });
        (0, tex_environment_1.ensureTexInPath)();
        vscode.window.showInformationMessage("TinyTeX installed successfully! You can now build LaTeX documents.");
    });
}
