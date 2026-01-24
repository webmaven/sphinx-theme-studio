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
import ast

# Import Sphinx
from sphinx.cmd.build import main as sphinx_main
from bs4 import BeautifulSoup

def validate_conf_safety(conf_content):
    """
    Ensures conf.py only contains safe assignments of primitives.
    No imports, no function calls, no complex expressions.
    """
    try:
        tree = ast.parse(conf_content)
    except SyntaxError as e:
        return f"Syntax Error in conf.py: {e}"

    for node in tree.body:
        # Allow docstrings (Expr -> Constant string)
        if isinstance(node, ast.Expr) and isinstance(node.value, ast.Constant) and isinstance(node.value.value, str):
            continue
            
        # Must be an assignment
        if not isinstance(node, ast.Assign):
            return f"Security Violation: Only variable assignments are allowed in conf.py. Found {type(node).__name__}. Imports and function calls are disabled."
        
        # Check targets (must be simple variable names, e.g. x = 1, not x.y = 1)
        for target in node.targets:
            if not isinstance(target, ast.Name):
                return "Security Violation: Assignments must be to simple variable names."
        
        # Recursive check for values
        def is_safe_value(n):
            # Literals
            if isinstance(n, ast.Constant): 
                return True
            # Lists/Tuples
            if isinstance(n, (ast.List, ast.Tuple)):
                return all(is_safe_value(e) for e in n.elts)
            # Dictionaries
            if isinstance(n, ast.Dict):
                return all((k is None or is_safe_value(k)) and is_safe_value(v) for k, v in zip(n.keys, n.values))
            # Negative numbers
            if isinstance(n, ast.UnaryOp) and isinstance(n.op, (ast.UAdd, ast.USub)):
                return is_safe_value(n.operand)
            
            return False

        if not is_safe_value(node.value):
            return f"Security Violation: Forbidden value type '{type(node.value).__name__}' in assignment. Only primitives (strings, numbers, booleans) and collections (lists, dicts) are allowed."
            
    return None

def parse_sphinx_conf(conf_content):
    config = {}
    try:
        tree = ast.parse(conf_content)
        for node in tree.body:
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        key = target.id
                        try:
                            # Safely evaluate literals
                            val = ast.literal_eval(node.value)
                            config[key] = val
                        except:
                            # If we can't evaluate (e.g. it's a function call or variable reference),
                            # we skip it for the parsed config object.
                            pass
        return json.dumps(config)
    except Exception as e:
        return json.dumps({"error": str(e)})

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
        # 1. Validate conf.py safety
        security_error = validate_conf_safety(conf_content)
        if security_error:
             raise ValueError(security_error)

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

// Configuration for Pyodide and Packages
export const PYODIDE_VERSION = "0.27.2";
export const PYODIDE_BASE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
export const PYODIDE_MJS_URL = `${PYODIDE_BASE_URL}pyodide.mjs`;

export const ENV_CACHE_VERSION = "v4-sphinx-env";

export const PYODIDE_PACKAGES = [
    'beautifulsoup4',
    'docutils',
    'sphinx', 
    'sphinx_rtd_theme', 
    'sphinxcontrib-jquery',
    'sphinx_book_theme',
    'sphinx-documatt-theme'
];