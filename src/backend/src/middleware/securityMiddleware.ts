import { Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import logger from '../utils/logger';

// Allowed origins for CORS
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:3002')
  .split(',')
  .map(origin => origin.trim());

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3002';

/**
 * CORS configuration
 */
const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS origin not allowed', { origin, allowedOrigins: ALLOWED_ORIGINS });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-Request-ID'
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count',
    'X-Rate-Limit-Limit',
    'X-Rate-Limit-Remaining',
    'X-Rate-Limit-Reset'
  ],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

/**
 * More permissive CORS for upload endpoints (but still secure)
 */
const uploadCorsOptions: CorsOptions = {
  ...corsOptions,
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: [
    ...corsOptions.allowedHeaders!,
    'Content-Length',
    'Content-Disposition'
  ]
};

/**
 * Helmet security configuration
 */
const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.AI_SERVICE_URL || "http://localhost:8000"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false, // Disable for file uploads
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
};

/**
 * Additional security headers middleware
 */
export const additionalSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Add custom security headers
  res.setHeader('X-Request-ID', req.headers['x-request-id'] || 'unknown');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Clear-Site-Data', '"cache", "cookies", "storage"');
  
  // Cache control for API endpoints
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
};

/**
 * CSRF protection middleware
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Check for CSRF token in headers
  const csrfToken = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  
  // Verify origin/referer for state-changing requests
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    logger.warn('CSRF: Invalid origin', { origin, path: req.path });
    return res.status(403).json({ error: 'Invalid origin' });
  }
  
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
      if (!ALLOWED_ORIGINS.includes(refererOrigin)) {
        logger.warn('CSRF: Invalid referer', { referer: refererOrigin, path: req.path });
        return res.status(403).json({ error: 'Invalid referer' });
      }
    } catch (error) {
      logger.warn('CSRF: Invalid referer URL', { referer, path: req.path });
      return res.status(403).json({ error: 'Invalid referer' });
    }
  }
  
  next();
};

/**
 * Request logging middleware
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Add request ID to request object
  req.headers['x-request-id'] = requestId.toString();
  
  logger.info('Request started', {
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    origin: req.headers.origin
  });
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('Request completed', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });
  
  next();
};

/**
 * Main CORS middleware
 */
export const corsMiddleware = cors(corsOptions);

/**
 * Upload-specific CORS middleware
 */
export const uploadCorsMiddleware = cors(uploadCorsOptions);

/**
 * Helmet security middleware
 */
export const helmetMiddleware = helmet(helmetOptions);

/**
 * Combined security middleware stack
 */
export const securityMiddleware = [
  requestLogger,
  helmetMiddleware,
  additionalSecurityHeaders,
  corsMiddleware,
  csrfProtection
];

/**
 * Upload security middleware stack (without CSRF for file uploads)
 */
export const uploadSecurityMiddleware = [
  requestLogger,
  helmetMiddleware,
  additionalSecurityHeaders,
  uploadCorsMiddleware
];