import { useState, useCallback, useRef } from 'react';

/**
 * Code execution result interface
 */
export interface ExecutionResult {
  stdout: string;
  stderr: string;
  logs: string[];
  executionTime?: string;
  memoryUsage?: string;
  exitCode?: number;
}

/**
 * Execution statistics
 */
export interface ExecutionStats {
  time?: string;
  memory?: string;
  exitCode?: number;
}

/**
 * Hook state interface
 */
export interface UseCodeExecutionState {
  isRunning: boolean;
  output: string;
  error: string | null;
  logs: string[];
  stats: ExecutionStats;
}

/**
 * Hook return interface
 */
export interface UseCodeExecutionReturn extends UseCodeExecutionState {
  runCode: (code: string, language: string) => Promise<void>;
  resetOutput: () => void;
  appendLog: (message: string) => void;
  cancelExecution: () => void;
}

/**
 * Custom hook for managing code execution lifecycle
 *
 * Handles:
 * - Async code execution via backend API
 * - Loading and completion states
 * - Output, error, and log management
 * - Execution statistics (time, memory)
 * - Cancellation support via AbortController
 *
 * @example
 * ```tsx
 * const { runCode, isRunning, output, error } = useCodeExecution();
 *
 * <Button onClick={() => runCode(code, 'python')} disabled={isRunning}>
 *   {isRunning ? 'Running...' : 'Run'}
 * </Button>
 * ```
 */
export function useCodeExecution(): UseCodeExecutionReturn {
  // Core state
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [stats, setStats] = useState<ExecutionStats>({});

  // Abort controller for cancellation support
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Execute code on backend
   */
  const runCode = useCallback(async (code: string, language: string) => {
    // Validation
    if (!code || !code.trim()) {
      setError('No code to execute. Please write some code first.');
      return;
    }

    if (!language) {
      setError('Language not specified.');
      return;
    }

    // Reset state
    setIsRunning(true);
    setError(null);
    setOutput('');
    setLogs(['Execution started...']);
    setStats({});

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      // Add initial log
      setLogs((prev) => [...prev, `Running ${language} code...`]);

      // Make API request
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language: language.toLowerCase(),
          code: code,
        }),
        signal: abortControllerRef.current.signal,
      });

      // Handle non-OK responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
          errorData.error ||
          `Server error: ${response.status} ${response.statusText}`
        );
      }

      // Parse result
      const result: ExecutionResult = await response.json();

      // Update state with results
      setOutput(result.stdout || '');

      if (result.stderr && result.stderr.trim()) {
        setError(result.stderr);
        setLogs((prev) => [...prev, 'Execution completed with errors.']);
      } else {
        setLogs((prev) => [...prev, ...(result.logs || []), 'Execution completed successfully.']);
      }

      // Set execution statistics
      setStats({
        time: result.executionTime,
        memory: result.memoryUsage,
        exitCode: result.exitCode,
      });

    } catch (err: any) {
      // Handle different error types
      if (err.name === 'AbortError') {
        setError('Execution was cancelled.');
        setLogs((prev) => [...prev, 'Execution cancelled by user.']);
      } else if (err.message?.includes('Failed to fetch')) {
        setError('Cannot connect to execution service. Please check your network connection.');
        setLogs((prev) => [...prev, 'Network error: Unable to reach server.']);
      } else if (err.message?.includes('timeout')) {
        setError('Execution timed out. Try optimizing your code or reducing its complexity.');
        setLogs((prev) => [...prev, 'Execution timed out.']);
      } else {
        setError(err.message || 'Unexpected error during code execution.');
        setLogs((prev) => [...prev, `Error: ${err.message || 'Unknown error'}`]);
      }

      // Set error stats
      setStats({ exitCode: -1 });

    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * Reset all output and clear execution state
   */
  const resetOutput = useCallback(() => {
    setOutput('');
    setError(null);
    setLogs([]);
    setStats({});
  }, []);

  /**
   * Append a log message to the logs array
   * Useful for live feedback or streaming updates
   */
  const appendLog = useCallback((message: string) => {
    setLogs((prev) => [...prev, message]);
  }, []);

  /**
   * Cancel ongoing execution
   */
  const cancelExecution = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsRunning(false);
      setLogs((prev) => [...prev, 'Cancelling execution...']);
    }
  }, []);

  return {
    // State
    isRunning,
    output,
    error,
    logs,
    stats,
    // Actions
    runCode,
    resetOutput,
    appendLog,
    cancelExecution,
  };
}

/**
 * Utility: Format execution time for display
 */
export function formatExecutionTime(time?: string): string {
  if (!time) return 'N/A';

  // If already formatted (e.g., "0.23s"), return as-is
  if (time.includes('s') || time.includes('ms')) {
    return time;
  }

  // Parse numeric value and format
  const numTime = parseFloat(time);
  if (isNaN(numTime)) return time;

  if (numTime < 1) {
    return `${(numTime * 1000).toFixed(0)}ms`;
  }
  return `${numTime.toFixed(2)}s`;
}

/**
 * Utility: Format memory usage for display
 */
export function formatMemoryUsage(memory?: string): string {
  if (!memory) return 'N/A';

  // If already formatted (e.g., "12 MB"), return as-is
  if (memory.includes('MB') || memory.includes('KB') || memory.includes('GB')) {
    return memory;
  }

  // Parse numeric value (assume bytes) and format
  const numMemory = parseFloat(memory);
  if (isNaN(numMemory)) return memory;

  if (numMemory < 1024) {
    return `${numMemory.toFixed(0)} B`;
  } else if (numMemory < 1024 * 1024) {
    return `${(numMemory / 1024).toFixed(2)} KB`;
  } else if (numMemory < 1024 * 1024 * 1024) {
    return `${(numMemory / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${(numMemory / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default useCodeExecution;
