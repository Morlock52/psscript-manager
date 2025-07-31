import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import logger from '../utils/logger';

/**
 * Create a rate limiter with memory store (fallback when Redis unavailable)
 */
function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
  prefix?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}) {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later.',
    prefix = 'rl',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return rateLimit({
    windowMs,
    max,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    skipFailedRequests,
    keyGenerator: (req: Request) => {
      // Use user ID if authenticated, otherwise use IP
      const identifier = req.user?.userId ? `user:${req.user.userId}` : `ip:${req.ip}`;
      return identifier;
    },
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userId: req.user?.userId,
        path: req.path,
        method: req.method,
        headers: {
          'x-forwarded-for': req.headers['x-forwarded-for'],
          'user-agent': req.headers['user-agent']
        }
      });
      res.status(429).json({
        error: 'Too Many Requests',
        message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
}

/**
 * Strict rate limit for authentication endpoints
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts, please try again later.',
  prefix: 'auth',
  skipSuccessfulRequests: true // Only count failed attempts
});

/**
 * Rate limit for login endpoint (stricter)
 */
export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 attempts per window
  message: 'Too many login attempts, please try again in 15 minutes.',
  prefix: 'login',
  skipSuccessfulRequests: true
});

/**
 * Rate limit for registration endpoint
 */
export const registrationRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour
  message: 'Too many registration attempts, please try again later.',
  prefix: 'register'
});

/**
 * General API rate limit
 */
export const apiRateLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many API requests, please slow down.',
  prefix: 'api'
});

/**
 * Strict rate limit for file uploads
 */
export const uploadRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 uploads per 5 minutes
  message: 'Too many file uploads, please wait before uploading more.',
  prefix: 'upload'
});

/**
 * Rate limit for script execution
 */
export const executionRateLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // 5 executions per minute
  message: 'Too many script executions, please wait before running more scripts.',
  prefix: 'execute'
});

/**
 * Rate limit for AI analysis endpoints
 */
export const aiAnalysisRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 analyses per 5 minutes
  message: 'Too many AI analysis requests, please wait.',
  prefix: 'ai-analysis'
});

/**
 * Rate limit for search endpoints
 */
export const searchRateLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  message: 'Too many search requests, please wait.',
  prefix: 'search'
});

/**
 * Rate limit for documentation endpoints
 */
export const documentationRateLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50, // 50 requests per minute
  message: 'Too many documentation requests, please wait.',
  prefix: 'docs'
});

/**
 * Custom rate limit middleware for specific endpoints
 */
export function createCustomRateLimiter(
  windowMinutes: number,
  maxRequests: number,
  prefix: string,
  message?: string
) {
  return createRateLimiter({
    windowMs: windowMinutes * 60 * 1000,
    max: maxRequests,
    message,
    prefix
  });
}

/**
 * Middleware to log rate limiting status
 */
export function logRateLimitStatus(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log rate limiting is active with memory store fallback
  logger.debug('Rate limiting active with memory store');
  next();
}

/**
 * Combined rate limit middleware for critical endpoints
 */
export function criticalEndpointRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Apply multiple rate limiters in sequence
  authRateLimiter(req, res, (err?: any) => {
    if (err) return next(err);
    apiRateLimiter(req, res, next);
  });
}