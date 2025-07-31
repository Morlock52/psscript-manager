#!/bin/bash

echo "Deploying test to 74.208.184.195..."

# Create tarball
tar -czf psscript-test-20250731011322.tar.gz psscript-test-20250731011322

# Copy to server (you'll need to enter password)
scp psscript-test-20250731011322.tar.gz root@74.208.184.195:~/

echo ""
echo "Now SSH into the server and run:"
echo "  ssh root@74.208.184.195"
echo "  tar -xzf psscript-test-20250731011322.tar.gz"
echo "  cd psscript-test-20250731011322"
echo "  ./test-deploy.sh"
echo ""
echo "After testing, clean up with:"
echo "  docker-compose down"
echo "  cd .."
echo "  rm -rf psscript-test-20250731011322 psscript-test-20250731011322.tar.gz"
