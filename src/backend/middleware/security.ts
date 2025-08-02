import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createHash, randomBytes } from 'crypto';
import { Request, Response, NextFunction, Express } from 'express';
import { config } from '../config/environment';

/**
 * Configure comprehensive security middleware
 */
export function configureSecurity(app: Express) {
  // 1. Helmet for security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Temporarily allow inline scripts for development
          "'unsafe-eval'", // Allow eval for development tools
          "https://cdn.jsdelivr.net", // For libraries
          "http://localhost:3002", // Frontend dev server
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // For TailwindCSS
          "https://cdn.jsdelivr.net",
        ],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", "wss:", "https:", "http://localhost:3002", "http://localhost:4005", "ws://localhost:3002"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'none'"],
        frameSrc: ["'none'"],
        workerSrc: ["'self'", "blob:"],
        childSrc: ["'none'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    permissionsPolicy: {
      features: {
        geolocation: ["'none'"],
        camera: ["'none'"],
        microphone: ["'none'"],
        payment: ["'none'"],
        usb: ["'none'"],
        magnetometer: ["'none'"],
        accelerometer: ["'none'"],
      },
    },
  }));

  // 2. CSP Nonce middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Generate nonce for this request
    const nonce = randomBytes(16).toString('base64');
    res.locals.nonce = nonce;

    // Update CSP header with nonce
    const csp = res.getHeader('Content-Security-Policy') as string;
    if (csp) {
      res.setHeader(
        'Content-Security-Policy',
        csp.replace('{NONCE}', nonce)
      );
    }

    next();
  });

  // 3. Additional security headers
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Enable XSS filter
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Prevent information leakage
    res.setHeader('X-Powered-By', 'PSScript');
    
    // Feature policy
    res.setHeader(
      'Feature-Policy',
      "geolocation 'none'; camera 'none'; microphone 'none'"
    );
    
    next();
  });

  // 4. CORS configuration
  const cors = require('cors');
  app.use(cors({
    origin: (origin: string, callback: Function) => {
      // Allow requests with no origin (mobile apps, Postman)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = config.CORS_ORIGIN.split(',').map(o => o.trim());
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 86400, // 24 hours
  }));

  // 5. Rate limiting
  const limiter = createRateLimiter();
  app.use('/api/', limiter);

  // Stricter limits for auth endpoints
  const authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: 'Too many authentication attempts, please try again later',
  });
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);

  // 6. CSRF Protection
  app.use(csrfProtection);

  // 7. Request sanitization
  app.use(sanitizeRequests);

  // 8. Security monitoring
  app.use(securityMonitoring);
}

/**
 * Create rate limiter with Redis store
 */
function createRateLimiter(options: Partial<any> = {}) {
  const defaultOptions = {
    windowMs: config.RATE_LIMIT_WINDOW,
    max: config.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests, please try again later',
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'Too Many Requests',
        message: options.message || 'Too many requests, please try again later',
        retryAfter: res.getHeader('Retry-After'),
      });
    },
  };

  // Use Redis store if available
  if (config.REDIS_URL) {
    const RedisClient = require('ioredis');
    const client = new RedisClient(config.REDIS_URL);

    return rateLimit({
      ...defaultOptions,
      ...options,
      store: new RedisStore({
        client,
        prefix: 'rl:',
      }),
    });
  }

  // Fallback to memory store
  return rateLimit({
    ...defaultOptions,
    ...options,
  });
}

/**
 * CSRF Protection middleware
 */
async function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF for read-only methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip for API clients (non-browser)
  const contentType = req.get('content-type');
  if (contentType?.includes('application/json') && !req.get('origin')) {
    return next();
  }

  // Get CSRF token from header or body
  const token = req.get('X-CSRF-Token') || req.body?._csrf;
  const sessionToken = req.session?.csrfToken;

  // Generate new token if needed
  if (!sessionToken) {
    req.session.csrfToken = randomBytes(32).toString('hex');
    res.cookie('csrf-token', req.session.csrfToken, {
      httpOnly: false, // Needs to be readable by JS
      secure: config.NODE_ENV === 'production',
      sameSite: 'strict',
    });
  }

  // Verify token for state-changing requests
  if (req.method !== 'GET' && token !== sessionToken) {
    return res.status(403).json({
      error: 'CSRF Protection',
      message: 'Invalid or missing CSRF token',
    });
  }

  next();
}

/**
 * Request sanitization middleware
 */
function sanitizeRequests(req: Request, res: Response, next: NextFunction) {
  // Sanitize common injection patterns
  const sanitize = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) return obj;

    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        // Remove script tags
        obj[key] = obj[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        
        // Remove SQL injection attempts
        obj[key] = obj[key].replace(/(\b(union|select|insert|update|delete|drop|create)\b)/gi, '');
        
        // Remove null bytes
        obj[key] = obj[key].replace(/\0/g, '');
      } else if (typeof obj[key] === 'object') {
        obj[key] = sanitize(obj[key]);
      }
    }
    
    return obj;
  };

  // Sanitize body, query, and params
  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);

  next();
}

/**
 * Security monitoring middleware
 */
function securityMonitoring(req: Request, res: Response, next: NextFunction) {
  // Log security-relevant events
  const securityEvents = [
    { pattern: /\/api\/auth\/login/, event: 'login_attempt' },
    { pattern: /\/api\/auth\/register/, event: 'registration_attempt' },
    { pattern: /\/api\/scripts\/.*\/execute/, event: 'script_execution' },
    { pattern: /\/api\/admin/, event: 'admin_access' },
  ];

  for (const { pattern, event } of securityEvents) {
    if (pattern.test(req.path)) {
      console.log({
        event,
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.get('user-agent'),
        path: req.path,
        method: req.method,
        userId: req.user?.id,
      });
    }
  }

  // Detect potential attacks
  const suspiciousPatterns = [
    /\.\.\//,           // Path traversal
    /<script/i,         // XSS attempt
    /union.*select/i,   // SQL injection
    /eval\s*\(/,        // Code injection
    /javascript:/i,     // JavaScript protocol
  ];

  const checkSuspicious = (str: string) => {
    return suspiciousPatterns.some(pattern => pattern.test(str));
  };

  const url = req.url;
  const body = JSON.stringify(req.body || {});
  
  if (checkSuspicious(url) || checkSuspicious(body)) {
    console.warn({
      event: 'suspicious_request',
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('user-agent'),
      path: req.path,
      method: req.method,
      suspicious: true,
    });
  }

  next();
}

/**
 * Get CSRF token for forms
 */
export function getCSRFToken(req: Request): string {
  return req.session?.csrfToken || '';
}

/**
 * Validate file upload security
 */
export function validateFileUpload(file: Express.Multer.File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > config.MAX_FILE_SIZE) {
    return { valid: false, error: 'File too large' };
  }

  // Check file type
  const allowedTypes = ['.ps1', '.psm1', '.psd1'];
  const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
  
  if (!allowedTypes.includes(ext)) {
    return { valid: false, error: 'Invalid file type' };
  }

  // Check for malicious content
  const content = file.buffer.toString('utf8');
  const maliciousPatterns = [
    /invoke-expression/i,
    /downloadstring/i,
    /system\.net\.webclient/i,
    /start-process.*-hidden/i,
  ];

  for (const pattern of maliciousPatterns) {
    if (pattern.test(content)) {
      return { valid: false, error: 'Potentially malicious content detected' };
    }
  }

  return { valid: true };
}