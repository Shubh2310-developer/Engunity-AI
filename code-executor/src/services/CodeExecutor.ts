import Docker from 'dockerode';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../config/logger';

const docker = new Docker();

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

const LANGUAGE_CONFIGS: Record<string, { image: string; cmd: string[]; ext: string }> = {
  python: {
    image: 'python:3.11-slim',
    cmd: ['python', '/workspace/main.py'],
    ext: 'py',
  },
  javascript: {
    image: 'node:20-slim',
    cmd: ['node', '/workspace/main.js'],
    ext: 'js',
  },
  typescript: {
    image: 'node:20-slim',
    cmd: ['npx', 'ts-node', '/workspace/main.ts'],
    ext: 'ts',
  },
  java: {
    image: 'openjdk:21-slim',
    cmd: ['sh', '-c', 'javac /workspace/Main.java && java -cp /workspace Main'],
    ext: 'java',
  },
  cpp: {
    image: 'gcc:latest',
    cmd: ['sh', '-c', 'g++ /workspace/main.cpp -o /workspace/main && /workspace/main'],
    ext: 'cpp',
  },
  c: {
    image: 'gcc:latest',
    cmd: ['sh', '-c', 'gcc /workspace/main.c -o /workspace/main && /workspace/main'],
    ext: 'c',
  },
  go: {
    image: 'golang:1.21-alpine',
    cmd: ['go', 'run', '/workspace/main.go'],
    ext: 'go',
  },
  rust: {
    image: 'rust:latest',
    cmd: ['sh', '-c', 'rustc /workspace/main.rs -o /workspace/main && /workspace/main'],
    ext: 'rs',
  },
  php: {
    image: 'php:8.2-cli',
    cmd: ['php', '/workspace/main.php'],
    ext: 'php',
  },
  ruby: {
    image: 'ruby:3.2-slim',
    cmd: ['ruby', '/workspace/main.rb'],
    ext: 'rb',
  },
  csharp: {
    image: 'mcr.microsoft.com/dotnet/sdk:8.0',
    cmd: ['sh', '-c', 'dotnet script /workspace/main.csx'],
    ext: 'csx',
  },
  bash: {
    image: 'bash:latest',
    cmd: ['bash', '/workspace/main.sh'],
    ext: 'sh',
  },
  shell: {
    image: 'bash:latest',
    cmd: ['bash', '/workspace/main.sh'],
    ext: 'sh',
  },
};

export class CodeExecutor {
  private readonly maxTimeout: number;
  private readonly maxMemory: number;
  private readonly maxOutputSize: number;

  constructor() {
    this.maxTimeout = parseInt(process.env.MAX_EXECUTION_TIME || '30000');
    this.maxMemory = parseInt(process.env.MAX_MEMORY_MB || '512') * 1024 * 1024; // Convert to bytes
    this.maxOutputSize = parseInt(process.env.MAX_OUTPUT_SIZE || '1048576'); // 1MB
  }

  async executeCode(config: ExecutionConfig): Promise<ExecutionResult> {
    const executionId = uuidv4();
    const workspaceDir = path.join('/tmp', `code-exec-${executionId}`);
    const startTime = Date.now();

    try {
      // Validate language
      const langConfig = LANGUAGE_CONFIGS[config.language];
      if (!langConfig) {
        throw new Error(`Unsupported language: ${config.language}`);
      }

      // Create workspace directory
      await fs.mkdir(workspaceDir, { recursive: true });

      // Write code to file
      const fileName = config.language === 'java' ? 'Main.java' : `main.${langConfig.ext}`;
      const filePath = path.join(workspaceDir, fileName);
      await fs.writeFile(filePath, config.code, 'utf-8');

      logger.info(`Executing ${config.language} code`, { executionId });

      // Pull image if not exists
      await this.ensureImage(langConfig.image);

      // Create container
      const container = await docker.createContainer({
        Image: langConfig.image,
        Cmd: langConfig.cmd,
        WorkingDir: '/workspace',
        HostConfig: {
          Binds: [`${workspaceDir}:/workspace:ro`],
          Memory: this.maxMemory,
          MemorySwap: this.maxMemory,
          NanoCpus: 1000000000, // 1 CPU
          NetworkMode: 'none', // Disable network for security
          ReadonlyRootfs: false,
          AutoRemove: true,
        },
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
      });

      // Start container
      await container.start();

      // Setup timeout
      const timeout = Math.min(config.timeout || this.maxTimeout, this.maxTimeout);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Execution timeout')), timeout)
      );

      // Wait for container with timeout
      const waitResult = await Promise.race([
        container.wait(),
        timeoutPromise,
      ]).catch(async (error) => {
        await container.stop().catch(() => {});
        throw error;
      });

      // Get logs
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        follow: false,
      });

      // Parse logs
      const output = this.parseLogs(logs);

      // Calculate execution time
      const executionTime = Date.now() - startTime;

      // Get container stats
      const stats = await container.stats({ stream: false }).catch(() => null);
      const memoryUsed = stats?.memory_stats?.usage || undefined;

      // Cleanup
      await this.cleanup(workspaceDir);

      const exitCode = (waitResult as any).StatusCode || 0;

      return {
        output: output.stdout.slice(0, this.maxOutputSize),
        error: output.stderr.slice(0, this.maxOutputSize),
        executionTime,
        exitCode,
        status: exitCode === 0 ? 'success' : 'error',
        memoryUsed,
      };
    } catch (error: any) {
      logger.error('Code execution failed', { error: error.message, executionId });

      await this.cleanup(workspaceDir);

      return {
        output: '',
        error: error.message || 'Execution failed',
        executionTime: Date.now() - startTime,
        exitCode: 1,
        status: error.message === 'Execution timeout' ? 'timeout' : 'error',
      };
    }
  }

  private async ensureImage(image: string): Promise<void> {
    try {
      await docker.getImage(image).inspect();
    } catch (error) {
      logger.info(`Pulling image: ${image}`);
      await new Promise((resolve, reject) => {
        docker.pull(image, (err: any, stream: any) => {
          if (err) return reject(err);
          docker.modem.followProgress(stream, (err: any) => {
            if (err) return reject(err);
            resolve(true);
          });
        });
      });
    }
  }

  private parseLogs(logs: Buffer): { stdout: string; stderr: string } {
    let stdout = '';
    let stderr = '';

    let offset = 0;
    while (offset < logs.length) {
      // Docker log format: [type][size][data]
      const type = logs[offset];
      const size = logs.readUInt32BE(offset + 4);

      if (size > 0 && offset + 8 + size <= logs.length) {
        const data = logs.slice(offset + 8, offset + 8 + size).toString('utf-8');

        if (type === 1) {
          stdout += data;
        } else if (type === 2) {
          stderr += data;
        }
      }

      offset += 8 + size;
    }

    return { stdout, stderr };
  }

  private async cleanup(dir: string): Promise<void> {
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch (error) {
      logger.error(`Failed to cleanup directory: ${dir}`, { error });
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await docker.ping();
      return true;
    } catch (error) {
      logger.error('Docker health check failed', { error });
      return false;
    }
  }
}

export const codeExecutor = new CodeExecutor();
