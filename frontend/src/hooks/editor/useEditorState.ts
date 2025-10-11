import { useState, useEffect, useCallback, useRef } from 'react';
import { getLanguageConfig, LANGUAGE_CONFIGS } from '@/lib/editor/languageConfig';

/**
 * Cursor position in the editor
 */
export interface CursorPosition {
  line: number;
  column: number;
}

/**
 * Complete editor state interface
 */
export interface EditorState {
  code: string;
  language: string;
  theme: string;
  fontSize: number;
  tabSize: number;
  fontFamily: string;
  lineNumbers: boolean;
  minimap: boolean;
  wordWrap: boolean;
  autoSave: boolean;
  cursorPosition: CursorPosition;
  fileName: string;
  isDirty: boolean;
  lastSaved: number;
}

/**
 * History entry for undo/redo
 */
interface HistoryEntry {
  code: string;
  timestamp: number;
  cursorPosition: CursorPosition;
}

/**
 * Hook return interface
 */
export interface UseEditorStateReturn {
  // State
  code: string;
  language: string;
  theme: string;
  fontSize: number;
  tabSize: number;
  fontFamily: string;
  lineNumbers: boolean;
  minimap: boolean;
  wordWrap: boolean;
  autoSave: boolean;
  cursorPosition: CursorPosition;
  fileName: string;
  isDirty: boolean;
  lastSaved: number;
  canUndo: boolean;
  canRedo: boolean;

  // Actions
  updateCode: (code: string) => void;
  changeLanguage: (language: string) => void;
  setTheme: (theme: string) => void;
  setFontSize: (size: number) => void;
  setTabSize: (size: number) => void;
  setFontFamily: (family: string) => void;
  setLineNumbers: (enabled: boolean) => void;
  setMinimap: (enabled: boolean) => void;
  setWordWrap: (enabled: boolean) => void;
  toggleAutoSave: () => void;
  updateCursorPosition: (line: number, column: number) => void;
  setFileName: (name: string) => void;
  saveCode: () => void;
  loadCode: () => void;
  resetToTemplate: () => void;
  undo: () => void;
  redo: () => void;
  getEditorConfig: () => any;
  clearHistory: () => void;
}

const DEFAULT_STATE: EditorState = {
  code: '# Write your code here\nprint("Hello, Engunity AI!")\n',
  language: 'python',
  theme: 'vs-dark',
  fontSize: 14,
  tabSize: 4,
  fontFamily: 'fira-code',
  lineNumbers: true,
  minimap: true,
  wordWrap: false,
  autoSave: true,
  cursorPosition: { line: 1, column: 1 },
  fileName: 'main.py',
  isDirty: false,
  lastSaved: Date.now(),
};

const MAX_HISTORY_SIZE = 50;
const AUTOSAVE_DELAY = 2000; // 2 seconds

/**
 * Custom hook for managing all editor state
 *
 * Handles:
 * - Code content and language selection
 * - Editor settings (theme, font, layout)
 * - Autosave with localStorage persistence
 * - Undo/redo history management
 * - Cursor position tracking
 * - File metadata and dirty state
 *
 * @param initialLanguage - Initial language (default: 'python')
 * @param initialFileName - Initial file name (default: 'main.py')
 *
 * @example
 * ```tsx
 * const { code, updateCode, changeLanguage, saveCode } = useEditorState();
 *
 * <CodeEditor value={code} onChange={updateCode} language={language} />
 * ```
 */
