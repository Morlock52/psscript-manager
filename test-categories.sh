#!/bin/bash

# Test script to verify categories functionality

# Start the backend server in the background
echo "Starting backend server..."
./start-backend.sh &
SERVER_PID=$!

# Wait for the server to start
echo "Waiting for server to start..."
sleep 10
echo "Checking if server is running..."
curl -s http://localhost:4001/api/health || echo "Server not responding"

# Make a request to get all categories
echo "Fetching categories..."
RESPONSE=$(curl -s http://localhost:4001/api/categories)

# Display the response
echo "Categories response:"
echo $RESPONSE

# Kill the server process
echo "Shutting down server..."
kill $SERVER_PID

echo "Test completed."
