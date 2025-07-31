import { Request, Response, NextFunction } from 'express';
import CacheManager from '../services/CacheManager';
import logger from '../utils/logger';

interface CacheMiddlewareOptions {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request) => boolean;
  invalidatePattern?: string;
}

/**
 * Advanced caching middleware with multi-tier support
 */
export function cacheMiddleware(options: CacheMiddlewareOptions = {}) {
  const {
    ttl = 300000, // 5 minutes default
    keyGenerator = defaultKeyGenerator,
    condition = defaultCondition,
    invalidatePattern
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip if condition not met
    if (!condition(req)) {
      return next();
    }

    const cacheKey = keyGenerator(req);

    // Try to get from cache
    try {
      const cached = await CacheManager.get(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);
        return res.json(cached);
      }
    } catch (error) {
      logger.error('Cache middleware get error', { error, cacheKey });
    }

    // Cache miss - proceed with request
    res.setHeader('X-Cache', 'MISS');
    res.setHeader('X-Cache-Key', cacheKey);

    // Store original send
    const originalSend = res.json;

    // Override json method to cache response
    res.json = function(data: any) {
      res.json = originalSend;

      // Cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        CacheManager.set(cacheKey, data, { ttl }).catch(error => {
          logger.error('Cache middleware set error', { error, cacheKey });
        });

        // Invalidate related cache if pattern provided
        if (invalidatePattern) {
          CacheManager.invalidateRelated([invalidatePattern]).catch(error => {
            logger.error('Cache invalidation error', { error, pattern: invalidatePattern });
          });
        }
      }

      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Invalidate cache middleware for write operations
 */
export function invalidateCacheMiddleware(patterns: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Add invalidation after successful response
    const originalSend = res.json;

    res.json = function(data: any) {
      res.json = originalSend;

      // Invalidate on successful write operations
      if (res.statusCode >= 200 && res.statusCode < 300 && 
          ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        CacheManager.invalidateRelated(patterns).catch(error => {
          logger.error('Cache invalidation middleware error', { error, patterns });
        });
      }

      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Cache warming middleware
 */
export function cacheWarmingMiddleware(
  keys: string[], 
  factory: (key: string) => Promise<any>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Warm cache in background
    CacheManager.warmCache(keys, factory).catch(error => {
      logger.error('Cache warming error', { error });
    });

    next();
  };
}

// Default key generator
function defaultKeyGenerator(req: Request): string {
  const userId = (req as any).user?.userId || 'anonymous';
  const query = JSON.stringify(req.query);
  const params = JSON.stringify(req.params);
  
  return CacheManager.createKey(
    'api',
    req.method,
    req.path,
    userId,
    CacheManager.generateKey({ query, params })
  );
}

// Default condition - only cache GET requests
function defaultCondition(req: Request): boolean {
  return req.method === 'GET';
}

// Route-specific cache configurations
export const cacheConfigs = {
  scripts: {
    list: cacheMiddleware({ ttl: 300000 }), // 5 minutes
    detail: cacheMiddleware({ ttl: 3600000 }), // 1 hour
    invalidate: invalidateCacheMiddleware(['scripts'])
  },
  categories: {
    list: cacheMiddleware({ ttl: 86400000 }), // 24 hours
    invalidate: invalidateCacheMiddleware(['categories'])
  },
  tags: {
    list: cacheMiddleware({ ttl: 86400000 }), // 24 hours
    invalidate: invalidateCacheMiddleware(['tags'])
  },
  search: {
    results: cacheMiddleware({ 
      ttl: 600000, // 10 minutes
      keyGenerator: (req) => {
        const query = req.query.q || '';
        const filters = JSON.stringify({
          textWeight: req.query.textWeight,
          vectorWeight: req.query.vectorWeight,
          limit: req.query.limit
        });
        return CacheManager.createKey('search', query, filters);
      }
    })
  },
  analytics: {
    dashboard: cacheMiddleware({ ttl: 900000 }), // 15 minutes
    invalidate: invalidateCacheMiddleware(['analytics'])
  }
};