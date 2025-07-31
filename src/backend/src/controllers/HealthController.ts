// File has been checked for TypeScript errors
import { Request, Response } from 'express';
import { sequelize } from '../database/connection';
import logger from '../utils/logger';
import os from 'os';
import { cache } from '../index';

/**
 * Health Controller
 * Provides endpoints for checking the health of various system components
 */
export class HealthController {
  /**
   * Get overall system health status
   * @param req Request object
   * @param res Response object
   */
  async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const dbStatus = await this.checkDatabaseConnection();
      const cacheStatus = this.checkCacheStatus();
      const systemStatus = this.getSystemStatus();
      
      const healthStatus = {
        status: dbStatus.connected ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        services: {
          database: dbStatus,
          cache: cacheStatus,
          system: systemStatus
        },
        version: process.env.npm_package_version || '0.1.0',
        environment: process.env.NODE_ENV || 'development'
      };
      
      const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(healthStatus);
    } catch (error) {
      logger.error('Health check failed:', error);
      res.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Get detailed database status
   * @param req Request object
   * @param res Response object
   */
  async getDatabaseStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = await this.checkDatabaseConnection();
      
      // Get connection pool statistics if available
      const pool = (sequelize as any).connectionManager.pool;
      const poolStatus = pool ? {
        size: pool.size,
        available: pool.available,
        used: pool.used,
        pending: pool.pending
      } : null;
      
      res.json({
        ...status,
        pool: poolStatus,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Database status check failed:', error);
      res.status(500).json({
        connected: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    }
  }
  
  /**
   * Get cache status
   * @param req Request object
   * @param res Response object
   */
  async getCacheStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = this.checkCacheStatus();
      res.json({
        ...status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Cache status check failed:', error);
      res.status(500).json({
        connected: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    }
  }
  
  /**
   * Check database connection
   * @returns Database connection status
   */
  private async checkDatabaseConnection(): Promise<any> {
    try {
      await sequelize.authenticate();
      return {
        connected: true,
        dialect: sequelize.getDialect(),
        host: (sequelize as any).config.host,
        database: (sequelize as any).config.database
      };
    } catch (error) {
      logger.error('Database connection check failed:', error);
      return {
        connected: false,
        error: error instanceof Error ? error.message : String(error),
        dialect: sequelize.getDialect(),
        host: (sequelize as any).config.host,
        database: (sequelize as any).config.database
      };
    }
  }
  
  /**
   * Check cache status
   * @returns Cache status
   */
  private checkCacheStatus(): any {
    try {
      // Perform a test operation
      const testKey = 'health:check:test';
      const testValue = `test-${Date.now()}`;
      
      // Set a test value
      cache.set(testKey, testValue);
      
      // Get the test value
      const retrievedValue = cache.get(testKey);
      
      // Validate and clean up
      const isWorking = retrievedValue === testValue;
      cache.del(testKey);
      
      // Get cache stats
      const stats = cache.stats();
      
      return {
        connected: true,
        working: isWorking,
        size: stats.size,
        type: 'in-memory'
      };
    } catch (error) {
      logger.error('Cache check failed:', error);
      return {
        connected: false,
        working: false,
        error: error instanceof Error ? error.message : String(error),
        type: 'in-memory'
      };
    }
  }
  
  /**
   * Get system status information
   * @returns System status
   */
  private getSystemStatus(): any {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    return {
      uptime: uptime,
      uptimeFormatted: this.formatUptime(uptime),
      memory: {
        rss: this.formatBytes(memoryUsage.rss),
        heapTotal: this.formatBytes(memoryUsage.heapTotal),
        heapUsed: this.formatBytes(memoryUsage.heapUsed),
        external: this.formatBytes(memoryUsage.external)
      },
      cpu: {
        cores: os.cpus().length,
        model: os.cpus()[0].model,
        loadAvg: os.loadavg()
      },
      platform: {
        type: os.type(),
        release: os.release(),
        arch: os.arch()
      },
      node: {
        version: process.version,
        env: process.env.NODE_ENV || 'development'
      }
    };
  }
  
  /**
   * Format uptime into human-readable format
   * @param uptime Uptime in seconds
   * @returns Formatted uptime string
   */
  private formatUptime(uptime: number): string {
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }
  
  /**
   * Format bytes into human-readable format
   * @param bytes Bytes
   * @returns Formatted bytes string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export default new HealthController();