export function useEditorState(
  initialLanguage: string = 'python',
  initialFileName: string = 'main.py'
): UseEditorStateReturn {
  // Core state
  const [code, setCode] = useState<string>(DEFAULT_STATE.code);
  const [language, setLanguage] = useState<string>(initialLanguage);
  const [theme, setThemeState] = useState<string>(DEFAULT_STATE.theme);
  const [fontSize, setFontSizeState] = useState<number>(DEFAULT_STATE.fontSize);
  const [tabSize, setTabSizeState] = useState<number>(DEFAULT_STATE.tabSize);
  const [fontFamily, setFontFamilyState] = useState<string>(DEFAULT_STATE.fontFamily);
  const [lineNumbers, setLineNumbersState] = useState<boolean>(DEFAULT_STATE.lineNumbers);
  const [minimap, setMinimapState] = useState<boolean>(DEFAULT_STATE.minimap);
  const [wordWrap, setWordWrapState] = useState<boolean>(DEFAULT_STATE.wordWrap);
  const [autoSave, setAutoSaveState] = useState<boolean>(DEFAULT_STATE.autoSave);
  const [cursorPosition, setCursorPositionState] = useState<CursorPosition>(DEFAULT_STATE.cursorPosition);
  const [fileName, setFileNameState] = useState<string>(initialFileName);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [lastSaved, setLastSaved] = useState<number>(Date.now());

  // History management for undo/redo
  const historyRef = useRef<HistoryEntry[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isUndoRedoRef = useRef<boolean>(false);

  // Autosave timer
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Load saved state from localStorage on mount
   */
  useEffect(() => {
    loadCode();
  }, []);

  /**
   * Autosave logic - saves to localStorage after delay
   */
  useEffect(() => {
    if (autoSave && isDirty && code.trim()) {
      // Clear existing timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      // Set new autosave timer
      autoSaveTimerRef.current = setTimeout(() => {
        saveCode();
      }, AUTOSAVE_DELAY);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [code, autoSave, isDirty, fileName]);

  /**
   * Update code with history tracking
   */
  const updateCode = useCallback((newCode: string) => {
    setCode(newCode);
    setIsDirty(true);

    // Don't add to history if this is an undo/redo operation
    if (!isUndoRedoRef.current) {
      // Remove any "future" history if we're in the middle of the stack
      if (historyIndexRef.current < historyRef.current.length - 1) {
        historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
      }

      // Add new entry
      historyRef.current.push({
        code: newCode,
        timestamp: Date.now(),
        cursorPosition: { ...cursorPosition },
      });

      // Limit history size
      if (historyRef.current.length > MAX_HISTORY_SIZE) {
        historyRef.current.shift();
      } else {
        historyIndexRef.current++;
      }
    }
  }, [cursorPosition]);

  /**
   * Change language and load default template
   */
  const changeLanguage = useCallback((newLanguage: string) => {
    const languageConfig = getLanguageConfig(newLanguage);
    setLanguage(newLanguage);
    setCode(languageConfig.defaultCode);
    setFileName(`main.${languageConfig.extension}`);
    setIsDirty(true);
  }, []);

  /**
   * Update theme
   */
  const setTheme = useCallback((newTheme: string) => {
    setThemeState(newTheme);
    localStorage.setItem('engunity-editor-theme', newTheme);
  }, []);

  /**
   * Update font size
   */
  const setFontSize = useCallback((size: number) => {
    setFontSizeState(size);
  }, []);

  /**
   * Update tab size
   */
  const setTabSize = useCallback((size: number) => {
    setTabSizeState(size);
  }, []);

  /**
   * Update font family
   */
  const setFontFamily = useCallback((family: string) => {
    setFontFamilyState(family);
  }, []);

  /**
   * Toggle line numbers
   */
  const setLineNumbers = useCallback((enabled: boolean) => {
    setLineNumbersState(enabled);
  }, []);

  /**
   * Toggle minimap
   */
  const setMinimap = useCallback((enabled: boolean) => {
    setMinimapState(enabled);
  }, []);

  /**
   * Toggle word wrap
   */
  const setWordWrap = useCallback((enabled: boolean) => {
    setWordWrapState(enabled);
  }, []);

  /**
   * Toggle autosave
   */
  const toggleAutoSave = useCallback(() => {
    setAutoSaveState((prev) => !prev);
  }, []);

  /**
   * Update cursor position
   */
  const updateCursorPosition = useCallback((line: number, column: number) => {
    setCursorPositionState({ line, column });
  }, []);

  /**
   * Update file name
   */
  const setFileName = useCallback((name: string) => {
    setFileNameState(name);
  }, []);

  /**
   * Save code to localStorage
   */
  const saveCode = useCallback(() => {
    try {
      const stateToSave: EditorState = {
        code,
        language,
        theme,
        fontSize,
        tabSize,
        fontFamily,
        lineNumbers,
        minimap,
        wordWrap,
        autoSave,
        cursorPosition,
        fileName,
        isDirty: false,
        lastSaved: Date.now(),
      };

      localStorage.setItem(`engunity-editor-${fileName}`, JSON.stringify(stateToSave));
      localStorage.setItem('engunity-editor-last-file', fileName);

      setIsDirty(false);
      setLastSaved(Date.now());
    } catch (error) {
      console.error('Failed to save code:', error);
    }
  }, [code, language, theme, fontSize, tabSize, fontFamily, lineNumbers, minimap, wordWrap, autoSave, cursorPosition, fileName]);

  /**
   * Load code from localStorage
   */
  const loadCode = useCallback(() => {
    try {
      // Try to load last file
      const lastFile = localStorage.getItem('engunity-editor-last-file');
      const fileToLoad = lastFile || fileName;

      const savedState = localStorage.getItem(`engunity-editor-${fileToLoad}`);
      if (savedState) {
        const parsed: EditorState = JSON.parse(savedState);
        setCode(parsed.code || DEFAULT_STATE.code);
        setLanguage(parsed.language || DEFAULT_STATE.language);
        setThemeState(parsed.theme || DEFAULT_STATE.theme);
        setFontSizeState(parsed.fontSize || DEFAULT_STATE.fontSize);
        setTabSizeState(parsed.tabSize || DEFAULT_STATE.tabSize);
        setFontFamilyState(parsed.fontFamily || DEFAULT_STATE.fontFamily);
        setLineNumbersState(parsed.lineNumbers ?? DEFAULT_STATE.lineNumbers);
        setMinimapState(parsed.minimap ?? DEFAULT_STATE.minimap);
        setWordWrapState(parsed.wordWrap ?? DEFAULT_STATE.wordWrap);
        setAutoSaveState(parsed.autoSave ?? DEFAULT_STATE.autoSave);
        setCursorPositionState(parsed.cursorPosition || DEFAULT_STATE.cursorPosition);
        setFileNameState(parsed.fileName || DEFAULT_STATE.fileName);
        setLastSaved(parsed.lastSaved || Date.now());
        setIsDirty(false);
      } else {
        // Load default template for language
        const languageConfig = getLanguageConfig(language);
        setCode(languageConfig.defaultCode);
      }
    } catch (error) {
      console.error('Failed to load code:', error);
      // Fallback to default
      const languageConfig = getLanguageConfig(language);
      setCode(languageConfig.defaultCode);
    }
  }, [fileName, language]);

  /**
   * Reset to default template for current language
   */
  const resetToTemplate = useCallback(() => {
    const languageConfig = getLanguageConfig(language);
    setCode(languageConfig.defaultCode);
    setIsDirty(true);
  }, [language]);

  /**
   * Undo last change
   */
  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      isUndoRedoRef.current = true;
      historyIndexRef.current--;
      const entry = historyRef.current[historyIndexRef.current];
      setCode(entry.code);
      setCursorPositionState(entry.cursorPosition);
      setIsDirty(true);
      isUndoRedoRef.current = false;
    }
  }, []);

  /**
   * Redo last undone change
   */
  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      isUndoRedoRef.current = true;
      historyIndexRef.current++;
      const entry = historyRef.current[historyIndexRef.current];
      setCode(entry.code);
      setCursorPositionState(entry.cursorPosition);
      setIsDirty(true);
      isUndoRedoRef.current = false;
    }
  }, []);

  /**
   * Get Monaco editor configuration
   */
  const getEditorConfig = useCallback(() => {
    const languageConfig = getLanguageConfig(language);
    return {
      language: languageConfig.monacoLanguage,
      theme,
      fontSize,
      tabSize,
      fontFamily,
      lineNumbers: lineNumbers ? 'on' : 'off',
      minimap: { enabled: minimap },
      wordWrap: wordWrap ? 'on' : 'off',
      automaticLayout: true,
      scrollBeyondLastLine: false,
      readOnly: false,
      cursorStyle: 'line',
      renderWhitespace: 'selection',
      formatOnPaste: true,
      formatOnType: true,
    };
  }, [language, theme, fontSize, tabSize, fontFamily, lineNumbers, minimap, wordWrap]);

  /**
   * Clear undo/redo history
   */
  const clearHistory = useCallback(() => {
    historyRef.current = [];
    historyIndexRef.current = -1;
  }, []);

  return {
    // State
    code,
    language,
    theme,
    fontSize,
    tabSize,
    fontFamily,
    lineNumbers,
    minimap,
    wordWrap,
    autoSave,
    cursorPosition,
    fileName,
    isDirty,
    lastSaved,
    canUndo: historyIndexRef.current > 0,
    canRedo: historyIndexRef.current < historyRef.current.length - 1,

    // Actions
    updateCode,
    changeLanguage,
    setTheme,
    setFontSize,
    setTabSize,
    setFontFamily,
    setLineNumbers,
    setMinimap,
    setWordWrap,
    toggleAutoSave,
    updateCursorPosition,
    setFileName,
    saveCode,
    loadCode,
    resetToTemplate,
    undo,
    redo,
    getEditorConfig,
    clearHistory,
  };
}

export default useEditorState;
