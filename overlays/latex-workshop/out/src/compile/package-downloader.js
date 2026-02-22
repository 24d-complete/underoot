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
exports.parseRequiredPackages = parseRequiredPackages;
exports.ensurePackagesInstalled = ensurePackagesInstalled;
exports.invalidateCache = invalidateCache;
exports.resolvePackageName = resolvePackageName;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const child_process = __importStar(require("child_process"));
const lw_1 = require("../lw");

const logger = lw_1.lw.log('Build', 'PackageDownloader');

/**
 * Scan a LaTeX file for \usepackage{} or \documentclass{} to find required packages.
 */
function parseRequiredPackages(rootFile) {
    if (!fs.existsSync(rootFile)) return new Set();
    const content = fs.readFileSync(rootFile, 'utf-8');
    const packages = new Set();

    // Match \usepackage[options]{pkg1,pkg2}
    const usepackageRegex = /\\usepackage(?:\[[^\]]*\])?\{([^\}]+)\}/g;
    let match;
    while ((match = usepackageRegex.exec(content)) !== null) {
        match[1].split(',').forEach(p => packages.add(p.trim()));
    }

    // Match \documentclass[options]{class}
    const documentclassRegex = /\\documentclass(?:\[[^\]]*\])?\{([^\}]+)\}/;
    const classMatch = documentclassRegex.exec(content);
    if (classMatch) {
        packages.add(classMatch[1].trim());
    }

    return packages;
}

/**
 * Strategy-based package resolution: Maps a .sty/.cls name to a TeX Live package name.
 */
async function resolvePackageName(name) {
    const runTlmgrCommand = (args, timeoutMs) => {
        return new Promise((resolve) => {
            const proc = lw_1.lw.external.spawn('tlmgr', args, { env: process.env });
            let stdout = '';
            let stderr = '';
            proc.stdout?.on('data', (data) => stdout += data.toString());
            proc.stderr?.on('data', (data) => stderr += data.toString());
            proc.on('error', (err) => resolve({ code: -1, stdout, stderr, error: err }));
            proc.on('exit', (code) => resolve({ code, stdout, stderr }));
            setTimeout(() => { try { proc.kill('SIGTERM'); } catch { } resolve({ code: -2, stdout, stderr, error: new Error('Timeout') }); }, timeoutMs);
        });
    };

    // Strategy 1: Search for the providing file
    const extensions = ['.sty', '.cls'];
    for (const ext of extensions) {
        const res = await runTlmgrCommand(['search', '--global', '--file', `/${name}${ext}`], 60000);
        if (res.code === 0 && res.stdout) {
            const lines = res.stdout.trim().split(/\r?\n/);
            for (const rawLine of lines) {
                const line = rawLine.trim();
                const match = line.match(/^(\S+):$/);
                if (match && match[1] !== 'tlmgr.pl') {
                    logger.log(`Resolved '${name}' -> '${match[1]}' via tlmgr search`);
                    return match[1];
                }
            }
        }
    }

    // Strategy 2: Lowercase fallback with info check
    const lowerName = name.toLowerCase();
    const infoRes = await runTlmgrCommand(['info', lowerName], 30000);
    if (infoRes.code === 0 && infoRes.stdout.includes('package:')) {
        logger.log(`Resolved '${name}' -> '${lowerName}' via tlmgr info`);
        return lowerName;
    }

    logger.log(`Using fallback '${lowerName}' for '${name}'`);
    return lowerName;
}

const _verifiedCache = new Map();

function invalidateCache(rootFile) {
    if (rootFile) { _verifiedCache.delete(rootFile); logger.log(`Cache invalidated: ${rootFile}`); }
    else { _verifiedCache.clear(); logger.log('Cache cleared (all).'); }
}

async function ensurePackagesInstalled(packages, rootFile) {
    if (!packages || packages.size === 0) return;
    const currentHash = [...packages].sort().join(',');
    const cached = _verifiedCache.get(rootFile);
    if (cached && cached.hash === currentHash) return;

    const toInstall = [];
    for (const pkg of packages) {
        try {
            child_process.execSync(`kpsewhich ${pkg}.sty || kpsewhich ${pkg}.cls`, { stdio: 'ignore' });
        } catch {
            const resolved = await resolvePackageName(pkg);
            if (resolved) toInstall.push(resolved);
        }
    }

    if (toInstall.length === 0) {
        _verifiedCache.set(rootFile, { hash: currentHash });
        return;
    }

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Underoot: Installing Packages",
        cancellable: false
    }, async (progress) => {
        progress.report({ message: `Installing ${toInstall.join(', ')}...` });
        return new Promise((resolve) => {
            const proc = lw_1.lw.external.spawn('tlmgr', ['install', ...toInstall], { env: process.env });
            proc.on('exit', (code) => {
                if (code === 0) _verifiedCache.set(rootFile, { hash: currentHash });
                resolve();
            });
            setTimeout(() => { try { proc.kill('SIGTERM'); } catch { } resolve(); }, 300000);
        });
    });
}
