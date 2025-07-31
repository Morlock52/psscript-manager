import express from 'express';
import logger from '../utils/logger';
import { sequelize, dbConnectionInfo, connectionEvents } from '../database/connection';
import { QueryTypes } from 'sequelize';
import dns from 'dns';
import net from 'net';
import os from 'os';
import { cache } from '../index';
import { 
  getCache, 
  setCache, 
  deleteCache, 
  invalidateByPattern, 
  persistCache, 
  loadCache 
} from '../utils/redis';

// Constants for cache health checks
// These match the values defined in index.ts
const MAX_CACHE_ITEMS = 10000; // Maximum number of items to store in cache before eviction
const MAX_MEMORY_USAGE = process.env.MAX_CACHE_MEMORY ? parseInt(process.env.MAX_CACHE_MEMORY, 10) : 500 * 1024 * 1024; // 500MB default
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

const router = express.Router();

// Enhanced comprehensive health check with detailed diagnostics
router.get('/', async (req, res) => {
  let dbStatus: string = 'disconnected';
  let authErrorMessage: string = '';
  let tables: string[] = [];
  let dbDiagnostics = {};
  
  try {
    // Import database instance
    const db = require('../database/connection').default;
    
    // Use enhanced database health check with diagnostics
    try {
      const healthResult = await db.healthCheck();
      
      dbStatus = healthResult.healthy ? 'connected' : 'disconnected';
      dbDiagnostics = {
        responseTime: healthResult.responseTime,
        connectionInfo: healthResult.connectionInfo,
        serverInfo: healthResult.diagnostics
      };
      
      if (!healthResult.healthy && healthResult.error) {
        authErrorMessage = healthResult.error;
        logger.error(`Database health check failed: ${healthResult.error}`);
      } else {
        logger.info(`Database health check successful (${healthResult.responseTime}ms)`);
      }
    } catch (error: any) {
      logger.error('Database health check failed: ' + error.message);
      dbStatus = 'disconnected';
      authErrorMessage = error.message;
    }
    
    // Only try to fetch tables if the database is connected
    if (dbStatus === 'connected') {
      try {
        const results = await sequelize.query(
          "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
          { type: QueryTypes.SELECT }
        );
        tables = results.map((r: any) => r.table_name as string);
        logger.info("Health check - fetched tables: " + tables.join(", "));
      } catch (error: any) {
        logger.error("Error fetching tables in health endpoint: " + error.message);
        // Do not fail the entire request if table fetching fails
        tables = [];
      }
    }
    
    // Check in-memory cache status
    let cacheStatus = 'connected';
    let cacheMetrics = {};
    
    try {
      // Get cache statistics
      const cacheStats = cache.stats();
      
      // Get heap memory usage
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
      const cacheMemoryMB = Math.round(cacheStats.memoryEstimate / 1024 / 1024);
      
      cacheMetrics = {
        size: cacheStats.size,
        keys: cacheStats.keys.slice(0, 10), // Show first 10 keys
        hitRatio: cacheStats.hitRatio,
        memoryUsage: {
          heapUsed: `${heapUsedMB}MB`,
          heapTotal: `${heapTotalMB}MB`,
          cacheEstimate: `${cacheMemoryMB}MB`,
          cachePercentage: `${Math.round((cacheStats.memoryEstimate / memoryUsage.heapUsed) * 100)}%`
        },
        topHits: cacheStats.topHits.slice(0, 3) // Top 3 most accessed keys
      };
      
      logger.info('Health check - In-memory cache statistics retrieved successfully');
    } catch (cacheError: any) {
      const errorMessage = cacheError instanceof Error ? cacheError.message : String(cacheError);
      logger.error('Cache statistics check failed:', errorMessage);
      cacheStatus = 'error';
      
      cacheMetrics = { 
        error: 'Failed to get cache metrics'
      };
    }
    
    // Get environment information
    const envInfo = {
      nodeEnv: process.env.NODE_ENV || 'development',
      dockerEnv: process.env.DOCKER_ENV === 'true',
      port: process.env.PORT || '4001'
    };
    
    // Check if we're running in Docker
    let isDocker = false;
    try {
      // Check for docker environment variable
      isDocker = process.env.DOCKER_ENV === 'true' || 
                Boolean(process.env.DOCKER_CONTAINER) || 
                Boolean(process.env.KUBERNETES_SERVICE_HOST);
      
      // Additional Docker detection logic
      if (!isDocker) {
        const fs = require('fs');
        // Check for .dockerenv file
        if (fs.existsSync('/.dockerenv')) {
          isDocker = true;
        } else {
          // Check for docker in cgroups
          const contents = fs.readFileSync('/proc/self/cgroup', 'utf8');
          isDocker = contents.includes('docker');
        } 
      }
    } catch (err) {
      // Ignore error - likely not in Docker
    }
    
    // Always return a valid response
    return res.status(200).json({
      dbStatus: dbStatus,
      cacheStatus: cacheStatus,
      status: dbStatus === 'connected' ? 'healthy' : 'degraded',
      message: authErrorMessage ? `DB: ${authErrorMessage}` : '',
      time: new Date().toISOString(),
      uptime: process.uptime(),
      tables: tables.length > 0 ? tables : undefined,
      cache: cacheMetrics,
      database: dbDiagnostics,
      environment: envInfo,
      isDocker: isDocker,
      platform: process.platform,
      nodeVersion: process.version,
      hostname: os.hostname()
    });
  } catch (error: any) {
    // Fallback error handling to ensure we always return a valid JSON response
    logger.error('Uncaught error in health check endpoint: ' + error.message);
    return res.status(500).json({
      dbStatus: 'error',
      status: 'error',
      message: error.message,
      time: new Date().toISOString()
    });
  }
});

