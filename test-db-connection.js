const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Database connection configuration
const dbConfig = {
  host: 'localhost', // Override to use localhost when running outside Docker
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'psscript',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres'
};

async function testConnection() {
  const client = new Client(dbConfig);
  
  console.log('Database config:', dbConfig);
  
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!');
    
    const result = await client.query('SELECT current_database(), current_user, version()');
    console.log('Database info:', result.rows[0]);
    
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('\nExisting tables:');
    tablesResult.rows.forEach(row => console.log(' -', row.table_name));
    
  } catch (error) {
    console.error('Connection failed:', error.message);
    console.error('Error details:', error);
  } finally {
    await client.end();
  }
}

testConnection().catch(console.error);