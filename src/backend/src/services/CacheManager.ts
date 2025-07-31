import { LRUCache } from 'lru-cache';
import Redis from 'ioredis';
import logger from '../utils/logger';
import crypto from 'crypto';

interface CacheOptions {
  ttl?: number;
  tier?: 'L1' | 'L2' | 'ALL';
  compress?: boolean;
}

interface CacheStats {
  l1: {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
    maxSize: number;
  };
  l2: {
    hits: number;
    misses: number;
    hitRate: number;
    memoryUsage?: number;
  };
  total: {
    hits: number;
    misses: number;
    hitRate: number;
  };
}

export class CacheManager {
  private l1Cache: LRUCache<string, any>;
  private redisClient: Redis | null = null;
  private stats = {
    l1Hits: 0,
    l1Misses: 0,
    l2Hits: 0,
    l2Misses: 0
  };
  private warmupKeys: Set<string> = new Set();

  constructor() {
    // L1 Cache: In-memory LRU cache
    this.l1Cache = new LRUCache({
      max: 500, // Maximum 500 items
      maxSize: 50 * 1024 * 1024, // 50MB max size
      sizeCalculation: (value) => {
        return JSON.stringify(value).length;
      },
      ttl: 1000 * 60 * 5, // 5 minutes default TTL
      updateAgeOnGet: true,
      updateAgeOnHas: true,
      // Dispose callback for cache eviction
      dispose: (value, key, reason) => {
        if (reason === 'evict' && this.warmupKeys.has(key)) {
          // Re-warm critical keys
          this.warmKey(key);
        }
      }
    });

    // Initialize Redis connection
    this.initializeRedis();
  }

  private async initializeRedis() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';
      this.redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        reconnectOnError: (err) => {
          const targetError = 'READONLY';
          if (err.message.includes(targetError)) {
            return true;
          }
          return false;
        }
      });

      this.redisClient.on('error', (error) => {
        logger.error('Redis client error', { error });
      });

      this.redisClient.on('ready', () => {
        logger.info('Redis client ready for L2 cache');
      });
    } catch (error) {
      logger.error('Failed to initialize Redis for L2 cache', { error });
    }
  }

  /**
   * Get value from cache with multi-tier lookup
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const { tier = 'ALL' } = options;

    // L1 lookup
    if (tier === 'L1' || tier === 'ALL') {
      const l1Value = this.l1Cache.get(key);
      if (l1Value !== undefined) {
        this.stats.l1Hits++;
        logger.debug('L1 cache hit', { key });
        return l1Value;
      }
      this.stats.l1Misses++;
    }

    // L2 lookup
    if ((tier === 'L2' || tier === 'ALL') && this.redisClient) {
      try {
        const l2Value = await this.redisClient.get(key);
        if (l2Value) {
          this.stats.l2Hits++;
          logger.debug('L2 cache hit', { key });
          
          const parsed = JSON.parse(l2Value);
          
          // Promote to L1 if we looked there first
          if (tier === 'ALL') {
            this.l1Cache.set(key, parsed);
          }
          
          return parsed;
        }
        this.stats.l2Misses++;
      } catch (error) {
        logger.error('L2 cache get error', { error, key });
      }
    }

    return null;
  }

  /**
   * Set value in cache with multi-tier storage
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const { ttl = 300000, tier = 'ALL' } = options; // Default 5 minutes

    // Store in L1
    if (tier === 'L1' || tier === 'ALL') {
      this.l1Cache.set(key, value, { ttl });
    }

    // Store in L2
    if ((tier === 'L2' || tier === 'ALL') && this.redisClient) {
      try {
        const serialized = JSON.stringify(value);
        await this.redisClient.set(key, serialized, 'PX', ttl);
        logger.debug('Cached in L2', { key, ttl });
      } catch (error) {
        logger.error('L2 cache set error', { error, key });
      }
    }
  }

  /**
   * Delete from all cache tiers
   */
  async delete(key: string): Promise<void> {
    this.l1Cache.delete(key);
    
    if (this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch (error) {
        logger.error('L2 cache delete error', { error, key });
      }
    }
  }

  /**
   * Clear cache by pattern
   */
  async clearPattern(pattern: string): Promise<number> {
    let cleared = 0;

    // Clear from L1
    for (const key of this.l1Cache.keys()) {
      if (key.includes(pattern)) {
        this.l1Cache.delete(key);
        cleared++;
      }
    }

    // Clear from L2
    if (this.redisClient) {
      try {
        const keys = await this.redisClient.keys(`*${pattern}*`);
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
          cleared += keys.length;
        }
      } catch (error) {
        logger.error('L2 cache clear pattern error', { error, pattern });
      }
    }

    return cleared;
  }

  /**
   * Get or set with cache-aside pattern
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    // Generate value
    const value = await factory();
    
    // Store in cache
    await this.set(key, value, options);
    
    return value;
  }

  /**
   * Invalidate related cache entries
   */
  async invalidateRelated(tags: string[]): Promise<void> {
    const keysToInvalidate: string[] = [];

    // Find keys with matching tags
    for (const key of this.l1Cache.keys()) {
      if (tags.some(tag => key.includes(tag))) {
        keysToInvalidate.push(key);
      }
    }

    // Delete from both tiers
    for (const key of keysToInvalidate) {
      await this.delete(key);
    }

    logger.info('Invalidated related cache entries', { 
      tags, 
      count: keysToInvalidate.length 
    });
  }

  /**
   * Warm cache with critical data
   */
  async warmKey(key: string): Promise<void> {
    this.warmupKeys.add(key);
    // Implementation depends on specific data requirements
  }

  /**
   * Warm cache with multiple keys
   */
  async warmCache(keys: string[], factory: (key: string) => Promise<any>): Promise<void> {
    logger.info('Starting cache warmup', { keyCount: keys.length });

    const promises = keys.map(async (key) => {
      try {
        const value = await factory(key);
        await this.set(key, value, { tier: 'ALL' });
        this.warmupKeys.add(key);
      } catch (error) {
        logger.warn('Failed to warm cache key', { key, error });
      }
    });

    await Promise.all(promises);
    logger.info('Cache warmup completed');
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const l1Total = this.stats.l1Hits + this.stats.l1Misses;
    const l2Total = this.stats.l2Hits + this.stats.l2Misses;
    const totalHits = this.stats.l1Hits + this.stats.l2Hits;
    const totalMisses = this.stats.l1Misses + this.stats.l2Misses;
    const total = totalHits + totalMisses;

    return {
      l1: {
        hits: this.stats.l1Hits,
        misses: this.stats.l1Misses,
        hitRate: l1Total > 0 ? this.stats.l1Hits / l1Total : 0,
        size: this.l1Cache.size,
        maxSize: this.l1Cache.max
      },
      l2: {
        hits: this.stats.l2Hits,
        misses: this.stats.l2Misses,
        hitRate: l2Total > 0 ? this.stats.l2Hits / l2Total : 0
      },
      total: {
        hits: totalHits,
        misses: totalMisses,
        hitRate: total > 0 ? totalHits / total : 0
      }
    };
  }

  /**
   * Create cache key with namespace
   */
  createKey(namespace: string, ...parts: string[]): string {
    return `${namespace}:${parts.join(':')}`;
  }

  /**
   * Generate cache key from object
   */
  generateKey(obj: any): string {
    const hash = crypto.createHash('md5');
    hash.update(JSON.stringify(obj));
    return hash.digest('hex');
  }
}

// Export singleton instance
export default new CacheManager();