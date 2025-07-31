import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import logger from '../utils/logger';

interface AuthenticatedUser {
  userId: number;
  username: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * JWT authentication middleware.
 * Validates JWT tokens and adds user info to request.
 */
export function authenticateJWT(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const requestId = req.headers['x-request-id'] as string || `auth-${Date.now()}`;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Authentication failed: Missing or invalid Authorization header', {
      authHeader: authHeader ? 'present but invalid format' : 'missing',
      path: req.path,
      method: req.method,
      ip: req.ip,
      requestId
    });
    
    res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please provide a valid authentication token' 
    });
    return;
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const secretKey = process.env.JWT_SECRET;
  
  if (!secretKey) {
    logger.error('JWT_SECRET environment variable is not set');
    res.status(500).json({ 
      error: 'Server configuration error',
      message: 'Authentication service is not properly configured' 
    });
    return;
  }
  
  try {
    const decoded = jwt.verify(token, secretKey, {
      issuer: 'psscript-api',
      audience: 'psscript-frontend'
    }) as JwtPayload;
    
    // Validate token payload structure
    if (!decoded.userId || !decoded.username || !decoded.email || !decoded.role) {
      logger.warn('Authentication failed: Invalid token payload structure', {
        hasUserId: !!decoded.userId,
        hasUsername: !!decoded.username,
        hasEmail: !!decoded.email,
        hasRole: !!decoded.role,
        path: req.path,
        requestId
      });
      
      res.status(401).json({ 
        error: 'Invalid token',
        message: 'Token payload is malformed' 
      });
      return;
    }
    
    // Add user info to request
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role
    };
    
    logger.debug('Authentication successful', {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
      path: req.path,
      method: req.method,
      requestId
    });
    
    next();
    
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Authentication failed: Token expired', {
        expiredAt: error.expiredAt,
        path: req.path,
        ip: req.ip,
        requestId
      });
      
      res.status(401).json({ 
        error: 'Token expired',
        message: 'Your session has expired. Please log in again.' 
      });
      return;
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Authentication failed: Invalid token', {
        error: error.message,
        path: req.path,
        ip: req.ip,
        requestId
      });
      
      res.status(401).json({ 
        error: 'Invalid token',
        message: 'The provided token is invalid' 
      });
      return;
    }
    
    logger.error('Authentication error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      path: req.path,
      ip: req.ip,
      requestId
    });
    
    res.status(500).json({ 
      error: 'Authentication error',
      message: 'An error occurred during authentication' 
    });
  }
}

/**
 * Optional authentication middleware.
 * Similar to authenticateJWT but doesn't fail if no token is provided.
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  // If no auth header, continue without setting user
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }
  
  // If auth header exists, validate it
  authenticateJWT(req, res, next);
}

/**
 * Admin role requirement middleware.
 * Must be used after authenticateJWT.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    logger.warn('Admin access attempted without authentication', {
      path: req.path,
      method: req.method,
      ip: req.ip,
      requestId: req.headers['x-request-id']
    });
    
    res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please log in to access this resource' 
    });
    return;
  }
  
  if (req.user.role !== 'admin') {
    logger.warn('Admin access denied for non-admin user', {
      userId: req.user.userId,
      username: req.user.username,
      role: req.user.role,
      path: req.path,
      method: req.method,
      ip: req.ip,
      requestId: req.headers['x-request-id']
    });
    
    res.status(403).json({ 
      error: 'Admin access required',
      message: 'You do not have permission to access this resource' 
    });
    return;
  }
  
  next();
}

/**
 * User role requirement middleware.
 * Allows both 'user' and 'admin' roles.
 */
export function requireUser(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please log in to access this resource' 
    });
    return;
  }
  
  if (!['user', 'admin'].includes(req.user.role)) {
    res.status(403).json({ 
      error: 'Access denied',
      message: 'You do not have permission to access this resource' 
    });
    return;
  }
  
  next();
}
