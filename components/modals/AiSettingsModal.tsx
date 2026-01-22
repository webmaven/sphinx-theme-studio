import React from 'react';
import { Settings, X, CheckCircle2 } from 'lucide-react';
import { AiSettings, AiProvider } from '../../types';

interface AiSettingsModalProps {
  onClose: () => void;
  aiSettings: AiSettings;
  setAiSettings: (settings: (prev: AiSettings) => AiSettings) => void;
  isGeminiKeySelected: boolean;
  setIsGeminiKeySelected: (selected: boolean) => void;
}

export const AiSettingsModal: React.FC<AiSettingsModalProps> = ({
  onClose,
  aiSettings,
  setAiSettings,
  isGeminiKeySelected,
  setIsGeminiKeySelected
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Settings size={18} className="text-blue-400" />
                    AI Settings
                </h3>
                <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18}/></button>
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
                    <div className={`p-3 border rounded text-xs flex items-center justify-between gap-3 transition-colors ${isGeminiKeySelected ? 'bg-green-900/10 border-green-900/20 text-green-300' : 'bg-amber-900/10 border-amber-900/20 text-amber-300'}`}>
                          <div className="flex items-start gap-3">
                                <CheckCircle2 size={16} className={`mt-0.5 shrink-0 ${isGeminiKeySelected ? 'text-green-500' : 'text-amber-500'}`} />
                                <div>
                                    <strong className="block mb-0.5 font-medium">{isGeminiKeySelected ? 'API Key Active' : 'API Key Required'}</strong>
                                    <span className="opacity-70 leading-relaxed block">
                                        {isGeminiKeySelected 
                                            ? 'Using your selected Google AI Studio API key.' 
                                            : 'You must select a Google AI Studio API key to use Gemini.'}
                                    </span>
                                </div>
                          </div>
                          {window.aistudio && (
                              <button 
                                onClick={async () => {
                                    await window.aistudio!.openSelectKey();
                                    const selected = await window.aistudio!.hasSelectedApiKey();
                                    setIsGeminiKeySelected(selected);
                                }}
                                className="shrink-0 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-slate-500 text-slate-200 rounded text-xs font-semibold transition-all shadow-sm"
                              >
                                {isGeminiKeySelected ? 'Change Key' : 'Select Key'}
                              </button>
                          )}
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
                    onClick={onClose}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                >
                    Done
                </button>
            </div>
        </div>
    </div>
  );
};