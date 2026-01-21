export interface ThemeFiles {
  css: string;
  html: string;
  rst: string;
  conf: string;
}

export type FileType = keyof ThemeFiles;

export interface BuildResult {
  html: string;
  error?: string;
  logs: string[];
}

export interface AiSuggestion {
  css: string;
  explanation: string;
}

export enum BuildStatus {
  IDLE = 'IDLE',
  LOADING_PYODIDE = 'LOADING_PYODIDE',
  INSTALLING_PACKAGES = 'INSTALLING_PACKAGES',
  BUILDING = 'BUILDING',
  READY = 'READY',
  ERROR = 'ERROR'
}

export type DeviceMode = 'desktop' | 'tablet' | 'mobile';

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  conf: string; // The specific configuration (theme name etc)
  css?: string; // Optional starting custom CSS
}

export type AiProvider = 'gemini' | 'openai' | 'anthropic';

export interface AiSettings {
  provider: AiProvider;
  openAiKey?: string;
  anthropicKey?: string;
}