// Get detailed database connection status information
router.get('/db/status', async (req, res) => {
  try {
    // Import database instance
    const db = require('../database/connection').default;
    
    // Get basic connection info
    const isConnected = db.healthCheck ? (await db.healthCheck()).healthy : false;
    const lastConnect = null; // We'll need to add this to the DB class
    
    // Get database info if connected
    let dbVersion = null;
    let dbTime = null;
    let pid = null;
    let connectionDuration = null;
    let dbProcessInfo = null;
    let queriesExecuted = null;
    let idleConnections = null;
    
    // Calculate time since last connection
    if (lastConnect) {
      connectionDuration = Date.now() - lastConnect;
    }
    
    if (isConnected) {
      try {
        // Get database server information
        const dbInfo = await sequelize.query(
          `SELECT version() as version, 
           now() as time, 
           pg_backend_pid() as pid,
           (SELECT count(*) FROM pg_stat_activity) as connections,
           (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle') as idle_connections,
           current_setting('max_connections') as max_connections`,
          { type: QueryTypes.SELECT }
        );
        
        if (dbInfo && dbInfo.length > 0) {
          const info = dbInfo[0] as Record<string, any>;
          dbVersion = info.version;
          dbTime = info.time;
          pid = info.pid;
          
          // Get process information
          try {
            const processInfo = await sequelize.query(
              "SELECT datname, usename, application_name, client_addr, backend_start, state, wait_event_type, wait_event, query FROM pg_stat_activity WHERE pid = $pid LIMIT 1",
              { 
                type: QueryTypes.SELECT,
                bind: { pid }
              }
            );
            
            if (processInfo && processInfo.length > 0) {
              dbProcessInfo = processInfo[0];
            }
            
            // Get additional query statistics
            const queryStats = await sequelize.query(
              "SELECT sum(xact_commit + xact_rollback) as transactions FROM pg_stat_database",
              { type: QueryTypes.SELECT }
            );
            
            if (queryStats && queryStats.length > 0) {
              const stats = queryStats[0] as Record<string, any>;
              queriesExecuted = stats.transactions;
            }
            
            const info = dbInfo[0] as Record<string, any>;
            idleConnections = info.idle_connections;
          } catch (err: unknown) {
            const error = err as Error;
            logger.warn(`Unable to get database process information: ${error.message}`);
          }
        }
      } catch (err: unknown) {
        const error = err as Error;
        logger.warn(`Unable to get database server information: ${error.message}`);
      }
    }
    
    // Get comprehensive status info
    const statusInfo = {
      connected: isConnected,
      lastSuccessfulConnection: lastConnect ? new Date(lastConnect).toISOString() : null,
      connectionDuration: connectionDuration ? Math.round(connectionDuration / 1000) : null,
      connectionAttempts: 0, // Placeholder
      consecutiveFailures: 0, // Placeholder
      tables: [],
      lastError: null,
      dbInfo: {
        version: dbVersion,
        time: dbTime,
        pid: pid,
        processInfo: dbProcessInfo,
        queriesExecuted,
        idleConnections
      },
      config: dbConnectionInfo
    };

    res.json(statusInfo);
  } catch (error: any) {
    logger.error(`Error in database status endpoint: ${error.message}`);
    res.status(500).json({
      error: error.message,
      status: 'error'
    });
  }
});

