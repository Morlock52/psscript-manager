#!/bin/bash

# Script to restart the backend services to apply the script deletion fix

echo "Restarting backend services to apply script deletion fix..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "Error: Docker is not running. Please start Docker and try again."
  exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
  echo "Error: docker-compose is not installed. Please install docker-compose and try again."
  exit 1
fi

# Restart the backend service
echo "Restarting backend service..."
docker-compose restart backend

# Check if the restart was successful
if [ $? -eq 0 ]; then
  echo "Backend service restarted successfully."
else
  echo "Error: Failed to restart backend service."
  exit 1
fi

# Wait for the backend service to be ready
echo "Waiting for backend service to be ready..."
sleep 5

# Check if the backend service is running
if docker-compose ps | grep -q "backend.*Up"; then
  echo "Backend service is running."
else
  echo "Error: Backend service is not running. Please check the logs for errors."
  docker-compose logs backend
  exit 1
fi

echo "Script deletion fix has been applied successfully."
echo "You can now use the script deletion functionality."
