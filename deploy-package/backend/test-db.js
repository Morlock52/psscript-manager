/**
 * PostgreSQL database connectivity test script
 * 
 * This script tests connectivity to PostgreSQL and logs results to the test-results directory.
 * Run with: node test-db.js
 */

// Load environment variables from .env file
require('dotenv').config();

// Import required modules
const { Sequelize, QueryTypes } = require('sequelize');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');

// Prepare logging
const LOG_FILE = path.join(process.cwd(), '../../test-results/db-tests/postgres-test.log');
const LOG_DIR = path.dirname(LOG_FILE);

// Create log directory if it doesn't exist
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Simple logger
function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} ${isError ? 'ERROR' : 'INFO'}: ${message}`;
  
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

// Start the test
async function runTest() {
  try {
    // Log system information
    log(`=== PostgreSQL Connection Test (${new Date().toISOString()}) ===`);
    log(`Node.js version: ${process.version}`);
    log(`Platform: ${os.platform()} ${os.release()}`);
    log(`Architecture: ${os.arch()}`);
    log(`Hostname: ${os.hostname()}`);
    
    // Check if we're in mock mode
    const USE_MOCK_SERVICES = process.env.USE_MOCK_SERVICES === 'true';
    if (USE_MOCK_SERVICES) {
      log(`MOCK MODE ENABLED: Skipping actual database connection tests`);
      log(`Application will use mock data instead of connecting to PostgreSQL`);
      return;
    }
    
    // Get database connection info from environment variables
    
    // Get database connection info from environment variables
    const DB_HOST = process.env.DB_HOST || 'localhost';
    const DB_PORT = parseInt(process.env.DB_PORT || '5432');
    const DB_NAME = process.env.DB_NAME || 'psscript';
    const DB_USER = process.env.DB_USER || 'postgres';
    const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
    const DB_SSL = process.env.DB_SSL === 'true';
    
    log(`Database connection info:`);
    log(`- Host: ${DB_HOST}`);
    log(`- Port: ${DB_PORT}`);
    log(`- Database: ${DB_NAME}`);
    log(`- User: ${DB_USER}`);
    log(`- SSL: ${DB_SSL ? 'enabled' : 'disabled'}`);
    
    // Log network interfaces
    try {
      const interfaces = os.networkInterfaces();
      log('Network interfaces:');
      
      for (const [name, netInterface] of Object.entries(interfaces)) {
        if (netInterface) {
          netInterface.forEach(interface => {
            if (interface.family === 'IPv4' && !interface.internal) {
              log(`  ${name}: ${interface.address}`);
            }
          });
        }
      }
    } catch (err) {
      log(`Could not determine network interfaces: ${err.message}`, true);
    }
    
    // Test TCP connectivity
    try {
      log(`Testing TCP connectivity to ${DB_HOST}:${DB_PORT}...`);
      
      await new Promise((resolve, reject) => {
        const socket = new net.Socket();
        let connected = false;
        
        const timeout = setTimeout(() => {
          if (!connected) {
            socket.destroy();
            reject(new Error(`Connection to ${DB_HOST}:${DB_PORT} timed out after 5 seconds`));
          }
        }, 5000);
        
        socket.connect(DB_PORT, DB_HOST, () => {
          connected = true;
          clearTimeout(timeout);
          log(`TCP connection to ${DB_HOST}:${DB_PORT} successful`);
          socket.destroy();
          resolve();
        });
        
        socket.on('error', (err) => {
          clearTimeout(timeout);
          socket.destroy();
          reject(err);
        });
      });
    } catch (err) {
      log(`TCP connection failed: ${err.message}`, true);
      log(`This indicates a network connectivity issue or the database server is not running.`, true);
    }
    
    // Test direct PostgreSQL client connection
    log(`Testing direct PostgreSQL client connection...`);
    const pgStart = Date.now();
    
    try {
      const client = new Client({
        host: DB_HOST,
        port: DB_PORT,
        database: DB_NAME,
        user: DB_USER,
        password: DB_PASSWORD,
        ssl: DB_SSL ? { rejectUnauthorized: false } : undefined,
        connectionTimeoutMillis: 10000, // 10 second timeout
      });
      
      log(`Attempting to connect to database with pg client...`);
      await client.connect();
      const connectTime = Date.now() - pgStart;
      log(`PG Client: Connected to PostgreSQL server in ${connectTime}ms`);
      
      // Get PostgreSQL version
      log(`PG Client: Querying PostgreSQL version...`);
      const versionResult = await client.query('SELECT version()');
      log(`PG Client: PostgreSQL version: ${versionResult.rows[0].version}`);
      
      // Close the client connection
      log(`PG Client: Closing database connection...`);
      await client.end();
      log(`PG Client: Database connection closed`);
    } catch (pgErr) {
      log(`PG Client: Connection failed: ${pgErr.message}`, true);
      if (pgErr.code) {
        log(`PG Client: Error code: ${pgErr.code}`, true);
      }
    }
    
    // Test Sequelize connection
    log(`Testing Sequelize ORM connection...`);
    const seqStart = Date.now();
    
    try {
      // Create Sequelize instance
      log(`Creating Sequelize instance...`);
      const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
        host: DB_HOST,
        port: DB_PORT,
        dialect: 'postgres',
        logging: (msg) => log(`Sequelize SQL: ${msg}`),
        dialectOptions: {
          ssl: DB_SSL ? { rejectUnauthorized: false } : undefined
        },
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000
        }
      });
      
      // Authenticate connection
      log(`Authenticating Sequelize connection...`);
      await sequelize.authenticate();
      const seqConnectTime = Date.now() - seqStart;
      log(`Sequelize connection successful (${seqConnectTime}ms)`);
      
      // Try some basic queries
      log(`Testing Sequelize queries...`);
      
      // Get database time
      const timeResult = await sequelize.query('SELECT NOW() as time', {
        type: QueryTypes.SELECT
      });
      log(`Database time: ${timeResult[0].time}`);
      
      // List tables
      const tablesResult = await sequelize.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
        { type: QueryTypes.SELECT }
      );
      
      // Extract table names from the query result, handling different PostgreSQL return formats
      let tableNames = [];
      
      if (tablesResult.length > 0) {
        tablesResult.forEach(item => {
          // Handle object format where each row is like { table_name: 'table1' }
          if (typeof item === 'object' && item !== null) {
            const tableName = item.table_name || item.tablename;
            if (tableName) {
              tableNames.push(tableName);
            }
          } 
          // Handle array format where each row might be just the value ['table1']
          else if (Array.isArray(item) && item.length > 0) {
            tableNames.push(item[0]);
          }
          // Handle direct string values
          else if (typeof item === 'string') {
            tableNames.push(item);
          }
        });
      }
      
      // If we still have no table names, check if the entire result is an array of arrays
      if (tableNames.length === 0 && Array.isArray(tablesResult[0])) {
        tableNames = tablesResult[0];
      }
      
      if (tablesResult.length > 0) {
        log(`Found ${tableNames.length} tables:`);
        tableNames.forEach((tableName, idx) => {
          log(`  ${idx+1}. ${tableName}`);
        });
        
        // Try to get a record count from the first table if we have any
        if (tableNames.length > 0) {
          const firstTable = tableNames[0];
          try {
            const countResult = await sequelize.query(
              `SELECT COUNT(*) as count FROM "${firstTable}"`,
              { type: QueryTypes.SELECT }
            );
            
            // Handle different count result formats
            let count;
            if (countResult[0] && typeof countResult[0] === 'object') {
              count = countResult[0].count;
            } else if (Array.isArray(countResult[0])) {
              count = countResult[0][0];
            } else {
              count = countResult[0];
            }
            
            log(`Table "${firstTable}" has ${count} records`);
          } catch (countErr) {
            log(`Could not count records in "${firstTable}": ${countErr.message}`, true);
          }
        } else {
          log(`No tables found in database or could not determine table names`, true);
        }
      } else {
        log(`No tables found in database`);
      }
      
      // Close Sequelize connection
      log(`Closing Sequelize connection...`);
      await sequelize.close();
      log(`Sequelize connection closed`);
      
      // Success!
      const totalDuration = Date.now() - seqStart;
      log(`Sequelize connectivity test completed in ${totalDuration}ms`);
      
    } catch (seqErr) {
      const seqFailTime = Date.now() - seqStart;
      log(`Sequelize connection failed after ${seqFailTime}ms: ${seqErr.message}`, true);
      if (seqErr.original && seqErr.original.code) {
        log(`Sequelize error code: ${seqErr.original.code}`, true);
      }
      if (seqErr.stack) {
        log(`Sequelize error stack:`, true);
        seqErr.stack.split('\n').slice(0, 5).forEach(line => log(`  ${line}`, true));
      }
    }
    
  } catch (err) {
    log(`Unexpected error during test: ${err.message}`, true);
    if (err.stack) {
      log(`Error stack trace:`, true);
      err.stack.split('\n').forEach(line => log(`  ${line}`, true));
    }
  }
  
  log(`Test completed. Results logged to: ${LOG_FILE}`);
}

// Run the test
runTest();
