#!/bin/bash

# Script to run the migration to add ON DELETE CASCADE constraints to script-related tables

echo "Starting migration to add ON DELETE CASCADE constraints..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js to run this migration."
    exit 1
fi

# Check if required packages are installed
if ! npm list pg dotenv &> /dev/null; then
    echo "Installing required packages..."
    npm install pg dotenv
fi

# Run the migration using the generic migration runner
echo "Running migration..."
node run-migration.js

# Check the exit code
if [ $? -eq 0 ]; then
    echo "Migration completed successfully."
    echo "ON DELETE CASCADE constraints have been added to all script-related tables."
    echo "This ensures that when a script is deleted, all related data is automatically deleted as well."
else
    echo "Migration failed. Please check the error message above."
    exit 1
fi

# Suggest running the test script
echo ""
echo "To verify the changes, you can run the script deletion test:"
echo "./run-script-deletion-test.sh"
