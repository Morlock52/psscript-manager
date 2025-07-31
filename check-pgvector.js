// Script to check if pgvector extension is installed and install it if needed
const { Client } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Database connection parameters
// Database connection parameters
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432');
const DB_NAME = process.env.DB_NAME || 'psscript';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';

async function checkAndInstallPgVector() {
  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD
  });

  try {
    console.log('Connecting to PostgreSQL database...');
    await client.connect();
    console.log('Connected successfully.');

    // Check if pgvector extension is available
    console.log('Checking if pgvector extension is available...');
    const extensionResult = await client.query(`
      SELECT * FROM pg_available_extensions WHERE name = 'vector';
    `);

    if (extensionResult.rows.length === 0) {
      console.error('ERROR: pgvector extension is not available in this PostgreSQL installation.');
      console.error('Please install pgvector extension using the following steps:');
      console.error('1. For Ubuntu/Debian: sudo apt-get install postgresql-14-pgvector');
      console.error('   (Replace 14 with your PostgreSQL version)');
      console.error('2. For macOS with Homebrew: brew install pgvector');
      console.error('3. For manual installation, follow instructions at: https://github.com/pgvector/pgvector');
      process.exit(1);
    }

    console.log('pgvector extension is available.');

    // Check if pgvector extension is installed in the current database
    const installedResult = await client.query(`
      SELECT * FROM pg_extension WHERE extname = 'vector';
    `);

    if (installedResult.rows.length === 0) {
      console.log('pgvector extension is not installed in the current database. Installing now...');
      
      // Install the extension
      await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
      console.log('Successfully installed pgvector extension.');
    } else {
      console.log('pgvector extension is already installed in the current database.');
    }

    // Check if script_embeddings table exists
    const tableResult = await client.query(`
      SELECT * FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'script_embeddings';
    `);

    if (tableResult.rows.length === 0) {
      console.log('script_embeddings table does not exist. Creating it...');
      
      // Create the table
      await client.query(`
        CREATE TABLE IF NOT EXISTS script_embeddings (
          id SERIAL PRIMARY KEY,
          script_id INTEGER UNIQUE,
          embedding vector(1536),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Successfully created script_embeddings table.');
    } else {
      console.log('script_embeddings table already exists.');
    }

    // Check if chat_history table exists and has the embedding column
    const chatHistoryResult = await client.query(`
      SELECT * FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'chat_history';
    `);

    if (chatHistoryResult.rows.length > 0) {
      // Check if embedding column exists
      const columnResult = await client.query(`
        SELECT * FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'chat_history' AND column_name = 'embedding';
      `);

      if (columnResult.rows.length === 0) {
        console.log('Adding embedding column to chat_history table...');
        
        // Add the column
        await client.query(`
          ALTER TABLE chat_history ADD COLUMN embedding vector(1536);
        `);
        console.log('Successfully added embedding column to chat_history table.');
      } else {
        console.log('embedding column already exists in chat_history table.');
      }
    } else {
      console.log('chat_history table does not exist. It will be created by the application if needed.');
    }

    console.log('Database is ready for vector operations.');

  } catch (error) {
    console.error('Error:', error.message);
    if (error.message.includes('extension "vector" does not exist')) {
      console.error('The pgvector extension is not installed properly.');
    }
  } finally {
    await client.end();
  }
}

// Run the function
checkAndInstallPgVector().catch(console.error);
