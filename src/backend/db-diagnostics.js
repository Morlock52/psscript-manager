/**
 * Comprehensive Database Diagnostics Script
 * ----------------------------------------
 * 
 * This script performs comprehensive diagnostics on the database connection,
 * collecting detailed information about:
 * - System environment
 * - Network interfaces and connectivity
 * - DNS resolution
 * - Database server configuration
 * - Connection pool health
 * - Table statistics and health
 * 
 * It also provides intelligent recommendations based on the diagnostics.
 */

const { Sequelize } = require('sequelize');
const { Client } = require('pg');
const os = require('os');
const fs = require('fs');
const net = require('net');
const dns = require('dns');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Setup logging
const timestamp = new Date().toISOString().replace(/:/g, '-');
const logFilePath = path.join(__dirname, 'logs', 'db-diagnostics.log');
const resultsPath = path.join(__dirname, 'test-results', 'db-diagnostics');

// Ensure directories exist
if (!fs.existsSync(path.join(__dirname, 'logs'))) {
  fs.mkdirSync(path.join(__dirname, 'logs'), { recursive: true });
}
if (!fs.existsSync(resultsPath)) {
  fs.mkdirSync(resultsPath, { recursive: true });
}

// Create a write stream for the log file
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

// Simple logging function
function log(level, message) {
  const entry = `${new Date().toISOString()} [${level.toUpperCase()}] ${message}\n`;
  logStream.write(entry);
  
  // Also output to console
  if (level === 'error') {
    console.error(message);
  } else {
    console.log(message);
  }
}

// Create a results object to store all diagnostics
const results = {
  timestamp: new Date().toISOString(),
  system: {},
  network: {},
  database: {},
  connection: {},
  recommendations: []
};

/**
 * Get database connection configuration
 */
function getDbConfig() {
  // Check for Docker environment
  const isDocker = process.env.DOCKER_ENV === 'true' || 
    process.env.DOCKER_CONTAINER || 
    process.env.KUBERNETES_SERVICE_HOST ||
    fs.existsSync('/.dockerenv');
  
  let host = process.env.DB_HOST || (isDocker ? 'postgres' : 'localhost');
  let port = parseInt(process.env.DB_PORT || '5432');
  let database = process.env.DB_NAME || 'psscript';
  let user = process.env.DB_USER || 'postgres';
  let password = process.env.DB_PASSWORD || 'postgres';
  let ssl = process.env.DB_SSL === 'true';
  
  // Check for DATABASE_URL (takes precedence if exists)
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    try {
      const match = databaseUrl.match(/postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
      if (match) {
        user = match[1];
        password = match[2];
        host = match[3];
        port = parseInt(match[4], 10);
        database = match[5];
        log('info', `Using database configuration from DATABASE_URL environment variable`);
      }
    } catch (err) {
      log('error', `Failed to parse DATABASE_URL: ${err.message}`);
    }
  }
  
  return {
    host,
    port,
    database,
    user,
    password,
    ssl,
    isDocker
  };
}

/**
 * Test TCP connectivity to the database server
 */
async function testTcpConnectivity(host, port) {
  return new Promise((resolve, reject) => {
    log('info', `Testing TCP connectivity to ${host}:${port}...`);
    
    const socket = new net.Socket();
    const timeout = setTimeout(() => {
      socket.destroy();
      resolve({
        success: false,
        error: `Connection timed out after 5 seconds`,
        time: 5000
      });
    }, 5000);
    
    const startTime = Date.now();
    
    socket.connect(port, host, () => {
      clearTimeout(timeout);
      const endTime = Date.now();
      const connectionTime = endTime - startTime;
      
      log('info', `TCP connection successful to ${host}:${port} in ${connectionTime}ms`);
      socket.destroy();
      resolve({
        success: true,
        time: connectionTime,
        localAddress: socket.localAddress,
        localPort: socket.localPort
      });
    });
    
    socket.on('error', (err) => {
      clearTimeout(timeout);
      const endTime = Date.now();
      const errorTime = endTime - startTime;
      log('error', `TCP connection failed to ${host}:${port}: ${err.message}`);
      socket.destroy();
      resolve({
        success: false,
        error: err.message,
        time: errorTime
      });
    });
  });
}

/**
 * Test DNS resolution
 */
