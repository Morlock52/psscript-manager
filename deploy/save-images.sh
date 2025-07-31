#!/bin/bash

# Exit on error
set -e

echo "=== Saving PSScript Docker Images to tar files ==="
cd "$(dirname "$0")"

# Create images directory if it doesn't exist
mkdir -p images

# List of images to save
images=(
  "psscript-frontend:latest"
  "psscript-backend:latest"
  "psscript-ai-service:latest"
  "pgvector/pgvector:pg15"
  "redis:7.0-alpine"
)

# Save each image
for img in "${images[@]}"; do
  filename=$(echo "$img" | tr '/:' '--')
  echo "Saving $img to images/${filename}.tar"
  docker save -o "images/${filename}.tar" "$img"
done

echo "\n=== All images saved to the ./images directory ==="
du -h images/*.tar

echo "\nYou can now transfer the entire deploy directory to another server."
echo "On the destination server, run ./deploy.sh to start the application."