/**
 * @ts-nocheck - Required for flexible middleware integration and error handling
 * Application entry point
 */
import express from 'express';
import dotenv from 'dotenv';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import logger from './utils/logger';
// import { initializeTelemetry } from './telemetry/tracing'; // Temporarily disabled
// import { telemetryMiddleware, errorTrackingMiddleware } from './middleware/telemetryMiddleware';
// import { getPrometheusMetrics } from './telemetry/metrics'; // Temporarily disabled
import authRoutes from './routes/auth'; // Re-enabled auth routes
import enhancedAuthRoutes from './routes/enhancedAuth';
import passport from 'passport';
import OAuthService from './services/OAuthService';
import SessionService from './services/SessionService';
import scriptRoutes from './routes/scripts';
import userRoutes from './routes/users';
import categoryRoutes from './routes/categories';
import tagRoutes from './routes/tags';
import analyticsRoutes from './routes/analytics';
import healthRoutes from './routes/health';
import chatRoutes from './routes/chat';
import aiAgentRoutes from './routes/ai-agent';
import aiRoutes from './routes/ai';
import aiagentRoutes from './routes/aiagent';
import searchRoutes from './routes/search';
import cacheRoutes from './routes/cache';
import settingsRoutes from './routes/settings';
import aiFeaturesRoutes from './routes/ai-features';
import aiAdvancedRoutes from './routes/ai-advanced';
import authSimpleRoutes from './routes/auth-simple';
import { errorHandler } from './middleware/errorHandler';
import { setupSwagger } from './utils/swagger';
import { securityMiddleware } from './middleware/securityMiddleware';
import path from 'path';

// Load environment variables
dotenv.config();

// Initialize OpenTelemetry before anything else - Temporarily disabled
// initializeTelemetry().catch(err => {
//   logger.error('Failed to initialize telemetry:', err);
// });

// Initialize OAuth strategies
OAuthService.initializeStrategies();

// Initialize session service
SessionService.initialize();

// Create Express app
const app = express();
app.use(express.static(path.join(process.cwd(), 'src', 'backend', 'src', 'public')));
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4001;
const isProduction = process.env.NODE_ENV === 'production';

// Log startup details
console.log(`Starting server: PORT=${port}, ENV=${process.env.NODE_ENV || 'development'}, DOCKER=${process.env.DOCKER_ENV || 'false'}`);

import db from './database/connection';

// Make sequelize available to routes
app.set('sequelize', db.sequelize);

// Set up environment-specific configuration
const isDevelopment = process.env.NODE_ENV !== 'production';

// Enable mock mode for faster development
if (isDevelopment) {
  process.env.USE_MOCK_SERVICES = 'false';
  logger.info('Development mode - mock services enabled');
}

// Set up in-memory caching for development
logger.info('Using in-memory cache for improved performance');

// Enhanced in-memory cache implementation with LRU, monitoring, and error handling
const memoryCache = new Map();
const cacheTTL = new Map();
const cacheHits = new Map();
const cacheMisses = new Map();
const cacheErrors = new Map();
const cacheLastAccessed = new Map();

// Maximum number of items to store in cache before eviction
const MAX_CACHE_ITEMS = 10000;
// Maximum memory usage in bytes (500MB default)
const MAX_MEMORY_USAGE = process.env.MAX_CACHE_MEMORY ? parseInt(process.env.MAX_CACHE_MEMORY, 10) : 500 * 1024 * 1024;
// Schedule automatic cleanup every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;

// Helper to get approximate size of object in bytes
const getObjectSize = (obj: any): number => {
  try {
    // Quick estimate for strings
    if (typeof obj === 'string') return obj.length * 2;
    // Serialize and measure for complex objects
    const serialized = JSON.stringify(obj);
    return serialized.length * 2; // Unicode chars are 2 bytes
  } catch (error) {
    // If serialization fails, make a conservative estimate
    return 1000;
  }
};

// Helper for error handling
const tryCacheOperation = <T>(operation: () => T, errorMessage: string): T | null => {
  try {
    return operation();
  } catch (error) {
    const errorKey = errorMessage;
    const currentCount = cacheErrors.get(errorKey) || 0;
    cacheErrors.set(errorKey, currentCount + 1);
    logger.error(`Cache error: ${errorMessage}`, error);
    return null;
  }
};

