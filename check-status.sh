#!/bin/bash

echo "🔍 Checking PSScript Status..."
echo "================================"

# Check backend
echo -n "Backend (Port 4000): "
if curl -s http://localhost:4000/health > /dev/null 2>&1; then
    echo "✅ Running"
else
    echo "❌ Not running"
fi

# Check frontend ports
for port in 5173 3000 3001 3002 3003 3004 3005; do
    echo -n "Frontend (Port $port): "
    if curl -s http://localhost:$port > /dev/null 2>&1; then
        echo "✅ Running"
        echo "🌐 Access the app at: http://localhost:$port"
        break
    else
        echo "❌ Not running"
    fi
done

echo "================================"
echo ""
echo "To start the servers manually:"
echo "1. Backend:  cd src/backend && npm run dev"
echo "2. Frontend: cd src/frontend && npm run dev"