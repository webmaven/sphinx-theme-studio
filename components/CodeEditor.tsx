import React, { useRef, useState } from 'react';
import { Palette, Type, AlignLeft, X } from 'lucide-react';
import { AVAILABLE_FONTS } from '../constants';

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  language: string;
  readOnly?: boolean;
}

// Simple CSS formatter
const formatCss = (css: string): string => {
  let formatted = '';
  let indentLevel = 0;
  const indent = '  ';
  
  // Collapse whitespace but preserve some structure is hard without full parser
  // Simple approach: cleanup lines and re-indent
  const clean = css.replace(/\s+/g, ' ').replace(/\s*\{\s*/g, '{').replace(/\s*\}\s*/g, '}').replace(/\s*;\s*/g, ';').trim();
  
  let i = 0;
  while(i < clean.length) {
    const char = clean[i];
    if (char === '{') {
      formatted += ' {\n' + indent.repeat(++indentLevel);
    } else if (char === '}') {
      formatted += '\n' + indent.repeat(--indentLevel) + '}\n' + indent.repeat(indentLevel);
    } else if (char === ';') {
      formatted += ';\n' + indent.repeat(indentLevel);
    } else {
      formatted += char;
    }
    i++;
  }
  // Cleanup artifacts
  return formatted.replace(/\n\s*\n/g, '\n').replace(/^\s+/gm, (match) => match).trim();
};

