/**
 * Redis Cache Service
 * 
 * This module provides a unified interface for caching with Redis or a fallback in-memory cache.
 * Features:
 * - Automatic Redis connection with retry mechanism
 * - Graceful fallback to in-memory cache when Redis is unavailable
 * - Connection health monitoring and automatic recovery
 * - Type-safe generic interface for storing and retrieving data
 */

import Redis from 'ioredis';
import { createLogger, format, transports } from 'winston';
import path from 'path';
import fs from 'fs';

// Configure logger
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.printf(({ level, message, timestamp }) => {
      return `${timestamp} ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [
    new transports.Console(),
    new transports.File({ 
      filename: path.join(process.cwd(), 'logs', 'redis.log'),
      dirname: path.join(process.cwd(), 'logs'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  ]
});

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  try {
    fs.mkdirSync(logsDir, { recursive: true });
  } catch (err) {
    console.error('Failed to create logs directory:', err);
  }
}

// Fallback in-memory cache
class MemoryCache {
  private cache: Map<string, any> = new Map();
  private ttlMap: Map<string, number> = new Map();
  
  async get<T>(key: string): Promise<T | null> {
    this.removeExpiredItems();
    return this.cache.get(key) || null;
  }
  
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    this.cache.set(key, value);
    if (ttlSeconds) {
      this.ttlMap.set(key, Date.now() + (ttlSeconds * 1000));
    } else {
      this.ttlMap.delete(key);
    }
  }
  
  async del(key: string): Promise<void> {
    this.cache.delete(key);
    this.ttlMap.delete(key);
  }
  
  async keys(pattern: string): Promise<string[]> {
    this.removeExpiredItems();
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Array.from(this.cache.keys()).filter(key => regex.test(key));
  }
  
  async flushAll(): Promise<void> {
    this.cache.clear();
    this.ttlMap.clear();
  }
  
  async ping(): Promise<string> {
    return 'PONG';
  }
  
  private removeExpiredItems(): void {
    const now = Date.now();
    for (const [key, expiry] of this.ttlMap.entries()) {
      if (expiry <= now) {
        this.cache.delete(key);
        this.ttlMap.delete(key);
      }
    }
  }
}

// Cache interface
interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  keys(pattern: string): Promise<string[]>;
  flushAll(): Promise<void>;
  ping(): Promise<string>;
}

// Redis cache implementation
class RedisCache implements CacheService {
  private client: Redis | null = null;
  private connected = false;
  private readonly redisUrl: string;
  
  constructor() {
    this.redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.init();
  }
  
  private async init() {
    try {
      logger.info(`Connecting to Redis at ${this.redisUrl.replace(/\/\/.*@/, '//<redacted>@')}`);
      
      this.client = new Redis(this.redisUrl, {
        lazyConnect: true,
        retryStrategy: (times) => {
          const delay = Math.min(times * 200, 5000);
          logger.info(`Redis connection attempt ${times}, retrying in ${delay}ms`);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableOfflineQueue: true,
        connectTimeout: 10000,
      });
      
      // Set up event handlers
      this.client.on('connect', () => {
        this.connected = true;
        logger.info('Redis connected successfully');
      });
      
      this.client.on('error', (err) => {
        if (this.connected) {
          logger.error(`Redis error: ${err.message}`);
        }
        this.connected = false;
      });
      
      this.client.on('reconnecting', () => {
        logger.info('Redis reconnecting...');
      });
      
      this.client.on('ready', () => {
        this.connected = true;
        logger.info('Redis ready');
      });
      
      // Connect to Redis
      await this.client.connect();
      await this.client.ping();
      logger.info('Redis connection test successful');
      this.connected = true;
    } catch (error) {
      logger.error(`Failed to connect to Redis: ${error}`);
      this.connected = false;
    }
  }
  
  async get<T>(key: string): Promise<T | null> {
    if (!this.connected || !this.client) {
      return null;
    }
    
    try {
      const data = await this.client.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      logger.error(`Redis get error for key ${key}: ${error}`);
      return null;
    }
  }
  
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (!this.connected || !this.client) {
      return;
    }
    
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.set(key, serialized, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      logger.error(`Redis set error for key ${key}: ${error}`);
    }
  }
  
  async del(key: string): Promise<void> {
    if (!this.connected || !this.client) {
      return;
    }
    
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error(`Redis del error for key ${key}: ${error}`);
    }
  }
  
  async keys(pattern: string): Promise<string[]> {
    if (!this.connected || !this.client) {
      return [];
    }
    
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error(`Redis keys error for pattern ${pattern}: ${error}`);
      return [];
    }
  }
  
  async flushAll(): Promise<void> {
    if (!this.connected || !this.client) {
      return;
    }
    
    try {
      await this.client.flushall();
    } catch (error) {
      logger.error(`Redis flushAll error: ${error}`);
    }
  }
  
  async ping(): Promise<string> {
    if (!this.connected || !this.client) {
      return 'OFFLINE';
    }
    
    try {
      return await this.client.ping();
    } catch (error) {
      logger.error(`Redis ping error: ${error}`);
      return 'ERROR';
    }
  }
}

// Unified cache service with automatic fallback
class UnifiedCacheService implements CacheService {
  private redisCache: RedisCache;
  private memoryCache: MemoryCache;
  private preferRedis: boolean;
  
  constructor() {
    this.redisCache = new RedisCache();
    this.memoryCache = new MemoryCache();
    this.preferRedis = true;
    
    // Check Redis health periodically
    setInterval(async () => {
      try {
        const result = await this.redisCache.ping();
        this.preferRedis = result === 'PONG';
        if (!this.preferRedis) {
          logger.warn('Redis unavailable, using memory cache fallback');
        } else if (process.env.NODE_ENV !== 'production') {
          logger.debug('Redis health check: OK');
        }
      } catch (error) {
        this.preferRedis = false;
        logger.warn('Redis health check failed, using memory cache fallback');
      }
    }, 30000); // Check every 30 seconds
  }
  
  async get<T>(key: string): Promise<T | null> {
    if (this.preferRedis) {
      const redisResult = await this.redisCache.get<T>(key);
      if (redisResult !== null) {
        return redisResult;
      }
    }
    return this.memoryCache.get<T>(key);
  }
  
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (this.preferRedis) {
      await this.redisCache.set<T>(key, value, ttlSeconds);
    }
    // Always store in memory cache as well for fallback
    await this.memoryCache.set<T>(key, value, ttlSeconds);
  }
  
  async del(key: string): Promise<void> {
    if (this.preferRedis) {
      await this.redisCache.del(key);
    }
    await this.memoryCache.del(key);
  }
  
  async keys(pattern: string): Promise<string[]> {
    if (this.preferRedis) {
      const redisKeys = await this.redisCache.keys(pattern);
      if (redisKeys.length > 0) {
        return redisKeys;
      }
    }
    return this.memoryCache.keys(pattern);
  }
  
  async flushAll(): Promise<void> {
    if (this.preferRedis) {
      await this.redisCache.flushAll();
    }
    await this.memoryCache.flushAll();
  }
  
  async ping(): Promise<string> {
    if (this.preferRedis) {
      try {
        const result = await this.redisCache.ping();
        if (result === 'PONG') {
          return result;
        }
      } catch (error) {
        logger.error(`Redis ping failed: ${error}`);
      }
    }
    return this.memoryCache.ping();
  }
}

// Create singleton instance
const cacheService = new UnifiedCacheService();
export default cacheService;