async function testDnsResolution(hostname) {
  return new Promise((resolve) => {
    if (net.isIP(hostname)) {
      resolve({
        success: true,
        message: 'Hostname is an IP address, no DNS resolution needed',
        addresses: [{ address: hostname, family: net.isIPv6(hostname) ? 6 : 4 }]
      });
      return;
    }
    
    if (hostname === 'localhost') {
      resolve({
        success: true,
        message: 'Hostname is localhost, no DNS resolution needed',
        addresses: [
          { address: '127.0.0.1', family: 4 },
          { address: '::1', family: 6 }
        ]
      });
      return;
    }
    
    log('info', `Testing DNS resolution for ${hostname}...`);
    const startTime = Date.now();
    
    dns.lookup(hostname, { all: true }, (err, addresses) => {
      const endTime = Date.now();
      const lookupTime = endTime - startTime;
      
      if (err) {
        log('error', `DNS resolution failed for ${hostname}: ${err.message}`);
        resolve({
          success: false,
          error: err.message,
          time: lookupTime
        });
        return;
      }
      
      log('info', `DNS resolution successful for ${hostname} in ${lookupTime}ms: ${addresses.map(a => a.address).join(', ')}`);
      resolve({
        success: true,
        addresses,
        time: lookupTime
      });
    });
  });
}

/**
 * Collect system information
 */
async function collectSystemInfo() {
  log('info', 'Collecting system information...');
  
  const systemInfo = {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    uptime: process.uptime(),
    hostname: os.hostname(),
    cpus: os.cpus().length,
    loadAvg: os.loadavg(),
    freeMemoryMB: Math.round(os.freemem() / 1024 / 1024),
    totalMemoryMB: Math.round(os.totalmem() / 1024 / 1024),
    memoryUsage: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    isDocker: getDbConfig().isDocker
  };
  
  log('info', `System information collected: ${systemInfo.platform} ${systemInfo.arch}, Node ${systemInfo.nodeVersion}`);
  results.system = systemInfo;
}

/**
 * Collect network information
 */
async function collectNetworkInfo() {
  log('info', 'Collecting network information...');
  
  const networkInfo = {
    interfaces: {},
    dnsServers: []
  };
  
  // Get network interfaces
  const interfaces = os.networkInterfaces();
  for (const [name, netInterface] of Object.entries(interfaces)) {
    if (netInterface) {
      networkInfo.interfaces[name] = netInterface.map(details => ({
        address: details.address,
        netmask: details.netmask,
        family: details.family,
        internal: details.internal
      }));
    }
  }
  
  // Try to get DNS servers (only works on some platforms)
  try {
    const resolvConf = fs.readFileSync('/etc/resolv.conf', 'utf8');
    const nameservers = resolvConf.match(/nameserver\s+(\d+\.\d+\.\d+\.\d+)/g);
    if (nameservers) {
      networkInfo.dnsServers = nameservers.map(line => line.split(/\s+/)[1]);
    }
  } catch (err) {
    // Ignore errors - file may not exist
  }
  
  log('info', `Network information collected: ${Object.keys(networkInfo.interfaces).length} interfaces`);
  results.network = networkInfo;
}

/**
 * Test database connectivity with Sequelize
 */
