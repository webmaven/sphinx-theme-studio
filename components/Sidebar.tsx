import React from 'react';
import { 
    LayoutTemplate, 
    ChevronLeft, 
    FileType as FileIcon, 
    FileCode, 
    Settings, 
    Palette, 
    RefreshCw, 
    Wand2, 
    Download 
} from 'lucide-react';
import { FileType } from '../types';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  activeFile: FileType;
  setActiveFile: (file: FileType) => void;
  onOpenThemeGallery: () => void;
  onOpenAiSettings: () => void;
  aiPrompt: string;
  setAiPrompt: (prompt: string) => void;
  onAiGenerate: () => void;
  isAiGenerating: boolean;
  onDownload: () => void;
}

const CodeIcon = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6"></polyline>
        <polyline points="8 6 2 12 8 18"></polyline>
    </svg>
);

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

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  setIsOpen,
  activeFile,
  setActiveFile,
  onOpenThemeGallery,
  onOpenAiSettings,
  aiPrompt,
  setAiPrompt,
  onAiGenerate,
  isAiGenerating,
  onDownload
}) => {
  return (
    <div 
        className={`
            bg-[#1e293b] flex flex-col border-r border-slate-700 shadow-xl z-20 flex-shrink-0 transition-all duration-300 ease-in-out
            ${isOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full opacity-0 overflow-hidden'}
        `}
    >
        <div className="p-4 border-b border-slate-700 flex items-center justify-between min-w-[18rem]">
            <div className="flex items-center gap-2">
                <LayoutTemplate className="w-6 h-6 text-blue-400" />
                <h1 className="font-bold text-lg tracking-tight">Sphinx Studio</h1>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
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
                    onClick={onOpenThemeGallery}
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
                    onClick={onOpenAiSettings}
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
                        onClick={onAiGenerate}
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
                onClick={onDownload}
                className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-white text-sm py-2 transition-colors"
            >
                <Download size={16} />
                Export Theme
            </button>
        </div>
      </div>
  );
};