// Function to perform LRU eviction when needed
const evictIfNeeded = (): void => {
  // Check if we're over the size limit
  if (memoryCache.size > MAX_CACHE_ITEMS) {
    // Sort keys by last accessed time (oldest first)
    const sortedKeys = Array.from(cacheLastAccessed.entries())
      .sort((a, b) => a[1] - b[1])
      .map(entry => entry[0]);
    
    // Remove oldest 10% of items
    const itemsToRemove = Math.ceil(memoryCache.size * 0.1);
    let removed = 0;
    
    for (const key of sortedKeys) {
      if (removed >= itemsToRemove) break;
      
      memoryCache.delete(key);
      cacheTTL.delete(key);
      cacheLastAccessed.delete(key);
      removed++;
    }
    
    logger.info(`LRU cache eviction: removed ${removed} items`);
  }
  
  // Check memory usage
  const memUsage = process.memoryUsage().heapUsed;
  if (memUsage > MAX_MEMORY_USAGE) {
    // Clear half the cache when memory limit is reached
    const sortedKeys = Array.from(cacheLastAccessed.entries())
      .sort((a, b) => a[1] - b[1])
      .map(entry => entry[0]);
    
    const itemsToRemove = Math.ceil(memoryCache.size * 0.5);
    let removed = 0;
    
    for (const key of sortedKeys) {
      if (removed >= itemsToRemove) break;
      
      memoryCache.delete(key);
      cacheTTL.delete(key);
      cacheLastAccessed.delete(key);
      removed++;
    }
    
    logger.warn(`Memory limit reached: ${Math.round(memUsage/1024/1024)}MB. Cleared ${removed} cache items.`);
  }
};

// Schedule automatic cleanup to remove expired items
setInterval(() => {
  const now = Date.now();
  let expired = 0;
  
  for (const [key, expiry] of cacheTTL.entries()) {
    if (expiry && expiry < now) {
      memoryCache.delete(key);
      cacheTTL.delete(key);
      cacheLastAccessed.delete(key);
      expired++;
    }
  }
  
  if (expired > 0) {
    logger.info(`Cache auto-cleanup: removed ${expired} expired items`);
  }
  
  // Perform eviction if needed
  evictIfNeeded();
}, CLEANUP_INTERVAL);

// Cache persistence helpers
const persistenceHelpers = {
  // Save cache to a JSON file
  saveToFile: (filePath: string): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        const fs = require('fs');
        const persistData = {
          timestamp: Date.now(),
          data: Array.from(memoryCache.entries()),
          ttl: Array.from(cacheTTL.entries()),
        };
        
        fs.writeFileSync(filePath, JSON.stringify(persistData), 'utf8');
        logger.info(`Cache persisted to ${filePath}`);
        resolve(true);
      } catch (error) {
        logger.error('Failed to persist cache to file:', error);
        resolve(false);
      }
    });
  },
  
  // Load cache from a JSON file
  loadFromFile: (filePath: string): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        const fs = require('fs');
        if (!fs.existsSync(filePath)) {
          logger.warn(`Cache file ${filePath} does not exist`);
          resolve(false);
          return;
        }
        
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const now = Date.now();
        
        // Clear existing cache
        memoryCache.clear();
        cacheTTL.clear();
        cacheLastAccessed.clear();
        
        // Load data, skipping expired items
        let loaded = 0;
        let skipped = 0;
        
        for (let i = 0; i < data.data.length; i++) {
          const [key, value] = data.data[i];
          const expiry = data.ttl.find(item => item[0] === key)?.[1];
          
          // Skip if expired
          if (expiry && expiry < now) {
            skipped++;
            continue;
          }
          
          memoryCache.set(key, value);
          if (expiry) cacheTTL.set(key, expiry);
          cacheLastAccessed.set(key, now);
          loaded++;
        }
        
        logger.info(`Cache loaded from ${filePath}: ${loaded} items loaded, ${skipped} expired items skipped`);
        resolve(true);
      } catch (error) {
        logger.error('Failed to load cache from file:', error);
        resolve(false);
      }
    });
  }
};

