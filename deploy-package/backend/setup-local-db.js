/**
 * Local database setup script
 * This script creates necessary tables and inserts seed data for local development
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection parameters
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'psscript',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
};

// Check if running in Docker
const isDocker = process.env.DB_HOST === 'postgres';

// Create connection pool
const pool = new Pool(dbConfig);

async function setupDatabase() {
  console.log('Starting database setup...');
  console.log(`Database connection config: ${JSON.stringify({
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
    environment: isDocker ? 'Docker' : 'Local'
  })}`);
  
  const client = await pool.connect();
  
  // Check if tables already exist
  async function tablesExist() {
    const tableResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    
    return tableResult.rows.length > 0;
  }

  try {
    console.log('Connected to PostgreSQL database');

    // Create the pgvector extension if it doesn't exist
    console.log('Checking for pgvector extension...');
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS vector');
      console.log('pgvector extension enabled');
    } catch (error) {
      console.warn('Could not create pgvector extension. Vector search will not work:', error.message);
      console.warn('You may need to install the pgvector extension first.');
      console.warn('Continuing setup without vector support...');
    }

    // Check if tables exist first
    const hasExistingTables = await tablesExist();
    
    if (hasExistingTables) {
      console.log('Database tables already exist. Skipping schema creation.');
    } else {
      // Read schema file
      console.log('Creating database schema...');
      try {
        // In Docker, schema.sql is mounted at /docker-entrypoint-initdb.d/01-schema.sql
        let schemaPath = '/docker-entrypoint-initdb.d/01-schema.sql';
        
        console.log(`Looking for schema at: ${schemaPath}`);
        
        // Need to test if file exists in the docker container
        if (!fs.existsSync(schemaPath)) {
          console.log(`Schema not found at ${schemaPath}`);
          
          if (isDocker) {
            schemaPath = '/app/src/db/schema.sql';
          } else {
            schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
          }
          
          console.log(`Trying schema at: ${schemaPath}`);
        }
        
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        // Execute schema script
        await client.query(schema);
        console.log('Schema created successfully');
      } catch (error) {
        console.error('Error creating schema:', error.message);
        console.error('Make sure the schema.sql file exists at the correct path');
        throw error;
      }
    }

    // For seed data, let's check if we already have data
    async function hasExistingData() {
      try {
        const userCount = await client.query('SELECT COUNT(*) FROM users');
        return parseInt(userCount.rows[0].count) > 0;
      } catch (error) {
        return false;
      }
    }
    
    const dataExists = await hasExistingData();
    
    if (dataExists) {
      console.log('Seed data already exists. Skipping seed data insertion.');
    } else {
      // Read seed data file
      console.log('Inserting seed data...');
      try {
        // In Docker, seed data is mounted at /docker-entrypoint-initdb.d/02-seed-data.sql
        let seedPath = '/docker-entrypoint-initdb.d/02-seed-data.sql';
        
        console.log(`Looking for seed data at: ${seedPath}`);
        
        // Need to test if file exists in the docker container
        if (!fs.existsSync(seedPath)) {
          console.log(`Seed data not found at ${seedPath}`);
          
          if (isDocker) {
            seedPath = '/app/src/db/seeds/01-initial-data.sql';
          } else {
            seedPath = path.join(__dirname, '..', 'db', 'seeds', '01-initial-data.sql');
          }
          
          console.log(`Trying seed data at: ${seedPath}`);
        }
        
        const seedData = fs.readFileSync(seedPath, 'utf8');
        
        // Execute seed script
        await client.query(seedData);
        console.log('Seed data inserted successfully');
      } catch (error) {
        console.error('Error inserting seed data:', error.message);
        console.error('Make sure the seed data file exists at the correct path');
        throw error;
      }
    }

    // Verify tables
    const tableResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    
    console.log(`\nDatabase tables created (${tableResult.rows.length}):`);
    tableResult.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });

    // Verify seed data
    try {
      const userCount = await client.query('SELECT COUNT(*) FROM users');
      const categoryCount = await client.query('SELECT COUNT(*) FROM categories');
      const scriptCount = await client.query('SELECT COUNT(*) FROM scripts');
      
      console.log('\nSeed data summary:');
      console.log(`- Users: ${userCount.rows[0].count}`);
      console.log(`- Categories: ${categoryCount.rows[0].count}`);
      console.log(`- Scripts: ${scriptCount.rows[0].count}`);
    } catch (error) {
      console.warn('Could not verify seed data:', error.message);
    }

    console.log('\nDatabase setup completed successfully!');
    console.log('You can now start the application.');

  } catch (error) {
    console.error('Error setting up database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the setup
setupDatabase()
  .then(() => {
    console.log('Setup completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Database setup failed:', error);
    process.exit(1);
  });