#!/bin/bash

# Update all script analysis with improved ratings and MS Learn references
#
# This script will run the update-script-analysis.js to re-analyze
# all scripts in the database with the improved AI analyzer.

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Set working directory
cd "$(dirname "$0")"

# Create logs directory if it doesn't exist
mkdir -p logs

# Check if AI service is running
echo "Checking AI service..."
if ! curl -s "http://localhost:8000/health" > /dev/null; then
  echo "AI service not running. Starting AI service..."
  npm run start:ai &
  sleep 10
fi

# Check if backend server is running
echo "Checking backend server..."
if ! curl -s "http://localhost:4001/health" > /dev/null; then
  echo "Backend server not running. Starting backend server..."
  npm run start:backend &
  sleep 5
fi

# Run the analysis update script
echo "Starting script analysis update..."
cd src/backend
node update-script-analysis.js

# Check if the update was successful
if [ $? -eq 0 ]; then
  echo "Script analysis update completed successfully."
  echo "All scripts have been analyzed with the improved ratings and MS Learn references."
else
  echo "Script analysis update failed. Check the logs for details."
  echo "Log file: logs/script-analysis-update.log"
  exit 1
fi

echo "Done."
exit 0