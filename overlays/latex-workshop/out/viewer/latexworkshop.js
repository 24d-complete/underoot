import { patchViewerUI, registerKeyBind, registerPersistentState, repositionAnnotation } from './components/gui.js';
import * as utils from './components/utils.js';
import { initTrim, setTrimCSS } from './components/trimming.js';
import { doneRefresh, restoreState } from './components/refresh.js';
import { initUploadState, setParams, uploadState } from './components/state.js';
import { initConnect, send } from './components/connection.js';
import { registerSyncTeX } from './components/synctex.js';
// The 'webviewerloaded' event is fired just before the initialization of PDF.js.
// We can set PDFViewerApplicationOptions at the time.
// - https://github.com/mozilla/pdf.js/wiki/Third-party-viewer-usage#initialization-promise
// - https://github.com/mozilla/pdf.js/pull/10318
const webViewerLoaded = new Promise((resolve) => {
    document.addEventListener('webviewerloaded', () => resolve());
    // https://github.com/James-Yu/LaTeX-Workshop/pull/4220#issuecomment-2034520751
    try {
        parent.document.addEventListener('webviewerloaded', () => resolve());
    }
    catch (_) { /* do nothing */ }
});
// For the details of the initialization of PDF.js,
// see https://github.com/mozilla/pdf.js/wiki/Third-party-viewer-usage
// We should use only the promises provided by PDF.js here, not the ones defined by us,
// to avoid deadlock.
async function getViewerEventBus() {
    await webViewerLoaded;
    await PDFViewerApplication.initializedPromise;
    return PDFViewerApplication.eventBus;
}
function onPDFViewerEvent(event, cb, option) {
    const cb0 = (evt) => {
        cb(evt);
        if (option?.once) {
            PDFViewerApplication.eventBus.off(event, cb0);
        }
    };
    void getViewerEventBus().then(eventBus => eventBus.on(event, cb0));
    return { dispose: () => PDFViewerApplication.eventBus.off(event, cb0) };
}
async function initialization() {
    document.title = utils.parseURL().docTitle;
    const params = await utils.getParams();
    globalThis.LW_SUPERSAMPLING = params.supersampling;
    document.addEventListener('webviewerloaded', () => {
        const color = utils.isPrefersColorSchemeDark(params.codeColorTheme) ? params.color.dark : params.color.light;
        const options = {
            annotationEditorMode: -1,
            disablePreferences: true,
            enableScripting: false,
            // The following paths are requested from ./build/cmaps/, ./build/standard_fonts/, and ./build/wasm/
            cMapUrl: './cmaps/',
            standardFontDataUrl: './standard_fonts/',
            wasmUrl: '../wasm/',
            sidebarViewOnLoad: 0,
            workerSrc: './pdfjs/pdf.worker.mjs',
            forcePageColors: true,
            // The following allow clear display with large zoom values. This is necessary to enable trimming.
            maxCanvasPixels: -1,
            maxCanvasDim: -1,
            enableDetailCanvas: false,
            ...color
        };
        PDFViewerApplicationOptions.setAll(options);
    });
    initConnect();
    await patchViewerUI();
    registerKeyBind();
}
await initialization();
onPDFViewerEvent('documentloaded', () => {
    void setParams();
    initUploadState();
    void getViewerEventBus().then(eventbus => {
        const events = ['scalechanged', 'zoomin', 'zoomout', 'zoomreset', 'scrollmodechanged', 'spreadmodechanged', 'pagenumberchanged'];
        events.forEach(event => {
            eventbus.on(event, () => { uploadState(); });
        });
    });
}, { once: true });
onPDFViewerEvent('pagesinit', () => {
    initTrim();
    void restoreState();
    registerSyncTeX();
    registerPersistentState();
});
onPDFViewerEvent('pagesloaded', () => {
    initTrim();
    void restoreState()
        .then(() => uploadState())
        .then(() => send({ type: 'loaded', pdfFileUri: utils.parseURL().pdfFileUri }));
    repositionAnnotation();
    doneRefresh();
});
onPDFViewerEvent('rotationchanging', () => setTrimCSS());
// @ts-expect-error Must import viewer.mjs here, otherwise some config won't work. #4096
await import('../../viewer/viewer.mjs');
//# sourceMappingURL=latexworkshop.js.map