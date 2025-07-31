#!/bin/bash
set -e

# Deployment script for PSScript Manager on a remote server
# Run this script on the target server after transferring the project files

echo "Starting deployment of PSScript Manager on remote server..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker not found. Installing Docker..."
    # Update package index
    apt-get update
    # Install prerequisites
    apt-get install -y apt-transport-https ca-certificates curl software-properties-common
    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -
    # Add Docker repository
    add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
    # Update package index again
    apt-get update
    # Install Docker
    apt-get install -y docker-ce docker-ce-cli containerd.io
    echo "Docker installed successfully."
else
    echo "Docker is already installed."
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose not found. Installing Docker Compose..."
    # Download the latest version of Docker Compose
    curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    # Apply executable permissions
    chmod +x /usr/local/bin/docker-compose
    # Create a symbolic link
    ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose
    echo "Docker Compose installed successfully."
else
    echo "Docker Compose is already installed."
fi

# Ensure the project directory is the current working directory
cd "$(dirname "$0")"

# Check if .env file exists, if not, create it from .env.example
if [ ! -f .env ]; then
    echo ".env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "Please edit the .env file to set your environment variables."
    echo "Deployment will continue with default values for now."
fi

# Stop any existing containers
echo "Stopping existing containers (if any)..."
docker-compose down

# Build and start the services
echo "Building and starting services..."
docker-compose build --no-cache
docker-compose up -d

echo "Deployment completed successfully!"
echo "The PSScript Manager application should now be running on the server."
echo "Access the frontend at http://<server-ip>:<frontend-port> (default: http://192.168.1.68:3002)"
echo "Check container status with: docker-compose ps"
echo "View logs with: docker-compose logs"
