/**
 * Database Connection Manager
 * 
 * This module handles PostgreSQL database connections with Sequelize ORM.
 * Features:
 * - Connection pooling
 * - Automatic reconnection with exponential backoff
 * - Environment detection (Docker vs local)
 * - Health checks and connection validation
 */

import { Sequelize, Options } from 'sequelize';
import winston from 'winston';
import fs from 'fs';
import path from 'path';

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) => {
      return `${timestamp} ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: path.join(process.cwd(), 'logs', 'database.log'),
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

// Connection configuration
const MAX_CONNECTION_RETRIES = 5;
const RETRY_DELAY_MS = 2000;
const CONNECTION_TIMEOUT_MS = 15000;
const POOL_MAX = 10;
const POOL_MIN = 0;
const POOL_ACQUIRE_TIMEOUT_MS = 30000;
const POOL_IDLE_TIMEOUT_MS = 10000;

// Error type definitions for better error handling
enum ConnectionErrorType {
  AUTHENTICATION = 'authentication',
  NETWORK = 'network',
  TIMEOUT = 'timeout',
  RESOURCE = 'resource',
  UNKNOWN = 'unknown'
}

/**
 * Determine the type of database connection error
 */
function getErrorType(error: any): ConnectionErrorType {
  if (!error) return ConnectionErrorType.UNKNOWN;
  
  // Extract error details
  const errorMessage = error.message || '';
  const errorCode = error.original?.code || '';
  
  // Authentication errors
  if (
    errorCode === '28P01' || // Invalid password
    errorCode === '28000' || // Invalid authorization
    errorMessage.includes('authentication failed')
  ) {
    return ConnectionErrorType.AUTHENTICATION;
  }
  
  // Network errors
  if (
    errorCode === 'ECONNREFUSED' ||
    errorCode === 'EHOSTUNREACH' ||
    errorCode === 'ENETUNREACH' ||
    errorCode === 'ETIMEDOUT' ||
    errorMessage.includes('connect ECONNREFUSED')
  ) {
    return ConnectionErrorType.NETWORK;
  }
  
  // Timeout errors
  if (
    errorCode === 'ETIMEDOUT' ||
    errorMessage.includes('Connection timed out')
  ) {
    return ConnectionErrorType.TIMEOUT;
  }
  
  // Resource errors (too many connections, out of memory, etc.)
  if (
    errorCode === '53300' || // Too many connections
    errorCode === '53200' || // Out of memory
    errorCode === '53100'    // Disk full
  ) {
    return ConnectionErrorType.RESOURCE;
  }
  
  return ConnectionErrorType.UNKNOWN;
}

/**
 * Sequelize database connection class
 */
class Database {
  private static instance: Database;
  public sequelize: Sequelize;
  private retries: number = 0;
  private connected: boolean = false;
  
  /**
   * Check if running in Docker environment
   */
  private isDockerEnvironment(): boolean {
    return process.env.DOCKER_ENV === 'true' || 
           Boolean(process.env.DOCKER_CONTAINER) || 
           Boolean(process.env.KUBERNETES_SERVICE_HOST);
  }

  /**
   * Get database configuration from environment variables
   */
  private getConfig(): Options {
    const databaseUrl = process.env.DATABASE_URL;
    const useSSL = process.env.DB_SSL === 'true';
    const isDocker = this.isDockerEnvironment();
    
    // Log environment context for debugging
    logger.info(`Database environment: Docker=${isDocker}, SSL=${useSSL}`);
    
    // Use DATABASE_URL if available
    if (databaseUrl) {
      logger.info('Using DATABASE_URL for connection');
      return {
        dialect: 'postgres',
        logging: (msg) => logger.debug(msg),
        dialectOptions: {
          ssl: useSSL ? {
            require: true,
            rejectUnauthorized: false
          } : undefined,
          connectTimeout: CONNECTION_TIMEOUT_MS
        },
        pool: {
          max: POOL_MAX,
          min: POOL_MIN,
          acquire: POOL_ACQUIRE_TIMEOUT_MS,
          idle: POOL_IDLE_TIMEOUT_MS
        },
        retry: {
          max: 3,
          match: [/Deadlock/i]
        }
      };
    }
    
    // Determine host based on environment
    const host = isDocker ? 'postgres' : (process.env.DB_HOST || 'localhost');
    
    logger.info(`Using database host: ${host} (DB_HOST=${process.env.DB_HOST})`);
    
    // Otherwise use individual connection parameters
    return {
      host: host,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'psscript',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      dialect: 'postgres',
      logging: (msg) => logger.debug(msg),
      dialectOptions: {
        ssl: useSSL ? {
          require: true,
          rejectUnauthorized: false
        } : undefined,
        connectTimeout: CONNECTION_TIMEOUT_MS
      },
      pool: {
        max: POOL_MAX,
        min: POOL_MIN,
        acquire: POOL_ACQUIRE_TIMEOUT_MS,
        idle: POOL_IDLE_TIMEOUT_MS
      },
      retry: {
        max: 3,
        match: [/Deadlock/i]
      }
    };
  }
  
  private constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    const config = this.getConfig();
    
    if (databaseUrl) {
      this.sequelize = new Sequelize(databaseUrl, config);
      logger.info('Initialized Sequelize connection using DATABASE_URL');
    } else {
      this.sequelize = new Sequelize(config);
      logger.info('Initialized Sequelize connection using individual connection parameters');
    }
    
    // Set connection status flag
    this.connected = false;
    this.retries = 0;
    
    // Log connection status
    logger.info('Database connection initialized');
  }
  
  /**
   * Get Database singleton instance
   */
  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }
  
  /**
   * Initialize database connection with advanced retry logic and diagnostics
   */
  public async connect(): Promise<void> {
    try {
      // Log detailed connection attempt with configuration summary
      const config = this.sequelize.config;
      logger.info(`Connecting to database at ${config.host}:${config.port}/${config.database}...`);
      
      // Add connection metadata for diagnostics
      const connectionMeta = {
        timestamp: new Date().toISOString(),
        host: config.host,
        database: config.database,
        dockerEnv: this.isDockerEnvironment(),
        retry: this.retries,
        nodeEnv: process.env.NODE_ENV
      };
      
      // Log connection metadata for diagnostics
      logger.debug(`Connection attempt metadata: ${JSON.stringify(connectionMeta)}`);
      
      // First try a TCP connection to database server
      try {
        const net = require('net');
        const socket = new net.Socket();
        
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            socket.destroy();
            reject(new Error(`TCP connection to ${config.host}:${config.port} timed out`));
          }, CONNECTION_TIMEOUT_MS / 2);
          
          socket.connect(config.port, config.host, () => {
            clearTimeout(timeout);
            socket.destroy();
            logger.debug(`TCP connection to ${config.host}:${config.port} successful`);
            resolve();
          });
          
          socket.on('error', (err) => {
            clearTimeout(timeout);
            socket.destroy();
            reject(err);
          });
        });
        
        logger.info('TCP connection successful, proceeding with authentication');
      } catch (tcpError: any) {
        logger.warn(`TCP connection failed: ${tcpError.message}`);
        // Continue with Sequelize authentication anyway
      }
      
      // Authenticate with Sequelize
      const authStartTime = Date.now();
      await this.sequelize.authenticate();
      const authDuration = Date.now() - authStartTime;
      
      // Update connection status
      this.connected = true;
      this.retries = 0;
      logger.info(`Database connection established successfully (${authDuration}ms)`);
      
      // Check connection performance - warn if slow
      if (authDuration > 1000) {
        logger.warn(`Database connection is slow (${authDuration}ms) - this may impact application performance`);
      }
      
      // Create migrations table if it doesn't exist
      await this.createMigrationsTable();
      
      // Test a simple query
      try {
        const queryStartTime = Date.now();
        await this.sequelize.query('SELECT 1 as test');
        const queryDuration = Date.now() - queryStartTime;
        logger.debug(`Test query completed in ${queryDuration}ms`);
      } catch (queryError: any) {
        logger.warn(`Test query failed: ${queryError.message}`);
      }
    } catch (error: any) {
      this.connected = false;
      const errorType = getErrorType(error);
      
      // Enhanced error logging with context
      logger.error(`Database connection failed (${errorType}): ${error.message}`);
      if (error.original) {
        logger.error(`Original error: ${error.original.message || 'Unknown'}`);
        if (error.original.code) {
          logger.error(`Error code: ${error.original.code}`);
        }
      }
      
      // Detailed connection troubleshooting
      if (this.isDockerEnvironment()) {
        logger.error('Running in Docker environment - check container networking and service discovery');
      }
      
      if (this.retries < MAX_CONNECTION_RETRIES) {
        // Calculate exponential backoff delay with jitter for distributed systems
        const baseDelay = RETRY_DELAY_MS * Math.pow(2, this.retries);
        const jitter = Math.floor(Math.random() * 1000); // Add up to 1 second of jitter
        const delay = baseDelay + jitter;
        this.retries++;
        
        logger.info(`Retrying connection (attempt ${this.retries}/${MAX_CONNECTION_RETRIES}) in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // On specific retry counts, try additional diagnostics
        if (this.retries === 3) {
          logger.info('Running connection diagnostics...');
          try {
            // Check if we can resolve the hostname
            const dns = require('dns');
            const config = this.sequelize.config;
            dns.lookup(config.host, (err: any, address: string) => {
              if (err) {
                logger.error(`DNS resolution failed for ${config.host}: ${err.message}`);
              } else {
                logger.info(`DNS resolution successful: ${config.host} resolves to ${address}`);
              }
            });
          } catch (diagError) {
            logger.error('Diagnostics failed:', diagError);
          }
        }
        
        return this.connect();
      } else {
        logger.error(`Maximum connection retries (${MAX_CONNECTION_RETRIES}) exceeded`);
        
        // Provide specific error guidance based on error type
        if (errorType === ConnectionErrorType.AUTHENTICATION) {
          logger.error('Authentication failed. Check your database credentials in .env file or environment variables.');
        } else if (errorType === ConnectionErrorType.NETWORK) {
          logger.error('Network error. Check if:');
          logger.error('1. The database server is running');
          logger.error('2. The host/port is correct');
          logger.error('3. Network connectivity is available (especially in Docker/K8s environments)');
          logger.error('4. Firewall rules allow the connection');
        } else if (errorType === ConnectionErrorType.TIMEOUT) {
          logger.error('Connection timeout. The database server might be overloaded or network latency is high.');
        } else if (errorType === ConnectionErrorType.RESOURCE) {
          logger.error('Resource error. The database server might have reached connection limits or is out of resources.');
        }
        
        // Suggest potential fixes
        logger.error('Potential fixes:');
        logger.error('- Check database server logs');
        logger.error('- Verify environment variables (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)');
        logger.error('- Check network connectivity between application and database');
        
        throw error;
      }
    }
  }
  
  /**
   * Create migrations tracking table if it doesn't exist
   */
  private async createMigrationsTable(): Promise<void> {
    try {
      await this.sequelize.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      logger.info('Migrations tracking table created or verified');
    } catch (error: any) {
      logger.error(`Failed to create migrations table: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Check database health with detailed diagnostics
   * @returns {Promise<Object>} Health check results with diagnostics
   */
  public async healthCheck(): Promise<{ 
    healthy: boolean; 
    responseTime?: number; 
    error?: string; 
    connectionInfo?: any;
    diagnostics?: any;
  }> {
    const startTime = Date.now();
    
    try {
      // Get connection info for diagnostics
      const config = this.sequelize.config;
      const connectionInfo = {
        host: config.host,
        port: config.port,
        database: config.database,
        connected: this.connected,
        isDocker: this.isDockerEnvironment()
      };
      
      // Simple query to test connection
      const result = await this.sequelize.query('SELECT 1 as test');
      const responseTime = Date.now() - startTime;
      
      // Run query to get database stats
      let diagnostics = {};
      try {
        const statsQuery = await this.sequelize.query(`
          SELECT 
            current_database() as database,
            current_timestamp as server_time,
            version() as version,
            pg_size_pretty(pg_database_size(current_database())) as db_size,
            (SELECT count(*) FROM pg_stat_activity) as active_connections
        `);
        
        diagnostics = statsQuery[0][0];
      } catch (diagError) {
        logger.debug(`Could not fetch database diagnostics: ${diagError}`);
      }
      
      // Update connection status
      this.connected = true;
      
      // Warn if query is slow
      if (responseTime > 500) {
        logger.warn(`Database health check is slow (${responseTime}ms)`);
      }
      
      return {
        healthy: true,
        responseTime,
        connectionInfo,
        diagnostics
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      this.connected = false;
      
      logger.error(`Health check failed (${responseTime}ms): ${error.message}`);
      
      // Try to get additional error details
      const errorDetails = { 
        message: error.message,
        type: error.name,
        code: error.original?.code
      };
      
      return {
        healthy: false,
        responseTime,
        error: error.message,
        connectionInfo: {
          host: this.sequelize.config.host,
          port: this.sequelize.config.port,
          database: this.sequelize.config.database,
          connected: false,
          isDocker: this.isDockerEnvironment()
        },
        diagnostics: {
          error: errorDetails,
          retries: this.retries
        }
      };
    }
  }
  
  /**
   * Close database connection
   */
  public async close(): Promise<void> {
    try {
      await this.sequelize.close();
      logger.info('Database connection closed');
    } catch (error) {
      logger.error(`Error closing database connection: ${error}`);
      throw error;
    }
  }
}

// Create and export database instance
const db = Database.getInstance();
export const sequelize = db.sequelize;

// Track connection events for reusability in other modules
export const connectionEvents = {
  connected: false,
  retryCount: 0,
  lastError: null
};

// Export database connection info for diagnostics
export const dbConnectionInfo = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'psscript',
  user: process.env.DB_USER || 'postgres'
};

export default db;