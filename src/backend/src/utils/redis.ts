import logger from './logger';
import { cache } from '../index';

/**
 * Enhanced cache utility functions that provide stronger TypeScript typing,
 * better error handling, and more detailed logging for cache operations.
 */

// Define response type for cache operations
interface CacheOperationResult<T = any> {
  success: boolean;
  value?: T;
  error?: string;
  key: string;
}

/**
 * Set a key in memory cache with optional expiry
 * @param key Cache key to store the value under
 * @param value Value to store in cache
 * @param expiry Time to live in seconds (default: 1 hour)
 * @returns Promise with operation result
 */
export const setCache = async <T>(
  key: string, 
  value: T, 
  expiry: number = 3600
): Promise<CacheOperationResult<T>> => {
  try {
    if (!key) {
      return { success: false, key, error: 'Invalid cache key' };
    }
    
    cache.set(key, value, expiry);
    logger.debug(`Cache set: ${key} (TTL: ${expiry}s)`);
    
    return { success: true, key, value };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Memory cache setCache error (${key}):`, error);
    return { success: false, key, error: errorMessage };
  }
};

/**
 * Get a value from memory cache with automatic type casting
 * @param key Cache key to retrieve
 * @returns Promise with operation result and typed value
 */
export const getCache = async <T>(key: string): Promise<CacheOperationResult<T>> => {
  try {
    if (!key) {
      return { success: false, key, error: 'Invalid cache key' };
    }
    
    const value = cache.get(key) as T | null;
    
    if (value === null) {
      logger.debug(`Cache miss: ${key}`);
      return { success: false, key, error: 'Cache miss' };
    }
    
    logger.debug(`Cache hit: ${key}`);
    return { success: true, key, value };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Memory cache getCache error (${key}):`, error);
    return { success: false, key, error: errorMessage };
  }
};

/**
 * Delete a key from memory cache
 * @param key Cache key to delete
 * @returns Promise with operation result
 */
export const deleteCache = async (key: string): Promise<CacheOperationResult> => {
  try {
    if (!key) {
      return { success: false, key, error: 'Invalid cache key' };
    }
    
    const existed = cache.del(key);
    
    if (existed) {
      logger.debug(`Cache delete: ${key}`);
      return { success: true, key };
    } else {
      logger.debug(`Cache delete (key not found): ${key}`);
      return { success: false, key, error: 'Key not found' };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Memory cache deleteCache error (${key}):`, error);
    return { success: false, key, error: errorMessage };
  }
};

/**
 * Invalidate cache keys by pattern
 * @param pattern Pattern to match cache keys (prefix matching)
 * @returns Promise with operation result and count of cleared keys
 */
export const invalidateByPattern = async (pattern: string): Promise<CacheOperationResult<number>> => {
  try {
    if (!pattern) {
      return { success: false, key: pattern, error: 'Invalid pattern' };
    }
    
    const count = cache.clearPattern(pattern);
    logger.info(`Invalidated ${count} cache keys matching pattern: ${pattern}`);
    
    return { success: true, key: pattern, value: count };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Memory cache invalidateByPattern error (${pattern}):`, error);
    return { success: false, key: pattern, error: errorMessage };
  }
};

/**
 * Get cache statistics
 * @returns Promise with detailed cache statistics
 */
export const getCacheStats = async (): Promise<any> => {
  try {
    return cache.stats();
  } catch (error) {
    logger.error('Memory cache getCacheStats error:', error);
    return {
      size: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

/**
 * Persist cache to disk
 * @param filePath Path to save the cache file
 * @returns Promise with operation result
 */
export const persistCache = async (filePath: string): Promise<CacheOperationResult<string>> => {
  try {
    if (!filePath) {
      return { success: false, key: 'persist', error: 'Invalid file path' };
    }
    
    const success = await cache.persistence.saveToFile(filePath);
    
    if (success) {
      return { success: true, key: 'persist', value: filePath };
    } else {
      return { success: false, key: 'persist', error: 'Failed to save cache file' };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Memory cache persistCache error (${filePath}):`, error);
    return { success: false, key: 'persist', error: errorMessage };
  }
};

/**
 * Load cache from disk
 * @param filePath Path to load the cache file from
 * @returns Promise with operation result
 */
export const loadCache = async (filePath: string): Promise<CacheOperationResult<string>> => {
  try {
    if (!filePath) {
      return { success: false, key: 'load', error: 'Invalid file path' };
    }
    
    const success = await cache.persistence.loadFromFile(filePath);
    
    if (success) {
      return { success: true, key: 'load', value: filePath };
    } else {
      return { success: false, key: 'load', error: 'Failed to load cache file' };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Memory cache loadCache error (${filePath}):`, error);
    return { success: false, key: 'load', error: errorMessage };
  }
};

// Export cache object reference for compatibility
export default cache;