#!/bin/bash

# Debug Login Issues
set -e

echo "🔍 Debugging login issues..."

SERVER_IP="74.208.184.195"

echo "1. Testing backend API directly:"
echo "================================"

echo "Health check:"
curl -s http://$SERVER_IP/api/health | jq . || echo "Failed"

echo ""
echo "Login test (admin123):"
curl -s -X POST http://$SERVER_IP/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}' | jq . || echo "Failed"

echo ""
echo "Login test (admin123!):"
curl -s -X POST http://$SERVER_IP/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123!"}' | jq . || echo "Failed"

echo ""
echo "2. Testing CORS headers:"
echo "========================"
curl -s -I -X OPTIONS http://$SERVER_IP/api/auth/login \
  -H "Origin: https://psscript.morloksmaze.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"

echo ""
echo "3. Testing frontend access:"
echo "==========================="
echo "HTTP status for main page:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://$SERVER_IP/

echo ""
echo "4. Testing from domain:"
echo "======================"
echo "Domain health check:"
curl -s https://psscript.morloksmaze.com/api/health | jq . || echo "Failed"

echo ""
echo "Domain login test:"
curl -s -X POST https://psscript.morloksmaze.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}' | jq . || echo "Failed"

echo ""
echo "🔍 Debugging complete!"
echo ""
echo "If login still doesn't work, please specify:"
echo "• Are you using http://74.208.184.195 or https://psscript.morloksmaze.com?"
echo "• What error message do you see?"
echo "• Does the login button respond at all?"