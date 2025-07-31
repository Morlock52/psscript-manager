#!/bin/bash

# Test script for file hash functionality
echo "Testing file hash functionality..."

# Check if .env file exists
if [ ! -f .env ]; then
  echo "Error: .env file not found. Please create it with DATABASE_URL."
  exit 1
fi

# Source environment variables
source .env

# Run the file hash migration
echo "Running file hash migration..."
node run-file-hash-migration.js

if [ $? -ne 0 ]; then
  echo "Error: Failed to run file hash migration."
  exit 1
fi

# Test file hash calculation
echo "Testing file hash calculation..."
node -e "
const { calculateStringMD5 } = require('./src/backend/src/utils/fileIntegrityJs');
const hash = calculateStringMD5('Test content');
console.log('MD5 hash of \"Test content\":', hash);
if (hash === '8bfa8e0684108f419933a5995264d150') {
  console.log('✅ Hash calculation test passed');
} else {
  console.log('❌ Hash calculation test failed');
  process.exit(1);
}
"

if [ $? -ne 0 ]; then
  echo "Error: File hash calculation test failed."
  exit 1
fi

# Test file hash database functionality
echo "Testing file hash database functionality..."
node -e "
const { Client } = require('pg');
require('dotenv').config();

async function testFileHashDB() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    console.log('Connected to database.');
    
    // Check if file_hash column exists
    const res = await client.query(\`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'scripts' AND column_name = 'file_hash'
    \`);
    
    if (res.rows.length > 0) {
      console.log('✅ file_hash column exists in scripts table');
    } else {
      console.error('❌ file_hash column does not exist in scripts table');
      process.exit(1);
    }
    
    // Check if any scripts have file hashes
    const hashRes = await client.query('SELECT COUNT(*) FROM scripts WHERE file_hash IS NOT NULL');
    const count = parseInt(hashRes.rows[0].count);
    
    console.log(\`Found \${count} scripts with file hashes\`);
    if (count > 0) {
      console.log('✅ Database has scripts with file hashes');
    } else {
      console.log('⚠️ No scripts with file hashes found. This is not an error if the database is empty.');
    }
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

testFileHashDB();
"

if [ $? -ne 0 ]; then
  echo "Error: File hash database test failed."
  exit 1
fi

echo "All tests completed successfully!"
echo "Note: Vector search functionality is disabled because pgvector extension is not installed."
