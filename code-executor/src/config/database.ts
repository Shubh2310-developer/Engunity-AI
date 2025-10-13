import mongoose from 'mongoose';
import { logger } from './logger';

export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/engunity-code-editor';

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 3000, // Timeout after 3 seconds
      connectTimeoutMS: 3000,
    });

    logger.info('MongoDB connected successfully');

    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', { error });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });
  } catch (error) {
    logger.warn('Failed to connect to MongoDB - continuing without database:', { error });
    // Don't crash the app - just throw the error to be handled by caller
    throw error;
  }
};