// Export enhanced cache helper functions for use in controllers
export const cache = {
  // Get value from cache with error handling and metrics
  get: (key: string): any => {
    return tryCacheOperation(() => {
      // Check if key exists and hasn't expired
      if (memoryCache.has(key)) {
        const expiry = cacheTTL.get(key);
        const now = Date.now();
        
        if (!expiry || expiry > now) {
          // Update last accessed time for LRU
          cacheLastAccessed.set(key, now);
          
          // Update hit counter
          const hits = cacheHits.get(key) || 0;
          cacheHits.set(key, hits + 1);
          
          return memoryCache.get(key);
        } else {
          // Clear expired item
          memoryCache.delete(key);
          cacheTTL.delete(key);
          cacheLastAccessed.delete(key);
          cacheHits.delete(key);
        }
      }
      
      // Count cache miss
      const misses = cacheMisses.get(key) || 0;
      cacheMisses.set(key, misses + 1);
      
      return null;
    }, `Failed to get cache key: ${key}`);
  },
  
  // Set value in cache with optional TTL in seconds
  set: (key: string, value: any, ttl?: number): void => {
    tryCacheOperation(() => {
      // Check if we need to evict items before adding this one
      evictIfNeeded();
      
      const now = Date.now();
      memoryCache.set(key, value);
      cacheLastAccessed.set(key, now);
      
      if (ttl) {
        cacheTTL.set(key, now + (ttl * 1000));
      }
      
      return true;
    }, `Failed to set cache key: ${key}`);
  },
  
  // Delete key from cache
  del: (key: string): boolean => {
    return tryCacheOperation(() => {
      const existed = memoryCache.has(key);
      memoryCache.delete(key);
      cacheTTL.delete(key);
      cacheLastAccessed.delete(key);
      cacheHits.delete(key);
      cacheMisses.delete(key);
      return existed;
    }, `Failed to delete cache key: ${key}`) || false;
  },
  
  // Clear all cache
  clear: (): void => {
    tryCacheOperation(() => {
      memoryCache.clear();
      cacheTTL.clear();
      cacheLastAccessed.clear();
      cacheHits.clear();
      cacheMisses.clear();
      return true;
    }, 'Failed to clear cache');
  },
  
  // Clear cache keys by pattern (using simple prefix matching)
  clearPattern: (pattern: string): number => {
    return tryCacheOperation(() => {
      let count = 0;
      for (const key of memoryCache.keys()) {
        if (key.startsWith(pattern)) {
          memoryCache.delete(key);
          cacheTTL.delete(key);
          cacheLastAccessed.delete(key);
          cacheHits.delete(key);
          cacheMisses.delete(key);
          count++;
        }
      }
      return count;
    }, `Failed to clear cache with pattern: ${pattern}`) || 0;
  },
  
  // Get enhanced cache statistics with metrics
  stats: (): { 
    size: number, 
    keys: string[], 
    hitRatio: number, 
    topHits: Array<{key: string, hits: number}>,
    topMisses: Array<{key: string, misses: number}>,
    errors: Record<string, number>,
    memoryEstimate: number
  } => {
    return tryCacheOperation(() => {
      // Calculate hit ratio
      const totalHits = Array.from(cacheHits.values()).reduce((sum, count) => sum + count, 0);
      const totalMisses = Array.from(cacheMisses.values()).reduce((sum, count) => sum + count, 0);
      const hitRatio = totalHits + totalMisses === 0 ? 0 : totalHits / (totalHits + totalMisses);
      
      // Get top hit keys
      const topHits = Array.from(cacheHits.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([key, hits]) => ({ key, hits }));
      
      // Get top miss keys
      const topMisses = Array.from(cacheMisses.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([key, misses]) => ({ key, misses }));
      
      // Estimate memory usage of cache
      let memoryEstimate = 0;
      const sampleSize = Math.min(100, memoryCache.size);
      const sampledKeys = Array.from(memoryCache.keys()).slice(0, sampleSize);
      
      for (const key of sampledKeys) {
        memoryEstimate += key.length * 2; // Key size (Unicode chars)
        memoryEstimate += getObjectSize(memoryCache.get(key)); // Value size
      }
      
      // Extrapolate for the whole cache
      if (sampleSize > 0) {
        memoryEstimate = Math.round((memoryEstimate / sampleSize) * memoryCache.size);
      }
      
      return {
        size: memoryCache.size,
        keys: Array.from(memoryCache.keys()).slice(0, 100), // Limit to first 100
        hitRatio: Math.round(hitRatio * 100) / 100,
        topHits,
        topMisses,
        errors: Object.fromEntries(cacheErrors.entries()),
        memoryEstimate
      };
    }, 'Failed to get cache statistics') || {
      size: 0,
      keys: [],
      hitRatio: 0,
      topHits: [],
      topMisses: [],
      errors: {},
      memoryEstimate: 0
    };
  },
  
  // Persistence operations
  persistence: persistenceHelpers
};

