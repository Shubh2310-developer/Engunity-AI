"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./config/database");
const logger_1 = require("./config/logger");
const execute_1 = __importDefault(require("./routes/execute"));
const projects_1 = __importDefault(require("./routes/projects"));
const auth_1 = __importDefault(require("./routes/auth"));
const CodeExecutor_1 = require("./services/CodeExecutor");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
exports.app = app;
const httpServer = (0, http_1.createServer)(app);
// CORS configuration
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
};
// Middleware
app.use((0, cors_1.default)(corsOptions));
app.use((0, helmet_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);
// Routes
app.use('/api/execute', execute_1.default);
app.use('/api/projects', projects_1.default);
app.use('/api/auth', auth_1.default);
// Health check
app.get('/health', async (_req, res) => {
    try {
        let dockerHealthy = false;
        try {
            dockerHealthy = await CodeExecutor_1.codeExecutor.healthCheck();
        }
        catch (err) {
            // Docker not available
        }
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            docker: dockerHealthy ? 'connected' : 'not available',
            mongodb: 'optional',
            message: 'Backend API is running',
        });
    }
    catch (error) {
        res.status(200).json({
            status: 'ok',
            error: 'Some services unavailable but API is running',
        });
    }
});
// 404 handler
app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
});
// Error handler
app.use((err, _req, res, _next) => {
    logger_1.logger.error('Unhandled error', { error: err.message, stack: err.stack });
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
    });
});
// Socket.IO setup for real-time code execution
const io = new socket_io_1.Server(httpServer, {
    cors: corsOptions,
});
exports.io = io;
io.on('connection', (socket) => {
    logger_1.logger.info('Client connected', { socketId: socket.id });
    // Handle code execution with real-time streaming
    socket.on('execute-code', async (data) => {
        try {
            const { code, language, timeout } = data;
            // Emit start event
            socket.emit('execution-start', { timestamp: Date.now() });
            // Execute code
            const result = await CodeExecutor_1.codeExecutor.executeCode({
                code,
                language,
                timeout,
            });
            // Emit result
            socket.emit('execution-complete', {
                success: result.status === 'success',
                output: result.output,
                error: result.error,
                executionTime: result.executionTime,
                exitCode: result.exitCode,
                status: result.status,
            });
        }
        catch (error) {
            logger_1.logger.error('Socket execution error', { error: error.message });
            socket.emit('execution-error', {
                error: error.message || 'Execution failed',
            });
        }
    });
    socket.on('disconnect', () => {
        logger_1.logger.info('Client disconnected', { socketId: socket.id });
    });
});
// Start server
const PORT = process.env.PORT || 4000;
const startServer = async () => {
    try {
        let mongoConnected = false;
        let dockerHealthy = false;
        // Connect to MongoDB (optional - will continue even if it fails)
        try {
            await (0, database_1.connectDatabase)();
            logger_1.logger.info('MongoDB connected successfully');
            mongoConnected = true;
        }
        catch (dbError) {
            logger_1.logger.warn('MongoDB not available - running without database', { error: dbError.message });
            logger_1.logger.info('✅ Backend will work without MongoDB (no user data persistence)');
        }
        // Check Docker availability (optional)
        try {
            dockerHealthy = await CodeExecutor_1.codeExecutor.healthCheck();
            if (!dockerHealthy) {
                logger_1.logger.warn('Docker is not available - code execution will be limited');
            }
            else {
                logger_1.logger.info('🐳 Docker: Connected');
            }
        }
        catch (dockerError) {
            logger_1.logger.warn('Docker check failed - code execution will be limited', { error: dockerError.message });
        }
        // Start HTTP server
        httpServer.listen(PORT, () => {
            logger_1.logger.info(`🚀 Server running on port ${PORT}`);
            logger_1.logger.info(`📝 API: http://localhost:${PORT}/api`);
            logger_1.logger.info(`🔌 WebSocket: ws://localhost:${PORT}`);
            logger_1.logger.info(`💾 MongoDB: ${mongoConnected ? 'Connected' : 'Not available'}`);
            logger_1.logger.info(`🐳 Docker: ${dockerHealthy ? 'Connected' : 'Not available'}`);
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start server', { error });
        process.exit(1);
    }
};
// Graceful shutdown
process.on('SIGTERM', () => {
    logger_1.logger.info('SIGTERM received, shutting down gracefully');
    httpServer.close(() => {
        logger_1.logger.info('Server closed');
        process.exit(0);
    });
});
process.on('SIGINT', () => {
    logger_1.logger.info('SIGINT received, shutting down gracefully');
    httpServer.close(() => {
        logger_1.logger.info('Server closed');
        process.exit(0);
    });
});
startServer();
//# sourceMappingURL=index.js.map