// Dedicated network testing endpoint
router.get('/network-test', async (req, res) => {
  const dbConfig = dbConnectionInfo;
  const results: any = {
    host: dbConfig.host,
    port: dbConfig.port,
    networkInterfaces: {},
    dnsResolution: null,
    portConnectivity: null,
    tcpInfo: null,
    time: new Date().toISOString()
  };
  
  try {
    // Get network interfaces
    const interfaces = os.networkInterfaces();
    for (const [name, netInterface] of Object.entries(interfaces)) {
      if (netInterface) {
        const ipv4Addresses = netInterface
          .filter(details => details.family === 'IPv4')
          .map(details => ({
            address: details.address,
            internal: details.internal
          }));
        
        if (ipv4Addresses.length > 0) {
          results.networkInterfaces[name] = ipv4Addresses;
        }
      }
    }
    
    // Test DNS resolution
    if (dbConfig.host !== 'localhost' && !net.isIP(dbConfig.host)) {
      try {
        const dnsStart = Date.now();
        const addresses = await new Promise<dns.LookupAddress[]>((resolve, reject) => {
          dns.lookup(dbConfig.host, { all: true }, (err, addresses) => {
            if (err) reject(err);
            else resolve(addresses);
          });
        });
        const dnsEnd = Date.now();
        
        results.dnsResolution = {
          success: true,
          addresses: addresses,
          time: dnsEnd - dnsStart,
          message: `Resolved ${dbConfig.host} to ${addresses.map(a => a.address).join(', ')}`
        };
      } catch (err) {
        results.dnsResolution = {
          success: false,
          error: (err as Error).message,
          message: `Failed to resolve hostname ${dbConfig.host}`
        };
      }
    } else {
      results.dnsResolution = {
        success: true,
        message: `Using ${dbConfig.host === 'localhost' ? 'localhost' : 'IP address directly'}, no DNS resolution needed`
      };
    }
    
    // Test port connectivity
    try {
      const portStart = Date.now();
      await new Promise<boolean>((resolve, reject) => {
        const socket = new net.Socket();
        const timeout = setTimeout(() => {
          socket.destroy();
          reject(new Error(`Timeout connecting to ${dbConfig.host}:${dbConfig.port}`));
        }, 5000);
        
        socket.connect(dbConfig.port, dbConfig.host, () => {
          clearTimeout(timeout);
          
          // Get socket info for diagnostics
          const tcpInfo = {
            localAddress: socket.localAddress,
            localPort: socket.localPort,
            remoteAddress: socket.remoteAddress,
            remotePort: socket.remotePort,
            bytesWritten: socket.bytesWritten,
            bytesRead: socket.bytesRead
          };
          
          results.tcpInfo = tcpInfo;
          
          socket.destroy();
          resolve(true);
        });
        
        socket.on('error', (err) => {
          clearTimeout(timeout);
          socket.destroy();
          reject(err);
        });
      });
      const portEnd = Date.now();
      
      results.portConnectivity = {
        success: true,
        time: portEnd - portStart,
        message: `Successfully connected to ${dbConfig.host}:${dbConfig.port}`
      };
    } catch (err) {
      results.portConnectivity = {
        success: false,
        error: (err as Error).message,
        message: `Failed to connect to ${dbConfig.host}:${dbConfig.port}`
      };
    }
    
    res.json(results);
  } catch (error: any) {
    logger.error(`Error in network test endpoint: ${error.message}`);
    res.status(500).json({
      error: error.message,
      status: 'error'
    });
  }
});

