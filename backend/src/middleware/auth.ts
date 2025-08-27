import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/userService.js';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        email: string;
      };
      userId?: string;
    }
  }
}

export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const sessionToken = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    const sessionData = await userService.validateSession(sessionToken);
    
    if (!sessionData) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    // Attach user data to request
    req.user = sessionData.user;
    req.userId = sessionData.userId;
    
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};