// Apply comprehensive security middleware
securityMiddleware.forEach(middleware => app.use(middleware));

// Add telemetry middleware after security - Temporarily disabled
// app.use(telemetryMiddleware);

// Request logging in non-test environments
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { 
    stream: { 
      write: (message) => logger.info(message.trim()) 
    }
  }));
}

// Compression middleware to reduce response size
app.use(compression());

// Rate limiting to prevent abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});

// Apply rate limiting to authentication endpoints
app.use('/api/auth', apiLimiter);

// Body parsing middleware with increased limits for script content
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Passport
app.use(passport.initialize());

// Import distributed cache middleware
// import { cacheMiddleware } from './middleware/cache'; // Temporarily disabled until TypeScript is fixed

// Create a simple cache middleware to replace Redis
const cacheMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Skip non-GET requests
  if (req.method !== 'GET') {
    return next();
  }

  // Skip authentication routes and other non-cacheable endpoints
  const skipRoutes = [
    '/api/auth', 
    '/api/health', 
    '/api/users/me'
  ];
  
  if (skipRoutes.some(route => req.path.startsWith(route))) {
    return next();
  }

  // Create a unique cache key based on the request path
  const cacheKey = `api:cache:${req.path}`;
  
  // Define cache TTL based on route
  let cacheTTL = 300; // Default: 5 minutes
  
  if (req.path.includes('/scripts/')) {
    cacheTTL = 3600; // Script details: 1 hour
  } else if (req.path.includes('/categories')) {
    cacheTTL = 86400; // Categories: 1 day
  }

  // Try to get cached response
  const cachedData = cache.get(cacheKey);
  
  if (cachedData) {
    // Set cache header
    res.setHeader('X-Cache', 'HIT');
    return res.status(cachedData.statusCode).json(cachedData.body);
  }
  
  // Cache miss - continue with request
  res.setHeader('X-Cache', 'MISS');
  
  // Intercept the response to cache it
  const originalSend = res.send;
  res.send = function(body): express.Response {
    // Only cache successful responses
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        // Create cached response object
        const cachedResponse = {
          statusCode: res.statusCode,
          body: JSON.parse(body) // Only cache JSON responses
        };
        
        // Save to cache with expiration
        cache.set(cacheKey, cachedResponse, cacheTTL);
        
      } catch (error) {
        // If not valid JSON or other error, don't cache
        logger.debug('Response not cached (not valid JSON):', error instanceof Error ? error.message : String(error));
      }
    }
    
    // Call the original send method
    return originalSend.call(this, body);
  };
  
  next();
};

// Add cache middleware
app.use(cacheMiddleware);

// Setup Swagger API documentation
setupSwagger(app);

// Metrics endpoint for Prometheus scraping - Temporarily disabled
// app.get('/metrics', (req, res) => {
//   res.set('Content-Type', 'text/plain');
//   getPrometheusMetrics()
//     .then(metrics => res.send(metrics))
//     .catch(err => {
//       logger.error('Error generating metrics:', err);
//       res.status(500).send('Error generating metrics');
//     });
// });

// API routes
app.use('/api/auth', enhancedAuthRoutes); // Enhanced auth routes with MFA and OAuth
app.use('/api/auth/legacy', authRoutes); // Legacy auth routes for backward compatibility
app.use('/api/auth/debug', authSimpleRoutes); // Simple auth routes for debugging
app.use('/api/scripts', scriptRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ai-agent', aiAgentRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/cache', cacheRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/aiagent', aiagentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/ai-features', aiFeaturesRoutes);
app.use('/api/ai/advanced', aiAdvancedRoutes);

// Create proxy routes for the frontend to use
// This ensures the frontend can directly call /scripts/please instead of /api/ai-agent/please
app.use('/scripts/please', (req, res) => {
  req.url = '/api/ai-agent/please';
  (app as any)._router.handle(req, res);
});

app.use('/scripts/analyze/assistant', (req, res) => {
  req.url = '/api/ai-agent/analyze/assistant';
  (app as any)._router.handle(req, res);
});

app.use('/scripts/generate', (req, res) => {
  req.url = '/api/ai-agent/generate';
  (app as any)._router.handle(req, res);
});

app.use('/scripts/explain', (req, res) => {
  req.url = '/api/ai-agent/explain';
  (app as any)._router.handle(req, res);
});

