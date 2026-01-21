import { ThemePreset } from './types';

export const INITIAL_RST = `
Welcome to Sphinx Theme Studio
==============================

This is a live preview running a **real Sphinx build** in your browser via Pyodide.

.. note::
   You are editing **index.rst**. The layout is controlled by the selected theme in **conf.py**.

.. toctree::
   :maxdepth: 2
   :caption: Table of Contents

   Introduction <self>
   Typography <self>

Typography & Elements
---------------------

*   This is a bullet list item.
*   Here is *italic text* and **bold text**.
*   Inline code looks like \`print("Hello")\`.

Blockquotes
~~~~~~~~~~~

    "Design is not just what it looks like and feels like. Design is how it works."
    
    -- Steve Jobs

Tables
------

+----------------+----------------+------------------+
| Feature        | Support        | Notes            |
+================+================+==================+
| **Tables**     | Yes            | Complex layouts  |
+----------------+----------------+------------------+
| **Images**     | Yes            | External URLs    |
+----------------+----------------+------------------+

Code Blocks
-----------

.. code-block:: python
    :linenos:

    def hello_sphinx():
        print("This is syntax highlighted code!")

Admonitions
-----------

.. warning::
   This is a warning! Themes usually color these yellow or red.

.. tip::
   Here is a helpful tip. Usually colored green or blue.
`;

export const INITIAL_CSS = `/* Custom CSS Overrides */
/* This file is loaded after the theme's CSS. */
/* Use it to customize fonts, colors, or spacing. */

/* Example: Override the sidebar background */
/* 
.wy-nav-side {
    background: #2980b9;
}
*/
`;

// Only used if the user actively edits the layout.html tab, which maps to _templates/layout.html
export const INITIAL_HTML = `{# _templates/layout.html #}
{% extends "!layout.html" %}

{# 
   This template extends the theme's default layout.
   You can override blocks here.
#}

{% block footer %}
{{ super() }}
<div class="custom-footer">
    Custom footer added via layout.html override.
</div>
{% endblock %}
`;

export const INITIAL_CONF = `# conf.py - Sphinx Configuration

project = 'Theme Studio Preview'
copyright = '2024, Editor'
author = 'Editor'

# The theme to use for HTML and HTML Help pages.
# Try changing this to 'alabaster', 'furo', 'sphinx_book_theme'
html_theme = 'sphinx_rtd_theme'

# Theme options are theme-specific and customize the look and feel
html_theme_options = {
    'navigation_depth': 4,
    'collapse_navigation': False,
    'sticky_navigation': True,
}

# Add any Sphinx extension module names here, as strings.
extensions = [
    'sphinx.ext.autodoc',
    'sphinx.ext.viewcode',
    'sphinx.ext.githubpages',
]

# Add custom css
html_static_path = ['_static']
html_css_files = [
    'custom.css',
]
`;

