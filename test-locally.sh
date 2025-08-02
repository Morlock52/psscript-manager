#!/bin/bash

echo "🚀 Testing PSScript Locally"
echo "=========================="

cd "/Users/morlock/fun/psscript 4/src/frontend/dist"

echo "Starting local server..."
echo "Your site will be available at: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start Python HTTP server
python3 -m http.server 8000