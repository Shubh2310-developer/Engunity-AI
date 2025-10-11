'use client';

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Terminal, Trash2, XCircle, ArrowUp, ChevronDown } from 'lucide-react';

interface TerminalLine {
  type: 'command' | 'output' | 'error' | 'info';
  content: string;
  timestamp: Date;
}

interface TerminalPanelProps {
  isVisible?: boolean;
  onClose?: () => void;
  className?: string;
}

export default function TerminalPanel({
  isVisible = true,
  onClose,
  className = '',
}: TerminalPanelProps) {
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      type: 'info',
      content: 'Welcome to Engunity AI Terminal. Type "help" for available commands.',
      timestamp: new Date(),
    },
  ]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const outputEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new lines are added
  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  // Auto-focus input when panel becomes visible
  useEffect(() => {
    if (isVisible) {
      inputRef.current?.focus();
    }
  }, [isVisible]);

  const addLine = (type: TerminalLine['type'], content: string) => {
    setLines((prev) => [...prev, { type, content, timestamp: new Date() }]);
  };

  const simulateCommand = async (cmd: string) => {
    setIsProcessing(true);

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Basic command simulation
    const trimmedCmd = cmd.trim().toLowerCase();

    if (trimmedCmd === 'help') {
      addLine('output', 'Available commands:');
      addLine('output', '  clear       - Clear terminal output');
      addLine('output', '  help        - Show this help message');
      addLine('output', '  exit        - Close terminal');
      addLine('output', '  date        - Show current date/time');
      addLine('output', '  echo [text] - Echo text back');
      addLine('output', '  whoami      - Show current user');
    } else if (trimmedCmd === 'clear') {
      setLines([]);
    } else if (trimmedCmd === 'exit') {
      if (onClose) {
        onClose();
      }
    } else if (trimmedCmd === 'date') {
      addLine('output', new Date().toString());
    } else if (trimmedCmd.startsWith('echo ')) {
      const text = cmd.substring(5);
      addLine('output', text);
    } else if (trimmedCmd === 'whoami') {
      addLine('output', 'user@engunity-ai');
    } else if (trimmedCmd === '') {
      // Empty command, just show prompt again
    } else {
      addLine('error', `Command not found: ${cmd}`);
      addLine('info', 'Type "help" for available commands.');
    }

    setIsProcessing(false);
  };

  const handleCommand = async () => {
    if (!currentCommand.trim() || isProcessing) return;

    // Add command to output
    addLine('command', currentCommand);

    // Add to history
    setCommandHistory((prev) => [...prev, currentCommand]);
    setHistoryIndex(-1);

    // Execute command
    await simulateCommand(currentCommand);

    // Clear input
    setCurrentCommand('');

    // Re-focus input
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex >= 0) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setCurrentCommand('');
        } else {
          setHistoryIndex(newIndex);
          setCurrentCommand(commandHistory[newIndex]);
        }
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (onClose) {
        onClose();
      }
    }
  };

  const handleClear = () => {
    setLines([]);
    inputRef.current?.focus();
  };

  const getLineColor = (type: TerminalLine['type']) => {
    switch (type) {
      case 'command':
        return 'text-cyan-400';
      case 'output':
        return 'text-neutral-300';
      case 'error':
        return 'text-red-400';
      case 'info':
        return 'text-blue-400';
      default:
        return 'text-neutral-300';
    }
  };

  const getPrompt = () => {
    return <span className="text-emerald-400">user@engunity-ai:~$</span>;
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.2 }}
      className={`h-full w-full flex flex-col bg-neutral-900/60 backdrop-blur-xl rounded-2xl border border-neutral-800 overflow-hidden shadow-xl ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-neutral-800/40 border-b border-neutral-700/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30">
            <Terminal className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="text-sm font-semibold text-white">Terminal</span>
          {isProcessing && (
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="flex items-center gap-2 text-xs text-cyan-400"
            >
              <ChevronDown className="w-3 h-3 animate-pulse" />
              <span>Processing...</span>
            </motion.div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleClear}
            variant="ghost"
            size="sm"
            className="text-neutral-400 hover:text-cyan-400 hover:bg-neutral-800 transition-colors"
            title="Clear terminal (Ctrl+L)"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            <span className="text-xs">Clear</span>
          </Button>
          {onClose && (
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-neutral-400 hover:text-red-400 hover:bg-neutral-800 transition-colors"
              title="Close terminal (Esc)"
            >
              <XCircle className="w-4 h-4 mr-1" />
              <span className="text-xs">Close</span>
            </Button>
          )}
        </div>
      </div>

      {/* Output Area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 px-6 py-4">
        <div className="font-mono text-sm space-y-1">
          <AnimatePresence>
            {lines.map((line, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15, delay: index * 0.02 }}
                className={`flex items-start gap-2 ${getLineColor(line.type)}`}
              >
                {line.type === 'command' && <span className="flex-shrink-0">{getPrompt()}</span>}
                {line.type === 'command' ? (
                  <span className="flex-1">{line.content}</span>
                ) : (
                  <span className="flex-1 pl-6">{line.content}</span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={outputEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="flex items-center gap-3 px-6 py-3 bg-neutral-800/40 border-t border-neutral-700/50">
        <span className="text-sm font-mono text-emerald-400 flex-shrink-0">{getPrompt()}</span>
        <Input
          ref={inputRef}
          value={currentCommand}
          onChange={(e) => setCurrentCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter command..."
          disabled={isProcessing}
          className="
            flex-1
            bg-neutral-900/60
            border border-neutral-700
            text-neutral-300
            placeholder:text-neutral-500
            focus:border-cyan-500
            focus:ring-2
            focus:ring-cyan-500/50
            font-mono text-sm
            rounded-lg
            transition-all
          "
          aria-label="Terminal command input"
          autoComplete="off"
          spellCheck="false"
        />
        {commandHistory.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-neutral-500">
            <ArrowUp className="w-3 h-3" />
            <span>History</span>
          </div>
        )}
      </div>

      {/* Bottom Accent Line */}
      <div className="h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 opacity-30" />
    </motion.div>
  );
}
