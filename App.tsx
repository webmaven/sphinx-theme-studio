import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    Smartphone,
    Tablet,
    Monitor,
    Eye,
    History,
    GripVertical,
} from 'lucide-react';
import { pyodideService } from './services/pyodideService';
import { generateThemeStyles } from './services/aiService';
import { CodeEditor } from './components/CodeEditor';
import { Preview } from './components/Preview';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { ThemeGalleryModal } from './components/modals/ThemeGalleryModal';
import { AiSettingsModal } from './components/modals/AiSettingsModal';
import { RestoreSessionModal } from './components/modals/RestoreSessionModal';
import { LogsModal } from './components/modals/LogsModal';
import { ThemeFiles, FileType, BuildStatus, DeviceMode, AiSettings } from './types';
import { INITIAL_CSS, INITIAL_HTML, INITIAL_RST, INITIAL_CONF, THEME_GALLERY } from './constants';

const STORAGE_KEY_FILES = 'sphinx_studio_files';
const STORAGE_KEY_AI = 'sphinx_studio_ai';

function App() {
  // Application State
  const [files, setFiles] = useState<ThemeFiles>({
    css: INITIAL_CSS,
    html: INITIAL_HTML,
    rst: INITIAL_RST,
    conf: INITIAL_CONF
  });
  const [activeFile, setActiveFile] = useState<FileType>('rst');
  const [generatedHtml, setGeneratedHtml] = useState<string>('');
  const [status, setStatus] = useState<BuildStatus>(BuildStatus.LOADING_PYODIDE);
  const [error, setError] = useState<string | undefined>();
  const [logs, setLogs] = useState<string[]>([]);
  const [buildTick, setBuildTick] = useState<number>(0);
  
  // Layout State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editorWidth, setEditorWidth] = useState(50); // percentage
  const [isDragging, setIsDragging] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [showThemeGallery, setShowThemeGallery] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  // Preview State
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  
  // Comparison State
  const [snapshotCss, setSnapshotCss] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  
  // AI State
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [showAiSettings, setShowAiSettings] = useState(false);
  const [aiSettings, setAiSettings] = useState<AiSettings>({
      provider: 'gemini',
      openAiKey: '',
      anthropicKey: ''
  });
  const [isGeminiKeySelected, setIsGeminiKeySelected] = useState(false);

  // Session Restore State
  const [hasSavedSession, setHasSavedSession] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  // Initialize Pyodide on mount and check storage
  useEffect(() => {
    // Subscribe to logs immediately to catch initialization messages
    const unsubscribeLogs = pyodideService.addLogListener((msg) => {
        setLogs(prev => [...prev, msg]);
        // If a fatal error occurs during init, we might want to ensure logs are visible
        if (msg.includes('FATAL') || msg.includes('Error')) {
             console.error("Log caught error:", msg);
        }
    });

    const init = async () => {
        try {
            await pyodideService.init();
            setStatus(BuildStatus.READY);
            
            // Check for saved session
            const saved = localStorage.getItem(STORAGE_KEY_FILES);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    // Simple validation
                    if (parsed.css && parsed.conf) {
                        setHasSavedSession(true);
                        setShowRestoreModal(true);
                    } else {
                        // Fallback to initial build if saved data is invalid
                         handleBuild(files);
                    }
                } catch (e) {
                     handleBuild(files);
                }
            } else {
                handleBuild(files);
            }

            // Load AI Settings
            const savedAi = localStorage.getItem(STORAGE_KEY_AI);
            if (savedAi) {
                setAiSettings(JSON.parse(savedAi));
            }

        } catch (e: any) {
            setStatus(BuildStatus.ERROR);
            setError(`Failed to load Python environment: ${e.message}`);
            // Ensure logs modal is open if initialization fails so user sees why
            setShowLogs(true);
        }
    };
    init();
    
    return () => {
        unsubscribeLogs();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check Gemini Key Status
  useEffect(() => {
      if (window.aistudio) {
          window.aistudio.hasSelectedApiKey().then(setIsGeminiKeySelected);
      } else {
          setIsGeminiKeySelected(!!process.env.API_KEY);
      }
  }, [aiSettings.provider, showAiSettings]);

  // Auto-save logic
  useEffect(() => {
    const timer = setTimeout(() => {
        localStorage.setItem(STORAGE_KEY_FILES, JSON.stringify(files));
        localStorage.setItem(STORAGE_KEY_AI, JSON.stringify(aiSettings));
    }, 1000);
    return () => clearTimeout(timer);
  }, [files, aiSettings]);

  const restoreSession = () => {
      const saved = localStorage.getItem(STORAGE_KEY_FILES);
      if (saved) {
          const parsed = JSON.parse(saved);
          setFiles(parsed);
          handleBuild(parsed);
          setShowRestoreModal(false);
      }
  };

  const discardSession = () => {
      localStorage.removeItem(STORAGE_KEY_FILES);
      setHasSavedSession(false);
      setShowRestoreModal(false);
      handleBuild(files); // Build default
  };

  const handleFileChange = (content: string) => {
    setFiles(prev => ({ ...prev, [activeFile]: content }));
  };

  const handleBuild = useCallback(async (currentFiles: ThemeFiles, forceCss?: string) => {
    if (status === BuildStatus.BUILDING) return;
    
    setStatus(BuildStatus.BUILDING);
    setError(undefined);
    setLogs([]); // Clear previous build logs, but we might want to keep init logs? 
                 // For now, let's clear to keep it relevant to the current build.
                 // Ideally, we'd distinguish init logs from build logs.

    try {
        const cssToBuild = forceCss || currentFiles.css;
        const result = await pyodideService.buildDocs(
            currentFiles.rst, 
            currentFiles.html, 
            cssToBuild,
            currentFiles.conf
        );
        
        setLogs(result.logs || []);

        if (result.error) {
            setError(result.error);
            setShowLogs(true); 
        } else {
            setGeneratedHtml(result.html);
            setBuildTick(prev => prev + 1);
        }
    } catch (e: any) {
        setError(e.message);
        setLogs(prev => [...prev, e.message]);
    } finally {
        setStatus(BuildStatus.READY);
    }
  }, [status]);

  const onBuildClick = () => handleBuild(files);

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;

    // Pre-flight checks for keys
    if (aiSettings.provider === 'gemini') {
        if (window.aistudio) {
            const hasKey = await window.aistudio.hasSelectedApiKey();
            if (!hasKey) {
                try {
                    await window.aistudio.openSelectKey();
                    // Update state to reflect selection
                    setIsGeminiKeySelected(await window.aistudio.hasSelectedApiKey());
                } catch (e) {
                    return; // Cancelled
                }
            }
        }
    }
    else if (aiSettings.provider === 'openai' && !aiSettings.openAiKey) {
        setShowAiSettings(true);
        return;
    }
    else if (aiSettings.provider === 'anthropic' && !aiSettings.anthropicKey) {
        setShowAiSettings(true);
        return;
    }

    setIsAiGenerating(true);
    try {
        const newCss = await generateThemeStyles(aiPrompt, files.css, aiSettings);
        if (!snapshotCss) {
            setSnapshotCss(files.css);
        }
        setFiles(prev => ({ ...prev, css: newCss }));
        setActiveFile('css');
        setTimeout(() => handleBuild({ ...files, css: newCss }), 100);
    } catch (e: any) {
        alert(`AI Generation failed: ${e.message}`);
    } finally {
        setIsAiGenerating(false);
    }
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const fileContent = JSON.stringify(files, null, 2);
    const file = new Blob([fileContent], {type: 'application/json'});
    element.href = URL.createObjectURL(file);
    element.download = "sphinx_theme_project.json";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const loadTheme = (themeId: string) => {
    const theme = THEME_GALLERY.find(t => t.id === themeId);
    if (theme) {
        if (!snapshotCss) setSnapshotCss(files.css);
        
        const baseConf = `project = 'Theme Studio Preview'
copyright = '2024, Editor'
author = 'Editor'

${theme.conf}

extensions = [
    'sphinx.ext.autodoc',
    'sphinx.ext.viewcode',
    'sphinx.ext.githubpages',
]

html_static_path = ['_static']
html_css_files = [
    'custom.css',
]
`;
        
        const newFiles = { 
            ...files, 
            conf: baseConf,
            css: theme.css || INITIAL_CSS 
        };
        setFiles(newFiles);
        handleBuild(newFiles);
        setActiveFile('conf');
        setShowThemeGallery(false);
    }
  };

  const isThemeActive = (themeId: string) => {
    const mapping: Record<string, string> = {
        'rtd': 'sphinx_rtd_theme',
        'book': 'sphinx_book_theme',
        'nature': 'nature',
        'alabaster': 'alabaster',
        'documatt': 'sphinx_documatt_theme'
    };
    const themeName = mapping[themeId] || themeId;
    const regex = new RegExp(`html_theme\\s*=\\s*['"]${themeName}['"]`);
    return regex.test(files.conf);
  };

  const handleTakeSnapshot = () => {
    setSnapshotCss(files.css);
  };

  const startCompare = () => {
    if (snapshotCss) {
        setIsComparing(true);
        handleBuild(files, snapshotCss);
    }
  };

  const stopCompare = () => {
    setIsComparing(false);
    handleBuild(files);
  };

  // Drag Resizer Logic
  const startResizing = useCallback(() => setIsDragging(true), []);
  const stopResizing = useCallback(() => setIsDragging(false), []);
  const resize = useCallback((e: MouseEvent) => {
    if (isDragging && contentRef.current) {
        const containerRect = contentRef.current.getBoundingClientRect();
        let newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
        if (newWidth < 10) newWidth = 10;
        if (newWidth > 90) newWidth = 90;
        setEditorWidth(newWidth);
        if (newWidth < 20 && sidebarOpen) {
            setSidebarOpen(false);
        }
    }
  }, [isDragging, sidebarOpen]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
        window.removeEventListener('mousemove', resize);
        window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  return (
    <div className="flex h-screen w-full bg-[#0f172a] text-slate-200 overflow-hidden font-sans">
      
      <Sidebar 
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        activeFile={activeFile}
        setActiveFile={setActiveFile}
        onOpenThemeGallery={() => setShowThemeGallery(true)}
        onOpenAiSettings={() => setShowAiSettings(true)}
        aiPrompt={aiPrompt}
        setAiPrompt={setAiPrompt}
        onAiGenerate={handleAiGenerate}
        isAiGenerating={isAiGenerating}
        onDownload={handleDownload}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        
        <Toolbar 
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            activeFile={activeFile}
            hasSavedSession={hasSavedSession}
            status={status}
            error={error}
            logsCount={logs.length}
            onShowLogs={() => setShowLogs(true)}
            onBuild={onBuildClick}
        />

        {/* Split View Container */}
        <div ref={contentRef} className="flex-1 flex overflow-hidden relative">
            {/* Editor Pane */}
            <div 
                style={{ width: `${editorWidth}%` }}
                className="border-r border-slate-800 flex flex-col bg-[#1e293b] min-w-[50px]"
            >
                <CodeEditor 
                    code={files[activeFile]} 
                    onChange={handleFileChange}
                    language={activeFile === 'rst' ? 'markdown' : activeFile === 'css' ? 'css' : activeFile === 'html' ? 'html' : 'python'}
                />
            </div>

            {/* Draggable Splitter */}
            <div
                onMouseDown={startResizing}
                className={`
                    w-1.5 bg-slate-900 hover:bg-blue-500 cursor-col-resize z-10 flex items-center justify-center transition-colors
                    ${isDragging ? 'bg-blue-600' : ''}
                `}
                title="Drag to resize"
            >
                 <GripVertical size={12} className="text-slate-600" />
            </div>

            {/* Preview Pane */}
            <div className="flex-1 bg-slate-200 flex flex-col min-w-[50px] relative">
               {/* Preview Toolbar */}
               <div className="h-10 bg-slate-100 border-b border-slate-300 flex items-center justify-between px-4 gap-2 flex-shrink-0">
                    <div className="flex items-center gap-2">
                         <div className="flex bg-slate-200 rounded p-0.5 border border-slate-300">
                             <button 
                                onClick={() => setDeviceMode('mobile')}
                                className={`p-1 rounded ${deviceMode === 'mobile' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                title="Mobile View"
                             >
                                 <Smartphone size={14} />
                             </button>
                             <button 
                                onClick={() => setDeviceMode('tablet')}
                                className={`p-1 rounded ${deviceMode === 'tablet' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                title="Tablet View"
                             >
                                 <Tablet size={14} />
                             </button>
                             <button 
                                onClick={() => setDeviceMode('desktop')}
                                className={`p-1 rounded ${deviceMode === 'desktop' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                title="Desktop View"
                             >
                                 <Monitor size={14} />
                             </button>
                         </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {snapshotCss && (
                            <button
                                onMouseDown={startCompare}
                                onMouseUp={stopCompare}
                                onMouseLeave={stopCompare}
                                onTouchStart={startCompare}
                                onTouchEnd={stopCompare}
                                className={`
                                    flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium border transition-all select-none
                                    ${isComparing 
                                        ? 'bg-blue-100 text-blue-700 border-blue-300 shadow-inner' 
                                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}
                                `}
                            >
                                <Eye size={12} />
                                {isComparing ? 'Showing Snapshot' : 'Hold to Compare'}
                            </button>
                        )}
                        {!snapshotCss && (
                             <button
                                onClick={handleTakeSnapshot}
                                className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium bg-white text-slate-600 border border-slate-300 hover:bg-slate-50"
                                title="Save current state as snapshot for comparison"
                             >
                                <History size={12} />
                                Snapshot
                            </button>
                        )}
                        
                        <div className="text-[10px] text-slate-400 font-mono px-2">
                            {deviceMode}
                        </div>
                    </div>
               </div>
               
               {/* Iframe Container */}
               <div className="flex-1 relative overflow-hidden">
                   {isDragging && <div className="absolute inset-0 z-50 bg-transparent" />}
                   <Preview html={generatedHtml} status={status} error={error} deviceMode={deviceMode} buildTick={buildTick} />
               </div>
            </div>
        </div>
      </div>

      {showThemeGallery && (
        <ThemeGalleryModal 
            onClose={() => setShowThemeGallery(false)}
            themes={THEME_GALLERY}
            loadTheme={loadTheme}
            isThemeActive={isThemeActive}
        />
      )}

      {showAiSettings && (
          <AiSettingsModal 
            onClose={() => setShowAiSettings(false)}
            aiSettings={aiSettings}
            setAiSettings={setAiSettings}
            isGeminiKeySelected={isGeminiKeySelected}
            setIsGeminiKeySelected={setIsGeminiKeySelected}
          />
      )}

      {showRestoreModal && (
          <RestoreSessionModal 
            onDiscard={discardSession}
            onRestore={restoreSession}
          />
      )}

      {showLogs && (
        <LogsModal 
            onClose={() => setShowLogs(false)}
            logs={logs}
        />
      )}

    </div>
  );
}

export default App;