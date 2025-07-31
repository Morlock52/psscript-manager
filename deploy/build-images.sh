#!/bin/bash

# Exit on error
set -e

echo "=== Building PSScript Docker Images ==="
cd "$(dirname "$0")"
cd ..

echo "\n=== Building Frontend Image ==="
cd src/frontend
docker build -t psscript-frontend:latest -f Dockerfile.prod .

echo "\n=== Building Backend Image ==="
cd ../backend
docker build -t psscript-backend:latest -f Dockerfile.prod .

echo "\n=== Building AI Service Image ==="
cd ../ai
docker build -t psscript-ai-service:latest -f Dockerfile.prod .

echo "\n=== All images built successfully ==="
docker images | grep psscript