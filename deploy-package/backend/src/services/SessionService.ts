import Redis from 'ioredis';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import { sequelize } from '../database/connection';

interface SessionData {
  userId: number;
  username: string;
  email: string;
  role: string;
  ipAddress?: string;
  userAgent?: string;
}

interface ActiveSession {
  sessionId: string;
  userId: number;
  ipAddress?: string;
  userAgent?: string;
  lastActivity: Date;
  expiresAt: Date;
  isActive: boolean;
}

/**
 * Service for managing user sessions
 */
export class SessionService {
  private static redis: Redis | null = null;
  private static readonly SESSION_PREFIX = 'session:';
  private static readonly USER_SESSIONS_PREFIX = 'user_sessions:';
  private static readonly SESSION_TTL = 24 * 60 * 60; // 24 hours in seconds
  private static readonly REFRESH_THRESHOLD = 30 * 60; // 30 minutes in seconds

  /**
   * Initialize Redis connection
   */
  static initialize(): void {
    try {
      this.redis = new Redis({
        host: process.env.DOCKER_ENV === 'true' ? (process.env.REDIS_HOST || 'redis') : 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '1'), // Use DB 1 for sessions
        retryStrategy: (times) => Math.min(times * 50, 2000)
      });

      this.redis.on('connect', () => {
        logger.info('Session Redis client connected');
      });

      this.redis.on('error', (error) => {
        logger.error('Session Redis client error:', error);
      });
    } catch (error) {
      logger.error('Failed to initialize session Redis client:', error);
    }
  }

  /**
   * Create a new session
   */
  static async createSession(sessionData: SessionData, expiresIn?: number): Promise<string> {
    const sessionId = this.generateSessionId();
    const ttl = expiresIn || this.SESSION_TTL;
    const expiresAt = new Date(Date.now() + ttl * 1000);

    try {
      // Store session in Redis
      if (this.redis) {
        const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
        await this.redis.setex(
          sessionKey,
          ttl,
          JSON.stringify({
            ...sessionData,
            createdAt: new Date(),
            lastActivity: new Date()
          })
        );

        // Add session to user's session set
        const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${sessionData.userId}`;
        await this.redis.sadd(userSessionsKey, sessionId);
        await this.redis.expire(userSessionsKey, ttl);
      }

      // Store session in database
      await sequelize.query(
        `INSERT INTO user_sessions (session_id, user_id, ip_address, user_agent, expires_at) 
         VALUES (:sessionId, :userId, :ipAddress, :userAgent, :expiresAt)`,
        {
          replacements: {
            sessionId,
            userId: sessionData.userId,
            ipAddress: sessionData.ipAddress,
            userAgent: sessionData.userAgent,
            expiresAt
          }
        }
      );

      logger.info('Session created', {
        sessionId,
        userId: sessionData.userId,
        expiresAt
      });

      return sessionId;
    } catch (error) {
      logger.error('Failed to create session:', error);
      throw error;
    }
  }

  /**
   * Get session data
   */
  static async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      if (this.redis) {
        const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
        const data = await this.redis.get(sessionKey);

        if (data) {
          // Update last activity
          const sessionData = JSON.parse(data);
          sessionData.lastActivity = new Date();
          
          const ttl = await this.redis.ttl(sessionKey);
          await this.redis.setex(sessionKey, ttl, JSON.stringify(sessionData));

          // Update database
          await sequelize.query(
            `UPDATE user_sessions SET last_activity = NOW() WHERE session_id = :sessionId`,
            { replacements: { sessionId } }
          );

          return sessionData;
        }
      }

      // Fallback to database
      const [session] = await sequelize.query(
        `SELECT u.id as userId, u.username, u.email, u.role, s.ip_address as ipAddress, s.user_agent as userAgent
         FROM user_sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.session_id = :sessionId AND s.is_active = true AND s.expires_at > NOW()`,
        {
          replacements: { sessionId },
          type: 'SELECT'
        }
      ) as any[];

      return session || null;
    } catch (error) {
      logger.error('Failed to get session:', error);
      return null;
    }
  }

  /**
   * Destroy a session
   */
  static async destroySession(sessionId: string): Promise<void> {
    try {
      // Get session data first
      const session = await this.getSession(sessionId);

      if (this.redis && session) {
        // Remove from Redis
        const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
        await this.redis.del(sessionKey);

        // Remove from user's session set
        const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${session.userId}`;
        await this.redis.srem(userSessionsKey, sessionId);
      }

      // Update database
      await sequelize.query(
        `UPDATE user_sessions SET is_active = false WHERE session_id = :sessionId`,
        { replacements: { sessionId } }
      );

      logger.info('Session destroyed', { sessionId });
    } catch (error) {
      logger.error('Failed to destroy session:', error);
    }
  }

  /**
   * Destroy all sessions for a user
   */
  static async destroyUserSessions(userId: number): Promise<void> {
    try {
      if (this.redis) {
        // Get all user sessions from Redis
        const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;
        const sessionIds = await this.redis.smembers(userSessionsKey);

        // Delete each session
        for (const sessionId of sessionIds) {
          const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
          await this.redis.del(sessionKey);
        }

        // Delete user sessions set
        await this.redis.del(userSessionsKey);
      }

      // Update database
      await sequelize.query(
        `UPDATE user_sessions SET is_active = false WHERE user_id = :userId`,
        { replacements: { userId } }
      );

      logger.info('All user sessions destroyed', { userId });
    } catch (error) {
      logger.error('Failed to destroy user sessions:', error);
    }
  }

  /**
   * Get all active sessions for a user
   */
  static async getUserSessions(userId: number): Promise<ActiveSession[]> {
    try {
      const sessions = await sequelize.query(
        `SELECT session_id as sessionId, user_id as userId, ip_address as ipAddress, 
                user_agent as userAgent, last_activity as lastActivity, 
                expires_at as expiresAt, is_active as isActive
         FROM user_sessions 
         WHERE user_id = :userId AND is_active = true AND expires_at > NOW()
         ORDER BY last_activity DESC`,
        {
          replacements: { userId },
          type: 'SELECT'
        }
      ) as any[];

      return sessions.map(s => ({
        sessionId: s.sessionid,
        userId: s.userid,
        ipAddress: s.ipaddress,
        userAgent: s.useragent,
        lastActivity: new Date(s.lastactivity),
        expiresAt: new Date(s.expiresat),
        isActive: s.isactive
      }));
    } catch (error) {
      logger.error('Failed to get user sessions:', error);
      return [];
    }
  }

  /**
   * Check if session needs refresh
   */
  static async shouldRefreshSession(sessionId: string): Promise<boolean> {
    try {
      if (this.redis) {
        const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
        const ttl = await this.redis.ttl(sessionKey);
        return ttl > 0 && ttl < this.REFRESH_THRESHOLD;
      }
      return false;
    } catch (error) {
      logger.error('Failed to check session refresh:', error);
      return false;
    }
  }

  /**
   * Extend session TTL
   */
  static async extendSession(sessionId: string, additionalTtl?: number): Promise<void> {
    const extension = additionalTtl || this.SESSION_TTL;

    try {
      if (this.redis) {
        const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
        const data = await this.redis.get(sessionKey);

        if (data) {
          await this.redis.expire(sessionKey, extension);
        }
      }

      // Update database
      await sequelize.query(
        `UPDATE user_sessions 
         SET expires_at = NOW() + INTERVAL ':extension seconds' 
         WHERE session_id = :sessionId`,
        {
          replacements: { sessionId, extension }
        }
      );

      logger.info('Session extended', { sessionId, extension });
    } catch (error) {
      logger.error('Failed to extend session:', error);
    }
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(): Promise<void> {
    try {
      const result = await sequelize.query(
        `UPDATE user_sessions 
         SET is_active = false 
         WHERE is_active = true AND expires_at <= NOW()`
      );

      logger.info('Cleaned up expired sessions');
    } catch (error) {
      logger.error('Failed to cleanup expired sessions:', error);
    }
  }

  /**
   * Generate a secure session ID
   */
  private static generateSessionId(): string {
    const uuid = uuidv4();
    const random = crypto.randomBytes(16).toString('hex');
    return `${uuid}-${random}`;
  }
}

export default SessionService;