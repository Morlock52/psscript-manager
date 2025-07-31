#!/bin/bash

# Script to update the database categories

echo "Updating database categories..."

# Check if the database is running
echo "Checking database connection..."
node src/backend/test-db.js

# Check if the database connection was successful
if [ $? -ne 0 ]; then
  echo "Error: Database connection failed. Make sure the database is running."
  exit 1
fi

# Run the update-categories.js script
echo "Running category update script..."
node update-categories.js

# Check if the update was successful
if [ $? -ne 0 ]; then
  echo "Error: Failed to update categories."
  exit 1
fi

echo "Categories updated successfully."

# Clear the categories cache
echo "Clearing categories cache..."
curl -s http://localhost:4000/api/categories/refresh/cache

# Check if the cache refresh was successful
if [ $? -ne 0 ]; then
  echo "Warning: Failed to clear categories cache. The backend may need to be restarted."
else
  echo "Categories cache cleared successfully."
fi

echo "Database categories update completed."
