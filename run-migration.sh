#!/bin/bash

# Script to run the migration to add updated_at column to categories table

# Skip PostgreSQL check since pg_isready is not available
echo "Skipping PostgreSQL check..."

# Run the migration
echo "Running migration to add updated_at column to categories table..."
PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d psscript -f src/db/migrations/add_updated_at_to_categories.sql

if [ $? -eq 0 ]; then
  echo "Migration completed successfully."
else
  echo "Migration failed. Please check the error message above."
  exit 1
fi

echo "Migration completed. The categories table now has an updated_at column."
