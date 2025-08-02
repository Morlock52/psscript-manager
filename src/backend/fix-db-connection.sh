#!/bin/bash

echo "PSScript Database Connection Fix"
echo "================================"
echo ""
echo "This script will fix the PostgreSQL connection issue by:"
echo "1. Creating the 'psscript' PostgreSQL user and database"
echo "2. Running the database setup to create tables and seed data"
echo ""

# Check if PostgreSQL is running
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "Error: PostgreSQL is not running on localhost:5432"
    echo ""
    echo "Please start PostgreSQL first:"
    echo "  brew services start postgresql@15  (on macOS with Homebrew)"
    echo "  sudo systemctl start postgresql   (on Linux)"
    exit 1
fi

echo "PostgreSQL is running. Proceeding with setup..."
echo ""

# Run the PostgreSQL user setup
echo "Step 1: Setting up PostgreSQL user and database..."
echo "You may be prompted for the PostgreSQL admin password"
echo ""

cd "$(dirname "$0")"
./setup-postgres-user.sh

if [ $? -ne 0 ]; then
    echo ""
    echo "Failed to set up PostgreSQL user. Please check the error messages above."
    exit 1
fi

echo ""
echo "Step 2: Running database setup (creating tables and seed data)..."
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Run the database setup
node setup-local-db.js

if [ $? -ne 0 ]; then
    echo ""
    echo "Failed to set up database tables. Please check the error messages above."
    exit 1
fi

echo ""
echo "Database setup completed successfully!"
echo ""
echo "You can now start the backend server:"
echo "  npm run dev"
echo ""
echo "Or run a connection test:"
echo "  npm run test:db"