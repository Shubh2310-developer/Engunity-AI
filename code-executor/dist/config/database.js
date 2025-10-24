"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDatabase = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = require("./logger");
const connectDatabase = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/engunity-code-editor';
        await mongoose_1.default.connect(mongoUri, {
            serverSelectionTimeoutMS: 3000, // Timeout after 3 seconds
            connectTimeoutMS: 3000,
        });
        logger_1.logger.info('MongoDB connected successfully');
        mongoose_1.default.connection.on('error', (error) => {
            logger_1.logger.error('MongoDB connection error:', { error });
        });
        mongoose_1.default.connection.on('disconnected', () => {
            logger_1.logger.warn('MongoDB disconnected');
        });
    }
    catch (error) {
        logger_1.logger.warn('Failed to connect to MongoDB - continuing without database:', { error });
        // Don't crash the app - just throw the error to be handled by caller
        throw error;
    }
};
exports.connectDatabase = connectDatabase;
//# sourceMappingURL=database.js.map