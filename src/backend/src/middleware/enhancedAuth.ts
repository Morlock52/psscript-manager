import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import SessionService from '../services/SessionService';
import PermissionService from '../services/PermissionService';
import logger from '../utils/logger';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        username: string;
        email: string;
        role: string;
      };
      session?: any;
      sessionId?: string;
    }
  }
}

/**
 * Enhanced JWT authentication with session validation
 */
export const authenticateWithSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authorization header missing' 
      });
      return;
    }
    
    // Extract the token
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid token format' 
      });
      return;
    }
    
    const token = parts[1];
    
    // Get session ID from header or query
    const sessionId = req.headers['x-session-id'] as string || 
                     req.query.sessionId as string;

    if (!sessionId) {
      res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Session ID required' 
      });
      return;
    }

    // Verify the token
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, secret) as any;
    
    // Validate session
    const sessionData = await SessionService.getSession(sessionId);
    
    if (!sessionData || sessionData.userId !== decoded.userId) {
      res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid or expired session' 
      });
      return;
    }

    // Check if session needs refresh
    if (await SessionService.shouldRefreshSession(sessionId)) {
      await SessionService.extendSession(sessionId);
    }
    
    // Add user info to request object
    req.user = decoded;
    req.sessionId = sessionId;
    
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(403).json({ 
        error: 'Forbidden',
        message: 'Invalid or expired token' 
      });
      return;
    }
    
    logger.error('Authentication error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Authentication failed' 
    });
  }
};

/**
 * Middleware to check for specific permission
 */
export const requirePermission = (permissionName: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authentication required' 
      });
      return;
    }

    const hasPermission = await PermissionService.hasPermission(
      req.user.userId,
      permissionName
    );

    if (!hasPermission) {
      logger.warn('Permission denied', {
        userId: req.user.userId,
        username: req.user.username,
        permission: permissionName,
        ip: req.ip
      });

      res.status(403).json({ 
        error: 'Forbidden',
        message: `Permission '${permissionName}' required` 
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to check for any of the specified permissions
 */
export const requireAnyPermission = (permissionNames: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authentication required' 
      });
      return;
    }

    const hasPermission = await PermissionService.hasAnyPermission(
      req.user.userId,
      permissionNames
    );

    if (!hasPermission) {
      logger.warn('Permission denied', {
        userId: req.user.userId,
        username: req.user.username,
        permissions: permissionNames,
        ip: req.ip
      });

      res.status(403).json({ 
        error: 'Forbidden',
        message: `One of these permissions required: ${permissionNames.join(', ')}` 
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to check for all specified permissions
 */
export const requireAllPermissions = (permissionNames: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authentication required' 
      });
      return;
    }

    const hasAllPermissions = await PermissionService.hasAllPermissions(
      req.user.userId,
      permissionNames
    );

    if (!hasAllPermissions) {
      logger.warn('Permission denied', {
        userId: req.user.userId,
        username: req.user.username,
        permissions: permissionNames,
        ip: req.ip
      });

      res.status(403).json({ 
        error: 'Forbidden',
        message: `All of these permissions required: ${permissionNames.join(', ')}` 
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to check if user owns the resource
 */
export const requireResourceOwnership = (
  resourceType: string,
  getResourceOwnerId: (req: Request) => Promise<number | null>
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authentication required' 
      });
      return;
    }

    try {
      const ownerId = await getResourceOwnerId(req);
      
      if (!ownerId || ownerId !== req.user.userId) {
        // Check if user has admin access
        const isAdmin = req.user.role === 'admin' || 
                       await PermissionService.hasPermission(
                         req.user.userId,
                         'admin.access'
                       );

        if (!isAdmin) {
          logger.warn('Resource ownership denied', {
            userId: req.user.userId,
            username: req.user.username,
            resourceType,
            resourceOwnerId: ownerId,
            ip: req.ip
          });

          res.status(403).json({ 
            error: 'Forbidden',
            message: 'You do not have access to this resource' 
          });
          return;
        }
      }

      next();
    } catch (error) {
      logger.error('Resource ownership check error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to verify resource ownership' 
      });
    }
  };
};

/**
 * Middleware to log authentication attempts
 */
export const logAuthAttempt = (action: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const logData = {
      action,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      userId: req.user?.userId,
      timestamp: new Date()
    };

    logger.info('Authentication attempt', logData);
    next();
  };
};

export default {
  authenticateWithSession,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireResourceOwnership,
  logAuthAttempt
};