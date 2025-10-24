import express, { Response } from 'express';
import { codeExecutor } from '../services/CodeExecutor';
import { optionalAuth, AuthRequest } from '../middleware/auth';
import ExecutionLog from '../models/ExecutionLog';
import { logger } from '../config/logger';

const router = express.Router();

/**
 * POST /api/execute
 * Execute code in a sandboxed Docker container
 */
router.post('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { code, language, timeout } = req.body;

    // Validation
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Code is required and must be a string' });
    }

    if (!language || typeof language !== 'string') {
      return res.status(400).json({ error: 'Language is required' });
    }

    if (code.length > 100000) {
      return res.status(400).json({ error: 'Code too large (max 100KB)' });
    }

    logger.info('Executing code', { language, userId: req.userId });

    // Execute code
    const result = await codeExecutor.executeCode({
      code,
      language,
      timeout,
    });

    // Log execution (if user is authenticated)
    if (req.userId) {
      await ExecutionLog.create({
        userId: req.userId,
        language,
        code,
        output: result.output,
        error: result.error,
        executionTime: result.executionTime,
        memoryUsed: result.memoryUsed,
        exitCode: result.exitCode,
        status: result.status,
      }).catch((error: any) => {
        logger.error('Failed to log execution', { error: error.message });
      });
    }

    res.json({
      success: result.status === 'success',
      output: result.output,
      error: result.error,
      executionTime: result.executionTime,
      exitCode: result.exitCode,
      status: result.status,
      memoryUsed: result.memoryUsed,
    });
  } catch (error: any) {
    logger.error('Code execution error', { error: error.message });
    res.status(500).json({
      error: 'Execution failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/execute/health
 * Check Docker service health
 */
router.get('/health', async (_req, res) => {
  try {
    const isHealthy = await codeExecutor.healthCheck();

    res.json({
      healthy: isHealthy,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      healthy: false,
      error: 'Docker service unavailable',
    });
  }
});

export default router;
