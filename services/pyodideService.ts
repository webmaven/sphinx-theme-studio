import { BuildResult } from '../types';
import { PYTHON_BUILD_SCRIPT } from '../constants';

type LogCallback = (msg: string) => void;

// We inline the worker code to avoid issues with file path resolution (new URL failure)
// and to ensure it works across different bundlers/environments.
// We use a Classic Worker with importScripts instead of a Module worker for simpler Blob usage.
const WORKER_CODE = `
// Import Pyodide (Classic Worker Style)
importScripts("https://cdn.jsdelivr.net/pyodide/v0.27.2/full/pyodide.js");

let pyodide = null;
const ENV_CACHE_VERSION = "v4-sphinx-env";
let pythonBuildScript = "";

self.onerror = function(event) {
    const msg = event instanceof ErrorEvent ? event.message : String(event);
    self.postMessage({ type: 'FATAL', payload: "Worker Global Error: " + msg });
};

self.onunhandledrejection = function(event) {
    self.postMessage({ type: 'FATAL', payload: "Worker Unhandled Rejection: " + event.reason });
};

self.onmessage = async (e) => {
    const { type, id, payload } = e.data;

    switch (type) {
        case 'INIT':
            pythonBuildScript = payload.buildScript;
            await handleInit();
            break;
        case 'BUILD':
            await handleBuild(id, payload);
            break;
    }
};

function postLog(msg) {
    self.postMessage({ type: 'LOG', payload: msg });
}

async function handleInit() {
    try {
        if (pyodide) {
             self.postMessage({ type: 'READY' });
             return;
        }

        postLog("Worker: Starting Pyodide initialization...");

        // loadPyodide is available globally via importScripts
        pyodide = await loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.2/full/",
            stdout: (text) => postLog("[Pyodide stdout] " + text),
            stderr: (text) => postLog("[Pyodide stderr] " + text),
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
        await new Promise(resolve => fs.syncfs(true, (err) => {
             if(err) postLog("IDBFS Read Error: " + err);
             resolve();
        }));

        let isCached = false;
        const versionFilePath = persistPath + "/.version";
        if (fs.analyzePath(versionFilePath).exists) {
            const cachedVersion = fs.readFile(versionFilePath, { encoding: 'utf8' });
            if (cachedVersion.trim() === ENV_CACHE_VERSION) {
                isCached = true;
            }
        }

        const setupScript = \`
import sys
import os
import shutil
import site

persist_path = "\${persistPath}"

# Add to sys.path to prefer cached packages
if persist_path not in sys.path:
    sys.path.insert(0, persist_path)

def save_environment(version):
    site_packages = site.getsitepackages()[0]
    shutil.copytree(site_packages, persist_path, dirs_exist_ok=True)
    with open(os.path.join(persist_path, ".version"), "w") as f:
        f.write(version)
\`;
        pyodide.runPython(setupScript);

        if (isCached) {
            postLog("Worker: Environment loaded from cache.");
        } else {
            postLog("Worker: Installing dependencies (this may take a moment)...");
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
            pyodide.runPython(\`save_environment("\${ENV_CACHE_VERSION}")\`);
            
            // Sync Write
            await new Promise(resolve => fs.syncfs(false, (err) => {
                 if(err) postLog("IDBFS Write Error: " + err);
                 resolve();
            }));
        }

        // Load the Python Build Script Logic passed from main thread
        if (!pythonBuildScript) {
            throw new Error("Python build script not provided in INIT payload");
        }
        pyodide.runPython(pythonBuildScript);
        
        postLog("Worker: Initialization complete.");
        self.postMessage({ type: 'READY' });

    } catch (error) {
        console.error("Worker Init Error", error);
        self.postMessage({ type: 'ERROR', payload: error.message || String(error) });
    }
}

async function handleBuild(id, payload) {
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

    } catch (error) {
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
`;

class PyodideService {
  private worker: Worker | null = null;
  private initPromise: Promise<void> | null = null;
  private buildCallbacks = new Map<string, (result: BuildResult) => void>();
  private logListeners: Set<LogCallback> = new Set();

  addLogListener(callback: LogCallback) {
    this.logListeners.add(callback);
    return () => this.logListeners.delete(callback);
  }

  private broadcastLog(msg: string) {
    this.logListeners.forEach(cb => cb(msg));
  }

  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
        try {
            // Create worker from Blob
            const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(blob);
            
            // Classic worker (no type: module) since we used importScripts
            this.worker = new Worker(workerUrl);

            this.worker.onmessage = (event) => {
                const { type, id, payload } = event.data;
                
                if (type === 'READY') {
                    resolve();
                } else if (type === 'LOG') {
                    this.broadcastLog(payload);
                } else if (type === 'ERROR' || type === 'FATAL') {
                    const errorMsg = `Pyodide Worker Error: ${payload}`;
                    console.error(errorMsg);
                    this.broadcastLog(errorMsg);
                    reject(new Error(payload));
                } else if (type === 'BUILD_RESULT') {
                    const callback = this.buildCallbacks.get(id);
                    if (callback) {
                        callback(payload);
                        this.buildCallbacks.delete(id);
                    }
                }
            };

            this.worker.onerror = (err) => {
                const msg = err instanceof ErrorEvent ? err.message : "Unknown Worker Error";
                console.error("Worker error:", err);
                this.broadcastLog(`Worker infrastructure error: ${msg}`);
                reject(err);
            };

            // Trigger initialization, passing the build script from constants
            this.worker.postMessage({ 
                type: 'INIT',
                payload: {
                    buildScript: PYTHON_BUILD_SCRIPT
                }
            });

        } catch (e: any) {
            reject(new Error(`Failed to create worker: ${e.message}`));
        }
    });

    return this.initPromise;
  }

  async buildDocs(rst: string, htmlTemplate: string, css: string, conf: string): Promise<BuildResult> {
    await this.init();

    if (!this.worker) {
        throw new Error("Worker not initialized");
    }

    return new Promise((resolve) => {
        const id = Math.random().toString(36).substring(7);
        this.buildCallbacks.set(id, resolve);
        
        this.worker!.postMessage({
            type: 'BUILD',
            id,
            payload: { rst, htmlTemplate, css, conf }
        });
    });
  }
}

export const pyodideService = new PyodideService();
