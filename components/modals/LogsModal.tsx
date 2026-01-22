import React from 'react';
import { ScrollText, X } from 'lucide-react';

interface LogsModalProps {
  onClose: () => void;
  logs: string[];
}

export const LogsModal: React.FC<LogsModalProps> = ({ onClose, logs }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-[#1e1e1e] border border-slate-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-3 border-b border-slate-700 flex items-center justify-between bg-slate-800">
                <div className="flex items-center gap-2">
                    <ScrollText className="text-slate-400" size={18} />
                    <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Sphinx Build Logs</h2>
                </div>
                <button 
                    onClick={onClose}
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
  );
};