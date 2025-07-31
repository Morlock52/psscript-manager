#!/bin/bash

# Test the updated AI script analyzer

# Configure the environment
export NODE_ENV=development

# Ensure all required services are running
echo "Checking backend status..."
backend_status=$(curl -s http://localhost:4001/health)
if [[ $? -ne 0 || "$backend_status" != *"ok"* ]]; then
  echo "Backend is not running. Starting backend..."
  npm run start:backend &
  sleep 5
fi

echo "Checking AI service status..."
ai_status=$(curl -s http://localhost:8000/health)
if [[ $? -ne 0 || "$ai_status" != *"ok"* ]]; then
  echo "AI service is not running. Starting AI service..."
  npm run start:ai &
  sleep 10
fi

# Run the test
echo "Running script analysis test..."
node test-script-analysis.js "$@"

# Capture exit code
exit_code=$?

echo "Test completed with exit code: $exit_code"
exit $exit_code