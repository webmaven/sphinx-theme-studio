import React from 'react';
import { Menu, ScrollText, Play } from 'lucide-react';
import { FileType, BuildStatus } from '../types';

interface ToolbarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeFile: FileType;
  hasSavedSession: boolean;
  status: BuildStatus;
  error?: string;
  logsCount: number;
  onShowLogs: () => void;
  onBuild: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  sidebarOpen,
  setSidebarOpen,
  activeFile,
  hasSavedSession,
  status,
  error,
  logsCount,
  onShowLogs,
  onBuild
}) => {
  return (
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
                onClick={onShowLogs}
                className={`
                    text-xs font-mono px-3 py-1.5 rounded border transition-colors flex items-center gap-2
                    ${logsCount > 0 && error ? 'bg-red-900/30 border-red-800 text-red-400 hover:bg-red-900/50' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'}
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
                onClick={onBuild}
                disabled={status !== BuildStatus.READY}
                className="bg-green-600 hover:bg-green-500 text-white text-sm font-semibold py-1.5 px-4 rounded-full flex items-center gap-2 shadow-lg shadow-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            >
                <Play size={14} fill="currentColor" />
                Build
            </button>
        </div>
    </header>
  );
};