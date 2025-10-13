import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import { logger } from './config/logger';
import executeRouter from './routes/execute';
import projectsRouter from './routes/projects';
import authRouter from './routes/auth';
import { codeExecutor } from './services/CodeExecutor';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
};

// Middleware
app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Routes
app.use('/api/execute', executeRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/auth', authRouter);

// Health check
app.get('/health', async (_req, res) => {
  try {
    let dockerHealthy = false;
    try {
      dockerHealthy = await codeExecutor.healthCheck();
    } catch (err) {
      // Docker not available
    }

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      docker: dockerHealthy ? 'connected' : 'not available',
      mongodb: 'optional',
      message: 'Backend API is running',
    });
  } catch (error) {
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
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Socket.IO setup for real-time code execution
const io = new Server(httpServer, {
  cors: corsOptions,
});

io.on('connection', (socket) => {
  logger.info('Client connected', { socketId: socket.id });

  // Handle code execution with real-time streaming
  socket.on('execute-code', async (data) => {
    try {
      const { code, language, timeout } = data;

      // Emit start event
      socket.emit('execution-start', { timestamp: Date.now() });

      // Execute code
      const result = await codeExecutor.executeCode({
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
    } catch (error: any) {
      logger.error('Socket execution error', { error: error.message });
      socket.emit('execution-error', {
        error: error.message || 'Execution failed',
      });
    }
  });

  socket.on('disconnect', () => {
    logger.info('Client disconnected', { socketId: socket.id });
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
      await connectDatabase();
      logger.info('MongoDB connected successfully');
      mongoConnected = true;
    } catch (dbError: any) {
      logger.warn('MongoDB not available - running without database', { error: dbError.message });
      logger.info('✅ Backend will work without MongoDB (no user data persistence)');
    }

    // Check Docker availability (optional)
    try {
      dockerHealthy = await codeExecutor.healthCheck();
      if (!dockerHealthy) {
        logger.warn('Docker is not available - code execution will be limited');
      } else {
        logger.info('🐳 Docker: Connected');
      }
    } catch (dockerError: any) {
      logger.warn('Docker check failed - code execution will be limited', { error: dockerError.message });
    }

    // Start HTTP server
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📝 API: http://localhost:${PORT}/api`);
      logger.info(`🔌 WebSocket: ws://localhost:${PORT}`);
      logger.info(`💾 MongoDB: ${mongoConnected ? 'Connected' : 'Not available'}`);
      logger.info(`🐳 Docker: ${dockerHealthy ? 'Connected' : 'Not available'}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

startServer();

export { app, io };
