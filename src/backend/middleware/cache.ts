import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import crypto from 'crypto';
import { config } from '../config/environment';

/**
 * Distributed caching middleware using Redis
 */
export class CacheMiddleware {
  private redis: Redis | null = null;
  private enabled: boolean = false;

  constructor() {
    this.initializeRedis();
  }

  private initializeRedis() {
    if (config.REDIS_URL) {
      try {
        this.redis = new Redis(config.REDIS_URL, {
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          reconnectOnError: (err) => {
            const targetError = 'READONLY';
            if (err.message.includes(targetError)) {
              // Only reconnect when the error contains "READONLY"
              return true;
            }
            return false;
          },
        });

        this.redis.on('connect', () => {
          console.log('Cache middleware connected to Redis');
          this.enabled = true;
        });

        this.redis.on('error', (err) => {
          console.error('Redis cache error:', err);
          this.enabled = false;
        });

        this.redis.on('close', () => {
          console.log('Redis cache connection closed');
          this.enabled = false;
        });
      } catch (error) {
        console.error('Failed to initialize Redis cache:', error);
        this.enabled = false;
      }
    } else {
      console.log('Redis URL not configured, caching disabled');
    }
  }

  /**
   * Generate cache key from request
   */
  private generateCacheKey(req: Request): string {
    const { method, originalUrl, query, body } = req;
    const userId = req.user?.id || 'anonymous';
    
    // Create a unique key based on request parameters
    const keyData = {
      method,
      url: originalUrl,
      query: query || {},
      body: method !== 'GET' ? body : {},
      userId
    };

    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(keyData))
      .digest('hex');

