import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../config/logger';

export interface AuthRequest extends Request {
  userId?: string;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET || 'default-secret-change-me';
    const decoded = jwt.verify(token, jwtSecret) as { userId: string };

    req.userId = decoded.userId;
    next();
  } catch (error) {
    logger.error('Authentication failed', { error });
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      const jwtSecret = process.env.JWT_SECRET || 'default-secret-change-me';
      const decoded = jwt.verify(token, jwtSecret) as { userId: string };
      req.userId = decoded.userId;
    }

    next();
  } catch (error) {
    // Continue without auth
    next();
  }
};
