/**
 * Code Executor API Client
 * Handles code execution requests to the backend code-executor service
 */

import { post } from './client';

export interface CodeExecutionRequest {
  language: string;
  code: string;
  stdin?: string;
  timeout?: number;
  memoryLimit?: number;
}

export interface CodeExecutionResponse {
  output: string;
  error: string;
  executionTime: number;
  exitCode: number;
  status: 'success' | 'error' | 'timeout';
  memoryUsed?: number;
}

const CODE_EXECUTOR_BASE_URL = process.env.NEXT_PUBLIC_CODE_EXECUTOR_URL || 'http://localhost:3001';

/**
 * Execute code in a sandboxed environment
 */
export async function executeCode(request: CodeExecutionRequest): Promise<CodeExecutionResponse> {
  try {
    const response = await fetch(`${CODE_EXECUTOR_BASE_URL}/api/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Execution failed with status ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Code execution error:', error);
    return {
      output: '',
      error: error.message || 'Failed to execute code',
      executionTime: 0,
      exitCode: 1,
      status: 'error',
    };
  }
}

/**
 * Check if code executor service is available
 */
export async function checkExecutorHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${CODE_EXECUTOR_BASE_URL}/health`, {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get supported languages from executor service
 */
export async function getSupportedLanguages(): Promise<string[]> {
  try {
    const response = await fetch(`${CODE_EXECUTOR_BASE_URL}/api/languages`);
    if (response.ok) {
      const data = await response.json();
      return data.languages || [];
    }
    return [];
  } catch {
    return [];
  }
}
