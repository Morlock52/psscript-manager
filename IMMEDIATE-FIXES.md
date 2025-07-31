# PSScript - Immediate Security Fixes Implementation Guide

## Critical Security Vulnerabilities to Fix (Priority Order)

### 1. JWT Hardcoded Secret (CRITICAL - Day 1)

**Current Issue**: 
```typescript
const secret = process.env.JWT_SECRET || 'your-secret-key'; // VULNERABLE!
```

**Fix Implementation**:

```typescript
// src/backend/src/middleware/auth.ts
import crypto from 'crypto';

// Generate secure secret if not provided
const getJWTSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    console.error('FATAL: JWT_SECRET environment variable is not set!');
    console.error('Generate a secure secret with: openssl rand -base64 32');
    process.exit(1);
  }
  
  if (secret.length < 32) {
    console.error('FATAL: JWT_SECRET must be at least 32 characters long!');
    process.exit(1);
  }
  
  return secret;
};

export const JWT_SECRET = getJWTSecret();

// Implement key rotation
export const JWT_SECRET_PREVIOUS = process.env.JWT_SECRET_PREVIOUS || null;

// Update JWT verification to support rotation
export const verifyToken = (token: string): any => {
  try {
    // Try current secret first
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (JWT_SECRET_PREVIOUS) {
      // Try previous secret for rotation support
      try {
        return jwt.verify(token, JWT_SECRET_PREVIOUS);
      } catch {
        throw new Error('Invalid token');
      }
    }
    throw error;
  }
};
```

**Environment Setup**:
```bash
# .env.example
JWT_SECRET=<generate-with-openssl-rand-base64-32>
JWT_SECRET_PREVIOUS=<previous-secret-during-rotation>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

### 2. SQL Injection Prevention (CRITICAL - Day 1)

**Current Issue**:
```typescript
// VULNERABLE - Raw SQL with string interpolation
const analyses = await sequelize.query(
  `SELECT * FROM script_analysis WHERE script_id IN (:scriptIds)`,
  { replacements: { scriptIds }, type: 'SELECT', raw: true }
);
```

**Fix Implementation**:

```typescript
// src/backend/src/controllers/ScriptController.ts

// Replace raw queries with Sequelize ORM methods
export const getScripts = async (req: Request, res: Response) => {
  try {
    const scripts = await Script.findAndCountAll({
      include: [
        {
          model: ScriptAnalysis,
          as: 'analysis',
          required: false
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email']
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name']
        }
      ],
      where: whereClause,
      order: [[sortBy, sortOrder]],
      limit: pageSize,
      offset,
      distinct: true,
      subQuery: false
    });

    return res.json({
      scripts: scripts.rows,
      total: scripts.count,
      page: parseInt(page),
      pageSize
    });
  } catch (error) {
    console.error('Error fetching scripts:', error);
    return res.status(500).json({ error: 'Failed to fetch scripts' });
  }
};

// If raw queries are absolutely necessary, use parameterized queries
export const searchScripts = async (req: Request, res: Response) => {
  const { query } = req.query;
  
  // Use Sequelize's built-in protection
  const scripts = await Script.findAll({
    where: {
      [Op.or]: [
        { title: { [Op.iLike]: `%${query}%` } },
        { description: { [Op.iLike]: `%${query}%` } }
      ]
    }
  });
  
  return res.json({ scripts });
};
```

### 3. Input Validation (CRITICAL - Day 2)

**Implementation**:

```bash
npm install express-validator express-rate-limit helmet express-mongo-sanitize
```

```typescript
// src/backend/src/middleware/validation.ts
import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Validation middleware
export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array() 
    });
  }
  next();
};

// Script validation rules
export const scriptValidation = {
  create: [
    body('title')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Title must be between 1 and 100 characters')
      .matches(/^[a-zA-Z0-9\s\-_]+$/)
      .withMessage('Title contains invalid characters'),
    body('content')
      .trim()
      .isLength({ max: 1000000 })
      .withMessage('Content exceeds maximum length'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description exceeds maximum length'),
    body('category_id')
      .optional()
      .isUUID()
      .withMessage('Invalid category ID'),
    body('tags')
      .optional()
      .isArray({ max: 10 })
      .withMessage('Maximum 10 tags allowed'),
    body('tags.*')
      .trim()
      .isLength({ min: 1, max: 50 })
      .matches(/^[a-zA-Z0-9\-]+$/)
      .withMessage('Invalid tag format'),
    validate
  ],
  
  update: [
    param('id').isUUID().withMessage('Invalid script ID'),
    ...this.create,
    validate
  ],
  
  delete: [
    param('id').isUUID().withMessage('Invalid script ID'),
    validate
  ]
};

// Apply to routes
router.post('/scripts', authenticate, scriptValidation.create, createScript);
router.put('/scripts/:id', authenticate, scriptValidation.update, updateScript);
router.delete('/scripts/:id', authenticate, scriptValidation.delete, deleteScript);
```

### 4. File Upload Security (CRITICAL - Day 2)

**Implementation**:

```bash
npm install multer file-type express-fileupload clamav.js
```

```typescript
// src/backend/src/middleware/fileUpload.ts
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fileType from 'file-type';
import fs from 'fs/promises';
import ClamAV from 'clamav.js';

const clam = new ClamAV().init();

// Secure file upload configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    // Create isolated upload directory
    const uploadDir = path.join(process.cwd(), 'uploads', 'quarantine');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate secure filename
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter
const fileFilter = (req: any, file: any, cb: any) => {
  // Allowed extensions
  const allowedExts = ['.ps1', '.psm1', '.psd1'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (!allowedExts.includes(ext)) {
    return cb(new Error('Invalid file type. Only PowerShell files allowed.'));
  }
  
  // Check MIME type
  const allowedMimes = ['text/plain', 'application/x-powershell'];
  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new Error('Invalid MIME type.'));
  }
  
  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 1 // Single file only
  }
});