    return `cache:${method}:${hash}`;
  }

  /**
   * Cache middleware for GET requests
   */
  cache(options: {
    ttl?: number;
    prefix?: string;
    excludeParams?: string[];
    varyByUser?: boolean;
  } = {}) {
    const {
      ttl = 300, // 5 minutes default
      prefix = '',
      excludeParams = [],
      varyByUser = true
    } = options;

    return async (req: Request, res: Response, next: NextFunction) => {
      // Only cache GET requests
      if (req.method !== 'GET' || !this.enabled || !this.redis) {
        return next();
      }

      try {
        // Generate cache key
        let cacheKey = this.generateCacheKey(req);
        if (prefix) {
          cacheKey = `${prefix}:${cacheKey}`;
        }

        // Check cache
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          const data = JSON.parse(cached);
          
          // Set cache headers
          res.set('X-Cache', 'HIT');
          res.set('X-Cache-TTL', ttl.toString());
          
          // Send cached response
          return res.status(data.status || 200).json(data.body);
        }

        // Cache miss - store original send method
        const originalSend = res.json.bind(res);
        
        // Override json method to cache response
        res.json = function(body: any) {
          // Only cache successful responses
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const cacheData = {
              status: res.statusCode,
              body,
              timestamp: Date.now()
            };

            // Store in cache (fire and forget)
            if (this.redis && this.enabled) {
              this.redis.setex(
                cacheKey,
                ttl,
                JSON.stringify(cacheData)
              ).catch(err => {
                console.error('Failed to cache response:', err);
              });
            }
          }

          // Set cache headers
          res.set('X-Cache', 'MISS');
          res.set('X-Cache-TTL', ttl.toString());

          // Call original send
          return originalSend(body);
        }.bind(this);

        next();
      } catch (error) {
        console.error('Cache middleware error:', error);
        next();
      }
    };
  }

  /**
   * Invalidate cache entries
   */
  async invalidate(patterns: string[]): Promise<void> {
    if (!this.enabled || !this.redis) return;

    try {
      for (const pattern of patterns) {
        const keys = await this.redis.keys(`cache:*${pattern}*`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
          console.log(`Invalidated ${keys.length} cache entries for pattern: ${pattern}`);
        }
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  /**
   * Clear all cache entries
   */
  async clearAll(): Promise<void> {
    if (!this.enabled || !this.redis) return;

    try {
      const keys = await this.redis.keys('cache:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
        console.log(`Cleared ${keys.length} cache entries`);
      }
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    enabled: boolean;
    connected: boolean;
    keyCount: number;
    memoryUsage?: string;
  }> {
    const stats = {
      enabled: this.enabled,
      connected: false,
      keyCount: 0,
      memoryUsage: undefined as string | undefined
    };

    if (this.enabled && this.redis) {
      try {
        await this.redis.ping();
        stats.connected = true;

        const keys = await this.redis.keys('cache:*');
        stats.keyCount = keys.length;

        const info = await this.redis.info('memory');
        const memMatch = info.match(/used_memory_human:(.+)/);
        if (memMatch) {
          stats.memoryUsage = memMatch[1].trim();
        }
      } catch (error) {
        console.error('Failed to get cache stats:', error);
      }
    }

    return stats;
  }

  /**
   * Rate limiting using Redis
   */
  rateLimit(options: {
    windowMs?: number;
    max?: number;
    keyGenerator?: (req: Request) => string;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
  } = {}) {
    const {
      windowMs = 900000, // 15 minutes
      max = 100,
      keyGenerator = (req) => req.ip || 'unknown',
      skipSuccessfulRequests = false,
      skipFailedRequests = false
    } = options;

    return async (req: Request, res: Response, next: NextFunction) => {
      if (!this.enabled || !this.redis) {
        return next();
      }

      const key = `ratelimit:${keyGenerator(req)}`;
      const windowSeconds = Math.floor(windowMs / 1000);

      try {
        // Get current count
        const current = await this.redis.incr(key);
        
        // Set expiry on first request
        if (current === 1) {
          await this.redis.expire(key, windowSeconds);
        }

        // Get TTL for headers
        const ttl = await this.redis.ttl(key);

        // Set rate limit headers
        res.set('X-RateLimit-Limit', max.toString());
        res.set('X-RateLimit-Remaining', Math.max(0, max - current).toString());
        res.set('X-RateLimit-Reset', new Date(Date.now() + ttl * 1000).toISOString());

        // Check if limit exceeded
        if (current > max) {
          res.status(429).json({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded',
            retryAfter: ttl
          });
          return;
        }

        // Handle skip options
        if (skipSuccessfulRequests || skipFailedRequests) {
          const originalSend = res.send.bind(res);
          res.send = function(...args: any[]) {
            const shouldSkip = 
              (skipSuccessfulRequests && res.statusCode < 400) ||
              (skipFailedRequests && res.statusCode >= 400);

            if (shouldSkip && this.redis && this.enabled) {
              // Decrement the counter
              this.redis.decr(key).catch(err => {
                console.error('Failed to decrement rate limit:', err);
              });
            }

            return originalSend(...args);
          }.bind(this);
        }

        next();
      } catch (error) {
        console.error('Rate limit error:', error);
        next();
      }
    };
  }

  /**
   * Session store using Redis
   */
  getSessionStore() {
    if (!this.enabled || !this.redis) {
      return null;
    }

    const RedisStore = require('connect-redis').default;
    return new RedisStore({
      client: this.redis,
      prefix: 'session:',
      ttl: 86400, // 1 day
      disableTouch: false
    });
  }

  /**
   * Distributed lock implementation
   */
  async acquireLock(
    resource: string,
    ttl: number = 30000
  ): Promise<{ unlock: () => Promise<void> } | null> {
    if (!this.enabled || !this.redis) return null;

    const lockKey = `lock:${resource}`;
    const lockValue = crypto.randomBytes(16).toString('hex');

    try {
      // Try to acquire lock
      const acquired = await this.redis.set(
        lockKey,
        lockValue,
        'PX',
        ttl,
        'NX'
      );

      if (acquired === 'OK') {
        return {
          unlock: async () => {
            // Only unlock if we own the lock
            const script = `
              if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
              else
                return 0
              end
            `;
            
            await this.redis!.eval(script, 1, lockKey, lockValue);
          }
        };
      }

      return null;
    } catch (error) {
      console.error('Lock acquisition error:', error);
      return null;
    }
  }

  /**
   * Pub/Sub functionality for real-time updates
   */
  async publish(channel: string, message: any): Promise<void> {
    if (!this.enabled || !this.redis) return;

    try {
      await this.redis.publish(channel, JSON.stringify(message));
    } catch (error) {
      console.error('Publish error:', error);
    }
  }

  subscribe(channel: string, handler: (message: any) => void): () => void {
    if (!this.enabled || !this.redis) {
      return () => {};
    }

    const subscriber = this.redis.duplicate();
    
    subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        try {
          const data = JSON.parse(message);
          handler(data);
        } catch (error) {
          console.error('Subscribe message parse error:', error);
        }
      }
    });

    subscriber.subscribe(channel).catch(err => {
      console.error('Subscribe error:', err);
    });

    // Return unsubscribe function
    return () => {
      subscriber.unsubscribe(channel);
      subscriber.disconnect();
    };
  }
}

// Export singleton instance
export const cacheMiddleware = new CacheMiddleware();