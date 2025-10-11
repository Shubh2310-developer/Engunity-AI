'use client';

import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Terminal, Trash2, Copy, Check, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface OutputPanelProps {
  output?: string;
  error?: string;
  logs?: string;
  isRunning?: boolean;
  executionTime?: number;
  memoryUsed?: number;
  onClear?: () => void;
}

export default function OutputPanel({
  output = '',
  error = '',
  logs = '',
  isRunning = false,
  executionTime,
  memoryUsed,
  onClear,
}: OutputPanelProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('output');
  const outputRef = useRef<HTMLPreElement>(null);
  const logsRef = useRef<HTMLPreElement>(null);
  const errorsRef = useRef<HTMLPreElement>(null);

  // Auto-scroll to bottom when content changes
  useEffect(() => {
    const refs = { output: outputRef, logs: logsRef, errors: errorsRef };
    const currentRef = refs[activeTab as keyof typeof refs]?.current;
    if (currentRef) {
      currentRef.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [output, error, logs, activeTab]);

  // Copy to clipboard handler
  const handleCopy = () => {
    const contentMap = {
      output: output,
      logs: logs,
      errors: error,
    };
    const content = contentMap[activeTab as keyof typeof contentMap];

    if (content) {
      navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Format text with color coding
  const formatOutput = (text: string, type: 'output' | 'logs' | 'errors') => {
    if (!text) {
      const emptyMessages = {
        output: 'No output yet. Run your code to see results here.',
        logs: 'No logs available.',
        errors: 'No errors. Everything looks good!',
      };
      return (
        <span className="text-neutral-500 italic">
          {emptyMessages[type]}
        </span>
      );
    }

    const lines = text.split('\n');
    return lines.map((line, index) => {
      let colorClass = 'text-neutral-300';

      if (type === 'errors') {
        colorClass = 'text-red-400';
      } else if (type === 'logs') {
        colorClass = 'text-blue-400';
      } else if (line.toLowerCase().includes('success') || line.toLowerCase().includes('✓')) {
        colorClass = 'text-emerald-400';
      } else if (line.toLowerCase().includes('error') || line.toLowerCase().includes('✗')) {
        colorClass = 'text-red-400';
      } else if (line.toLowerCase().includes('warning') || line.toLowerCase().includes('⚠')) {
        colorClass = 'text-amber-400';
      }

      return (
        <div key={index} className={colorClass}>
          {line || '\u00A0'}
        </div>
      );
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="h-full w-full flex flex-col bg-neutral-900/60 dark:bg-neutral-900/60 backdrop-blur-xl rounded-2xl border border-neutral-800 dark:border-neutral-800 overflow-hidden shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-neutral-800/40 dark:bg-neutral-800/40 border-b border-neutral-700/50 dark:border-neutral-700/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-green-600/20 border border-emerald-500/30">
            <Terminal className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-sm font-semibold text-white">Terminal Output</span>
          {isRunning && (
            <div className="flex items-center gap-2 text-xs text-cyan-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Running...</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleCopy}
            variant="ghost"
            size="sm"
            className="text-neutral-400 hover:text-white hover:bg-neutral-800"
            disabled={!output && !error && !logs}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-1" />
                <span className="text-xs">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-1" />
                <span className="text-xs">Copy</span>
              </>
            )}
          </Button>
          {onClear && (
            <Button
              onClick={onClear}
              variant="ghost"
              size="sm"
              className="text-neutral-400 hover:text-white hover:bg-neutral-800"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              <span className="text-xs">Clear</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-6 mt-4 bg-neutral-800/60">
          <TabsTrigger value="output" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            Output
            {output && <span className="ml-2 w-2 h-2 rounded-full bg-emerald-500" />}
          </TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
            Logs
            {logs && <span className="ml-2 w-2 h-2 rounded-full bg-blue-500" />}
          </TabsTrigger>
          <TabsTrigger value="errors" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">
            Errors
            {error && <span className="ml-2 w-2 h-2 rounded-full bg-red-500" />}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="output" className="flex-1 mt-0 border-0 p-0">
          <ScrollArea className="h-full px-6 py-4">
            <pre ref={outputRef} className="text-sm font-mono whitespace-pre-wrap">
              {formatOutput(output, 'output')}
            </pre>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="logs" className="flex-1 mt-0 border-0 p-0">
          <ScrollArea className="h-full px-6 py-4">
            <pre ref={logsRef} className="text-sm font-mono whitespace-pre-wrap">
              {formatOutput(logs, 'logs')}
            </pre>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="errors" className="flex-1 mt-0 border-0 p-0">
          <ScrollArea className="h-full px-6 py-4">
            <pre ref={errorsRef} className="text-sm font-mono whitespace-pre-wrap">
              {formatOutput(error, 'errors')}
            </pre>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Statistics Footer */}
      {(executionTime !== undefined || memoryUsed !== undefined) && (
        <div className="flex items-center justify-between px-6 py-3 bg-neutral-800/40 dark:bg-neutral-800/40 border-t border-neutral-700/50 dark:border-neutral-700/50">
          <div className="flex items-center gap-6 text-xs text-neutral-400">
            {executionTime !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-neutral-500">⏱️</span>
                <span>Execution Time:</span>
                <span className="text-cyan-400 font-semibold">{executionTime}ms</span>
              </div>
            )}
            {memoryUsed !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-neutral-500">💾</span>
                <span>Memory Used:</span>
                <span className="text-purple-400 font-semibold">{memoryUsed}MB</span>
              </div>
            )}
          </div>
          <div className="text-xs text-neutral-500">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      )}

      {/* Bottom Accent Line */}
      <div className="h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-500 opacity-30" />
    </motion.div>
  );
}
