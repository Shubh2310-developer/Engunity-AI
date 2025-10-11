'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { motion } from 'framer-motion';
import { FileCode, Save, Check } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { getLanguageConfig } from '@/lib/editor/languageConfig';

interface CodeEditorPanelProps {
  language: string;
  value: string;
  onChange: (value: string) => void;
  theme?: string;
  readOnly?: boolean;
  fontSize?: number;
  filename?: string;
}

export default function CodeEditorPanel({
  language,
  value,
  onChange,
  theme = 'vs-dark',
  readOnly = false,
  fontSize = 14,
  filename,
}: CodeEditorPanelProps) {
  const editorRef = useRef<any>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showAutoSave, setShowAutoSave] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });

  // Get language configuration
  const languageConfig = getLanguageConfig(language);

  // Debounced change handler for performance
  const handleEditorChange = useCallback(
    (newValue: string | undefined) => {
      if (newValue === undefined) return;

      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new debounce timer (500ms)
      debounceTimerRef.current = setTimeout(() => {
        onChange(newValue);

        // Show auto-save indicator
        setShowAutoSave(true);
        setTimeout(() => setShowAutoSave(false), 2000);
      }, 500);
    },
    [onChange]
  );

  // Handle editor mount
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    // Configure editor options
    editor.updateOptions({
      fontSize,
      fontFamily: 'Fira Code, JetBrains Mono, Consolas, Monaco, monospace',
      fontLigatures: true,
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      automaticLayout: true,
      lineNumbers: 'on',
      renderLineHighlight: 'all',
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      formatOnPaste: true,
      formatOnType: true,
      tabSize: 2,
      insertSpaces: true,
      bracketPairColorization: {
        enabled: true,
      },
    });

    // Track cursor position
    editor.onDidChangeCursorPosition((e: any) => {
      setCursorPosition({
        line: e.position.lineNumber,
        column: e.position.column,
      });
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Auto-detect theme based on Tailwind dark mode
  const effectiveTheme = theme || 'vs-dark';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="h-full w-full flex flex-col bg-neutral-900/60 dark:bg-neutral-900/60 backdrop-blur-xl rounded-2xl border border-neutral-800 dark:border-neutral-800 overflow-hidden shadow-xl"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-neutral-800/40 dark:bg-neutral-800/40 border-b border-neutral-700/50 dark:border-neutral-700/50">
        {/* Left: Language Info */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30">
            <FileCode className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{languageConfig.icon}</span>
            <span className="text-sm font-semibold text-white">
              {languageConfig.name}
            </span>
            {filename && (
              <>
                <span className="text-neutral-500">•</span>
                <span className="text-sm text-neutral-400">{filename}</span>
              </>
            )}
          </div>
        </div>

        {/* Right: Status Indicators */}
        <div className="flex items-center gap-6">
          {/* Cursor Position */}
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span>Ln {cursorPosition.line}</span>
            <span>•</span>
            <span>Col {cursorPosition.column}</span>
          </div>

          {/* Auto-Save Indicator */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: showAutoSave ? 1 : 0.5,
              scale: showAutoSave ? 1 : 0.95,
            }}
            className="flex items-center gap-2"
          >
            {showAutoSave ? (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"
                />
                <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Saved
                </span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-neutral-600" />
                <span className="text-xs text-neutral-500">Auto Save</span>
              </>
            )}
          </motion.div>

          {/* Read-only Badge */}
          {readOnly && (
            <div className="px-2 py-1 rounded bg-amber-500/20 border border-amber-500/30">
              <span className="text-xs font-medium text-amber-400">Read Only</span>
            </div>
          )}
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 relative bg-white dark:bg-[#1e1e1e]">
        <Editor
          height="100%"
          language={languageConfig.monacoLanguage}
          value={value}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          theme={effectiveTheme}
          options={{
            readOnly,
            selectOnLineNumbers: true,
            roundedSelection: false,
            cursorStyle: 'line',
            automaticLayout: true,
            scrollbar: {
              vertical: 'visible',
              horizontal: 'visible',
              useShadows: false,
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
            },
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
          }}
          loading={
            <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-[#1e1e1e]">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mb-3" />
              <p className="text-sm text-neutral-400">Loading editor...</p>
            </div>
          }
        />
      </div>

      {/* Bottom Accent Line */}
      <div className="h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 opacity-30" />
    </motion.div>
  );
}
