/** 
 * @ts-nocheck 
 * This file is kept for backwards compatibility but is no longer used.
 * All Redis functionality has been replaced with in-memory caching in index.ts
 */
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { cache } from '../index';

// Provide a compatibility layer for existing code
export const redisClient = null;

// Health check functions for Redis client
export const redisHealth = {
  // Check if in-memory cache is connected and responding
  isConnected: async (): Promise<boolean> => {
    try {
      // Simple test to verify the cache is working
      const testKey = 'health:check:test';
      const testValue = Date.now().toString();
      
      cache.set(testKey, testValue);
      const result = cache.get(testKey) === testValue;
      cache.del(testKey);
      
      return result;
    } catch (error) {
      logger.warn('Cache health check failed:', error);
      return false;
    }
  },
  
  // Get detailed cache status information
  getStatus: () => {
    try {
      const stats = cache.stats();
      
      return { 
        status: 'ready' as string,
        connected: true,
        instance: 'in-memory',
        size: stats.size
      };
    } catch (error) {
      return { 
        status: 'error' as string,
        connected: false,
        instance: 'in-memory',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// These functions are kept for compatibility but now use the in-memory cache
export async function initRedisClient() {
  logger.info('Using in-memory cache instead of Redis');
  return cache;
}

export async function getRedisClient() {
  logger.info('Using in-memory cache instead of Redis');
  return cache;
}

// Middleware wrapper for Express (kept for compatibility)
export const redisMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    // No action needed - cacheMiddleware in index.ts handles this now
    next();
  };
};