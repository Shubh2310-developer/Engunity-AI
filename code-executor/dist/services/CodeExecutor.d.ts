export interface ExecutionConfig {
    language: string;
    code: string;
    timeout?: number;
    memoryLimit?: number;
}
export interface ExecutionResult {
    output: string;
    error: string;
    executionTime: number;
    exitCode: number;
    status: 'success' | 'error' | 'timeout';
    memoryUsed?: number;
}
export declare class CodeExecutor {
    private readonly maxTimeout;
    private readonly maxMemory;
    private readonly maxOutputSize;
    constructor();
    executeCode(config: ExecutionConfig): Promise<ExecutionResult>;
    private ensureImage;
    private parseLogs;
    private cleanup;
    healthCheck(): Promise<boolean>;
}
export declare const codeExecutor: CodeExecutor;
//# sourceMappingURL=CodeExecutor.d.ts.map