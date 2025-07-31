/**
 * Universal Database Connection Utility
 * Provides consistent database connection across all scripts and environments
 */
const { Sequelize } = require('sequelize');
const dns = require('dns');
const net = require('net');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { networkInterfaces } = require('os');

// Load environment variables if available
try {
  require('dotenv').config();
} catch (err) {
  // dotenv not available, continue with defaults
}

// Helper function for console logging with colors
const log = {
  info: (msg) => console.log(`\x1b[36m${msg}\x1b[0m`),
  success: (msg) => console.log(`\x1b[32m${msg}\x1b[0m`),
  warn: (msg) => console.log(`\x1b[33m${msg}\x1b[0m`),
  error: (msg) => console.log(`\x1b[31m${msg}\x1b[0m`)
};

// Detect environment (Docker vs local)
const isDocker = process.env.DOCKER_ENV === 'true';
const isProduction = process.env.NODE_ENV === 'production';

// Enhanced connection pooling settings
const DEFAULT_POOL_CONFIG = {
  max: parseInt(process.env.DB_POOL_MAX || '10'),  // Increased from 5
  min: parseInt(process.env.DB_POOL_MIN || '2'),   // Increased from 0
  idle: parseInt(process.env.DB_POOL_IDLE || '30000'),
  acquire: parseInt(process.env.DB_POOL_ACQUIRE || '60000'),
  evict: 30000, // Check for idle connections every 30 seconds
};

// Connection retry configuration
const MAX_CONNECTION_ATTEMPTS = global.__MAX_CONNECTION_ATTEMPTS__ || 5;
global.__MAX_CONNECTION_ATTEMPTS__ = MAX_CONNECTION_ATTEMPTS;
const RETRY_DELAY_MS = 5000;

// Connection timeout settings
const CONNECT_TIMEOUT = 10000;
const OPERATION_TIMEOUT = 30000;

// Cache successful connections
let connectionCache = null;
let connectionAttempts = 0;

// Database connection options with best practices
const getConnectionOptions = (host, logging = false, additionalOptions = {}) => ({
  host,
  port: parseInt(process.env.DB_PORT || '5432'),
  dialect: 'postgres',
  logging: logging ? console.log : false,
  pool: {
    ...DEFAULT_POOL_CONFIG,
    ...additionalOptions.pool,
  },
  dialectOptions: {
    // Connection timeout settings
    connectTimeout: CONNECT_TIMEOUT,
    statement_timeout: OPERATION_TIMEOUT,
    idle_in_transaction_session_timeout: OPERATION_TIMEOUT,
    
    // TCP keepalive to prevent connection dropping
    keepAlive: true,
    keepAliveInitialDelay: 5000,
    
    // Identify connection in pg_stat_activity
    application_name: 'psscript_app',
    
    // SSL options for production environments
    ...(isProduction && {
      ssl: {
        require: true,
        rejectUnauthorized: false // Set to true in strict environments with proper certificates
      }
    }),
  },
  retry: {
    match: [
      /ConnectionRefused/,
      /Connection terminated unexpectedly/,
      /Connection timed out/,
      /SequelizeConnectionRefusedError/,
      /SequelizeConnectionError/,
      /SequelizeTimeoutError/,
    ],
    max: 5,
    backoffBase: 1000,
    backoffExponent: 1.5,
  },
  ...additionalOptions
});

// Connection cache to avoid creating multiple connections
// Duplicate declarations removed as they are already declared above

/**
 * Get a database connection that works in both Docker and local environments
 * with enhanced reliability and connection pooling
 * @param {Object} options Additional Sequelize options
 * @returns {Promise<Sequelize>} A configured Sequelize instance
 */