async function testSequelizeConnection() {
  const config = getDbConfig();
  log('info', `Testing Sequelize connection to ${config.host}:${config.port}/${config.database}...`);
  
  // Create sequelize instance
  const sequelize = new Sequelize({
    dialect: 'postgres',
    host: config.host,
    port: config.port,
    database: config.database,
    username: config.user,
    password: config.password,
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: config.ssl ? {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    } : {}
  });
  
  try {
    // Test connectivity
    const startTime = Date.now();
    await sequelize.authenticate();
    const endTime = Date.now();
    const connectTime = endTime - startTime;
    
    log('info', `Sequelize connection successful in ${connectTime}ms`);
    
    // Get database information
    const [dbInfoResults] = await sequelize.query(`
      SELECT 
        version() as version,
        current_database() as database,
        now() as server_time,
        pg_size_pretty(pg_database_size(current_database())) as db_size,
        (SELECT count(*) FROM pg_stat_activity) as active_connections,
        current_setting('max_connections') as max_connections,
        current_setting('shared_buffers') as shared_buffers,
        current_setting('work_mem') as work_mem
    `);
    
    const dbInfo = dbInfoResults[0];
    log('info', `Database info: PostgreSQL ${dbInfo.version.split(' ')[1]}, Size: ${dbInfo.db_size}`);
    
    // Get table information
    const [tableResults] = await sequelize.query(`
      SELECT
        relname as table_name,
        n_live_tup as row_count,
        pg_size_pretty(pg_relation_size(quote_ident(relname))) as size,
        pg_size_pretty(pg_total_relation_size(quote_ident(relname))) as total_size,
        seq_scan,
        idx_scan,
        seq_tup_read,
        idx_tup_fetch,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_dead_tup as dead_tuples
      FROM
        pg_stat_user_tables
      ORDER BY
        n_live_tup DESC
    `);
    
    log('info', `Table information collected: ${tableResults.length} tables`);
    
    // Get index information
    const [indexResults] = await sequelize.query(`
      SELECT
        indexrelname as index_name,
        relname as table_name,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
        idx_scan as scans,
        idx_tup_read as reads,
        idx_tup_fetch as fetches
      FROM
        pg_stat_user_indexes
      ORDER BY
        idx_scan DESC
    `);
    
    log('info', `Index information collected: ${indexResults.length} indexes`);
    
    // Get connection pool information
    const [poolResults] = await sequelize.query(`
      SELECT
        state,
        count(*) as count,
        MAX(extract(epoch from now() - state_change)) as max_time_seconds
      FROM
        pg_stat_activity
      WHERE
        datname = current_database()
      GROUP BY
        state
    `);
    
    log('info', `Connection pool information collected`);
    
    // Store all results
    results.database = {
      connection: {
        success: true,
        time: connectTime
      },
      info: dbInfo,
      tables: tableResults,
      indexes: indexResults,
      pool: poolResults
    };
    
    // Close the connection
    await sequelize.close();
    
  } catch (err) {
    log('error', `Sequelize connection failed: ${err.message}`);
    results.database.connection = {
      success: false,
      error: err.message
    };
  }
}

/**
 * Test database connectivity with pg client
 */
async function testPgClientConnection() {
  const config = getDbConfig();
  log('info', `Testing pg client connection to ${config.host}:${config.port}/${config.database}...`);
  
  // Create client
  const client = new Client({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    ssl: config.ssl ? {
      rejectUnauthorized: false
    } : undefined
  });
  
  try {
    // Connect
    const startTime = Date.now();
    await client.connect();
    const endTime = Date.now();
    const connectTime = endTime - startTime;
    
    log('info', `pg client connection successful in ${connectTime}ms`);
    
    // Test query
    const queryStartTime = Date.now();
    const res = await client.query('SELECT 1 as result');
    const queryEndTime = Date.now();
    const queryTime = queryEndTime - queryStartTime;
    
    log('info', `pg client query successful in ${queryTime}ms`);
    
    // Store results
    results.connection.pgClient = {
      success: true,
      connectTime,
      queryTime
    };
    
    // Close connection
    await client.end();
    
  } catch (err) {
    log('error', `pg client connection failed: ${err.message}`);
    results.connection.pgClient = {
      success: false,
      error: err.message
    };
  }
}

/**
 * Generate recommendations based on diagnostics
 */