// Manual database connection management
router.post('/db/:action', async (req, res) => {
  const { action } = req.params;
  try {
    // Import database instance
    const db = require('../database/connection').default;
    
    if (action === 'disconnect') {
      try {
        await db.close();
        res.json({ dbStatus: 'disconnected', message: 'Database disconnected successfully' });
      } catch (closeError: any) {
        logger.error(`Error while disconnecting from database: ${closeError.message}`);
        res.status(500).json({ 
          error: closeError.message, 
          dbStatus: 'error',
          message: 'Failed to disconnect from database'
        });
      }
    } else if (action === 'connect') {
      try {
        await db.connect();
        res.json({ dbStatus: 'connected', message: 'Database connected successfully' });
      } catch (authError: any) {
        logger.error(`Error while connecting to database: ${authError.message}`);
        res.status(500).json({ 
          error: authError.message, 
          dbStatus: 'error',
          message: 'Failed to connect to database'
        });
      }
    } else if (action === 'validate') {
      try {
        // Use the healthCheck function from db
        const healthResult = await db.healthCheck();
        const isValid = healthResult.healthy;
        
        res.json({ 
          dbStatus: isValid ? 'connected' : 'disconnected',
          valid: isValid,
          message: isValid ? 'Database connection is valid' : 'Database connection is invalid',
          details: healthResult
        });
      } catch (validationError: any) {
        logger.error(`Error validating database connection: ${validationError.message}`);
        res.status(500).json({ 
          error: validationError.message, 
          dbStatus: 'error',
          message: 'Failed to validate database connection'
        });
      }
    } else {
      res.status(400).json({ 
        error: 'Invalid action', 
        dbStatus: 'error',
        message: `Action '${action}' is not supported. Valid actions: connect, disconnect, validate`
      });
    }
  } catch (error: any) {
    logger.error(`Unexpected error in /db/${action} endpoint: ${error.message}`);
    // Ensure we always send a JSON response even on uncaught errors
    res.status(500).json({ 
      error: error.message, 
      dbStatus: 'error',
      message: 'An unexpected error occurred'
    });
  }
});

// Comprehensive diagnostics endpoint
router.get('/diagnostics', async (req, res) => {
  try {
    // Import database instance
    const db = require('../database/connection').default;
    
    // System information
    const systemInfo = {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      hostname: os.hostname(),
      cpus: os.cpus().length,
      loadAvg: os.loadavg(),
      freeMemory: os.freemem(),
      totalMemory: os.totalmem()
    };
    
    // Network information
    const networkInfo = {
      interfaces: os.networkInterfaces()
    };
    
    // Database information
    let dbInfo = null;
    let dbConnections = null;
    let dbQueries = null;
    let dbTables = null;
    let isConnected = false;
    
    // Check DB health
    const healthResult = await db.healthCheck();
    isConnected = healthResult.healthy;
    
    if (isConnected) {
      try {
        // General database information
        const dbInfoResult = await sequelize.query(
          `SELECT version() as version, 
           now() as time, 
           current_database() as database,
           pg_size_pretty(pg_database_size(current_database())) as db_size,
           current_setting('max_connections') as max_connections`,
          { type: QueryTypes.SELECT }
        );
        
        if (dbInfoResult && dbInfoResult.length > 0) {
          dbInfo = dbInfoResult[0];
        }
        
        // Connection information
        const connectionResult = await sequelize.query(
          `SELECT count(*) as total_connections,
           count(*) FILTER (WHERE state = 'active') as active,
           count(*) FILTER (WHERE state = 'idle') as idle,
           count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
           count(*) FILTER (WHERE wait_event is not null) as waiting,
           extract(epoch from (now() - backend_start)) as max_connection_age_seconds
           FROM pg_stat_activity 
           WHERE backend_type = 'client backend'`,
          { type: QueryTypes.SELECT }
        );
        
        if (connectionResult && connectionResult.length > 0) {
          dbConnections = connectionResult[0];
        }
        
        // Query information
        const queryResult = await sequelize.query(
          `SELECT datname, 
           xact_commit as commits, 
           xact_rollback as rollbacks,
           blks_read, 
           blks_hit,
           tup_returned, 
           tup_fetched, 
           tup_inserted, 
           tup_updated, 
           tup_deleted
           FROM pg_stat_database 
           WHERE datname = current_database()`,
          { type: QueryTypes.SELECT }
        );
        
        if (queryResult && queryResult.length > 0) {
          dbQueries = queryResult[0];
        }
        
        // Table information (limited to 10 tables)
        const tableResult = await sequelize.query(
          `SELECT relname as table_name, 
           n_live_tup as row_count,
           pg_size_pretty(pg_relation_size(quote_ident(relname))) as size,
           seq_scan,
           idx_scan
           FROM pg_stat_user_tables
           ORDER BY n_live_tup DESC
           LIMIT 10`,
          { type: QueryTypes.SELECT }
        );
        
        if (tableResult && tableResult.length > 0) {
          dbTables = tableResult;
        }
      } catch (err: unknown) {
        const error = err as Error;
        logger.warn(`Unable to get detailed database information: ${error.message}`);
      }
    }
    
    // Connection pool information
    const poolInfo = {
      config: { max: 10, min: 0, idle: 10000, acquire: 30000 }, // Defaults
      status: isConnected ? 'connected' : 'disconnected'
    };
    
    // Combine all diagnostics
    const diagnostics = {
      time: new Date().toISOString(),
      system: systemInfo,
      network: networkInfo,
      database: {
        connected: isConnected,
        lastSuccessfulConnection: null, // We'll need to add this to the DB class
        info: dbInfo,
        connections: dbConnections,
        queries: dbQueries,
        tables: dbTables,
        pool: poolInfo,
        health: healthResult
      }
    };
    
    res.json(diagnostics);
  } catch (error: any) {
    logger.error(`Error in diagnostics endpoint: ${error.message}`);
    res.status(500).json({
      error: error.message,
      status: 'error',
      time: new Date().toISOString()
    });
  }
});

