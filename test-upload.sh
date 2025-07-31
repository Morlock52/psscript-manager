#!/bin/bash

# Test script to upload a PowerShell file to the backend API
SCRIPT_PATH="./test-script.ps1"
API_URL="http://localhost:4000/api/scripts/upload"

# Check if the PowerShell script exists
if [ ! -f "$SCRIPT_PATH" ]; then
  echo "Error: Test script not found at $SCRIPT_PATH"
  exit 1
fi

# Check if the server is running
echo "Checking if backend server is running at $API_URL..."
curl -s -o /dev/null -w "%{http_code}" "$API_URL" > /dev/null
if [ $? -ne 0 ]; then
  echo "Error: Backend server not responding. Make sure it's running on port 4000."
  exit 1
fi

# Upload the script using curl
echo "Uploading test script to $API_URL..."
curl -v -F "title=Test PowerShell Script" \
     -F "description=This is a test script for PSScript platform" \
     -F "script_file=@$SCRIPT_PATH" \
     -F "analyze_with_ai=true" \
     -F "is_public=true" \
     "$API_URL"

# Check the result
if [ $? -eq 0 ]; then
  echo -e "\n\nUpload request sent successfully!"
  echo "Check the backend logs for details."
else
  echo -e "\n\nUpload request failed."
fi