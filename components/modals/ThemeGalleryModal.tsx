import React from 'react';
import { Palette, X, LayoutTemplate, CheckCircle2, GitFork } from 'lucide-react';
import { ThemePreset } from '../../types';

interface ThemeGalleryModalProps {
  onClose: () => void;
  themes: ThemePreset[];
  loadTheme: (id: string) => void;
  isThemeActive: (id: string) => boolean;
}

export const ThemeGalleryModal: React.FC<ThemeGalleryModalProps> = ({
  onClose,
  themes,
  loadTheme,
  isThemeActive
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-900/50">
                <div className="flex items-center gap-2">
                    <Palette className="text-blue-400" size={20} />
                    <h2 className="text-xl font-bold text-white">Theme Gallery</h2>
                </div>
                <button 
                    onClick={onClose}
                    className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-full transition-colors"
                >
                    <X size={20} />
                </button>
            </div>
            
            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {themes.map(theme => (
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
  );
};