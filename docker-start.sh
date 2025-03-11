#!/bin/bash

# Set default environment
ENV=${1:-"prod"}

# Print header
echo "========================================"
echo "Starting PSScript Manager in $ENV mode"
echo "========================================"

# Check if .env file exists, if not create from example
if [ ! -f .env ]; then
  echo "No .env file found. Creating from .env.example..."
  cp .env.example .env
  echo "Please edit .env file with your configuration and run this script again."
  exit 1
fi

# Load environment variables
set -a
source .env
set +a

# Start containers based on environment
if [ "$ENV" = "dev" ]; then
  echo "Starting in DEVELOPMENT mode..."
  docker-compose -f docker-compose.yml -f docker-compose.override.yml up --build
else
  echo "Starting in PRODUCTION mode..."
  docker-compose up --build
fi
