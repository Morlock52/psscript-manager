#!/bin/bash

# Script to run the file_hash migration
echo "Running file_hash migration..."

# Get the database connection string from .env file
if [ -f .env ]; then
  source .env
  DB_CONNECTION_STRING=$DATABASE_URL
else
  echo "Error: .env file not found. Please create it with DATABASE_URL."
  exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DB_CONNECTION_STRING" ]; then
  echo "Error: DATABASE_URL not set in .env file."
  exit 1
fi

# Run the migration
psql "$DB_CONNECTION_STRING" -f src/db/migrations/add_file_hash_to_scripts.sql

# Check if the migration was successful
if [ $? -eq 0 ]; then
  echo "Migration completed successfully!"
else
  echo "Error: Migration failed."
  exit 1
fi

# Update the scripts table to set file_hash for existing scripts
echo "Updating existing scripts with file hashes..."
psql "$DB_CONNECTION_STRING" -c "
  UPDATE scripts 
  SET file_hash = md5(content) 
  WHERE file_hash IS NULL;
"

echo "Migration and data update completed."