// Virus scanning middleware
export const scanFile = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) return next();
  
  try {
    const filePath = req.file.path;
    
    // Check actual file type
    const type = await fileType.fromFile(filePath);
    if (type && !['text/plain'].includes(type.mime)) {
      await fs.unlink(filePath);
      return res.status(400).json({ error: 'File type mismatch detected' });
    }
    
    // Scan for viruses
    const result = await clam.scanFile(filePath);
    if (result.isInfected) {
      await fs.unlink(filePath);
      return res.status(400).json({ error: 'File failed security scan' });
    }
    
    // Move to safe directory
    const safeDir = path.join(process.cwd(), 'uploads', 'safe');
    await fs.mkdir(safeDir, { recursive: true });
    const safePath = path.join(safeDir, req.file.filename);
    await fs.rename(filePath, safePath);
    
    req.file.path = safePath;
    next();
  } catch (error) {
    console.error('File scan error:', error);
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    return res.status(500).json({ error: 'File processing failed' });
  }
};
```

### 5. CSRF Protection (HIGH - Day 3)

**Implementation**:

```bash
npm install csurf
```

```typescript
// src/backend/src/middleware/security.ts
import csrf from 'csurf';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// CSRF protection
export const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

// Rate limiting
export const createRateLimiter = (windowMs: number, max: number) => {
  return rateLimit({
    windowMs,
    max,
    message: 'Too many requests from this IP',
    standardHeaders: true,
    legacyHeaders: false
  });
};

// Security headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Apply to Express app
app.use(securityHeaders);
app.use('/api', createRateLimiter(15 * 60 * 1000, 100)); // 100 requests per 15 minutes

// Apply CSRF to state-changing routes
app.use('/api/scripts', csrfProtection);
app.use('/api/settings', csrfProtection);

// CSRF token endpoint
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});
```

### 6. PowerShell Execution Security (HIGH - Day 3)

**Implementation**:

```typescript
// src/backend/src/services/PowerShellExecutor.ts
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';

export class SecurePowerShellExecutor {
  private sandboxDir: string;
  
  constructor() {
    this.sandboxDir = path.join(process.cwd(), 'sandbox');
  }
  
  async executeScript(scriptContent: string, params: any = {}): Promise<ExecutionResult> {
    const executionId = uuidv4();
    const scriptDir = path.join(this.sandboxDir, executionId);
    
    try {
      // Create isolated directory
      await fs.mkdir(scriptDir, { recursive: true });
      
      // Write script to file
      const scriptPath = path.join(scriptDir, 'script.ps1');
      await fs.writeFile(scriptPath, scriptContent);
      
      // Execute with constraints
      const ps = spawn('pwsh', [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy', 'Restricted',
        '-Command', `
          # Set constrained language mode
          $ExecutionContext.SessionState.LanguageMode = 'ConstrainedLanguage'
          
          # Limit execution time
          $job = Start-Job -ScriptBlock {
            & '${scriptPath}'
          }
          
          $job | Wait-Job -Timeout 30
          
          if ($job.State -eq 'Running') {
            $job | Stop-Job
            throw 'Script execution timeout'
          }
          
          $job | Receive-Job
        `
      ], {
        cwd: scriptDir,
        env: {
          ...process.env,
          PSModulePath: '', // Restrict module access
          Path: '/usr/bin:/bin' // Minimal PATH
        },
        timeout: 35000 // 35 second hard timeout
      });
      
      let stdout = '';
      let stderr = '';
      
      ps.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      ps.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      await new Promise((resolve, reject) => {
        ps.on('close', (code) => {
          if (code === 0) {
            resolve(code);
          } else {
            reject(new Error(`Process exited with code ${code}`));
          }
        });
        
        ps.on('error', reject);
      });
      
      return {
        success: true,
        output: stdout,
        error: stderr
      };
      
    } finally {
      // Clean up
      await fs.rm(scriptDir, { recursive: true, force: true });
    }
  }
}
```

### 7. Environment Configuration (HIGH - Day 4)

**Create secure environment setup**:

```bash
# .env.production
NODE_ENV=production
PORT=4000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/psscript
DB_SSL=true
DB_POOL_MIN=2
DB_POOL_MAX=10

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=<secure-password>

