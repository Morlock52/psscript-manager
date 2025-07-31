#!/bin/bash

# Script to test the OpenAI Assistant integration
# This script runs the test-openai-assistant.js file

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo "Error: Node.js is required but not installed."
  echo "Please install Node.js first."
  exit 1
fi

# Check if the test script exists
if [ ! -f "test-openai-assistant.js" ]; then
  echo "Error: test-openai-assistant.js not found."
  echo "Please make sure the file exists in the current directory."
  exit 1
fi

# Check if the script is executable
if [ ! -x "test-openai-assistant.js" ]; then
  echo "Making test-openai-assistant.js executable..."
  chmod +x test-openai-assistant.js
fi

# Check if axios is installed
if ! node -e "require('axios')" &> /dev/null; then
  echo "Installing axios package..."
  npm install axios
fi

# Check if dotenv is installed
if ! node -e "require('dotenv')" &> /dev/null; then
  echo "Installing dotenv package..."
  npm install dotenv
fi

echo "=== Running OpenAI Assistant Test ==="
echo "This test will create a thread, send a message, and get a response from the OpenAI Assistant."
echo "Make sure you have set the OPENAI_API_KEY and OPENAI_ASSISTANT_ID environment variables."
echo ""

# Run the test script
node test-openai-assistant.js
