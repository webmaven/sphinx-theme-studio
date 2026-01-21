import React, { useMemo } from 'react';
import { BuildStatus, DeviceMode } from '../types';
import { Loader2, AlertCircle } from 'lucide-react';
import { GOOGLE_FONTS_URL } from '../constants';

interface PreviewProps {
  html: string;
  status: BuildStatus;
  error?: string;
  deviceMode: DeviceMode;
  buildTick: number; // Incrementing counter to force refreshes
}

export const Preview: React.FC<PreviewProps> = ({ html, status, error, deviceMode, buildTick }) => {
  
  // Construct the iframe content using useMemo to avoid recalculating on every render
  // We use srcDoc instead of document.write to ensure a completely fresh Window context
  // for every build. This prevents issues where themes declare global 'const' variables
  // that would throw "Identifier already declared" if the window was reused.
  const srcDoc = useMemo(() => {
    if (!html) return '';

    // Basic error catcher injected into the iframe to show JS errors
    const errorCatcher = `
      <script>
        window.onerror = function(msg, url, line, col, error) {
          document.body.innerHTML = '<div style="color:red; padding:20px; font-family:sans-serif;"><h3>Preview Runtime Error</h3><p>' + msg + '</p><pre>' + (error ? error.stack : '') + '</pre></div>';
          return false;
        };
      </script>
    `;

    let finalHtml = html;
    
    // Inject Google Fonts at the end of head
    if (finalHtml.includes('</head>')) {
        finalHtml = finalHtml.replace('</head>', `<link rel="stylesheet" href="${GOOGLE_FONTS_URL}"></head>`);
    } else {
        // Fallback if no head tag (unlikely from Sphinx)
        finalHtml = `<head><link rel="stylesheet" href="${GOOGLE_FONTS_URL}"></head>` + finalHtml;
    }

    // Inject Error Catcher at the start of head
    if (finalHtml.includes('<head>')) {
        finalHtml = finalHtml.replace('<head>', `<head>${errorCatcher}`);
    } else {
        finalHtml = `<head>${errorCatcher}</head>` + finalHtml;
    }

    return finalHtml;
  }, [html]);
  
  // Generate a unique key for the iframe to force a re-render when the HTML content changes drastically
  // OR when the buildTick changes (user manually clicked build).
  const iframeKey = useMemo(() => {
      // We explicitly append buildTick to force a remount on every successful build action
      return `${buildTick}-${html ? html.length : 'empty'}`;
  }, [html, buildTick]);

  // Dimensions based on device mode
  const getContainerStyle = () => {
    switch (deviceMode) {
        case 'mobile':
            return { width: '375px', height: '100%', border: 'none' };
        case 'tablet':
            return { width: '768px', height: '100%', border: 'none' };
        case 'desktop':
        default:
            return { width: '100%', height: '100%', border: 'none' };
    }
  };

  const containerStyle = getContainerStyle();

  if (status === BuildStatus.LOADING_PYODIDE || status === BuildStatus.INSTALLING_PACKAGES) {
      return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
              <p className="text-sm font-medium">Initializing Python Runtime...</p>
              <p className="text-xs mt-2 opacity-75">Loading Pyodide & Sphinx Core</p>
          </div>
      );
  }

  if (error) {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 text-red-600 p-8 text-center">
            <AlertCircle className="w-12 h-12 mb-4" />
            <h3 className="text-lg font-bold mb-2">Build Error</h3>
            <pre className="text-xs bg-red-100 p-4 rounded text-left overflow-auto max-w-full whitespace-pre-wrap">
                {error}
            </pre>
        </div>
    );
  }

  return (
    <div className={`w-full h-full bg-slate-200 flex items-start justify-center overflow-auto p-4 transition-all duration-300 ${deviceMode !== 'desktop' ? 'shadow-inner' : ''} relative`}>
        {status === BuildStatus.BUILDING && (
             <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-sm flex items-center justify-center">
                <div className="bg-white p-4 rounded-full shadow-lg">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
            </div>
        )}
        
        <div 
            style={containerStyle} 
            className={`bg-white transition-all duration-300 relative ${deviceMode !== 'desktop' ? 'shadow-2xl rounded-lg overflow-hidden my-4 ring-4 ring-slate-900/10' : ''}`}
        >
            <iframe 
                key={iframeKey}
                title="Theme Preview"
                className="w-full h-full block bg-white"
                sandbox="allow-same-origin allow-scripts allow-modals allow-forms"
                srcDoc={srcDoc}
            />
        </div>
    </div>
  );
};