app.use('/scripts/examples', (req, res) => {
  req.url = '/api/ai-agent/examples';
  (app as any)._router.handle(req, res);
});

// Root route with API information
app.get('/api', (req, res) => {
  res.json({
    message: 'PowerShell Script Management API',
    version: process.env.npm_package_version || '0.1.0',
    environment: process.env.NODE_ENV || 'development',
    documentation: '/api-docs',
    status: 'healthy'
  });
});

// Serve the index.html file at the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler - must be before the error handler
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Not Found',
    message: `The requested resource at ${req.originalUrl} was not found`
  });
});

// Error handling middleware
// app.use(errorTrackingMiddleware); // Temporarily disabled
app.use(errorHandler);

// Create HTTP server with proper error handling
const startServer = async () => {
  try {
    // Test database connection with retry
    let connected = false;
    let attempts = 0;
    const maxAttempts = 5;
    
    while (!connected && attempts < maxAttempts) {
      try {
        attempts++;
        await db.connect();
        connected = true;
        logger.info('Database connection established successfully');
      } catch (error) {
        logger.error(`Database connection attempt ${attempts} failed:`, error);
        
        if (attempts >= maxAttempts) {
          throw error;
        }
        
        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    // Add endpoint to clear cache
    app.get('/api/cache/clear', (req, res) => {
      const pattern = req.query.pattern as string;
      let count = 0;
      
      if (pattern) {
        count = cache.clearPattern(pattern);
        logger.info(`Cache cleared for pattern: ${pattern}, removed ${count} entries`);
      } else {
        const stats = cache.stats();
        count = stats.size;
        cache.clear();
        logger.info(`Full cache cleared, removed ${count} entries`);
      }
      
      res.json({
        success: true,
        message: `Cache cleared successfully`,
        entriesRemoved: count
      });
    });
    
    // Add enhanced endpoint to get detailed cache stats
    app.get('/api/cache/stats', (req, res) => {
      const stats = cache.stats();
      const memUsage = process.memoryUsage();
      
      res.json({
        // Basic stats
        size: stats.size,
        keys: stats.keys.slice(0, 100), // Limit to first 100 keys to avoid huge responses
        
        // Performance metrics
        hitRatio: stats.hitRatio,
        topHits: stats.topHits,
        topMisses: stats.topMisses,
        
        // Memory usage
        memoryUsage: {
          ...memUsage,
          cacheMemoryEstimate: stats.memoryEstimate,
          cacheMemoryPercentage: Math.round((stats.memoryEstimate / memUsage.heapUsed) * 100) / 100
        },
        
        // Error tracking
        errors: stats.errors,
        
        // LRU info
        maxItems: MAX_CACHE_ITEMS,
        maxMemory: `${Math.round(MAX_MEMORY_USAGE/1024/1024)}MB`
      });
    });
    
    console.log('Starting HTTP server on port', port);
    
    // Initialize default categories
    try {
      const CategoryController = require('./controllers/CategoryController').default;
      await CategoryController.initializeDefaultCategories();
      logger.info('Default categories initialized');
    } catch (error) {
      logger.error('Error initializing default categories:', error);
    }
    
    // Start HTTP server
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`Server is now running on http://0.0.0.0:${port}`);
      logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${port}`);
      logger.info(`API documentation available at http://localhost:${port}/api-docs`);
      logger.info(`In-memory cache initialized and ready`);
    });
    
    // Set server timeouts
    server.timeout = 60000; // 60 seconds
    
    // Handle server errors
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${port} is already in use. Exiting.`);
      } else {
        logger.error('Server error:', error);
      }
      process.exit(1);
    });
    
    // Graceful shutdown logic
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);
      
      // Close HTTP server (stop accepting new connections)
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          // Close database connection
          await db.close();
          logger.info('Database connections closed');
          
          // Clear in-memory cache
          cache.clear();
          logger.info('In-memory cache cleared');
          
          logger.info('Shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });
      
      // Force close if graceful shutdown fails
      setTimeout(() => {
        logger.error('Shutdown took too long, forcing exit');
        process.exit(1);
      }, 30000); // 30 seconds timeout
    };
    
    // Register shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions and unhandled promise rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  // Don't exit immediately in production to allow for graceful handling
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection:', reason);
  // Log but don't crash in production
});

// Export server for testing purposes
const server = startServer();
export default server;
