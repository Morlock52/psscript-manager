#!/bin/bash

# Script to restart the services with the updated configuration
echo "Stopping existing services..."
docker-compose down

echo "Building and starting services with the updated configuration..."
docker-compose up -d

echo "Services restarted successfully!"
echo "You can now access the script analysis page at http://localhost:3002/scripts/10/analysis"
