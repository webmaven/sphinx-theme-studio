# Technical Debt Evaluation - Sphinx Theme Studio

This document outlines the technical debt identified in the Sphinx Theme Studio project, categorized by impact and area.

## 1. Architecture & Component Structure

### Monolithic `App.tsx`
- **Issue**: `App.tsx` is a "God Component" exceeding 360 lines of code. It manages all application state, complex `useEffect` hooks for Pyodide initialization, local storage synchronization, AI generation logic, build orchestration, and even layout/resizing logic.
- **Impact**: Difficult to test, maintain, and reason about. Changes to one feature (e.g., AI settings) can accidentally impact unrelated parts (e.g., the editor resizing).
- **Recommendation**: Decompose into custom hooks (e.g., `usePyodide`, `useFileManagement`, `useLayout`) and smaller container components.

### UI Logic in Components
- **Issue**: `CodeEditor.tsx` contains complex logic for CSS formatting and "intelligent" color replacement.
- **Impact**: Makes the component bulky and hard to test the business logic in isolation.
- **Recommendation**: Move formatting and string manipulation logic into separate utility functions or custom hooks.

## 2. Code Quality & Maintainability

### Inlined Worker Code
- **Issue**: In `services/pyodideService.ts`, the entire Web Worker logic is stored as a massive string (`WORKER_CODE`).
- **Impact**: No syntax highlighting, no linting, and no type checking for the worker logic during development. It makes debugging and extending the worker extremely difficult.
- **Recommendation**: Use Vite's built-in worker support (`new Worker(new URL('./worker.ts', import.meta.url))`) to keep the worker code in a proper `.ts` file.

### Dead Code / Duplication
- **Issue**: `services/pyodideWorker.ts` exists but appears to be a duplicate of the logic inlined in `pyodideService.ts`. It is unclear which one is the "source of truth".
- **Impact**: Confusion for developers and potential for desynchronization if changes are made to one but not the other.
- **Recommendation**: Consolidate into a single worker file and remove the inlined string.

### Bloated `constants.ts`
- **Issue**: `constants.ts` contains large blocks of initial content (RST, CSS, HTML, Conf) and the entire Python build script (over 200 lines).
- **Impact**: Poor readability and maintainability.
- **Recommendation**: Split into separate files (e.g., `templates/`, `scripts/`) and import them.

## 3. Infrastructure & Tooling

### Lack of Testing
- **Issue**: There are zero unit or integration tests in the project.
- **Impact**: High risk of regressions, especially in the complex Python-JS bridge and the CSS manipulation logic.
- **Recommendation**: Implement a testing suite using Vitest and React Testing Library.

### Use of CDN for Tailwind
- **Issue**: `index.html` loads Tailwind via a CDN script tag.
- **Impact**: Larger runtime bundle (Tailwind JIT in the browser), lack of build-time optimizations (purging unused CSS), and potential for inconsistent styling if the CDN is slow or unavailable.
- **Recommendation**: Properly integrate Tailwind CSS into the Vite build process.

### Missing Linting and Formatting
- **Issue**: No ESLint or Prettier configurations are present.
- **Impact**: Inconsistent code style and potential for catching simple bugs late.
- **Recommendation**: Add ESLint and Prettier with standard React/TypeScript rules.

## 4. Performance & Reliability

### Pyodide Management
- **Issue**: The `pyodideService.ts` handles initialization but doesn't provide robust handling for worker crashes or restarts.
- **Impact**: If the Python environment crashes, the user might have to refresh the whole page to recover.
- **Recommendation**: Implement a more robust lifecycle management for the worker.

### Storage Logic
- **Issue**: `App.tsx` uses a simple `useEffect` with `localStorage` for auto-saving.
- **Impact**: Could lead to performance issues if the files (especially `rst` or `css`) grow very large, as it saves on every change (debounced slightly).
- **Recommendation**: Consider using IndexedDB for larger files or a more sophisticated state persistence strategy.

## 5. Security & API Handling

### API Key Management
- **Issue**: `services/aiService.ts` mixes `process.env` usage with passed-in settings. `vite.config.ts` inlines the `GEMINI_API_KEY` into the build.
- **Impact**: Risk of accidentally leaking API keys if not careful with environment variables and build artifacts.
- **Recommendation**: Standardize API key handling and ensure they are never committed to the repository (already partially handled by `.gitignore` but the code structure is messy).
