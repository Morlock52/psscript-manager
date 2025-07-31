#!/bin/bash

# Deploy Login Fix
set -e

echo "🔧 Deploying login fix..."

SERVER_IP="74.208.184.195"
SERVER_USER="root"
SERVER_PASS="Morlock52"

echo "📤 Uploading fixed backend..."

# Upload fixed backend
sshpass -p "$SERVER_PASS" scp fix-login-backend.js $SERVER_USER@$SERVER_IP:/opt/psscript/

# Deploy fix
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no root@74.208.184.195 << 'ENDSSH'
cd /opt/psscript

echo "🔄 Updating backend..."

# Backup current backend
cp mock-backend-fixed.js mock-backend-fixed.js.bak

# Use fixed backend
cp fix-login-backend.js mock-backend-fixed.js

# Restart backend service
docker-compose restart backend

# Wait for restart
sleep 10

echo ""
echo "🔍 Testing fixed backend..."

echo "Health check:"
curl -s http://localhost/api/health | jq .

echo ""
echo "Test endpoint:"
curl -s -X POST http://localhost/api/test \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}' | jq .

echo ""
echo "Login test with simple password:"
curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}' | jq .

echo ""
echo "Login test with exclamation password:"
curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123!"}' | jq .

echo ""
echo "✅ Backend fix deployed!"
ENDSSH

echo ""
echo "✅ Login fix deployed successfully!"
echo ""
echo "🔍 Test login now at:"
echo "• http://74.208.184.195"
echo "• https://psscript.morloksmaze.com"
echo ""
echo "📧 Valid login credentials:"
echo "• admin@example.com / admin123!"
echo "• admin@example.com / admin123"
echo "• test@test.com / test123"