// Test cache persistence
router.get('/cache/persistence', async (req, res) => {
  try {
    const filePath = './cache-backup-test.json';
    
    // First check if we can persist the cache
    const beforeSize = cache.stats().size;
    const persistResult = await persistCache(filePath);
    
    if (!persistResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to persist cache',
        error: persistResult.error
      });
    }
    
    // Now clear the cache and verify it's empty
    cache.clear();
    const afterClearSize = cache.stats().size;
    
    if (afterClearSize !== 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to clear cache',
        beforeSize,
        afterClearSize
      });
    }
    
    // Now load the cache from the file
    const loadResult = await loadCache(filePath);
    
    if (!loadResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to load cache from file',
        error: loadResult.error
      });
    }
    
    // Verify the cache is loaded
    const afterLoadSize = cache.stats().size;
    
    // Run test with typed cache operations
    const testKey = 'typed:test:key';
    const testValue = { name: 'Test Object', value: Date.now() };
    
    // Test typed set operation
    const setResult = await setCache<typeof testValue>(testKey, testValue, 60);
    
    // Test typed get operation
    const getResult = await getCache<typeof testValue>(testKey);
    
    // Test delete operation
    const deleteResult = await deleteCache(testKey);
    
    res.json({
      success: true,
      message: 'Cache persistence test completed successfully',
      persistResult: {
        success: persistResult.success,
        filePath: persistResult.value
      },
      loadResult: {
        success: loadResult.success,
        filePath: loadResult.value
      },
      sizeBefore: beforeSize,
      sizeAfterClear: afterClearSize,
      sizeAfterLoad: afterLoadSize,
      typedCacheOperations: {
        set: setResult,
        get: getResult,
        delete: deleteResult
      }
    });
    
    // Try to clean up the test file
    try {
      const fs = require('fs');
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (cleanupError) {
      logger.error('Failed to clean up test file:', cleanupError);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Cache persistence test failed:', errorMessage);
    
    return res.status(500).json({
      success: false,
      message: 'Cache persistence test failed',
      error: errorMessage
    });
  }
});

