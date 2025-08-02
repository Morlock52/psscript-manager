import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

/**
 * Middleware to require authentication for protected routes
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'No authentication token provided'
      });
    }

    // Verify JWT_SECRET is configured
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('CRITICAL: JWT_SECRET not configured in environment');
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'Authentication service unavailable'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    // Check if user still exists and is active
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'email', 'role', 'isActive']
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ 
        error: 'Invalid authentication',
        message: 'User account not found or inactive'
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Please login again'
      });
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Authentication token is invalid'
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      error: 'Authentication error',
      message: 'An error occurred during authentication'
    });
  }
};

/**
 * Middleware to optionally authenticate (doesn't fail if no token)
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      return next();
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return next();
    }

    const decoded = jwt.verify(token, jwtSecret) as any;
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'email', 'role', 'isActive']
    });

    if (user && user.isActive) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role
      };
    }

    next();
  } catch (error) {
    // Ignore errors for optional auth
    next();
  }
};

/**
 * Middleware to require admin role
 */
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Admin access required'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Forbidden',
      message: 'Admin privileges required'
    });
  }

  next();
};