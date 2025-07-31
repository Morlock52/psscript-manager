#!/bin/bash

# Script to run the categories migration

# Set database connection parameters
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-psscript}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}

# Display connection info
echo "Running categories migration with the following settings:"
echo "- Host: $DB_HOST"
echo "- Port: $DB_PORT"
echo "- Database: $DB_NAME"
echo "- User: $DB_USER"

# Run the migration
echo "Running migration..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f src/db/migrations/update_categories.sql

# Check if the migration was successful
if [ $? -eq 0 ]; then
  echo "Migration completed successfully!"
  
  # Count the number of categories
  echo "Verifying categories..."
  PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) FROM categories;"
  
  # List the categories
  echo "Categories in the database:"
  PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT id, name FROM categories ORDER BY id;"
else
  echo "Migration failed!"
fi
