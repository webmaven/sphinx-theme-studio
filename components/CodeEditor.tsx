import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Palette, Type, AlignLeft, X } from 'lucide-react';
import CodeMirror, { ReactCodeMirrorRef, Extension } from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { markdown } from '@codemirror/lang-markdown';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { AVAILABLE_FONTS } from '../constants';

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  language: string;
  readOnly?: boolean;
}

// Simple CSS formatter
const formatCss = (cssText: string): string => {
  let formatted = '';
  let indentLevel = 0;
  const indent = '  ';
  
  const clean = cssText.replace(/\s+/g, ' ').replace(/\s*\{\s*/g, '{').replace(/\s*\}\s*/g, '}').replace(/\s*;\s*/g, ';').trim();
  
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
  return formatted.replace(/\n\s*\n/g, '\n').replace(/^\s+/gm, (match) => match).trim();
};

export const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange, language, readOnly = false }) => {
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const [activeTool, setActiveTool] = useState<'color' | 'font' | null>(null);
  const [pickerColor, setPickerColor] = useState('#000000');

  // Map language string to CodeMirror extension
  const extensions = useMemo(() => {
    const exts: Extension[] = [];
    switch(language) {
      case 'python': exts.push(python()); break;
      case 'css': exts.push(css()); break;
      case 'html': exts.push(html()); break;
      case 'markdown': exts.push(markdown()); break;
      default: exts.push(markdown()); break;
    }
    return exts;
  }, [language]);

  const insertText = (text: string) => {
    const view = editorRef.current?.view;
    if (!view) return;
    
    view.dispatch(view.state.replaceSelection(text));
    view.focus();
  };

  const handleColorChange = (newColor: string) => {
    const view = editorRef.current?.view;
    if (!view) return;

    const state = view.state;
    const { from, to } = state.selection.main;
    
    // 1. Explicit selection
    if (from !== to) {
      view.dispatch(state.replaceSelection(newColor));
      view.focus();
      return;
    }

    // 2. Intelligent Replace
    const doc = state.doc;
    const line = doc.lineAt(from);
    const lineText = line.text;
    const cursor = from - line.from; // relative to line start

    // A. Hex Code Detection
    let start = -1;
    let end = -1;
    const lookbackLimit = Math.max(0, cursor - 10);

    for (let i = cursor - 1; i >= lookbackLimit; i--) {
        if (lineText[i] === '#') {
            const chunk = lineText.substring(i + 1, cursor);
            if (/^[0-9a-fA-F]*$/.test(chunk)) {
                start = i;
            }
            break;
        }
    }

    if (start !== -1) {
        let i = cursor;
        while (i < lineText.length && /[0-9a-fA-F]/.test(lineText[i])) {
            i++;
        }
        end = i;
        
        if (cursor >= start && cursor <= end) {
            const absStart = line.from + start;
            const absEnd = line.from + end;
            view.dispatch({ changes: { from: absStart, to: absEnd, insert: newColor } });
            view.focus();
            return;
        }
    }

    // B. Function Detection (rgb/rgba/hsl/hsla)
    const textBefore = lineText.substring(Math.max(0, cursor - 50), cursor);
    const fnMatch = textBefore.match(/(rgba?|hsla?)\([^)]*$/);

    if (fnMatch && fnMatch.index !== undefined) {
        const fnStartRelative = Math.max(0, cursor - 50) + fnMatch.index;
        
        const textAfter = lineText.substring(cursor);
        const closeIndex = textAfter.indexOf(')');
        
        if (closeIndex !== -1) {
             const absStart = line.from + fnStartRelative;
             const absEnd = from + closeIndex + 1;
             
             view.dispatch({ changes: { from: absStart, to: absEnd, insert: newColor } });
             view.focus();
             return;
        }
    }

    // C. Fallback
    insertText(newColor);
  };

  const handleFormat = () => {
    if (language === 'css') {
        const formatted = formatCss(code);
        onChange(formatted);
    }
  };

  const toggleTool = (tool: 'color' | 'font') => {
      if (tool === 'color' && activeTool !== 'color') {
          // Attempt to pick up color under cursor
          const view = editorRef.current?.view;
          if (view) {
              const state = view.state;
              const { from } = state.selection.main;
              const line = state.doc.lineAt(from);
              const cursor = from - line.from;
              const lineText = line.text;
              
              let foundColor = '#000000';
              
              // Hex logic (simplified from handleColorChange)
              for (let i = cursor - 1; i >= Math.max(0, cursor - 10); i--) {
                  if (lineText[i] === '#') {
                      let end = i + 1;
                      while (end < lineText.length && /[0-9a-fA-F]/.test(lineText[end])) end++;
                      
                      if (cursor >= i && cursor <= end) {
                          const hex = lineText.substring(i, end);
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

      <CodeMirror
        ref={editorRef}
        value={code}
        height="100%"
        theme={vscodeDark}
        extensions={extensions}
        onChange={onChange}
        readOnly={readOnly}
        basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightSpecialChars: true,
            history: true,
            foldGutter: true,
            drawSelection: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            syntaxHighlighting: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            crosshairCursor: true,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            closeBracketsKeymap: true,
            defaultKeymap: true,
            searchKeymap: true,
            historyKeymap: true,
            foldKeymap: true,
            completionKeymap: true,
            lintKeymap: true,
        }}
        className="flex-1 overflow-hidden text-sm"
      />
    </div>
  );
};
