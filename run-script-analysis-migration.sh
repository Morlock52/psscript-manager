#!/bin/bash

# Script to run the migration to add command_details and ms_docs_references columns to script_analysis table

# Check if PostgreSQL is running
echo "Checking if PostgreSQL is running..."
# Try to connect to PostgreSQL using a more universal approach
if command -v psql &> /dev/null; then
  # If psql is available, use it
  psql -h localhost -p 5432 -U postgres -c "SELECT 1" &> /dev/null
  PG_STATUS=$?
elif command -v pg_isready &> /dev/null; then
  # If pg_isready is available, use it
  pg_isready -h localhost -p 5432 -d postgres -U postgres &> /dev/null
  PG_STATUS=$?
else
  # If neither is available, try a direct socket connection
  nc -z localhost 5432 &> /dev/null
  PG_STATUS=$?
fi

if [ $PG_STATUS -ne 0 ]; then
  echo "PostgreSQL is not running. Please start PostgreSQL and try again."
  exit 1
fi

# Run the migration
echo "Running migration to add command_details and ms_docs_references columns to script_analysis table..."
PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d psscript -f src/db/migrations/add_command_details_to_script_analysis.sql

if [ $? -eq 0 ]; then
  echo "Migration completed successfully."
else
  echo "Migration failed. Please check the error message above."
  exit 1
fi

echo "Migration completed. The script_analysis table now has command_details and ms_docs_references columns."
