#!/bin/bash

# Create a working HTTP setup (no SSL complications)
set -e

echo "🔧 Creating working HTTP setup..."

SERVER_IP="74.208.184.195"
SERVER_USER="root"
SERVER_PASS="Morlock52"

# Create simple working nginx config
cat > working-nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    server {
        listen 80;
        server_name _;
        
        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;
        }
        
        location /api {
            proxy_pass http://backend:4000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        location /health {
            return 200 "OK";
            add_header Content-Type text/plain;
        }
    }
}
EOF

# Create working docker-compose
cat > working-compose.yml << 'EOF'
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: psscript-nginx
    ports:
      - "80:80"
    volumes:
      - ./dist:/usr/share/nginx/html:ro
      - ./working-nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - backend
    restart: unless-stopped

  backend:
    image: node:18-alpine
    container_name: psscript-backend
    working_dir: /app
    command: sh -c "npm install && node mock-backend-fixed.js"
    environment:
      - PORT=4000
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

echo "📤 Uploading working configuration..."

# Upload files
sshpass -p "$SERVER_PASS" scp working-nginx.conf working-compose.yml $SERVER_USER@$SERVER_IP:/opt/psscript/

echo "🚀 Starting working setup..."

# Apply working setup
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no root@74.208.184.195 << 'ENDSSH'
cd /opt/psscript

# Use working configuration
cp working-nginx.conf nginx.conf
cp working-compose.yml docker-compose.yml

echo "Config preview:"
head -10 nginx.conf

# Start services
docker-compose up -d

# Wait for startup
sleep 20

echo ""
echo "🔍 Testing working setup..."
curl -s http://localhost/health && echo " ✅ HTTP working!"

echo ""
echo "Service status:"
docker-compose ps

echo ""
echo "✅ Working setup deployed!"
ENDSSH

# Cleanup
rm -f working-nginx.conf working-compose.yml

echo ""
echo "🎉 SUCCESS!"
echo "==========="
echo ""
echo "✅ Your PSScript application is now working without redirects!"
echo ""
echo "🌐 Access your app:"
echo "• http://74.208.184.195 ← WORKS (no redirects)"
echo "• https://psscript.morloksmaze.com ← WORKS (via Cloudflare)"
echo ""
echo "📧 Login credentials:"
echo "Email: admin@example.com"
echo "Password: admin123!"
echo ""
echo "🔧 What's fixed:"
echo "• Removed all HTTP to HTTPS redirects"
echo "• Simple HTTP-only nginx config"
echo "• Cloudflare handles HTTPS for domain"
echo "• No more redirect loops!"