function generateRecommendations() {
  const recommendations = [];
  
  // Connectivity recommendations
  if (results.network.tcpConnectivity && !results.network.tcpConnectivity.success) {
    recommendations.push({
      severity: 'critical',
      issue: 'TCP connectivity to database failed',
      recommendation: 'Check firewall settings, network configuration, and ensure PostgreSQL is running on the target server'
    });
    
    if (results.network.tcpConnectivity.error && results.network.tcpConnectivity.error.includes('ENOTFOUND')) {
      recommendations.push({
        severity: 'critical',
        issue: 'Hostname could not be resolved',
        recommendation: 'Check DNS configuration or use IP address directly'
      });
    }
  }
  
  // DNS recommendations
  if (results.network.dnsResolution && !results.network.dnsResolution.success) {
    recommendations.push({
      severity: 'high',
      issue: 'DNS resolution failed',
      recommendation: 'Check DNS configuration or use IP address instead of hostname'
    });
  }
  
  // Database recommendations
  if (results.database.connection && !results.database.connection.success) {
    const error = results.database.connection.error || '';
    
    if (error.includes('password') || error.includes('authentication')) {
      recommendations.push({
        severity: 'critical',
        issue: 'Authentication failed',
        recommendation: 'Check database username and password'
      });
    } else if (error.includes('role') || error.includes('database') && error.includes('not exist')) {
      recommendations.push({
        severity: 'critical',
        issue: 'Database or role does not exist',
        recommendation: 'Check database name and ensure user has been created'
      });
    }
  }
  
  // Performance recommendations
  if (results.database.pool) {
    const activeConnections = results.database.pool.find(p => p.state === 'active');
    const idleConnections = results.database.pool.find(p => p.state === 'idle');
    
    if (activeConnections && activeConnections.count > 5) {
      recommendations.push({
        severity: 'medium',
        issue: 'High number of active connections',
        recommendation: 'Consider increasing connection pool size or optimizing queries'
      });
    }
    
    if (idleConnections && idleConnections.count > 10) {
      recommendations.push({
        severity: 'low',
        issue: 'High number of idle connections',
        recommendation: 'Consider reducing idle timeout or connection pool size'
      });
    }
  }
  
  // Table recommendations
  if (results.database.tables) {
    // Check for tables with high dead tuples
    const tablesWithDeadTuples = results.database.tables.filter(t => 
      t.dead_tuples > 1000 && t.dead_tuples > t.row_count * 0.1
    );
    
    if (tablesWithDeadTuples.length > 0) {
      recommendations.push({
        severity: 'medium',
        issue: `${tablesWithDeadTuples.length} tables have high numbers of dead tuples`,
        recommendation: 'Run VACUUM on these tables to reclaim space and improve performance',
        details: tablesWithDeadTuples.map(t => t.table_name).join(', ')
      });
    }
    
    // Check for tables with high number of sequential scans
    const tablesWithSeqScans = results.database.tables.filter(t => 
      t.row_count > 1000 && t.seq_scan > 100 && (t.idx_scan === 0 || t.seq_scan > t.idx_scan * 10)
    );
    
    if (tablesWithSeqScans.length > 0) {
      recommendations.push({
        severity: 'medium',
        issue: `${tablesWithSeqScans.length} tables have high numbers of sequential scans`,
        recommendation: 'Consider adding indexes to these tables to improve query performance',
        details: tablesWithSeqScans.map(t => t.table_name).join(', ')
      });
    }
  }
  
  // Docker-specific recommendations
  if (results.system.isDocker) {
    recommendations.push({
      severity: 'info',
      issue: 'Running in Docker environment',
      recommendation: 'Ensure database host is set to "postgres" in Docker environment'
    });
  }
  
  // Store recommendations
  results.recommendations = recommendations;
  
  // Log recommendations
  log('info', `Generated ${recommendations.length} recommendations`);
  recommendations.forEach(rec => {
    log(rec.severity === 'critical' || rec.severity === 'high' ? 'error' : 'info', 
      `[${rec.severity.toUpperCase()}] ${rec.issue}: ${rec.recommendation}`);
  });
}

/**
 * Run all diagnostics
 */