// Enhanced Cache health check endpoint
router.get('/cache', async (req, res) => {
  try {
    // Get enhanced cache statistics with metrics
    const cacheStats = cache.stats();
    
    // Test cache with a simple set/get
    let readWriteTest = false;
    let readWriteError = null;
    let readWriteTime = 0;
    
    try {
      const testKey = 'health:check:test';
      const testValue = `test-${Date.now()}`;
      
      // Set a value in the cache and measure time
      const setStart = Date.now();
      cache.set(testKey, testValue, 60); // 60 seconds expiry
      const setEnd = Date.now();
      
      // Retrieve the value and measure time
      const getStart = Date.now();
      const retrievedValue = cache.get(testKey);
      const getEnd = Date.now();
      
      // Total operation time
      readWriteTime = (setEnd - setStart) + (getEnd - getStart);
      
      // Check if the retrieved value matches the original
      readWriteTest = testValue === retrievedValue;
      logger.info(`Cache diagnostics - Read/write test ${readWriteTest ? 'successful' : 'failed'} in ${readWriteTime}ms`);
      
      // Clean up by removing the test key
      cache.del(testKey);
    } catch (rwError) {
      readWriteError = rwError instanceof Error ? rwError.message : String(rwError);
      logger.error('Cache diagnostics - Read/write test failed:', readWriteError);
    }
    
    // Count different types of keys by prefix
    const keyTypes = cacheStats.keys.reduce((acc: Record<string, number>, key: string) => {
      // Check common key prefixes
      const prefix = key.split(':')[0] || 'other';
      acc[prefix] = (acc[prefix] || 0) + 1;
      return acc;
    }, {});
    
    // Calculate memory usage
    const memoryUsage = process.memoryUsage();
    const cacheMemoryPercentage = Math.round((cacheStats.memoryEstimate / memoryUsage.heapUsed) * 100);
    
    // Get the hottest keys (most accessed)
    const hotKeys = cacheStats.topHits.map(hit => ({
      key: hit.key,
      hits: hit.hits,
      accessFrequency: 'high'
    }));
    
    // Get the coldest keys (most missed)
    const coldKeys = cacheStats.topMisses.map(miss => ({
      key: miss.key,
      misses: miss.misses,
      accessFrequency: 'low'
    }));
    
    // Run stressful operation to measure performance
    let stressTestResult = null;
    try {
      const testItemCount = 100;
      const testItemSize = 1; // 1KB
      
      const stressStart = Date.now();
      
      // Create a test key with timestamp to avoid conflicts
      const stressTestKeyPrefix = `stress:test:${Date.now()}:`;
      
      // Generate random data
      const generateRandomString = (sizeKB: number) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        // 1KB is roughly 1000 characters
        const length = sizeKB * 1000;
        for (let i = 0; i < length; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };
      
      const testData = generateRandomString(testItemSize);
      
      // Add items to cache
      for (let i = 0; i < testItemCount; i++) {
        cache.set(`${stressTestKeyPrefix}${i}`, { 
          data: testData,
          index: i
        }, 30); // 30 seconds TTL
      }
      
      // Read back some random items
      const readItems = 20;
      for (let i = 0; i < readItems; i++) {
        const randomIndex = Math.floor(Math.random() * testItemCount);
        cache.get(`${stressTestKeyPrefix}${randomIndex}`);
      }
      
      const stressEnd = Date.now();
      const stressTime = stressEnd - stressStart;
      
      // Clean up stress test keys
      cache.clearPattern(stressTestKeyPrefix);
      
      stressTestResult = {
        success: true,
        itemsCreated: testItemCount,
        itemsRead: readItems,
        itemSizeKB: testItemSize,
        executionTimeMs: stressTime,
        opsPerSecond: Math.round((testItemCount + readItems) / (stressTime / 1000))
      };
    } catch (stressError) {
      stressTestResult = {
        success: false,
        error: stressError instanceof Error ? stressError.message : String(stressError)
      };
    }
    
    return res.status(200).json({
      status: 'connected',
      time: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      
      // Basic tests
      basicTest: {
        readWriteTest,
        readWriteError,
        readWriteTimeMs: readWriteTime
      },
      
      // Cache metrics
      metrics: {
        totalKeys: cacheStats.size,
        keysByType: keyTypes,
        hitRatio: cacheStats.hitRatio,
        errorsCount: Object.values(cacheStats.errors || {}).reduce((a, b) => a + b, 0),
        keysSample: cacheStats.keys.slice(0, 10)
      },
      
      // Memory usage
      memory: {
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        external: `${Math.round((memoryUsage.external || 0) / 1024 / 1024)} MB`,
        cacheEstimate: `${Math.round(cacheStats.memoryEstimate / 1024 / 1024)} MB`,
        cachePercentage: `${cacheMemoryPercentage}%`,
        maxAllowed: `${Math.round(MAX_MEMORY_USAGE / 1024 / 1024)} MB`,
      },
      
      // Performance metrics
      performance: {
        hotKeys,
        coldKeys,
        stressTest: stressTestResult,
        cpuUsage: process.cpuUsage(),
        resourceUsage: process.resourceUsage ? process.resourceUsage() : null
      },
      
      // Configuration
      config: {
        maxItems: MAX_CACHE_ITEMS,
        ttlCleanupInterval: CLEANUP_INTERVAL / 1000 + ' seconds',
        persistenceSupported: true
      },
      
      // Server info
      serverInfo: {
        platform: process.platform,
        nodeVersion: process.version,
        uptime: `${Math.floor(process.uptime())} seconds`
      }
    });
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Cache health check failed:', errorMessage);
    
    return res.status(500).json({
      status: 'error',
      message: errorMessage,
      time: new Date().toISOString()
    });
  }
});

export default router;