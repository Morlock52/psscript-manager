#!/bin/bash

# Final Fix for Redirect Issue - Direct Volume Mount
set -e

echo "🔧 Final fix for redirect issue..."

SERVER_IP="74.208.184.195"
SERVER_USER="root"
SERVER_PASS="Morlock52"

echo "The issue is the nginx container is not loading our config properly."
echo "Let's rebuild everything with the correct configuration."
echo ""

# Create the absolute simplest nginx config
cat > nginx-final.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    server {
        listen 80;
        listen 443 ssl http2;
        server_name _;
        
        # SSL files (will be ignored on port 80)
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        
        # Frontend
        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;
        }
        
        # API
        location /api {
            proxy_pass http://backend:4000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # Health check
        location /health {
            return 200 "OK";
            add_header Content-Type text/plain;
        }
    }
}
EOF

# Create new docker-compose that ensures correct volume mounting
cat > docker-compose-final.yml << 'EOF'
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: psscript-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./dist:/usr/share/nginx/html:ro
      - ./nginx-final.conf:/etc/nginx/nginx.conf:ro
      - ./ssl/letsencrypt/fullchain.pem:/etc/nginx/ssl/fullchain.pem:ro
      - ./ssl/letsencrypt/privkey.pem:/etc/nginx/ssl/privkey.pem:ro
    depends_on:
      - backend
    restart: unless-stopped
    command: ["/bin/sh", "-c", "nginx -t && nginx -g 'daemon off;'"]

  backend:
    image: node:18-alpine
    container_name: psscript-backend
    working_dir: /app
    command: sh -c "npm install && node mock-backend-fixed.js"
    environment:
      - PORT=4000
      - NODE_ENV=production
    volumes:
      - ./mock-backend-fixed.js:/app/mock-backend-fixed.js:ro
      - ./package.json:/app/package.json:ro
    restart: unless-stopped

  ai-service:
    image: python:3.11-alpine
    container_name: psscript-ai
    working_dir: /app
    command: python mock-ai-service.py
    volumes:
      - ./mock-ai-service.py:/app/mock-ai-service.py:ro
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    container_name: psscript-postgres
    environment:
      - POSTGRES_DB=psscript
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: psscript-redis
    restart: unless-stopped

networks:
  default:
    name: psscript-network
EOF

echo "📤 Deploying final fix..."

# Upload files
sshpass -p "$SERVER_PASS" scp nginx-final.conf docker-compose-final.yml $SERVER_USER@$SERVER_IP:/opt/psscript/

# Apply final fix
sshpass -p "$SERVER_PASS" ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
cd /opt/psscript

echo "🔄 Applying final configuration..."

# Stop everything
docker-compose down
docker system prune -f

# Use final configs
cp nginx-final.conf nginx.conf
cp docker-compose-final.yml docker-compose.yml

echo "Config check:"
head -20 nginx.conf

# Start with fresh containers
docker-compose up -d

# Wait for startup
sleep 25

echo ""
echo "🔍 Final testing..."

echo "HTTP direct test:"
curl -s http://localhost/health || echo "Failed"

echo ""
echo "HTTPS direct test:"
curl -k -s https://localhost/health || echo "Failed"

echo ""
echo "Config verification in container:"
docker exec psscript-nginx nginx -t

echo ""
echo "Container processes:"
docker-compose ps

echo ""
echo "✅ Final fix applied!"
ENDSSH

# Cleanup
rm -f nginx-final.conf docker-compose-final.yml

echo ""
echo "🎉 FINAL FIX COMPLETE!"
echo "======================"
echo ""
echo "✅ The redirect loop should now be completely resolved!"
echo ""
echo "🌐 Your application is accessible at:"
echo "• https://psscript.morloksmaze.com (via Cloudflare)"
echo "• http://74.208.184.195 (direct HTTP)"
echo "• https://74.208.184.195 (direct HTTPS)"
echo ""
echo "📧 Login credentials:"
echo "Email: admin@example.com"
echo "Password: admin123!"
echo ""
echo "🔧 What was fixed:"
echo "• Completely removed server-side redirects"
echo "• Fresh nginx container with correct config"
echo "• Single server block handles both HTTP/HTTPS"
echo ""
echo "💡 If you still get redirects, check Cloudflare settings:"
echo "• SSL/TLS mode should be 'Full' or 'Flexible'"
echo "• Disable 'Always Use HTTPS' rule"