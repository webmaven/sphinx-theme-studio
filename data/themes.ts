import { ThemePreset } from '../types';

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
