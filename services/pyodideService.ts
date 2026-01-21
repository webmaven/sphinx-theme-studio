import { PYTHON_BUILD_SCRIPT } from '../constants';
import { BuildResult } from '../types';

declare global {
  interface Window {
    loadPyodide: (config: { indexURL: string }) => Promise<any>;
    pyodide: any;
  }
}

// Increment this version string to invalidate the cache and force a re-install
// for all users (e.g., when adding new packages).
const ENV_CACHE_VERSION = "v4-sphinx-env";

class PyodideService {
  private pyodide: any = null;
  private isInitializing: boolean = false;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.pyodide) return;
    if (this.initPromise) return this.initPromise;

    this.isInitializing = true;

    this.initPromise = (async () => {
      try {
        if (!window.loadPyodide) {
            throw new Error("Pyodide script not loaded in index.html");
        }
        
        console.log("Loading Pyodide...");
        this.pyodide = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.2/full/"
        });

        console.log("Loading Micropip...");
        await this.pyodide.loadPackage("micropip");
        const micropip = this.pyodide.pyimport("micropip");
        
        // --- Caching Logic Start ---
        const fs = this.pyodide.FS;
        const persistPath = "/persistent_site_packages";
        
        // 1. Mount IDBFS
        // Create the directory if it doesn't exist
        try { fs.mkdir(persistPath); } catch(e) {} // ignore if exists
        
        // Mount IDBFS to this path
        fs.mount(fs.filesystems.IDBFS, {}, persistPath);
        
        // 2. Sync from IndexedDB to Memory
        console.log("Checking cache...");
        await new Promise<void>(resolve => fs.syncfs(true, (err: any) => {
            if (err) console.error("IDBFS read error", err);
            resolve();
        }));
        
        // 3. Check Version
        let isCached = false;
        const versionFilePath = `${persistPath}/.version`;
        if (fs.analyzePath(versionFilePath).exists) {
            const cachedVersion = fs.readFile(versionFilePath, { encoding: 'utf8' });
            if (cachedVersion.trim() === ENV_CACHE_VERSION) {
                isCached = true;
            }
        }

        // 4. Setup Python Path
        // We add the persistent path to sys.path so Python can find packages there
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
    # Get the system site-packages (where micropip installs things)
    site_packages = site.getsitepackages()[0]
    
    print(f"Copying libraries from {site_packages} to {persist_path}...")
    
    # Copy all files from site_packages to persist_path
    # dirs_exist_ok=True allows us to merge/overwrite
    shutil.copytree(site_packages, persist_path, dirs_exist_ok=True)
    
    # Write version file
    with open(os.path.join(persist_path, ".version"), "w") as f:
        f.write(version)
`;
        this.pyodide.runPython(setupScript);

        if (isCached) {
            console.log("Python environment loaded from cache (IDBFS). Skipping install.");
        } else {
            console.log("Cache invalid or empty. Installing dependencies...");
            // Install core dependencies and themes
            // Sphinx recent versions require sphinxcontrib-jquery for themes like RTD
            await micropip.install([
                'beautifulsoup4',
                'docutils',
                'sphinx', 
                'sphinx_rtd_theme', 
                'sphinxcontrib-jquery',
                'sphinx_book_theme',
                'sphinx-documatt-theme'
            ]);
            
            console.log("Persisting environment to cache...");
            // Copy installed files to persistent directory
            this.pyodide.runPython(`save_environment("${ENV_CACHE_VERSION}")`);
            
            // Sync Write: Save memory contents to IndexedDB
            await new Promise<void>(resolve => fs.syncfs(false, (err: any) => {
                 if (err) console.error("IDBFS write error", err);
                 else console.log("Environment cached successfully.");
                 resolve();
            }));
        }
        // --- Caching Logic End ---
        
        console.log("Pyodide Ready.");
      } catch (err) {
        console.error("Failed to initialize Pyodide", err);
        throw err;
      } finally {
        this.isInitializing = false;
      }
    })();

    return this.initPromise;
  }

  async buildDocs(rst: string, htmlTemplate: string, css: string, conf: string): Promise<BuildResult> {
    if (!this.pyodide) {
      await this.init();
    }

    try {
        // Load the build script
        this.pyodide.runPython(PYTHON_BUILD_SCRIPT);
        
        const buildDocs = this.pyodide.globals.get('build_docs');
        const resultJson = buildDocs(rst, htmlTemplate, css, conf);
        const result = JSON.parse(resultJson);
        
        if (result.status === 'error') {
            console.error("Python Build Error:", result.message);
            return {
                html: '',
                error: result.message,
                logs: result.logs || ['Build failed without logs']
            };
        }

        return {
            html: result.html,
            logs: result.logs || ['Build successful']
        };

    } catch (e: any) {
        console.error("JS Execution Error:", e);
        return {
            html: '',
            error: e.message || String(e),
            logs: ['JavaScript execution error']
        };
    }
  }
}

export const pyodideService = new PyodideService();