# JWT
JWT_SECRET=<generate-with-openssl-rand-base64-32>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=<generate-with-openssl-rand-base64-32>
CORS_ORIGIN=https://your-domain.com

# API Keys (use secret management in production)
OPENAI_API_KEY=<store-in-secrets-manager>

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=/secure/uploads

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

```typescript
// src/backend/src/config/index.ts
import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment
dotenv.config({
  path: `.env.${process.env.NODE_ENV || 'development'}`
});

// Environment schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.string().transform(Number),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string(),
  JWT_REFRESH_EXPIRES_IN: z.string(),
  BCRYPT_ROUNDS: z.string().transform(Number).default('12'),
  SESSION_SECRET: z.string().min(32),
  CORS_ORIGIN: z.string().url(),
  MAX_FILE_SIZE: z.string().transform(Number),
  RATE_LIMIT_WINDOW: z.string().transform(Number),
  RATE_LIMIT_MAX: z.string().transform(Number)
});

// Validate environment
const env = envSchema.parse(process.env);

export default env;
```

## Testing the Fixes

### 1. Security Test Suite

```typescript
// src/backend/src/tests/security.test.ts
import request from 'supertest';
import app from '../app';

describe('Security Tests', () => {
  describe('JWT Security', () => {
    it('should reject requests without JWT_SECRET', () => {
      delete process.env.JWT_SECRET;
      expect(() => require('../app')).toThrow();
    });
    
    it('should reject weak JWT_SECRET', () => {
      process.env.JWT_SECRET = 'weak';
      expect(() => require('../app')).toThrow();
    });
  });
  
  describe('SQL Injection Prevention', () => {
    it('should sanitize malicious input', async () => {
      const maliciousInput = "'; DROP TABLE scripts; --";
      const response = await request(app)
        .get('/api/scripts')
        .query({ search: maliciousInput });
      
      expect(response.status).toBe(200);
      // Verify no SQL error in response
      expect(response.body.error).toBeUndefined();
    });
  });
  
  describe('File Upload Security', () => {
    it('should reject non-PowerShell files', async () => {
      const response = await request(app)
        .post('/api/scripts/upload')
        .attach('file', Buffer.from('malicious'), 'hack.exe');
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid file type');
    });
  });
});
```

### 2. Penetration Testing Checklist

- [ ] OWASP Top 10 vulnerabilities scan
- [ ] SQL injection attempts on all endpoints
- [ ] XSS payload testing
- [ ] CSRF token validation
- [ ] File upload exploits
- [ ] JWT manipulation attempts
- [ ] Rate limiting bypass attempts
- [ ] Directory traversal tests
- [ ] Command injection tests
- [ ] XXE injection tests

## Monitoring & Alerts

```typescript
// src/backend/src/monitoring/security.ts
import winston from 'winston';

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'security' },
  transports: [
    new winston.transports.File({ filename: 'security.log' }),
    new winston.transports.Console()
  ]
});

// Log security events
export const logSecurityEvent = (event: string, details: any) => {
  securityLogger.warn({
    event,
    details,
    timestamp: new Date().toISOString(),
    ip: details.ip,
    userId: details.userId
  });
};

// Alert on critical events
export const alertOnCritical = (event: string, details: any) => {
  // Send to monitoring service (Datadog, New Relic, etc.)
  // Send email/SMS alerts
  // Trigger incident response
};
```

## Deployment Checklist

### Before Deployment
- [ ] All environment variables set securely
- [ ] JWT_SECRET generated and stored in secrets manager
- [ ] Database credentials rotated
- [ ] SSL certificates installed
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] File upload directory secured
- [ ] PowerShell sandbox configured

### Post-Deployment
- [ ] Run security scan (OWASP ZAP)
- [ ] Verify all endpoints require authentication
- [ ] Test rate limiting
- [ ] Monitor error logs
- [ ] Set up security alerts
- [ ] Schedule regular security audits

## Timeline

**Day 1**: JWT & SQL Injection fixes
**Day 2**: Input validation & File upload security  
**Day 3**: CSRF & PowerShell execution security
**Day 4**: Environment configuration & Testing
**Day 5**: Deployment & Monitoring setup

This implementation guide provides concrete fixes for all critical security vulnerabilities. Each fix includes code examples, testing strategies, and deployment considerations.