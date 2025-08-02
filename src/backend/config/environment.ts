import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment schema validation
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('4000').transform(Number),
  
  // Security - REQUIRED, no defaults
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  
  // Database
  DATABASE_URL: z.string().url().or(z.string().startsWith('postgres://')),
  DB_SSL: z.string().transform(val => val === 'true').default('false'),
  POOL_MIN: z.string().default('2').transform(Number),
  POOL_MAX: z.string().default('10').transform(Number),
  
  // Redis
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379').transform(Number),
  REDIS_PASSWORD: z.string().optional(),
  
  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW: z.string().default('900000').transform(Number), // 15 minutes
  RATE_LIMIT_MAX: z.string().default('100').transform(Number),
  
  // OpenAI (optional)
  OPENAI_API_KEY: z.string().optional(),
  
  // File Upload
  MAX_FILE_SIZE: z.string().default('10485760').transform(Number), // 10MB
  UPLOAD_DIR: z.string().default('./uploads'),
  
  // Monitoring (optional)
  SENTRY_DSN: z.string().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  OTEL_SERVICE_NAME: z.string().default('psscript'),
});

// Validate environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.errors.forEach(err => {
        console.error(`   - ${err.path.join('.')}: ${err.message}`);
      });
      
      // Critical security check
      if (error.errors.some(e => e.path.includes('JWT_SECRET'))) {
        console.error('\n🚨 CRITICAL: JWT_SECRET is required for security!');
        console.error('   Generate one with: openssl rand -base64 32');
      }
      
      process.exit(1);
    }
    throw error;
  }
};

// Export validated config
export const config = parseEnv();

// Helper to check if in production
export const isProduction = () => config.NODE_ENV === 'production';
export const isDevelopment = () => config.NODE_ENV === 'development';
export const isTest = () => config.NODE_ENV === 'test';

// Security helpers
export const getJwtSecret = () => {
  if (!config.JWT_SECRET) {
    throw new Error('JWT_SECRET not configured - this is a critical security issue');
  }
  return config.JWT_SECRET;
};

export const getSessionSecret = () => {
  if (!config.SESSION_SECRET) {
    throw new Error('SESSION_SECRET not configured - this is a critical security issue');
  }
  return config.SESSION_SECRET;
};

// Generate secure secrets helper (for setup)
export const generateSecureSecret = () => {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('base64');
};

// Log configuration (without secrets)
export const logConfig = () => {
  console.log('🔧 Configuration loaded:');
  console.log(`   Environment: ${config.NODE_ENV}`);
  console.log(`   Port: ${config.PORT}`);
  console.log(`   Database: ${config.DATABASE_URL.split('@')[1] || 'configured'}`);
  console.log(`   Redis: ${config.REDIS_HOST}:${config.REDIS_PORT}`);
  console.log(`   CORS Origin: ${config.CORS_ORIGIN}`);
  console.log(`   JWT Secret: ${config.JWT_SECRET ? '✓ Configured' : '✗ MISSING'}`);
  console.log(`   Session Secret: ${config.SESSION_SECRET ? '✓ Configured' : '✗ MISSING'}`);
};

// Export type for use in other files
export type Config = z.infer<typeof envSchema>;