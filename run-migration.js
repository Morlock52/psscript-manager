/**
 * PostgreSQL Database Migration Runner
 * 
 * This script runs SQL migration files in order and tracks which migrations have been applied.
 * It creates a schema_migrations table to track applied migrations and prevents duplicate runs.
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Database connection parameters
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432');
const DB_NAME = process.env.DB_NAME || 'psscript';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
const DB_SSL = process.env.DB_SSL === 'true';

// Create a connection pool
const pool = new Pool({
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
  ssl: DB_SSL ? { rejectUnauthorized: false } : undefined,
  max: 5, // Maximum number of clients
  idleTimeoutMillis: 30000 // Close idle clients after 30 seconds
});

// Migration directory path
const MIGRATIONS_DIR = path.join(__dirname, 'src', 'db', 'migrations');

// Ensure migrations directory exists
if (!fs.existsSync(MIGRATIONS_DIR)) {
  console.error(`Error: Migrations directory does not exist: ${MIGRATIONS_DIR}`);
  process.exit(1);
}

/**
 * Create schema_migrations table if it doesn't exist
 */
async function ensureMigrationsTable() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Migration tracking table verified or created');
  } catch (err) {
    console.error('Error creating migrations table:', err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Get list of applied migrations from the database
 */
async function getAppliedMigrations() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT name FROM schema_migrations ORDER BY id');
    return result.rows.map(row => row.name);
  } catch (err) {
    console.error('Error getting applied migrations:', err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Get sorted list of migration files
 */
function getMigrationFiles() {
  // Get all .sql files from migrations directory
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort((a, b) => {
      // Sort numerically if files start with numbers (e.g., 01_, 02_, etc.)
      const numA = parseInt(a.match(/^(\d+)_/) ? a.match(/^(\d+)_/)[1] : '0');
      const numB = parseInt(b.match(/^(\d+)_/) ? b.match(/^(\d+)_/)[1] : '0');
      
      // If both have numeric prefixes, sort by those
      if (numA && numB) {
        return numA - numB;
      }
      
      // Otherwise, sort alphabetically
      return a.localeCompare(b);
    });
  
  return files;
}

/**
 * Apply a single migration file
 */
async function applyMigration(fileName) {
  const client = await pool.connect();
  const filePath = path.join(MIGRATIONS_DIR, fileName);
  
  try {
    // Read migration file
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Start transaction
    await client.query('BEGIN');
    
    // Run migration
    console.log(`  Running migration: ${fileName}`);
    await client.query(sql);
    
    // Record migration
    await client.query(
      'INSERT INTO schema_migrations (name) VALUES ($1)',
      [fileName]
    );
    
    // Commit transaction
    await client.query('COMMIT');
    console.log(`  Migration successful: ${fileName}`);
    return true;
  } catch (err) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error(`  Error applying migration ${fileName}:`, err.message);
    return false;
  } finally {
    client.release();
  }
}

/**
 * Run all pending migrations
 */
async function runMigrations() {
  try {
    console.log('Starting database migration...');
    console.log(`Database: ${DB_NAME} at ${DB_HOST}:${DB_PORT}`);
    
    // Ensure migrations table exists
    await ensureMigrationsTable();
    
    // Get list of already applied migrations
    const appliedMigrations = await getAppliedMigrations();
    console.log(`Found ${appliedMigrations.length} previously applied migrations`);
    
    // Get list of migration files
    const migrationFiles = getMigrationFiles();
    console.log(`Found ${migrationFiles.length} migration files`);
    
    // Determine which migrations need to be applied
    const pendingMigrations = migrationFiles.filter(file => !appliedMigrations.includes(file));
    console.log(`Found ${pendingMigrations.length} pending migrations to apply`);
    
    if (pendingMigrations.length === 0) {
      console.log('No migrations to apply. Database is up to date.');
      return;
    }
    
    // Apply each pending migration
    let successCount = 0;
    let failureCount = 0;
    
    for (const migrationFile of pendingMigrations) {
      const success = await applyMigration(migrationFile);
      if (success) {
        successCount++;
      } else {
        failureCount++;
        // Don't continue if a migration fails
        break;
      }
    }
    
    // Print summary
    console.log('\nMigration Summary:');
    console.log(`  Total migrations: ${migrationFiles.length}`);
    console.log(`  Previously applied: ${appliedMigrations.length}`);
    console.log(`  Successfully applied: ${successCount}`);
    console.log(`  Failed: ${failureCount}`);
    
    if (failureCount > 0) {
      console.error('Migration failed. Please fix the issues and try again.');
      process.exit(1);
    } else {
      console.log('Migration completed successfully!');
    }
  } catch (err) {
    console.error('Unexpected error during migration:', err);
    process.exit(1);
  } finally {
    // Close the connection pool
    await pool.end();
  }
}

// Run migrations
runMigrations().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});