async function getConnection(options = {}) {
  // If we already have a connection, return it
  if (connectionCache && connectionCache.authenticate) {
    try {
      // Quick verification that connection is still valid
      await connectionCache.authenticate({ timeout: 5000 });
      return connectionCache;
    } catch (err) {
      log.warn(`Cached connection no longer valid, creating new connection: ${err.message}`);
      connectionCache = null;
    }
  }

  if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
    log.error(`Maximum connection attempts (${MAX_CONNECTION_ATTEMPTS}) reached. Resetting counter and waiting before retry.`);
    connectionAttempts = 0;
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  connectionAttempts++;
  
  const db = process.env.DB_NAME || 'psscript';
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD || 'postgres';
  
  // Log connection attempt
  log.info(`Attempting database connection (attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS})...`);
  
  // Try Docker container first if we're in Docker environment
  if (isDocker) {
    try {
      const dockerHost = process.env.DB_HOST || 'postgres';
      
      // Test port connectivity first
      await testPortConnectivity(dockerHost, parseInt(process.env.DB_PORT || '5432'));
      
      // Create Sequelize instance
      const sequelize = new Sequelize(
        db, user, password, 
        getConnectionOptions(dockerHost, options.logging, options)
      );
      
      await sequelize.authenticate();
      log.success(`Connected to database in Docker container at ${dockerHost}`);
      
      connectionCache = sequelize;
      connectionAttempts = 0;
      return sequelize;
    } catch (err) {
      log.warn(`Docker connection failed: ${err.message}`);
      log.info('Falling back to localhost connection...');
    }
  }
  
  // Try localhost connection
  try {
    const sequelize = new Sequelize(
      db, user, password, 
      getConnectionOptions('localhost', options.logging, options)
    );
    
    await sequelize.authenticate();
    log.success('Connected to database at localhost');
    
    connectionCache = sequelize;
    connectionAttempts = 0;
    return sequelize;
  } catch (err) {
    // If localhost fails and we didn't try Docker yet, try Docker as fallback
    if (!isDocker) {
      try {
        log.info('Localhost connection failed, trying postgres container...');
        
        const sequelize = new Sequelize(
          db, user, password, 
          getConnectionOptions('postgres', options.logging, options)
        );
        
        await sequelize.authenticate();
        log.success('Connected to database in Docker container');
        
        connectionCache = sequelize;
        connectionAttempts = 0;
        return sequelize;
      } catch (dockerErr) {
        log.error(`Docker fallback connection also failed: ${dockerErr.message}`);
      }
    }
    
    // Both approaches failed
    log.error(`All database connection attempts failed: ${err.message}`);
    
    if (connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
      log.info(`Retrying connection (attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS})...`);
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s...
      const backoffTime = Math.min(1000 * Math.pow(2, connectionAttempts - 1), 30000);
      log.info(`Waiting ${backoffTime}ms before next attempt...`);
      await new Promise(resolve => setTimeout(resolve, backoffTime));
      return getConnection(options);
    }
    
    throw new Error('Could not connect to PostgreSQL database after multiple attempts');
  }
}

/**
 * Test TCP connectivity to database
 * @param {string} host Database host
 * @param {number} port Database port
 * @returns {Promise<boolean>} True if port is reachable
 */
async function testPortConnectivity(host, port) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error(`Connection to ${host}:${port} timed out`));
    }, 5000);
    
    socket.connect(port, host, () => {
      clearTimeout(timeout);
      socket.end();
      resolve(true);
    });
    
    socket.on('error', (err) => {
      clearTimeout(timeout);
      socket.destroy();
      reject(err);
    });
  });
}

/**
 * Verify database structure has all required tables
 * @param {Sequelize} sequelize Sequelize instance
 * @returns {Promise<string[]>} List of table names
 */
async function checkDatabaseTables(sequelize) {
  try {
    const tables = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    if (!tables || tables.length === 0) {
      log.warn('No tables found in database. Schema may need initialization.');
      return [];
    }
    
    const tableNames = tables.map(t => t.table_name);
    log.info(`Found ${tableNames.length} tables in database`);
    
    return tableNames;
  } catch (err) {
    log.error(`Error checking database tables: ${err.message}`);
    return [];
  }
}

/**
 * Check if pgvector extension is installed
 * @param {Sequelize} sequelize Sequelize instance
 * @returns {Promise<boolean>} True if extension is installed
 */