export const PYTHON_BUILD_SCRIPT = `
import sys
import os
import shutil
from pathlib import Path
import base64
import mimetypes
import json
import re
import io

# Import Sphinx
from sphinx.cmd.build import main as sphinx_main
from bs4 import BeautifulSoup

def build_docs(rst_content, html_template, css_content, conf_content):
    # Capture output
    stdout_capture = io.StringIO()
    stderr_capture = io.StringIO()
    old_stdout = sys.stdout
    old_stderr = sys.stderr
    sys.stdout = stdout_capture
    sys.stderr = stderr_capture
    
    status = "success"
    message = ""
    html_output = ""

    try:
        # Setup VFS
        base_dir = Path("/tmp/sphinx_project")
        if base_dir.exists():
            shutil.rmtree(base_dir)
        base_dir.mkdir(parents=True)
        
        src_dir = base_dir / "source"
        build_dir = base_dir / "build"
        src_dir.mkdir()
        (src_dir / "_static").mkdir()
        (src_dir / "_templates").mkdir()
        
        # Write files
        (src_dir / "conf.py").write_text(conf_content, encoding="utf-8")
        (src_dir / "index.rst").write_text(rst_content, encoding="utf-8")
        (src_dir / "_static" / "custom.css").write_text(css_content, encoding="utf-8")
        
        # Only write layout override if it looks used
        if html_template and "extends" in html_template:
            (src_dir / "_templates" / "layout.html").write_text(html_template, encoding="utf-8")

        print("Starting Sphinx build...")
        # Run Sphinx
        # -b html, source, build
        exit_code = sphinx_main(['-b', 'html', str(src_dir), str(build_dir)])
        
        if exit_code != 0:
             status = "error"
             message = "Sphinx build returned non-zero exit code."
             print(f"Sphinx exited with code {exit_code}")
        else:
             print("Sphinx build finished successfully.")
        
        # Try to find index.html even if exit code is non-zero (sometimes warnings cause non-zero but HTML is generated)
        index_html_path = build_dir / "index.html"
        if index_html_path.exists():
            print(f"Processing index.html from {index_html_path}")
            soup = BeautifulSoup(index_html_path.read_text(encoding="utf-8"), "html.parser")
            
            # Helper to resolve and base64 encode assets
            def get_data_uri(file_path):
                suf = file_path.suffix.lower()
                mime_type = None
                
                if suf == '.css': mime_type = 'text/css'
                elif suf == '.js': mime_type = 'application/javascript'
                elif suf == '.png': mime_type = 'image/png'
                elif suf == '.jpg' or suf == '.jpeg': mime_type = 'image/jpeg'
                elif suf == '.svg': mime_type = 'image/svg+xml'
                elif suf == '.woff': mime_type = 'font/woff'
                elif suf == '.woff2': mime_type = 'font/woff2'
                elif suf == '.ttf': mime_type = 'font/ttf'
                elif suf == '.eot': mime_type = 'application/vnd.ms-fontobject'
                elif suf == '.otf': mime_type = 'font/otf'
                elif suf == '.json': mime_type = 'application/json'
                
                if not mime_type:
                    mime_type, _ = mimetypes.guess_type(file_path)
                
                if not mime_type:
                    mime_type = "application/octet-stream"
                
                # Use read_bytes for everything to be safe
                data = base64.b64encode(file_path.read_bytes()).decode("ascii")
                return f"data:{mime_type};base64,{data}"

            # Inline CSS
            count_css = 0
            processed_css = set()
            
            for link in soup.find_all("link", rel="stylesheet"):
                href = link.get("href")
                if not href or href.startswith("http") or href.startswith("//") or href.startswith("data:"): continue
                
                # Remove query params like ?v=123
                clean_href = href.split('?')[0].split('#')[0]
                
                # Deduplication
                if clean_href in processed_css:
                    print(f"Skipping duplicate CSS: {clean_href}")
                    link.decompose()
                    continue
                
                file_path = (build_dir / clean_href).resolve()
                if file_path.exists():
                    processed_css.add(clean_href)
                    count_css += 1
                    print(f"Inlining CSS: {clean_href}")
                    try:
                        css_text = file_path.read_text(encoding="utf-8")
                        
                        # Handle CSS URL imports (fonts, images)
                        def replace_url(match):
                            # The regex group 1 is the url content
                            raw_url = match.group(1).strip("'\\" \\t\\n")
                            if raw_url.startswith("data:") or raw_url.startswith("http") or raw_url.startswith("//"):
                                return match.group(0)
                            
                            clean_url = raw_url.split('?')[0].split('#')[0]
                            
                            asset_path = (file_path.parent / clean_url).resolve()
                            if asset_path.exists():
                                return f'url("{get_data_uri(asset_path)}")'
                            else:
                                print(f"  Warning: Asset not found: {clean_url} (in {clean_href})")
                                return match.group(0)

                        # Regex: url( ... )
                        # Match things inside parens, non-greedy, handling potential quotes
                        css_text = re.sub(r'url\\s*\\(([^)]+)\\)', replace_url, css_text)
                        
                        # Escape closing style tags to prevent HTML breakage
                        # We use four backslashes in TS string to result in two backslashes in Python source code
                        # which Python interprets as a literal backslash.
                        css_text = css_text.replace("</style>", "<\\\\/style>")
                        
                        new_style = soup.new_tag("style")
                        new_style.string = css_text
                        link.replace_with(new_style)
                    except Exception as e:
                         print(f"Error inlining CSS {clean_href}: {e}")
                else:
                    print(f"Warning: CSS file not found: {clean_href}")

            # Inline JS
            # We must move ALL scripts (even remote ones) to the end of body to preserve execution order
            # relative to the dependencies (like jQuery) that we are inlining.
            count_js = 0
            processed_js = set()
            all_scripts = []
            
            # First pass: Identify all scripts and process local ones in place
            # We don't remove them yet, just prepare them
            for script in soup.find_all("script"):
                all_scripts.append(script)
                
                src = script.get("src")
                if not src: 
                    continue

                if src.startswith("http") or src.startswith("//") or src.startswith("data:"): 
                    continue
                
                # Local File Processing
                clean_src = src.split('?')[0].split('#')[0]
                
                # Deduplication
                if clean_src in processed_js:
                    print(f"Skipping duplicate JS: {clean_src}")
                    # Mark for removal
                    script["data-remove"] = "true"
                    continue
                
                file_path = (build_dir / clean_src).resolve()
                if file_path.exists():
                    processed_js.add(clean_src)
                    count_js += 1
                    print(f"Inlining JS: {clean_src}")
                    try:
                        js_code = file_path.read_text(encoding="utf-8")
                        
                        # Escape closing script tags to prevent HTML breakage
                        # We use four backslashes in TS string to result in two backslashes in Python source code
                        js_code = js_code.replace("</script>", "<\\\\/script>")
                        
                        script["src"] = None
                        script.string = js_code
                        del script["src"]
                        
                        # Remove async/defer to ensure strictly ordered execution when appended to body
                        if script.has_attr('async'): del script['async']
                        if script.has_attr('defer'): del script['defer']
                        
                    except Exception as e:
                        print(f"Error inlining JS {clean_src}: {e}")
                else:
                    print(f"Warning: JS file not found: {clean_src}")

            # Second pass: Move ALL scripts to end of body in order
            if soup.body:
                for script in all_scripts:
                    # Remove if it was a duplicate
                    if script.get("data-remove") == "true":
                        script.decompose()
                        continue

                    # Extract from current location
                    if script.parent:
                        script.extract()
                    
                    # Append to body
                    soup.body.append(script)

            # Inline Images (img tags)
            for img in soup.find_all("img"):
                src = img.get("src")
                if not src or src.startswith("http") or src.startswith("//") or src.startswith("data:"): continue
                
                clean_src = src.split('?')[0].split('#')[0]
                file_path = (build_dir / clean_src).resolve()
                if file_path.exists():
                    img["src"] = get_data_uri(file_path)

            html_output = str(soup)
            print(f"Build complete. Inlined {count_css} CSS files and {count_js} JS files.")
        
        elif status == "success":
             status = "error"
             message = "Build finished but index.html not found."

    except Exception as e:
        import traceback
        status = "error"
        message = str(e) + "\\n" + traceback.format_exc()
        print("Exception during build:")
        print(message)
    
    finally:
        sys.stdout = old_stdout
        sys.stderr = old_stderr
    
    logs = stdout_capture.getvalue() + "\\n" + stderr_capture.getvalue()
    
    return json.dumps({
        "status": status,
        "message": message,
        "html": html_output,
        "logs": logs.split('\\n')
    })
`;

