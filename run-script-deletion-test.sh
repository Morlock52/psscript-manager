#!/bin/bash

# Script to test the script deletion functionality

echo "Starting script deletion test..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js to run this test."
    exit 1
fi

# Check if axios is installed
if ! npm list axios &> /dev/null; then
    echo "Installing axios package..."
    npm install axios
fi

# Set API URL environment variable if provided
if [ ! -z "$1" ]; then
    export API_URL="$1" # Export only if argument is provided
    echo "Using provided API URL: $API_URL"
else
    # Do not export, let the Node script use its default
    echo "No API URL provided, Node script will use its default (http://localhost:4000)."
fi

# Run the test script
echo "Running script deletion tests..."
node test-script-deletion.js

# Check the exit code
if [ $? -eq 0 ]; then
    echo "Script deletion test completed successfully."
else
    echo "Script deletion test failed."
    exit 1
fi

echo "Test completed."
