'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Brain,
  Save,
  Download,
  Upload,
  Settings,
  Terminal as TerminalIcon,
  Code2,
  Maximize2,
  Minimize2,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Loader2,
  FileCode,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import CodeEditorPanel from '@/components/editor/CodeEditorPanel';
import OutputPanel from '@/components/editor/OutputPanel';
import FileExplorer from '@/components/editor/FileExplorer';
import LanguageSelector from '@/components/editor/LanguageSelector';
import TerminalPanel from '@/components/editor/TerminalPanel';
import SettingsPanel from '@/components/editor/SettingsPanel';
import { useCodeExecution } from '@/hooks/editor/useCodeExecution';
import { useEditorState } from '@/hooks/editor/useEditorState';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
};

const panelVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: {
      duration: 0.2,
    },
  },
};

export default function CodeEditorPage() {
  // Editor state management
  const {
    state: editorState,
    updateCode,
    updateLanguage,
    updateTheme,
    updateFontSize,
    updateFilename,
  } = useEditorState();

  // Code execution
  const { executeCode, isRunning, result } = useCodeExecution();

  // UI state
  const [showFileExplorer, setShowFileExplorer] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showAIAssist, setShowAIAssist] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<'output' | 'terminal'>('output');

  // Handlers
  const handleRunCode = async () => {
    if (!editorState.code.trim()) return;
    await executeCode(editorState.code, editorState.language);
  };

  const handleSaveFile = () => {
    // TODO: Implement save to backend/localStorage
    console.log('Saving file:', editorState.filename);
  };

  const handleDownloadFile = () => {
    const blob = new Blob([editorState.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = editorState.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.py,.js,.ts,.java,.cpp,.c,.go,.rs,.html,.css,.json,.md';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          updateCode(content);
          updateFilename(file.name);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Empty state check
  const isEmptyState = !editorState.code || editorState.code.trim() === '# Write your code here\n' || editorState.code.trim() === '';

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      }`}
    >
      {/* Header Toolbar */}
      <motion.header
        variants={itemVariants}
        className="relative border-b border-slate-200 dark:border-neutral-800/60 bg-white/80 dark:bg-neutral-900/60 backdrop-blur-xl"
      >
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Title & File Explorer Toggle */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFileExplorer(!showFileExplorer)}
                className="text-slate-600 dark:text-neutral-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                aria-label="Toggle file explorer"
              >
                {showFileExplorer ? (
                  <ChevronLeft className="w-5 h-5" />
                ) : (
                  <ChevronRight className="w-5 h-5" />
                )}
              </Button>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg">
                  <Code2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Code Editor
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    {editorState.filename || 'untitled.py'}
                  </p>
                </div>
              </div>

              <Separator orientation="vertical" className="h-8 bg-slate-300 dark:bg-neutral-800" />

              <LanguageSelector
                selected={editorState.language}
                onChange={updateLanguage}
              />
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUploadFile}
                className="text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleSaveFile}
                className="text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800"
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownloadFile}
                className="text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>

              <Separator orientation="vertical" className="h-8 bg-slate-300 dark:bg-neutral-800" />

              <Button
                onClick={handleRunCode}
                disabled={isRunning || isEmptyState}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Run Code
                  </>
                )}
              </Button>

              <Button
                onClick={() => setShowAIAssist(!showAIAssist)}
                className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold shadow-lg transition-all"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI Assist
              </Button>

              <Separator orientation="vertical" className="h-8 bg-slate-300 dark:bg-neutral-800" />

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800"
              >
                <Settings className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="px-6 py-2 border-t border-slate-200 dark:border-neutral-800/60 bg-slate-100/80 dark:bg-neutral-950/40">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4 text-slate-600 dark:text-neutral-400">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Ready
              </span>
              <span>Ln 1, Col 1</span>
              <span>UTF-8</span>
            </div>
            <div className="flex items-center gap-4 text-slate-600 dark:text-neutral-400">
              <span>Font: {editorState.fontSize}px</span>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - File Explorer */}
        <AnimatePresence mode="wait">
          {showFileExplorer && (
            <motion.aside
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-64 border-r border-slate-200 dark:border-neutral-800/60 bg-white/80 dark:bg-neutral-900/40 backdrop-blur-xl flex-shrink-0"
            >
              <FileExplorer />
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Center - Code Editor + Output */}
        <motion.main
          variants={itemVariants}
          className="flex-1 flex flex-col overflow-hidden"
        >
          {/* Code Editor Area */}
          <div className="flex-1 relative bg-white dark:bg-neutral-950">
            {isEmptyState ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="text-center space-y-6 p-8">
                  <motion.div
                    animate={{
                      scale: [1, 1.05, 1],
                      rotate: [0, 5, -5, 0],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      repeatType: 'reverse',
                    }}
                    className="mx-auto w-24 h-24 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 backdrop-blur-xl border border-cyan-500/30 flex items-center justify-center"
                  >
                    <FileCode className="w-12 h-12 text-cyan-500 dark:text-cyan-400" />
                  </motion.div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      Ready to Code
                    </h3>
                    <p className="text-slate-600 dark:text-neutral-400 max-w-md">
                      Select or create a file to start coding, or upload an existing file
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <Button
                      onClick={handleUploadFile}
                      variant="outline"
                      className="border-cyan-500/50 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload File
                    </Button>
                    <Button
                      onClick={() => updateCode('# Start coding here\n')}
                      className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
                    >
                      <Code2 className="w-4 h-4 mr-2" />
                      New File
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <CodeEditorPanel
                language={editorState.language}
                value={editorState.code}
                onChange={updateCode}
                theme={editorState.theme}
                fontSize={editorState.fontSize}
                filename={editorState.filename}
              />
            )}
          </div>

          {/* Bottom Panel - Output/Terminal */}
          <motion.div
            variants={itemVariants}
            className="h-72 border-t border-slate-200 dark:border-neutral-800/60 bg-slate-50/80 dark:bg-neutral-900/40 backdrop-blur-xl"
          >
            <Tabs
              value={activeBottomTab}
              onValueChange={(v) => setActiveBottomTab(v as 'output' | 'terminal')}
              className="h-full flex flex-col"
            >
              <div className="px-4 pt-2 border-b border-slate-200 dark:border-neutral-800/60">
                <TabsList className="bg-slate-200/60 dark:bg-neutral-800/40 backdrop-blur-sm">
                  <TabsTrigger
                    value="output"
                    className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-700 dark:text-slate-300"
                  >
                    <TerminalIcon className="w-4 h-4 mr-2" />
                    Output
                    {result && (
                      <Badge
                        variant="secondary"
                        className="ml-2 bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      >
                        New
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="terminal"
                    className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-700 dark:text-slate-300"
                  >
                    <Code2 className="w-4 h-4 mr-2" />
                    Terminal
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="output" className="flex-1 overflow-hidden m-0">
                <OutputPanel
                  output={result?.output || ''}
                  onClear={() => {}}
                />
              </TabsContent>

              <TabsContent value="terminal" className="flex-1 overflow-hidden m-0">
                <TerminalPanel />
              </TabsContent>
            </Tabs>
          </motion.div>
        </motion.main>

        {/* Right Sidebar - Settings Panel */}
        <AnimatePresence mode="wait">
          {showSettings && (
            <motion.aside
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-80 border-l border-slate-200 dark:border-neutral-800/60 bg-white/80 dark:bg-neutral-900/40 backdrop-blur-xl flex-shrink-0"
            >
              <SettingsPanel onClose={() => setShowSettings(false)} />
            </motion.aside>
          )}
        </AnimatePresence>

        {/* AI Assist Panel (Placeholder) */}
        <AnimatePresence mode="wait">
          {showAIAssist && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center"
              onClick={() => setShowAIAssist(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-3xl border border-slate-300 dark:border-neutral-800 shadow-2xl p-8"
              >
                <div className="text-center space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                    <Brain className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">AI Assistant</h2>
                  <p className="text-slate-600 dark:text-neutral-400">
                    AI-powered code assistance coming soon! This feature will help you:
                  </p>
                  <ul className="text-left text-slate-700 dark:text-neutral-300 space-y-2 max-w-md mx-auto">
                    <li className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-purple-500 dark:text-purple-400 mt-1" />
                      <span>Generate code from natural language</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-purple-500 dark:text-purple-400 mt-1" />
                      <span>Debug and fix errors automatically</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-purple-500 dark:text-purple-400 mt-1" />
                      <span>Explain complex code snippets</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-purple-500 dark:text-purple-400 mt-1" />
                      <span>Optimize performance and best practices</span>
                    </li>
                  </ul>
                  <Button
                    onClick={() => setShowAIAssist(false)}
                    className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white"
                  >
                    Got it!
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
