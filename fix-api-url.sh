#!/bin/bash

# Fix Frontend API URL Configuration
set -e

echo "🔧 Fixing frontend API URL configuration..."

SERVER_IP="74.208.184.195"
SERVER_USER="root"
SERVER_PASS="Morlock52"

echo "The issue: Frontend is trying to connect to localhost:4000 instead of the production server"
echo "Solution: Update API configuration and rebuild frontend"
echo ""

# Check current frontend build
echo "📍 Checking current frontend files..."
if [ -d "src/frontend" ]; then
    echo "✅ Frontend source found"
    
    # Look for API configuration files
    find src/frontend -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | head -10
else
    echo "❌ Frontend source not found in expected location"
    echo "Let me create a quick fix by injecting the correct API URL"
fi

echo ""
echo "🔧 Creating immediate fix..."

# Create a script to inject correct API URL into the built files
cat > fix-api-url-production.sh << 'EOFSCRIPT'
#!/bin/bash
set -e

echo "🔧 Fixing API URL in production build..."

cd /opt/psscript

# Backup current dist
cp -r dist dist.backup

# Find and replace localhost:4000 with the correct server IP
echo "Searching for API URL references..."
find dist -name "*.js" -exec grep -l "localhost:4000" {} \;

echo "Replacing API URLs..."
find dist -name "*.js" -exec sed -i 's|http://localhost:4000/api|/api|g' {} \;
find dist -name "*.js" -exec sed -i 's|localhost:4000/api|/api|g' {} \;

# Also fix any hardcoded localhost references
find dist -name "*.js" -exec sed -i 's|http://localhost:4000|/|g' {} \;

echo "✅ API URLs fixed!"

echo "🔄 Restarting nginx to clear cache..."
docker-compose restart nginx

sleep 5

echo "🔍 Testing fix..."
curl -s http://localhost/api/health && echo " ✅ API accessible via relative path"

echo ""
echo "✅ Frontend API URL fix applied!"
EOFSCRIPT

echo "📤 Deploying API URL fix..."

# Upload and execute fix
sshpass -p "$SERVER_PASS" scp fix-api-url-production.sh $SERVER_USER@$SERVER_IP:/opt/psscript/

sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no root@74.208.184.195 "cd /opt/psscript && chmod +x fix-api-url-production.sh && ./fix-api-url-production.sh"

# Cleanup
rm -f fix-api-url-production.sh

echo ""
echo "✅ API URL Fix Applied!"
echo "======================"
echo ""
echo "🔧 What was fixed:"
echo "• Changed hardcoded localhost:4000 URLs to relative /api paths"
echo "• Updated all JavaScript files in the build"
echo "• Restarted nginx to clear cache"
echo ""
echo "🌐 Your login should now work at:"
echo "• http://74.208.184.195"
echo "• https://psscript.morloksmaze.com"
echo ""
echo "📧 Login credentials:"
echo "• admin@example.com / admin123!"
echo "• admin@example.com / admin123"
echo "• test@test.com / test123"
echo ""
echo "🔍 If you still see issues, clear your browser cache and try again!"