export const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange, language, readOnly = false }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeTool, setActiveTool] = useState<'color' | 'font' | null>(null);
  const [pickerColor, setPickerColor] = useState('#000000');

  const insertText = (text: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const val = ta.value;
    
    const newVal = val.substring(0, start) + text + val.substring(end);
    onChange(newVal);
    
    // Defer cursor update to next tick
    setTimeout(() => {
        if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + text.length;
            textareaRef.current.focus();
        }
    }, 0);
  };

  const handleColorChange = (newColor: string) => {
    const ta = textareaRef.current;
    if (!ta) return;

    const val = ta.value;
    const cursor = ta.selectionStart;
    const selectionEnd = ta.selectionEnd;

    // 1. If user has explicitly selected text, standard replace behavior
    if (cursor !== selectionEnd) {
        insertText(newColor);
        return;
    }

    // 2. Intelligent Replace Logic
    // We want to detect if the cursor is inside or adjacent to a color value and replace it.

    // A. Hex Code Detection
    // Look backwards from cursor for a '#'
    let start = -1;
    let end = -1;
    const lookbackLimit = Math.max(0, cursor - 10);
    
    for (let i = cursor - 1; i >= lookbackLimit; i--) {
        if (val[i] === '#') {
            // Check if everything between # and cursor is valid hex char
            const chunk = val.substring(i + 1, cursor);
            if (/^[0-9a-fA-F]*$/.test(chunk)) {
                start = i;
            }
            break;
        }
    }

    // If we found a start '#', look forward for the end of the hex code
    if (start !== -1) {
        let i = cursor;
        while (i < val.length && /[0-9a-fA-F]/.test(val[i])) {
            i++;
        }
        // Verify it looks like a hex code (length 3, 4, 6, 8 usually, but we be flexible for editing)
        end = i;
        
        // Check if cursor was actually "inside" this token
        if (cursor >= start && cursor <= end) {
            const newVal = val.substring(0, start) + newColor + val.substring(end);
            onChange(newVal);
            
            // Move cursor to end of inserted color
            setTimeout(() => {
                if (textareaRef.current) {
                    const newCursorPos = start + newColor.length;
                    textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newCursorPos;
                    textareaRef.current.focus();
                }
            }, 0);
            return;
        }
    }

    // B. Function Detection (rgb, rgba, hsl, hsla)
    // Look backwards for function start
    const textBefore = val.substring(Math.max(0, cursor - 50), cursor);
    const fnMatch = textBefore.match(/(rgba?|hsla?)\([^)]*$/);
    
    if (fnMatch) {
        const fnStart = Math.max(0, cursor - 50) + fnMatch.index!;
        
        // Look forward for closing parenthesis
        const textAfter = val.substring(cursor);
        const closeIndex = textAfter.indexOf(')');
        
        if (closeIndex !== -1) {
            const fnEnd = cursor + closeIndex + 1;
            const newVal = val.substring(0, fnStart) + newColor + val.substring(fnEnd);
            onChange(newVal);
            
            setTimeout(() => {
                if (textareaRef.current) {
                    const newCursorPos = fnStart + newColor.length;
                    textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newCursorPos;
                    textareaRef.current.focus();
                }
            }, 0);
            return;
        }
    }

    // C. Fallback: Just insert
    insertText(newColor);
  };

  const handleFormat = () => {
    if (language === 'css') {
        onChange(formatCss(code));
    }
  };

  const toggleTool = (tool: 'color' | 'font') => {
      if (tool === 'color' && activeTool !== 'color') {
          // Initialize picker color from cursor
          const ta = textareaRef.current;
          if (ta) {
            const val = ta.value;
            const cursor = ta.selectionStart;
            let foundColor = '#000000';
            
            // Hex detection (simplified from handleColorChange)
            for (let i = cursor - 1; i >= Math.max(0, cursor - 10); i--) {
                if (val[i] === '#') {
                     let end = i + 1;
                     while (end < val.length && /[0-9a-fA-F]/.test(val[end])) end++;
                     
                     if (cursor >= i && cursor <= end) {
                         const hex = val.substring(i, end);
                         if (hex.length === 7) foundColor = hex;
                         else if (hex.length === 4) foundColor = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
                     }
                     break; 
                }
            }
            setPickerColor(foundColor);
          }
      }
      setActiveTool(current => current === tool ? null : tool);
  };

  return (
    <div className="relative w-full h-full flex flex-col font-mono text-sm group">
      {/* Editor Toolbar - Only visible for CSS for now */}
      {language === 'css' && !readOnly && (
        <div className="absolute top-2 right-4 z-30 flex flex-col items-end pointer-events-none">
            {/* Main Toolbar */}
            <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700 shadow-xl pointer-events-auto">
                {/* Color Picker Toggle */}
                <div className="relative">
                    <button 
                        onClick={() => toggleTool('color')} 
                        className={`p-1.5 rounded transition-colors ${activeTool === 'color' ? 'bg-slate-700 text-blue-400' : 'text-slate-300 hover:bg-slate-700'}`} 
                        title="Insert Color"
                    >
                    <Palette size={14} />
                    </button>
                    
                    {activeTool === 'color' && (
                        <div className="absolute top-full right-0 mt-2 p-3 bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-52 z-50 animate-in fade-in zoom-in-95 duration-100">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Color Picker</span>
                                <button onClick={() => setActiveTool(null)} className="text-slate-500 hover:text-white transition-colors"><X size={12}/></button>
                            </div>
                            <div className="flex gap-2 items-center bg-slate-900 p-2 rounded border border-slate-700">
                                <input 
                                        type="color" 
                                        className="w-8 h-8 cursor-pointer rounded border-none p-0 bg-transparent"
                                        value={pickerColor}
                                        onChange={(e) => {
                                            setPickerColor(e.target.value);
                                            handleColorChange(e.target.value);
                                        }} 
                                />
                                <span className="text-xs text-slate-400">Click swatch to pick</span>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Font Picker Toggle */}
                <div className="relative">
                    <button 
                        onClick={() => toggleTool('font')} 
                        className={`p-1.5 rounded transition-colors ${activeTool === 'font' ? 'bg-slate-700 text-blue-400' : 'text-slate-300 hover:bg-slate-700'}`} 
                        title="Select Font"
                    >
                    <Type size={14} />
                    </button>

                    {activeTool === 'font' && (
                        <div className="absolute top-full right-0 mt-2 p-3 bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-64 z-50 animate-in fade-in zoom-in-95 duration-100">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Insert Font Family</span>
                                <button onClick={() => setActiveTool(null)} className="text-slate-500 hover:text-white transition-colors"><X size={12}/></button>
                            </div>
                            <select 
                                className="w-full bg-slate-900 text-xs text-slate-300 p-2 border border-slate-600 rounded focus:outline-none focus:border-blue-500"
                                onChange={(e) => { 
                                    if(e.target.value) {
                                        insertText(e.target.value);
                                        e.target.value = ""; // Reset
                                        setActiveTool(null);
                                    }
                                }}
                            >
                                <option value="">Select a font...</option>
                                {AVAILABLE_FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                            </select>
                        </div>
                    )}
                </div>
        
                <div className="w-px h-4 bg-slate-700 mx-1 my-auto"></div>

                {/* Format Button */}
                <button onClick={handleFormat} className="p-1.5 hover:bg-slate-700 rounded text-slate-300 transition-colors" title="Format CSS">
                    <AlignLeft size={14} />
                </button>
            </div>
        </div>
      )}

      <div className="absolute top-0 right-0 px-2 py-1 text-xs text-slate-500 bg-slate-900 rounded-bl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        {language}
      </div>
      <textarea
        ref={textareaRef}
        className="flex-1 w-full h-full p-4 bg-[#1e293b] text-[#e2e8f0] resize-none focus:outline-none border-none leading-relaxed custom-scrollbar pt-12"
        value={code}
        onChange={(e) => onChange(e.target.value)}
        onClick={() => setActiveTool(null)}
        spellCheck={false}
        readOnly={readOnly}
        style={{ fontFamily: '"Fira Code", monospace' }}
      />
    </div>
  );
};