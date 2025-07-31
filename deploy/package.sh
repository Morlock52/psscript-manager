#!/bin/bash

# Exit on error
set -e

echo "=== Creating PSScript Deployment Package ==="
cd "$(dirname "$0")"

# Make sure all scripts are executable
chmod +x *.sh

# Save Docker images if not already saved
if [ ! -d "./images" ] || [ "$(ls -A ./images | wc -l)" -eq 0 ]; then
  echo "Saving Docker images..."
  ./save-images.sh
else
  echo "Docker images already saved, skipping..."
fi

# Create the package
PACKAGE_NAME="psscript-deploy-$(date +%Y%m%d).tar.gz"
echo "Creating package: $PACKAGE_NAME"

# Go up one directory to include the deploy folder in the archive
cd ..
tar -czvf "$PACKAGE_NAME" \
    --exclude="deploy/images/*.tar" \
    deploy/

# Create a separate archive for the Docker images
IMAGES_PACKAGE="psscript-docker-images-$(date +%Y%m%d).tar.gz"
echo "Creating Docker images package: $IMAGES_PACKAGE"
tar -czvf "$IMAGES_PACKAGE" deploy/images/*.tar

echo "\n=== Deployment packages created ==="
ls -lh "$PACKAGE_NAME" "$IMAGES_PACKAGE"

echo "\nDeployment instructions:"
echo "1. Copy $PACKAGE_NAME to your server"
echo "2. Extract with: tar -xzf $PACKAGE_NAME"
echo "3. If you want to use pre-built images, also copy $IMAGES_PACKAGE"
echo "4. Extract Docker images with: tar -xzf $IMAGES_PACKAGE"
echo "5. Run the deployment: cd deploy && ./deploy.sh"