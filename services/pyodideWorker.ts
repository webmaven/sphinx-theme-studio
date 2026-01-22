import { PYTHON_BUILD_SCRIPT } from '../constants';

// Types to silence TS errors in worker context
// Extending Worker interface to include onunhandledrejection which is missing in the standard Worker type but present in DedicatedWorkerGlobalScope
declare const self: Worker & {
  onunhandledrejection: (event: any) => void;
};
declare global {
  interface Window {
    loadPyodide: any;
  }
}

let pyodide: any = null;
const ENV_CACHE_VERSION = "v4-sphinx-env";

// Global Error Handlers to catch loading/network issues
self.onerror = function(event) {
    const msg = event instanceof ErrorEvent ? event.message : String(event);
    self.postMessage({ type: 'FATAL', payload: `Worker Global Error: ${msg}` });
};

self.onunhandledrejection = function(event) {
    self.postMessage({ type: 'FATAL', payload: `Worker Unhandled Rejection: ${event.reason}` });
};

self.onmessage = async (e: MessageEvent) => {
    const { type, id, payload } = e.data;

    switch (type) {
        case 'INIT':
            await handleInit();
            break;
        case 'BUILD':
            await handleBuild(id, payload);
            break;
    }
};

function postLog(msg: string) {
    self.postMessage({ type: 'LOG', payload: msg });
}

async function handleInit() {
    try {
        if (pyodide) {
             self.postMessage({ type: 'READY' });
             return;
        }

        postLog("Worker: Starting Pyodide initialization...");

        // Dynamically import the ES module version of Pyodide
        // We wrap this in a try/catch specifically for the import
        let loadPyodide;
        try {
            // @ts-ignore
            const pyodideModule = await import('https://cdn.jsdelivr.net/pyodide/v0.27.2/full/pyodide.mjs');
            loadPyodide = pyodideModule.loadPyodide;
        } catch (e: any) {
            throw new Error(`Failed to import Pyodide module: ${e.message}`);
        }

        pyodide = await loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.2/full/",
            stdout: (text: string) => postLog(`[Pyodide stdout] ${text}`),
            stderr: (text: string) => postLog(`[Pyodide stderr] ${text}`),
        });

        postLog("Worker: Pyodide core loaded. Loading micropip...");
        await pyodide.loadPackage("micropip");
        const micropip = pyodide.pyimport("micropip");

        // --- Caching Logic ---
        const fs = pyodide.FS;
        const persistPath = "/persistent_site_packages";

        try { fs.mkdir(persistPath); } catch(e) {}
        fs.mount(fs.filesystems.IDBFS, {}, persistPath);

        // Sync from IndexedDB to Memory
        await new Promise<void>(resolve => fs.syncfs(true, (err: any) => {
             if(err) postLog(`IDBFS Read Error: ${err}`);
             resolve();
        }));

        let isCached = false;
        const versionFilePath = `${persistPath}/.version`;
        if (fs.analyzePath(versionFilePath).exists) {
            const cachedVersion = fs.readFile(versionFilePath, { encoding: 'utf8' });
            if (cachedVersion.trim() === ENV_CACHE_VERSION) {
                isCached = true;
            }
        }

        const setupScript = `
import sys
import os
import shutil
import site

persist_path = "${persistPath}"

# Add to sys.path to prefer cached packages
if persist_path not in sys.path:
    sys.path.insert(0, persist_path)

def save_environment(version):
    site_packages = site.getsitepackages()[0]
    shutil.copytree(site_packages, persist_path, dirs_exist_ok=True)
    with open(os.path.join(persist_path, ".version"), "w") as f:
        f.write(version)
`;
        pyodide.runPython(setupScript);

        if (isCached) {
            postLog("Worker: Environment loaded from cache.");
        } else {
            postLog("Worker: Installing dependencies (this may take a moment)...");
            // We install one by one or in small groups to see progress better in logs
            const packages = [
                'beautifulsoup4',
                'docutils',
                'sphinx', 
                'sphinx_rtd_theme', 
                'sphinxcontrib-jquery',
                'sphinx_book_theme',
                'sphinx-documatt-theme'
            ];
            await micropip.install(packages);
            
            postLog("Worker: Dependencies installed. Persisting to cache...");
            pyodide.runPython(`save_environment("${ENV_CACHE_VERSION}")`);
            
            // Sync Write: Save memory contents to IndexedDB
            await new Promise<void>(resolve => fs.syncfs(false, (err: any) => {
                 if(err) postLog(`IDBFS Write Error: ${err}`);
                 resolve();
            }));
        }

        // Load the Python Build Script Logic
        pyodide.runPython(PYTHON_BUILD_SCRIPT);
        
        postLog("Worker: Initialization complete.");
        self.postMessage({ type: 'READY' });

    } catch (error: any) {
        console.error("Worker Init Error", error);
        self.postMessage({ type: 'ERROR', payload: error.message || String(error) });
    }
}

async function handleBuild(id: string, payload: any) {
    if (!pyodide) {
        self.postMessage({ 
            type: 'BUILD_RESULT', 
            id, 
            payload: { html: '', error: 'Pyodide not initialized', logs: [] } 
        });
        return;
    }

    try {
        const { rst, htmlTemplate, css, conf } = payload;
        
        // build_docs is defined in PYTHON_BUILD_SCRIPT which was run during init
        const buildDocs = pyodide.globals.get('build_docs');
        
        // Execute build
        const resultJson = buildDocs(rst, htmlTemplate, css, conf);
        const result = JSON.parse(resultJson);

        self.postMessage({ 
            type: 'BUILD_RESULT', 
            id, 
            payload: {
                html: result.html,
                error: result.status === 'error' ? result.message : undefined,
                logs: result.logs || []
            } 
        });

    } catch (error: any) {
        self.postMessage({ 
            type: 'BUILD_RESULT', 
            id, 
            payload: { 
                html: '', 
                error: error.message || String(error), 
                logs: ['Worker Execution Error: ' + error.message] 
            } 
        });
    }
}
