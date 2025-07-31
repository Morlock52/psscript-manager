#!/bin/bash

# Database Reset and Setup Script
# This script resets and sets up the database from scratch

# Set the working directory to the script directory
cd "$(dirname "$0")"

echo "=== PSScript Database Reset and Setup ==="
echo "Started at: $(date)"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "Error: PostgreSQL client (psql) is not installed"
    echo "Please install PostgreSQL client tools first"
    exit 1
fi

# Load environment variables
if [ -f .env ]; then
    echo "Loading environment variables from .env file"
    source <(grep -v '^#' .env | sed -E 's/(.*)=(.*)/export \1="\2"/g')
fi

# Set default values if not set in environment
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-psscript}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}

echo "Database: $DB_NAME at $DB_HOST:$DB_PORT"

# Function to check if database exists
database_exists() {
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME
    return $?
}

# Check if we need to create the database
if database_exists; then
    echo "Database $DB_NAME already exists"
    
    # Ask for confirmation before dropping
    read -p "Do you want to drop and recreate the database? (y/N) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Dropping database $DB_NAME..."
        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "DROP DATABASE $DB_NAME;" postgres
        
        echo "Creating database $DB_NAME..."
        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME;" postgres
    else
        echo "Using existing database $DB_NAME"
    fi
else
    echo "Creating database $DB_NAME..."
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME;" postgres
fi

# Make sure the script is executable
chmod +x setup-and-test.js

# Run the setup and test script
echo "Running database setup and tests..."
node setup-and-test.js

# Check the result
if [ $? -eq 0 ]; then
    echo "Database setup and tests completed successfully"
    echo "The database is now ready to use"
else
    echo "Database setup or tests failed"
    echo "Please check the error messages above"
fi

echo "Completed at: $(date)"