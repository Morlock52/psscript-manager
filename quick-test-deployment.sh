#!/bin/bash

# Quick Test Deployment Script for PSScript
# This creates a working local server for immediate testing

echo "🚀 PSScript Quick Test Deployment"
echo "================================="

# Navigate to frontend build directory
cd "$(dirname "$0")/src/frontend/dist"

# Check if build exists
if [ ! -f "index.html" ]; then
    echo "❌ Frontend build not found. Building now..."
    cd ../
    npm install
    npm run build
    cd dist/
fi

echo "✅ Frontend build found"

# Find available port
PORT=8080
while lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; do
    PORT=$((PORT + 1))
done

echo "🌐 Starting local server on port $PORT"
echo "📱 Access your app at: http://localhost:$PORT"
echo "🌍 To access from network: http://$(ipconfig getifaddr en0):$PORT"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start Python HTTP server
python3 -m http.server $PORT --bind 0.0.0.0