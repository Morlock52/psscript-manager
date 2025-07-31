#!/bin/bash

# Test script to upload a modified PowerShell script to the backend API
SCRIPT_PATH="./test-script-unique-modified.ps1"
API_URL="http://localhost:4001/api/scripts/upload"  # Using port 4001 to match our backend

# Check if the PowerShell script exists
if [ ! -f "$SCRIPT_PATH" ]; then
  echo "Error: Test script not found at $SCRIPT_PATH"
  exit 1
fi

# Check if the server is running
echo "Checking if backend server is running..."
curl -s -o /dev/null -w "%{http_code}" "http://localhost:4001/api/scripts" > /dev/null
if [ $? -ne 0 ]; then
  echo "Error: Backend server not responding. Make sure it's running on port 4001."
  exit 1
fi

# Upload the script using curl
echo "Uploading modified test script to $API_URL..."
curl -v -F "title=Enhanced Disk Info PowerShell Script" \
     -F "description=This script retrieves detailed disk information from a Windows system with remote computer support" \
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
