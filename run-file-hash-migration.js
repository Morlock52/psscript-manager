#!/usr/bin/env node

/**
 * Script to run the file_hash migration using Node.js
 */
require('dotenv').config();

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Get the database connection string from .env file
const dbConnectionString = process.env.DATABASE_URL;

if (!dbConnectionString) {
  console.error('Error: DATABASE_URL not set in .env file.');
  process.exit(1);
}

async function runMigration() {
  console.log('Running file_hash migration...');
  
  const client = new Client({
    connectionString: dbConnectionString
  });

  try {
    await client.connect();
    console.log('Connected to database.');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'src/db/migrations/add_file_hash_to_scripts.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    console.log('Executing migration SQL...');
    await client.query(migrationSql);
    console.log('Migration SQL executed successfully.');
    
    // Update existing scripts with file hashes
    console.log('Updating existing scripts with file hashes...');
    await client.query(`
      UPDATE scripts 
      SET file_hash = md5(content::text) 
      WHERE file_hash IS NULL;
    `);
    
    console.log('Migration and data update completed successfully!');
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
