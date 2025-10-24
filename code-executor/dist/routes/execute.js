"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const CodeExecutor_1 = require("../services/CodeExecutor");
const auth_1 = require("../middleware/auth");
const ExecutionLog_1 = __importDefault(require("../models/ExecutionLog"));
const logger_1 = require("../config/logger");
const router = express_1.default.Router();
/**
 * POST /api/execute
 * Execute code in a sandboxed Docker container
 */
router.post('/', auth_1.optionalAuth, async (req, res) => {
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
        logger_1.logger.info('Executing code', { language, userId: req.userId });
        // Execute code
        const result = await CodeExecutor_1.codeExecutor.executeCode({
            code,
            language,
            timeout,
        });
        // Log execution (if user is authenticated)
        if (req.userId) {
            await ExecutionLog_1.default.create({
                userId: req.userId,
                language,
                code,
                output: result.output,
                error: result.error,
                executionTime: result.executionTime,
                memoryUsed: result.memoryUsed,
                exitCode: result.exitCode,
                status: result.status,
            }).catch((error) => {
                logger_1.logger.error('Failed to log execution', { error: error.message });
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
    }
    catch (error) {
        logger_1.logger.error('Code execution error', { error: error.message });
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
        const isHealthy = await CodeExecutor_1.codeExecutor.healthCheck();
        res.json({
            healthy: isHealthy,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        res.status(503).json({
            healthy: false,
            error: 'Docker service unavailable',
        });
    }
});
exports.default = router;
//# sourceMappingURL=execute.js.map