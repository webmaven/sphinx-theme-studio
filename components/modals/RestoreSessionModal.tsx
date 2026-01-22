import React from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';

interface RestoreSessionModalProps {
  onDiscard: () => void;
  onRestore: () => void;
}

export const RestoreSessionModal: React.FC<RestoreSessionModalProps> = ({ onDiscard, onRestore }) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
        <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md p-6 text-center animate-in zoom-in-95 duration-200">
            <RotateCcw className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Restore Previous Session?</h2>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                We found unsaved changes from your last visit. Would you like to pick up where you left off?
            </p>
            <div className="grid grid-cols-2 gap-3">
                <button 
                    onClick={onDiscard}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                    <Trash2 size={16} />
                    Discard
                </button>
                <button 
                    onClick={onRestore}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-500 font-medium transition-colors shadow-lg shadow-blue-900/20"
                >
                    <RotateCcw size={16} />
                    Restore
                </button>
            </div>
        </div>
    </div>
  );
};