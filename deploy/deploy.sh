#!/bin/bash

# Exit on error
set -e

echo "=== Deploying PSScript Application ==="
cd "$(dirname "$0")"

# Check if .env file exists, if not, create it from example
if [ ! -f .env ]; then
  echo "Creating .env file from .env.example"
  cp .env.example .env
  echo "Please edit .env file with your configuration before continuing."
  echo "Press Enter to continue after editing, or Ctrl+C to cancel..."
  read
fi

# Source the environment file
set -a
source .env
set +a

# Check for Docker
if ! command -v docker &> /dev/null; then
  echo "Docker is not installed. Please install Docker before continuing."
  exit 1
fi

# Check for Docker Compose
if ! command -v docker-compose &> /dev/null; then
  echo "Docker Compose is not installed. Please install Docker Compose before continuing."
  exit 1
fi

# Load the images if they exist as tar files
if [ -d "./images" ]; then
  echo "Loading Docker images from tar files..."
  for image in ./images/*.tar; do
    if [ -f "$image" ]; then
      echo "Loading image: $image"
      docker load -i "$image"
    fi
  done
fi

# Start the application
echo "Starting PSScript application using Docker Compose..."
docker-compose -f docker-compose.prod.yml up -d

echo "\n=== Deployment completed successfully ==="
echo "The application should now be available at:"
echo "- Frontend: http://localhost:3002"
echo "- Backend API: http://localhost:4000"
echo "- AI Service: http://localhost:8000"
echo "\nTo check container status: docker-compose -f docker-compose.prod.yml ps"
echo "To view logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "To stop the application: docker-compose -f docker-compose.prod.yml down"