export const AVAILABLE_FONTS = [
  { label: 'Fira Code', value: 'Fira Code, monospace' },
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Roboto', value: 'Roboto, sans-serif' },
  { label: 'Open Sans', value: 'Open Sans, sans-serif' },
  { label: 'Lato', value: 'Lato, sans-serif' },
  { label: 'Montserrat', value: 'Montserrat, sans-serif' },
  { label: 'Source Code Pro', value: 'Source Code Pro, monospace' },
  { label: 'Source Serif 4', value: 'Source Serif 4, serif' },
  { label: 'Merriweather', value: 'Merriweather, serif' },
  { label: 'Crimson Pro', value: 'Crimson Pro, serif' },
];

export const GOOGLE_FONTS_URL = "https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Lato:wght@300;400;700&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&family=Montserrat:wght@300;400;500;600;700&family=Open+Sans:wght@300;400;600;700&family=Roboto:wght@300;400;500;700&family=Source+Code+Pro:wght@300;400;500;600;700&family=Crimson+Pro:ital,wght@0,200..900;1,200..900&family=Source+Serif+4:ital,opsz,wght@0,8..60,200..900;1,8..60,200..900&display=swap";

export const THEME_GALLERY: ThemePreset[] = [
  {
    id: 'rtd',
    name: 'Read the Docs',
    description: 'The classic, reliable theme used by millions of projects. Great sidebar navigation.',
    conf: "html_theme = 'sphinx_rtd_theme'",
  },
  {
    id: 'documatt',
    name: 'Documatt',
    description: 'A modern, responsive theme with a clean layout and great mobile support.',
    conf: `html_theme = 'sphinx_documatt_theme'

# Documatt options
html_theme_options = {
    'header_style': 'default',
    'logo_link_url': '/',
}`,
    css: `/* Documatt Fixes */

/* Aggressive Reset to prevent padding issues */
html, body {
    margin: 0;
    padding: 0;
}

div.document {
    /* Clear float is critical in some layouts */
    float: none !important; 
    
    /* Centering and sizing */
    margin: 0 auto !important;
    max-width: 1000px !important;
    
    /* Breathing room */
    padding: 3rem 2rem !important;
    
    /* Box Model */
    box-sizing: border-box !important;
}

/* Ensure inner wrappers don't overflow or add weird margins */
div.bodywrapper, div.body, div.content {
    margin: 0 !important;
    padding: 0 !important;
    max-width: none !important;
    box-sizing: border-box !important;
}

/* Responsive adjustment */
@media (max-width: 768px) {
    div.document {
        padding: 1.5rem !important;
    }
}
`
  },
  {
    id: 'web_typography',
    name: 'Web Typography',
    description: 'A minimalist theme optimized for long-form reading. Features generous whitespace, a musical modular scale, and classic serif typography.',
    conf: `html_theme = 'alabaster'

html_sidebars = {
    '**': ['about.html', 'navigation.html']
}

html_theme_options = {
    'logo': '',
    'github_user': '',
    'github_repo': '',
    'description': 'The Elements of Typographic Style for the Web',
    'fixed_sidebar': False, # Changed to false so we can control it with CSS better
    'sidebar_width': '220px',
    'page_width': 'auto',
    'body_text': '#111',
    'font_family': "'Source Serif 4', serif",
    'head_font_family': "'Source Serif 4', serif",
}`,
    css: `/* Web Typography Theme */
@import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,200..900;1,8..60,200..900&display=swap');

:root {
  --bg-color: #fffff8;
  --text-color: #111;
  --link-color: #ce3015; /* Vermillion */
}

body {
    background-color: var(--bg-color);
    color: var(--text-color);
    font-family: 'Source Serif 4', serif;
    font-size: 20px;
    line-height: 1.5;
    font-weight: 400;
    margin: 0;
    
    text-rendering: optimizeLegibility;
    font-kerning: normal;
}

/* AGGRESSIVE RESET for Alabaster */
/* Alabaster floats these, which causes overlap if we don't clear or position them properly */
div.document, div.documentwrapper, div.bodywrapper {
    float: none !important;
    margin: 0 !important;
    padding: 0 !important;
    width: auto !important;
}

div.sphinxsidebar {
    float: none !important;
    position: static !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 1rem 0 !important;
    border: none !important;
    background: transparent;
}

/* Explicit Italics & Bold */
em, i {
    font-style: italic !important;
    font-variation-settings: 'ital' 1;
}

strong, b {
    font-weight: 700 !important;
}

/* Headings */
/* Increased Specificity to override Alabaster defaults */
div.body h1, div.body h2, div.body h3, div.body h4, div.body h5, div.body h6 {
    font-family: 'Source Serif 4', serif;
    font-weight: 400;
    color: #000;
    margin-top: 2em;
    margin-bottom: 0.8em;
}

div.body h1 {
    font-size: 2.5em;
    font-weight: 600; /* SemiBold */
    margin-top: 1em;
    border-bottom: none;
    line-height: 1.1;
}

/* Faux Small Caps Implementation */
/* Increased specificity with div.body prefix */
div.body h2 {
    font-size: 1.0em; /* Reduced size to mimic small caps relative to body */
    font-weight: 700; /* Increased weight to compensate for reduction */
    text-transform: uppercase;
    letter-spacing: 0.12em; /* Tracking is crucial for SC look */
    border-bottom: 1px solid rgba(0,0,0,0.1);
    padding-bottom: 0.3em;
    margin-top: 2.5rem;
    font-variant: normal; /* Disable browser synthesis just in case */
}

div.body h3 {
    font-size: 1.25em;
    font-style: italic;
    font-variation-settings: 'ital' 1;
}

/* Paragraphs & Indentation */
div.body p {
    margin-top: 0;
    margin-bottom: 0;
    text-indent: 1.5em;
    text-align: left; /* Ragged right */
}

/* Reset indent for first paragraph after headings */
div.body h1 + p, div.body h2 + p, div.body h3 + p, div.body h4 + p, div.body h5 + p, div.body h6 + p, div.body .first {
    text-indent: 0;
}

/* Vertical spacing for other block elements */
ul, ol, dl, blockquote, pre, table, .admonition {
    margin-top: 1.5em;
    margin-bottom: 1.5em;
}

/* Lists */
li {
    margin-bottom: 0.25em;
}

/* Blockquotes */
blockquote {
    font-size: 0.95em;
    margin: 1.5em 2em;
    border: none;
    font-style: italic;
    color: #444;
}

/* Links */
a {
    color: var(--link-color);
    text-decoration: none;
    text-decoration-skip-ink: auto;
}
a:hover {
    text-decoration: underline;
}

/* Code */
pre {
    font-family: 'Fira Code', monospace;
    font-size: 0.8em;
    background: rgba(0,0,0,0.03);
    padding: 1em;
    border-radius: 2px;
    border-left: 3px solid rgba(0,0,0,0.1);
    overflow-x: auto;
    font-variant-numeric: lining-nums tabular-nums;
    font-variant-caps: normal;
}
code {
    font-family: 'Fira Code', monospace;
    font-variant-numeric: lining-nums tabular-nums;
    font-variant-caps: normal;
    font-size: 0.85em;
}

/* Tables */
table.docutils {
    width: 100%;
    border-collapse: collapse;
    margin: 2em 0;
    font-variant-numeric: lining-nums tabular-nums;
    font-variant-caps: normal;
}
/* Table headers small caps */
table.docutils th {
    border-bottom: 1px solid #000;
    padding: 0.5em;
    text-align: left;
    
    /* Matching H2 small caps style */
    text-transform: uppercase;
    font-weight: 700;
    font-size: 0.85em;
    letter-spacing: 0.1em;
}
table.docutils td {
    border-bottom: 1px solid #ddd;
    padding: 0.5em;
}

/* Admonitions */
.admonition {
    background: #fdfdfd;
    border: 1px solid #eee;
    padding: 1rem;
}
.admonition-title {
    font-family: 'Source Serif 4', serif;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-size: 0.9em;
    margin-bottom: 0.5em;
}

/* 
   RESPONSIVE LAYOUT ENGINE 
   We use strict !importants here to override Alabaster's inline styles 
*/

/* Mobile / Base (< 900px) */
div.document {
    max-width: 44rem;
    margin: 0 auto !important;
    padding: 2rem 1.5rem !important;
}

div.sphinxsidebar {
    border-bottom: 1px solid #eee !important;
    margin-bottom: 3rem !important;
    padding-left: 1.5rem !important;
}

/* Desktop (> 900px) */
@media (min-width: 900px) {
    div.sphinxsidebar {
        position: fixed !important;
        left: 0;
        top: 0;
        bottom: 0;
        width: 240px !important;
        height: 100vh;
        padding: 2rem !important;
        text-align: right;
        border-bottom: none !important;
        z-index: 20;
        background-color: var(--bg-color);
        overflow-y: auto;
    }
    
    div.document {
        /* Sidebar width (240) + Gap (40) */
        margin-left: 280px !important; 
        margin-right: auto !important;
        max-width: 44rem;
    }
}
`
  },
  {
    id: 'mobile_pro',
    name: 'Mobile Pro',
    description: 'A custom, de-novo theme built on Alabaster. Optimized for readability on small screens with large typography and hidden sidebars.',
    conf: `html_theme = 'alabaster'

html_sidebars = {
    '**': [
        'about.html',
        'navigation.html',
        'searchbox.html',
    ]
}

html_theme_options = {
    'fixed_sidebar': False,
    'sidebar_width': '280px',
    'page_width': '100%',
    'body_text': '#333',
    'font_family': "'Inter', sans-serif",
    'head_font_family': "'Inter', sans-serif",
    'font_size': '17px',
}`,
    css: `/* Mobile Pro Theme - Custom CSS */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');

body {
    font-family: 'Inter', sans-serif;
    color: #1a1a1a;
    line-height: 1.6;
}

div.document {
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
    padding: 0 20px;
}

div.body {
    background: transparent;
    max-width: none;
}

h1 {
    font-weight: 800;
    font-size: 2.5rem;
    margin-bottom: 1.5rem;
    letter-spacing: -0.02em;
    border-bottom: none;
}

h2 {
    font-weight: 600;
    margin-top: 2rem;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid #eee;
}

/* Mobile First Sidebar: Hidden by default on small screens */
div.sphinxsidebar {
    display: none;
    background: #f8f9fa;
    border-right: 1px solid #eee;
}

@media (min-width: 900px) {
    div.sphinxsidebar {
        display: block;
        width: 280px;
        position: fixed;
        height: 100%;
        left: 0;
        top: 0;
        overflow-y: auto;
    }
    div.document {
        margin-left: 300px; /* Offset for sidebar */
        max-width: 900px;
    }
}

/* Better mobile tables */
table.docutils {
    display: block;
    overflow-x: auto;
    white-space: nowrap;
}
`
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'A custom high-contrast dark theme with neon accents. Heavily modified to break the standard Read the Docs mold.',
    conf: `html_theme = 'sphinx_rtd_theme'
html_theme_options = {
    'display_version': False,
    'prev_next_buttons_location': 'bottom',
    'style_external_links': False,
    'collapse_navigation': False,
}`,
    css: `/* Cyberpunk Theme Overrides */

/* Core colors & Variables */
:root {
    --bg-dark: #020204;
    --bg-panel: #0a0a0a;
    --neon-blue: #00f3ff;
    --neon-pink: #ff0055;
    --neon-green: #00ff41;
    --text-main: #e0e0e0;
    --text-dim: #6e6e6e;
    --border-color: #333;
}

body {
    background-color: var(--bg-dark) !important;
    color: var(--text-main) !important;
    font-family: 'Fira Code', monospace;
}

/* -----------------------------
   Sidebar "Hack" 
   ----------------------------- */
.wy-nav-side {
    background: #000000 !important;
    border-right: 1px solid var(--border-color);
    padding-bottom: 2rem;
}

/* Header Area (Logo/Search) */
.wy-side-nav-search {
    background-color: #050505 !important;
    border-bottom: 1px solid var(--neon-blue);
    margin-bottom: 1rem;
    padding: 2rem 1rem;
    position: relative;
}

/* "HUD" Corner Effect for Header */
.wy-side-nav-search:after {
    content: "";
    position: absolute;
    bottom: 0;
    right: 0;
    width: 20px;
    height: 20px;
    background: linear-gradient(135deg, transparent 50%, var(--neon-blue) 50%);
}

.wy-side-nav-search > a {
    color: var(--neon-blue) !important;
    font-family: 'Montserrat', sans-serif;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 3px;
    font-size: 1.5rem;
    text-shadow: 0 0 10px rgba(0, 243, 255, 0.4);
}

/* Search Box - Squared off and Neon */
.wy-side-nav-search input[type="text"] {
    border-radius: 0 !important;
    background: #111 !important;
    border: 1px solid #333;
    color: var(--neon-blue);
    font-family: 'Fira Code', monospace;
    box-shadow: none;
    transition: all 0.3s ease;
}

.wy-side-nav-search input[type="text"]:focus {
    border-color: var(--neon-pink);
    box-shadow: 0 0 8px var(--neon-pink);
    background: #000 !important;
}

/* Navigation Menu */
.wy-menu-vertical a {
    color: var(--text-dim) !important;
    font-family: 'Fira Code', monospace;
    font-size: 0.85rem;
    transition: all 0.2s;
    border-left: 2px solid transparent;
}

.wy-menu-vertical a:hover {
    background-color: #111 !important;
    color: var(--neon-blue) !important;
    border-left-color: var(--neon-blue);
    padding-left: 1.5rem; /* Glitch slide effect */
}

/* Active Page */
.wy-menu-vertical li.current {
    background: transparent !important;
}

.wy-menu-vertical li.current > a {
    background: #0a0a0a !important;
    color: var(--neon-pink) !important;
    border-right: none;
    border-top: none;
    border-bottom: none;
    border-left: 2px solid var(--neon-pink) !important;
    font-weight: bold;
    text-shadow: 0 0 5px rgba(255, 0, 85, 0.4);
}

.wy-menu-vertical li.on a, .wy-menu-vertical li.current > a {
    color: var(--neon-pink) !important;
}

/* -----------------------------
   Main Content 
   ----------------------------- */
.wy-nav-content-wrap {
    background-color: var(--bg-dark) !important;
    margin-left: 300px !important;
}

@media screen and (max-width: 768px) {
    .wy-nav-content-wrap { margin-left: 0 !important; }
}

.wy-nav-content {
    background-color: var(--bg-dark) !important;
    max-width: 1000px !important;
    padding: 3rem !important;
}

/* Typography */
h1, h2, h3, h4, h5, h6 {
    color: var(--neon-blue) !important;
    font-family: 'Montserrat', sans-serif;
    text-transform: uppercase;
    letter-spacing: 1px;
}

h1 {
    font-size: 2.5rem;
    border-bottom: 2px solid var(--neon-pink);
    padding-bottom: 0.5rem;
    margin-bottom: 2rem;
    position: relative;
    display: inline-block;
    width: 100%;
}

h1:before {
    content: "> ";
    color: var(--neon-pink);
}

h2 {
    font-size: 1.8rem;
    margin-top: 3rem;
    border-left: 4px solid var(--neon-green);
    padding-left: 1rem;
}

p {
    color: #ccc;
    font-size: 1rem;
    line-height: 1.7;
}

/* Lists */
.rst-content ul.simple > li, .rst-content ul > li {
    list-style: none; 
}
.rst-content ul.simple > li:before, .rst-content ul > li:before {
    content: ":: ";
    color: var(--neon-green);
    margin-right: 0.5rem;
}

/* Code Blocks & Pre */
.rst-content pre.literal-block, 
.rst-content code.literal {
    background: #080808 !important;
    border: 1px solid #222 !important;
    color: #00ff41 !important; /* Matrix green text */
    font-family: 'Source Code Pro', monospace;
    font-size: 0.9rem;
    box-shadow: inset 0 0 10px rgba(0,0,0,0.8);
}

.rst-content code.literal {
    padding: 2px 6px;
    border-radius: 0;
}

/* Admonitions (Note, Warning) - Tech panels */
.admonition {
    border-radius: 0 !important;
    box-shadow: 0 0 15px rgba(0,0,0,0.5);
    position: relative;
    overflow: hidden;
}

.admonition.note {
    background: rgba(0, 243, 255, 0.05) !important;
    border: 1px solid var(--neon-blue) !important;
}

.admonition.warning {
    background: rgba(255, 0, 85, 0.05) !important;
    border: 1px solid var(--neon-pink) !important;
}

.admonition-title {
    background: rgba(0,0,0,0.5) !important;
    color: #fff !important;
    border-bottom: 1px solid rgba(255,255,255,0.1) !important;
    font-family: 'Fira Code', monospace;
    text-transform: uppercase;
}

/* Links */
a {
    color: var(--neon-blue) !important;
    text-decoration: none;
    border-bottom: 1px dashed var(--neon-blue);
    transition: all 0.3s;
}

a:hover {
    color: #fff !important;
    border-bottom-style: solid;
    text-shadow: 0 0 5px var(--neon-blue);
}

/* Tables */
table.docutils {
    border: 1px solid #333;
    border-collapse: collapse;
}

table.docutils th {
    background: #111;
    color: var(--neon-blue);
    border: 1px solid #333;
    text-transform: uppercase;
    font-weight: bold;
    padding: 10px;
}

table.docutils td {
    border: 1px solid #222;
    padding: 10px;
    background: #050505;
}

/* Footer */
footer {
    border-top: 1px solid #333;
    margin-top: 4rem !important;
    padding-top: 2rem;
    color: #555;
    font-size: 0.8rem;
    text-align: right;
    font-family: 'Fira Code', monospace;
}
`
  },
  {
    id: 'book',
    name: 'Sphinx Book Theme',
    description: 'A clean theme resembling a book, based on Jupyter Book.',
    conf: "html_theme = 'sphinx_book_theme'",
  },
  {
    id: 'nature',
    name: 'Nature',
    description: 'A simple, clean, green-hued built-in theme. Very reliable.',
    conf: "html_theme = 'nature'",
  },
  {
    id: 'alabaster',
    name: 'Alabaster',
    description: 'Lightweight, simple, and customizable. The default Sphinx theme.',
    conf: "html_theme = 'alabaster'",
  }
];