async function checkPgVectorExtension(sequelize) {
  try {
    const results = await sequelize.query(
      "SELECT * FROM pg_extension WHERE extname = 'vector'",
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    const isInstalled = results && results.length > 0;
    
    if (isInstalled) {
      log.success('pgvector extension is installed');
    } else {
      log.warn('pgvector extension is NOT installed (vector search features will be limited)');
    }
    
    return isInstalled;
  } catch (err) {
    log.error(`Error checking pgvector extension: ${err.message}`);
    return false;
  }
}

/**
 * Run comprehensive database diagnostics
 * @param {Sequelize} sequelize Sequelize instance
 * @returns {Promise<Object>} Diagnostics results
 */
async function runDiagnostics(sequelize) {
  const results = {
    connected: false,
    tables: [],
    pgvector: false,
    version: null,
    size: null,
    connectionPool: null,
    errors: []
  };
  
  try {
    // Test basic connection
    await sequelize.authenticate();
    results.connected = true;
    
    // Get PostgreSQL version
    const [versionResult] = await sequelize.query('SELECT version()');
    if (versionResult && versionResult[0]) {
      results.version = versionResult[0].version;
    }
    
    // Check database size
    const [sizeResult] = await sequelize.query(
      `SELECT pg_size_pretty(pg_database_size('${process.env.DB_NAME || 'psscript'}')) as size`
    );
    if (sizeResult && sizeResult[0]) {
      results.size = sizeResult[0].size;
    }
    
    // Check tables
    results.tables = await checkDatabaseTables(sequelize);
    
    // Check pgvector
    results.pgvector = await checkPgVectorExtension(sequelize);
    
    // Get connection pool stats
    const pool = sequelize.connectionManager.pool;
    results.connectionPool = {
      size: pool.size,
      available: pool.available,
      pending: pool.pending,
      max: pool.options.max,
      min: pool.options.min
    };
    
    // Additional database health metrics
    const [activeConnections] = await sequelize.query(
      "SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active'"
    );
    if (activeConnections && activeConnections[0]) {
      results.activeConnections = parseInt(activeConnections[0].count, 10);
    }
    
  } catch (err) {
    results.errors.push(err.message);
  }
  
  return results;
}

/**
 * Execute schema files to initialize database
 * @param {Sequelize} sequelize Sequelize instance
 * @param {string[]} filePaths Paths to SQL files to execute
 * @returns {Promise<boolean>} Success status
 */
async function executeSqlFiles(sequelize, filePaths) {
  const results = [];
  
  for (const filePath of filePaths) {
    try {
      log.info(`Executing SQL file: ${path.basename(filePath)}`);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      // Execute the SQL
      await sequelize.query(sql, { 
        type: Sequelize.QueryTypes.RAW,
        multipleStatements: true
      });
      
      results.push({
        file: path.basename(filePath),
        success: true
      });
    } catch (err) {
      log.error(`Error executing ${path.basename(filePath)}: ${err.message}`);
      
      results.push({
        file: path.basename(filePath),
        success: false,
        error: err.message
      });
    }
  }
  
  const allSucceeded = results.every(r => r.success);
  return allSucceeded;
}

/**
 * Close database connection and release pool
 * @param {Sequelize} sequelize Sequelize instance
 */
async function closeConnection(sequelize = null) {
  const conn = sequelize || connectionCache;
  if (conn) {
    try {
      log.info('Closing database connection...');
      await conn.close();
      if (conn === connectionCache) {
        connectionCache = null;
      }
      log.success('Database connection closed successfully');
    } catch (err) {
      log.error(`Error closing database connection: ${err.message}`);
    }
  }
}

/**
 * Reset the connection pool (useful when pool becomes unresponsive)
 */
async function resetConnectionPool() {
  if (connectionCache) {
    try {
      log.info('Resetting connection pool...');
      await connectionCache.connectionManager.pool.drain();
      await connectionCache.connectionManager.pool.clear();
      log.success('Connection pool reset successfully');
    } catch (err) {
      log.error(`Error resetting connection pool: ${err.message}`);
      // Force a full reconnection
      connectionCache = null;
    }
  }
}

// Export the utilities
module.exports = {
  getConnection,
  checkDatabaseTables,
  checkPgVectorExtension,
  runDiagnostics,
  executeSqlFiles,
  testPortConnectivity,
  closeConnection,
  resetConnectionPool
};