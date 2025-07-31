#!/bin/bash
# Test Script Analysis with proper field mapping

echo "Running script analysis test..."
echo "================================================================================"

# Set API URL for the backend
export BACKEND_URL=http://localhost:4001

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js to run this test."
    exit 1
fi

# Run the test script
node test-script-analysis.js

echo "================================================================================"
echo "Test completed!"