async function runDiagnostics() {
  log('info', `=== Starting Database Diagnostics (${new Date().toISOString()}) ===`);
  console.log(`Database Diagnostics - Results will be written to ${path.join(resultsPath, 'diagnostics.json')}`);
  
  try {
    // Collect basic info
    await collectSystemInfo();
    await collectNetworkInfo();
    
    // Test connectivity
    const config = getDbConfig();
    results.network.dnsResolution = await testDnsResolution(config.host);
    results.network.tcpConnectivity = await testTcpConnectivity(config.host, config.port);
    
    // Test database connections
    await testPgClientConnection();
    await testSequelizeConnection();
    
    // Generate recommendations
    generateRecommendations();
    
    // Save results to file
    const resultsJson = JSON.stringify(results, null, 2);
    fs.writeFileSync(path.join(resultsPath, 'diagnostics.json'), resultsJson);
    
    // Create a summary file
    const summary = {
      timestamp: results.timestamp,
      system: {
        platform: results.system.platform,
        nodeVersion: results.system.nodeVersion,
        isDocker: results.system.isDocker
      },
      network: {
        dnsResolution: results.network.dnsResolution?.success,
        tcpConnectivity: results.network.tcpConnectivity?.success
      },
      database: {
        pgClientConnection: results.connection.pgClient?.success,
        sequelizeConnection: results.database.connection?.success,
        info: results.database.info,
        tableCount: results.database.tables?.length
      },
      recommendations: results.recommendations.map(rec => ({
        severity: rec.severity,
        issue: rec.issue,
        recommendation: rec.recommendation
      }))
    };
    
    fs.writeFileSync(path.join(resultsPath, 'summary.json'), JSON.stringify(summary, null, 2));
    
    // Create a human-readable report
    const report = [
      `# Database Diagnostics Report`,
      `Generated: ${results.timestamp}`,
      ``,
      `## System Information`,
      `- Platform: ${results.system.platform} ${results.system.arch}`,
      `- Node Version: ${results.system.nodeVersion}`,
      `- Docker Environment: ${results.system.isDocker ? 'Yes' : 'No'}`,
      `- Memory: ${results.system.freeMemoryMB}MB free / ${results.system.totalMemoryMB}MB total`,
      ``,
      `## Network Connectivity`,
      `- DNS Resolution: ${results.network.dnsResolution?.success ? 'Success' : 'Failed'}`,
      results.network.dnsResolution?.addresses ? 
        `  - Resolved Addresses: ${results.network.dnsResolution.addresses.map(a => a.address).join(', ')}` : '',
      `- TCP Connectivity: ${results.network.tcpConnectivity?.success ? 'Success' : 'Failed'}`,
      results.network.tcpConnectivity?.time ? 
        `  - Connection Time: ${results.network.tcpConnectivity.time}ms` : '',
      ``,
      `## Database Connection`,
      `- PG Client: ${results.connection.pgClient?.success ? 'Success' : 'Failed'}`,
      results.connection.pgClient?.error ? 
        `  - Error: ${results.connection.pgClient.error}` : '',
      `- Sequelize ORM: ${results.database.connection?.success ? 'Success' : 'Failed'}`,
      results.database.connection?.error ? 
        `  - Error: ${results.database.connection.error}` : '',
      ``,
      `## Database Information`,
      results.database.info ? [
        `- Version: ${results.database.info.version}`,
        `- Database: ${results.database.info.database}`,
        `- Size: ${results.database.info.db_size}`,
        `- Active Connections: ${results.database.info.active_connections}`,
        `- Max Connections: ${results.database.info.max_connections}`,
        `- Shared Buffers: ${results.database.info.shared_buffers}`,
        `- Work Memory: ${results.database.info.work_mem}`
      ].join('\n') : '- No database information available',
      ``,
      `## Recommendations`,
      results.recommendations.length > 0 ? 
        results.recommendations.map(rec => `- [${rec.severity.toUpperCase()}] ${rec.issue}: ${rec.recommendation}`).join('\n') :
        '- No recommendations generated'
    ].join('\n');
    
    fs.writeFileSync(path.join(resultsPath, 'report.md'), report);
    
    log('info', `=== Database Diagnostics Completed ===`);
    console.log(`\nDiagnostics completed successfully. Results saved to ${path.join(resultsPath, 'report.md')}\n`);
    
    // Print summary to console
    console.log(`=== Summary ===`);
    console.log(`DNS Resolution: ${results.network.dnsResolution?.success ? 'Success ✅' : 'Failed ❌'}`);
    console.log(`TCP Connectivity: ${results.network.tcpConnectivity?.success ? 'Success ✅' : 'Failed ❌'}`);
    console.log(`PG Client Connection: ${results.connection.pgClient?.success ? 'Success ✅' : 'Failed ❌'}`);
    console.log(`Sequelize Connection: ${results.database.connection?.success ? 'Success ✅' : 'Failed ❌'}`);
    
    if (results.recommendations.length > 0) {
      console.log(`\n=== Recommendations ===`);
      results.recommendations.forEach(rec => {
        const icon = rec.severity === 'critical' ? '❗' : 
                     rec.severity === 'high' ? '⚠️' : 
                     rec.severity === 'medium' ? '📢' : 
                     rec.severity === 'low' ? 'ℹ️' : 'ℹ️';
        console.log(`${icon} [${rec.severity.toUpperCase()}] ${rec.issue}: ${rec.recommendation}`);
      });
    }
    
  } catch (err) {
    log('error', `Error running diagnostics: ${err.message}`);
    console.error(`Error running diagnostics: ${err.message}`);
    console.error(err.stack);
  } finally {
    // Close log stream
    logStream.end();
  }
}

// Run diagnostics
runDiagnostics();