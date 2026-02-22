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
exports.detectTexEnvironment = detectTexEnvironment;
exports.getTinyTexBinPath = getTinyTexBinPath;
exports.ensureTexInPath = ensureTexInPath;
const child_process = __importStar(require("child_process"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const lw_1 = require("../lw");

const logger = lw_1.lw.log('Underoot', 'TexEnvironment');

function getTinyTexBinPath() {
    if (process.platform === 'win32') {
        const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
        return path.join(appData, 'TinyTeX', 'bin', 'windows');
    } else if (process.platform === 'darwin') {
        return path.join(os.homedir(), 'Library', 'TinyTeX', 'bin', 'universal-darwin');
    } else {
        return path.join(os.homedir(), '.TinyTeX', 'bin', 'x86_64-linux');
    }
}

function isCommandAvailable(command) {
    try {
        const cmd = process.platform === 'win32' ? 'where' : 'which';
        child_process.execSync(`${cmd} ${command}`, { stdio: 'pipe', timeout: 5000 });
        return true;
    } catch {
        return false;
    }
}

function getCommandVersion(command) {
    try {
        const result = child_process.execSync(`${command} --version`, {
            stdio: 'pipe',
            timeout: 10000,
            encoding: 'utf-8'
        });
        return result.trim().split('\n')[0];
    } catch {
        return null;
    }
}

function detectTexDistro() {
    const tinyTexBinPath = getTinyTexBinPath();
    if (fs.existsSync(tinyTexBinPath)) {
        logger.log(`TinyTeX found at: ${tinyTexBinPath}`);
        return 'tinytex';
    }
    const versionStr = getCommandVersion('pdflatex');
    if (versionStr) {
        if (versionStr.includes('MiKTeX')) return 'miktex';
        if (versionStr.includes('TeX Live')) return 'texlive';
        return 'texlive';
    }
    return 'none';
}

async function detectTexEnvironment() {
    logger.log('Detecting TeX environment...');
    const hasLatexmk = isCommandAvailable('latexmk');
    const hasPdflatex = isCommandAvailable('pdflatex');
    const hasLualatex = isCommandAvailable('lualatex');
    const hasXelatex = isCommandAvailable('xelatex');
    const hasTlmgr = isCommandAvailable('tlmgr');
    const hasBibtex = isCommandAvailable('bibtex');

    let texDistro = 'none';
    let binPath = null;

    if (hasPdflatex || hasLatexmk) {
        texDistro = detectTexDistro();
        try {
            const cmd = process.platform === 'win32' ? 'where' : 'which';
            const target = hasPdflatex ? 'pdflatex' : 'latexmk';
            const result = child_process.execSync(`${cmd} ${target}`, {
                stdio: 'pipe',
                timeout: 5000,
                encoding: 'utf-8'
            });
            binPath = path.dirname(result.trim().split('\n')[0]);
        } catch { }
    } else {
        const tinyTexBinPath = getTinyTexBinPath();
        if (fs.existsSync(tinyTexBinPath)) {
            texDistro = 'tinytex';
            binPath = tinyTexBinPath;
            logger.log(`TinyTeX found at ${tinyTexBinPath} but not in PATH. Adding now...`);
            ensureTexInPath(tinyTexBinPath);
            // Re-check commands now that PATH is updated
            result_override = {
                hasLatexmk: isCommandAvailable('latexmk'),
                hasPdflatex: isCommandAvailable('pdflatex'),
                hasLualatex: isCommandAvailable('lualatex'),
                hasXelatex: isCommandAvailable('xelatex'),
                hasTlmgr: isCommandAvailable('tlmgr'),
                hasBibtex: isCommandAvailable('bibtex'),
                texDistro,
                binPath,
            };
        }
    }

    const finalResult = typeof result_override !== 'undefined' ? result_override : { hasLatexmk, hasPdflatex, hasLualatex, hasXelatex, hasTlmgr, hasBibtex, texDistro, binPath };
    logger.log(`TeX environment: ${JSON.stringify(finalResult)}`);
    return finalResult;
}

function ensureTexInPath(customBinPath) {
    const binPath = customBinPath || getTinyTexBinPath();
    if (!fs.existsSync(binPath)) {
        logger.log(`Cannot add to PATH: ${binPath} does not exist.`);
        return false;
    }
    const pathSep = process.platform === 'win32' ? ';' : ':';
    const currentPath = process.env.PATH || process.env.Path || '';
    if (currentPath.split(pathSep).some(p => p.toLowerCase() === binPath.toLowerCase())) {
        logger.log(`TinyTeX bin path already in PATH: ${binPath}`);
        return false;
    }
    if (process.platform === 'win32') {
        process.env.Path = binPath + pathSep + (process.env.Path || '');
    }
    process.env.PATH = binPath + pathSep + currentPath;
    logger.log(`Added TinyTeX bin to PATH: ${binPath}`);
    return true;
}
