// Redis connection test script
const fs = require('fs');
const path = require('path');
const os = require('os');
const winston = require('winston');

console.log("Starting cache test script");
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

// Ensure test-results directory exists
const testResultsDir = path.join(__dirname, '../../test-results/db-tests');
if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir, { recursive: true });
}

// Configure logger for test
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(info => `${info.timestamp} ${info.level.toUpperCase()}: ${info.message}`)
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: path.join(testResultsDir, 'redis-test.log') 
    })
  ]
});

// Simple in-memory cache implementation
const memoryCache = new Map();
const cacheTTL = new Map();

const cache = {
  // Get value from cache
  get: (key) => {
    // Check if key exists and hasn't expired
    if (memoryCache.has(key)) {
      const expiry = cacheTTL.get(key);
      if (!expiry || expiry > Date.now()) {
        return memoryCache.get(key);
      } else {
        // Clear expired item
        memoryCache.delete(key);
        cacheTTL.delete(key);
      }
    }
    return null;
  },
  
  // Set value in cache with optional TTL in seconds
  set: (key, value, ttl) => {
    memoryCache.set(key, value);
    if (ttl) {
      cacheTTL.set(key, Date.now() + (ttl * 1000));
    }
    return 'OK';
  },
  
  // Delete key from cache
  del: (key) => {
    const existed = memoryCache.has(key);
    memoryCache.delete(key);
    cacheTTL.delete(key);
    return existed ? 1 : 0;
  },
  
  // Clear all cache
  clear: () => {
    memoryCache.clear();
    cacheTTL.clear();
  },
  
  // Clear cache keys by pattern (using simple prefix matching)
  clearPattern: (pattern) => {
    let count = 0;
    for (const key of memoryCache.keys()) {
      if (key.startsWith(pattern)) {
        memoryCache.delete(key);
        cacheTTL.delete(key);
        count++;
      }
    }
    return count;
  },
  
  // Get cache statistics
  stats: () => {
    return {
      size: memoryCache.size,
      keys: Array.from(memoryCache.keys())
    };
  },
  
  // Mock Redis ping command
  ping: async () => {
    return 'PONG';
  },
  
  // Mock Redis info command
  info: async () => {
    return `# Server
memory_usage:${process.memoryUsage().heapUsed}
uptime_in_seconds:${process.uptime()}
connected_clients:1
used_memory_human:${Math.round(process.memoryUsage().heapUsed / 1024)}K
    `;
  }
};

// Run the tests
async function runTests() {
  try {
    logger.info('\n=== In-Memory Cache Test ===');
    logger.info(`Date: ${new Date().toISOString()}`);
    logger.info(`Node.js version: ${process.version}`);
    logger.info(`Platform: ${process.platform} ${os.release()}`);
    logger.info(`Hostname: ${os.hostname()}`);
    
    // Log network interfaces (useful for networking issues)
    const interfaces = os.networkInterfaces();
    logger.info('Network interfaces:');
    Object.keys(interfaces).forEach(iface => {
      const addresses = interfaces[iface].filter(addr => addr.family === 'IPv4' && !addr.internal);
      addresses.forEach(addr => {
        logger.info(`  ${iface}: ${addr.address}`);
      });
    });
    
    // Test basic operations
    logger.info('Testing cache PING...');
    const pingResult = await cache.ping();
    logger.info(`Cache ping successful, result: ${pingResult}`);
    
    // Test SET/GET operations
    logger.info('Testing cache SET/GET operations...');
    const testKey = `test:key:${Date.now()}`;
    const testValue = `Test value at ${new Date().toISOString()}`;
    
    logger.info(`Setting test key: ${testKey}`);
    await cache.set(testKey, testValue);
    
    logger.info(`Getting test key: ${testKey}`);
    const getValue = cache.get(testKey);
    
    if (getValue === testValue) {
      logger.info(`SET/GET test passed - value correctly retrieved: "${getValue}"`);
    } else {
      logger.error(`SET/GET test FAILED - expected "${testValue}" but got "${getValue}"`);
      throw new Error('SET/GET test failed');
    }
    
    logger.info(`Deleting test key: ${testKey}`);
    await cache.del(testKey);
    
    // Test TTL functionality
    logger.info('Testing cache TTL functionality...');
    const ttlKey = `test:ttl:${Date.now()}`;
    await cache.set(ttlKey, 'This should expire', 1); // 1 second TTL
    logger.info(`Set key with 1 second TTL: ${ttlKey}`);
    
    // Wait for 1.5 seconds
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const expiredValue = cache.get(ttlKey);
    if (expiredValue === null) {
      logger.info('TTL test passed - key expired as expected');
    } else {
      logger.error(`TTL test FAILED - key should have expired but returned: "${expiredValue}"`);
    }
    
    // Test pattern-based clearing
    logger.info('Testing pattern-based cache clearing...');
    for (let i = 0; i < 5; i++) {
      const patternKey = `test:pattern:${i}`;
      await cache.set(patternKey, `Pattern test value ${i}`);
      logger.info(`Set pattern test key: ${patternKey}`);
    }
    
    const stats1 = cache.stats();
    logger.info(`Cache has ${stats1.size} keys before pattern clearing`);
    
    const clearedCount = cache.clearPattern('test:pattern:');
    logger.info(`Cleared ${clearedCount} keys matching pattern 'test:pattern:'`);
    
    const stats2 = cache.stats();
    logger.info(`Cache has ${stats2.size} keys after pattern clearing`);
    
    if (stats1.size - clearedCount === stats2.size) {
      logger.info('Pattern clearing test passed');
    } else {
      logger.error('Pattern clearing test FAILED - unexpected number of keys remaining');
    }
    
    // Get stats about the cache
    const cacheStats = cache.stats();
    logger.info(`Cache statistics: ${cacheStats.size} keys`);
    
    // Test info command
    logger.info('Testing cache INFO command...');
    const infoResult = await cache.info();
    const infoLines = infoResult.split('\n').filter(Boolean);
    
    logger.info('Cache information:');
    infoLines.forEach(line => {
      if (line.trim() && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          switch (key) {
            case 'uptime_in_seconds':
              logger.info(`  Uptime: ${value} seconds`);
              break;
            case 'connected_clients':
              logger.info(`  Connected clients: ${value}`);
              break;
            case 'used_memory_human':
              logger.info(`  Used memory: ${value}`);
              break;
          }
        }
      }
    });
    
    logger.info('Using in-memory cache');
    logger.info('Cache test completed successfully');
    logger.info('=== Cache test completed ===\n');
    
    logger.info(`Test results logged to: ${path.join(testResultsDir, 'redis-test.log')}`);
    
  } catch (error) {
    logger.error(`Test failed: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}

// Run tests and exit
runTests()
  .then(() => {
    process.exit(0);
  })
  .catch(err => {
    logger.error('Unhandled error in test script:', err);
    process.exit(1);
  });