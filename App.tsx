import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    FileCode, 
    FileType as FileIcon, 
    Play, 
    Download, 
    Wand2, 
    Settings, 
    LayoutTemplate,
    RefreshCw,
    Smartphone,
    Tablet,
    Monitor,
    Eye,
    History,
    Palette,
    Menu,
    ChevronLeft,
    X,
    GripVertical,
    CheckCircle2,
    ScrollText,
    GitFork,
    RotateCcw,
    Trash2,
    Save
} from 'lucide-react';
import { pyodideService } from './services/pyodideService';
import { generateThemeStyles } from './services/aiService';
import { CodeEditor } from './components/CodeEditor';
import { Preview } from './components/Preview';
import { ThemeFiles, FileType, BuildStatus, DeviceMode, AiSettings, AiProvider } from './types';
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

  // Session Restore State
  const [hasSavedSession, setHasSavedSession] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  // Initialize Pyodide on mount and check storage
  useEffect(() => {
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

        } catch (e) {
            setStatus(BuildStatus.ERROR);
            setError("Failed to load Python environment. Please refresh.");
        }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save logic
  useEffect(() => {
    const timer = setTimeout(() => {
        localStorage.setItem(STORAGE_KEY_FILES, JSON.stringify(files));
        localStorage.setItem(STORAGE_KEY_AI, JSON.stringify(aiSettings));
    }, 1000);
    return () => clearTimeout(timer);
  }, [files, aiSettings]);

  // Warn on close if unsaved? 
  // Since we auto-save to localStorage, we don't necessarily need to block unload,
  // but it's good practice in editors to ensure the write happened.
  useEffect(() => {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
          // Only if we have pending changes that might not have hit LS yet? 
          // Simplest is to just rely on the auto-save interval being fast enough.
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

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
    setLogs([]);

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

    // First use check: if provider is not gemini and no key, OR if first run
    // Actually, prompt says "Prompt user for API key on first use".
    // We'll check if configuration is valid for selected provider.
    if (aiSettings.provider === 'openai' && !aiSettings.openAiKey) {
        setShowAiSettings(true);
        return;
    }
    if (aiSettings.provider === 'anthropic' && !aiSettings.anthropicKey) {
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
      
      {/* Sidebar */}
      <div 
        className={`
            bg-[#1e293b] flex flex-col border-r border-slate-700 shadow-xl z-20 flex-shrink-0 transition-all duration-300 ease-in-out
            ${sidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full opacity-0 overflow-hidden'}
        `}
      >
        <div className="p-4 border-b border-slate-700 flex items-center justify-between min-w-[18rem]">
            <div className="flex items-center gap-2">
                <LayoutTemplate className="w-6 h-6 text-blue-400" />
                <h1 className="font-bold text-lg tracking-tight">Sphinx Studio</h1>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white">
                <ChevronLeft size={20} />
            </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar min-w-[18rem]">
            <div className="px-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Source Files
            </div>
            <ul className="space-y-1 mb-6">
                <FileTab 
                    label="index.rst" 
                    icon={<FileIcon size={16} />} 
                    isActive={activeFile === 'rst'} 
                    onClick={() => setActiveFile('rst')} 
                />
                 <FileTab 
                    label="custom.css" 
                    icon={<FileCode size={16} />} 
                    isActive={activeFile === 'css'} 
                    onClick={() => setActiveFile('css')} 
                />
                 <FileTab 
                    label="conf.py" 
                    icon={<Settings size={16} />} 
                    isActive={activeFile === 'conf'} 
                    onClick={() => setActiveFile('conf')} 
                />
                <FileTab 
                    label="layout.html" 
                    icon={<CodeIcon size={16} />} 
                    isActive={activeFile === 'html'} 
                    onClick={() => setActiveFile('html')} 
                />
            </ul>

            <div className="px-4 mb-4">
                 <button 
                    onClick={() => setShowThemeGallery(true)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-300 transition-colors group"
                >
                    <span className="flex items-center gap-2">
                        <Palette size={16} className="text-blue-400" />
                        Theme Gallery
                    </span>
                    <ChevronLeft size={16} className="rotate-180 opacity-50 group-hover:opacity-100 transition-opacity" />
                </button>
            </div>

            <div className="px-4 mb-2 flex items-center justify-between">
                 <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Assistant</span>
                 <button 
                    onClick={() => setShowAiSettings(true)}
                    className="text-slate-500 hover:text-blue-400 transition-colors"
                    title="AI Settings"
                 >
                     <Settings size={12} />
                 </button>
            </div>
            <div className="px-4">
                <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                    <label className="text-xs text-slate-400 block mb-2">Describe style changes:</label>
                    <textarea 
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none resize-none mb-2"
                        rows={3}
                        placeholder="e.g. Make the sidebar headers darker and font larger..."
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                    />
                    <button 
                        onClick={handleAiGenerate}
                        disabled={isAiGenerating || !aiPrompt}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold py-2 px-3 rounded flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isAiGenerating ? <RefreshCw className="animate-spin w-3 h-3"/> : <Wand2 className="w-3 h-3" />}
                        Generate Style
                    </button>
                </div>
            </div>
        </nav>

        <div className="p-4 border-t border-slate-700 min-w-[18rem]">
            <button 
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-white text-sm py-2 transition-colors"
            >
                <Download size={16} />
                Export Theme
            </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Toolbar */}
        <header className="h-14 bg-[#0f172a] border-b border-slate-800 flex items-center justify-between px-4 flex-shrink-0">
            <div className="flex items-center gap-4">
                {!sidebarOpen && (
                    <button 
                        onClick={() => setSidebarOpen(true)}
                        className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
                        title="Show Sidebar"
                    >
                        <Menu size={20} />
                    </button>
                )}
                <span className="text-slate-400 text-sm hidden sm:inline truncate">
                    Editing: <span className="text-blue-400 font-mono ml-1">{activeFile === 'rst' ? 'index.rst' : activeFile === 'css' ? 'custom.css' : activeFile === 'html' ? 'layout.html' : 'conf.py'}</span>
                </span>
                <span className="text-xs text-slate-500 italic">
                    {hasSavedSession ? '• Changes saved locally' : ''}
                </span>
            </div>
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => setShowLogs(true)}
                    className={`
                        text-xs font-mono px-3 py-1.5 rounded border transition-colors flex items-center gap-2
                        ${logs.length > 0 && error ? 'bg-red-900/30 border-red-800 text-red-400 hover:bg-red-900/50' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'}
                    `}
                >
                    <ScrollText size={14} />
                    Logs
                    {error && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                </button>
                
                <div className="w-px h-6 bg-slate-800 mx-1"></div>

                <div className="text-xs text-slate-500 mr-2 flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${status === BuildStatus.READY ? 'bg-green-500' : status === BuildStatus.ERROR ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'}`} />
                    {status === BuildStatus.READY ? 'Pyodide Ready' : status === BuildStatus.BUILDING ? 'Building...' : 'Loading Sphinx...'}
                </div>
                <button 
                    onClick={onBuildClick}
                    disabled={status !== BuildStatus.READY}
                    className="bg-green-600 hover:bg-green-500 text-white text-sm font-semibold py-1.5 px-4 rounded-full flex items-center gap-2 shadow-lg shadow-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                    <Play size={14} fill="currentColor" />
                    Build
                </button>
            </div>
        </header>

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

      {/* Theme Gallery Modal */}
      {showThemeGallery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-900/50">
                    <div className="flex items-center gap-2">
                        <Palette className="text-blue-400" size={20} />
                        <h2 className="text-xl font-bold text-white">Theme Gallery</h2>
                    </div>
                    <button 
                        onClick={() => setShowThemeGallery(false)}
                        className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {THEME_GALLERY.map(theme => (
                        <button
                            key={theme.id}
                            onClick={() => loadTheme(theme.id)}
                            className="group relative flex flex-col text-left bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-lg p-4 transition-all hover:shadow-lg hover:shadow-blue-500/10"
                        >
                            <div className="mb-3 flex items-start justify-between w-full">
                                <div className="p-2 bg-slate-900 rounded-md text-blue-400 group-hover:text-blue-300">
                                    <LayoutTemplate size={24} />
                                </div>
                                {isThemeActive(theme.id) && (
                                    <div className="flex items-center gap-1 text-green-400 text-[10px] font-bold uppercase tracking-wider bg-green-400/10 px-2 py-1 rounded-full">
                                        <CheckCircle2 size={12} />
                                        Active
                                    </div>
                                )}
                            </div>
                            <h3 className="font-bold text-slate-200 group-hover:text-white mb-1">{theme.name}</h3>
                            <p className="text-xs text-slate-400 leading-relaxed mb-4 flex-1">
                                {theme.description}
                            </p>
                            <div className="w-full py-2 bg-slate-900 rounded text-center text-xs font-semibold text-slate-400 group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-colors flex items-center justify-center gap-2">
                                <GitFork size={14} />
                                Fork & Edit
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* AI Settings Modal */}
      {showAiSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <Settings size={18} className="text-blue-400" />
                          AI Settings
                      </h3>
                      <button onClick={() => setShowAiSettings(false)} className="text-slate-400 hover:text-white"><X size={18}/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Provider</label>
                          <select 
                              className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white focus:border-blue-500 outline-none"
                              value={aiSettings.provider}
                              onChange={(e) => setAiSettings(prev => ({ ...prev, provider: e.target.value as AiProvider }))}
                          >
                              <option value="gemini">Google Gemini</option>
                              <option value="openai">OpenAI (GPT-4)</option>
                              <option value="anthropic">Anthropic (Claude)</option>
                          </select>
                      </div>
                      
                      {aiSettings.provider === 'gemini' && (
                          <div className="p-3 bg-blue-900/20 border border-blue-900/50 rounded text-xs text-blue-200 flex items-start gap-2">
                                <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                                <div>
                                    Using system-provided API key. <br/>
                                    <span className="opacity-70">Requests are handled by the built-in Gemini environment.</span>
                                </div>
                          </div>
                      )}

                      {aiSettings.provider === 'openai' && (
                          <div>
                              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">OpenAI API Key</label>
                              <input 
                                  type="password" 
                                  placeholder="sk-..." 
                                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white focus:border-blue-500 outline-none"
                                  value={aiSettings.openAiKey}
                                  onChange={(e) => setAiSettings(prev => ({ ...prev, openAiKey: e.target.value }))}
                              />
                              <p className="text-[10px] text-slate-500 mt-1">Key is stored locally in your browser.</p>
                          </div>
                      )}

                      {aiSettings.provider === 'anthropic' && (
                          <div>
                              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Anthropic API Key</label>
                              <input 
                                  type="password" 
                                  placeholder="sk-ant-..." 
                                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white focus:border-blue-500 outline-none"
                                  value={aiSettings.anthropicKey}
                                  onChange={(e) => setAiSettings(prev => ({ ...prev, anthropicKey: e.target.value }))}
                              />
                              <p className="text-[10px] text-slate-500 mt-1">Key is stored locally in your browser. Requires CORS support.</p>
                          </div>
                      )}
                  </div>
                  <div className="p-4 border-t border-slate-700 flex justify-end">
                      <button 
                          onClick={() => setShowAiSettings(false)}
                          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                      >
                          Done
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Restore Session Modal */}
      {showRestoreModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md p-6 text-center animate-in zoom-in-95 duration-200">
                  <RotateCcw className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-white mb-2">Restore Previous Session?</h2>
                  <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                      We found unsaved changes from your last visit. Would you like to pick up where you left off?
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                      <button 
                          onClick={discardSession}
                          className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                      >
                          <Trash2 size={16} />
                          Discard
                      </button>
                      <button 
                          onClick={restoreSession}
                          className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-500 font-medium transition-colors shadow-lg shadow-blue-900/20"
                      >
                          <RotateCcw size={16} />
                          Restore
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Logs Modal */}
      {showLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#1e1e1e] border border-slate-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-3 border-b border-slate-700 flex items-center justify-between bg-slate-800">
                    <div className="flex items-center gap-2">
                        <ScrollText className="text-slate-400" size={18} />
                        <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Sphinx Build Logs</h2>
                    </div>
                    <button 
                        onClick={() => setShowLogs(false)}
                        className="text-slate-400 hover:text-white hover:bg-slate-700 p-1 rounded transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-4 bg-black font-mono text-xs leading-relaxed">
                    {logs.length === 0 ? (
                        <div className="text-slate-500 italic">No logs available.</div>
                    ) : (
                        logs.map((log, i) => (
                            <div key={i} className={`${log.toLowerCase().includes('error') ? 'text-red-400' : log.toLowerCase().includes('warning') ? 'text-yellow-400' : 'text-slate-300'} border-b border-white/5 pb-1 mb-1 whitespace-pre-wrap break-all`}>
                                {log}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
      )}

    </div>
  );
}

// Helper Component for Sidebar Tabs
const FileTab = ({ label, icon, isActive, onClick }: { label: string, icon: React.ReactNode, isActive: boolean, onClick: () => void }) => (
    <li 
        onClick={onClick}
        className={`
            px-4 py-2 cursor-pointer flex items-center gap-3 text-sm transition-colors border-l-2
            ${isActive 
                ? 'bg-slate-800 text-blue-400 border-blue-500' 
                : 'text-slate-400 border-transparent hover:bg-slate-800/50 hover:text-slate-200'}
        `}
    >
        {icon}
        <span className="font-medium">{label}</span>
    </li>
);

// Helper for generic code icon
const CodeIcon = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6"></polyline>
        <polyline points="8 6 2 12 8 18"></polyline>
    </svg>
);

export default App;
