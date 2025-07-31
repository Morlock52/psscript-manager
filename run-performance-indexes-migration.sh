#!/bin/bash

# Script to run the performance indexes migration
echo "Running performance indexes migration..."

# Get the database connection from environment or docker
if [ "$DOCKER_ENV" = "true" ]; then
  # If running in Docker, use the postgres container
  echo "Running migration in Docker environment..."
  docker-compose exec postgres psql -U postgres -d psscript -f /docker-entrypoint-initdb.d/add_performance_indexes.sql
else
  # Local development - construct connection string
  DB_HOST=${DB_HOST:-localhost}
  DB_PORT=${DB_PORT:-5432}
  DB_NAME=${DB_NAME:-psscript}
  DB_USER=${DB_USER:-postgres}
  DB_PASSWORD=${DB_PASSWORD:-postgres}
  
  export PGPASSWORD=$DB_PASSWORD
  
  echo "Running migration on local database..."
  psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f src/db/migrations/add_performance_indexes.sql
fi

# Check if the migration was successful
if [ $? -eq 0 ]; then
  echo "Performance indexes migration completed successfully!"
  echo "Database query performance should now be significantly improved."
else
  echo "Error: Migration failed."
  exit 1
fi