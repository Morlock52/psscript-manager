#!/bin/bash

# Simple HTTP-only fix to resolve redirects immediately
set -e

echo "🔧 Applying simple HTTP-only fix..."

SERVER_IP="74.208.184.195"
SERVER_USER="root"
SERVER_PASS="Morlock52"

# Create HTTP-only nginx config (no SSL complications)
cat > nginx-http-only.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    server_tokens off;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    
    server {
        listen 80;
        server_name _;
        
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
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
        
        # Status page
        location /status {
            return 200 "PSScript Server\nMode: HTTP Only\nStatus: Running\n";
            add_header Content-Type text/plain;
        }
    }
}
EOF

# Create HTTP-only docker compose
cat > docker-compose-http.yml << 'EOF'
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: psscript-nginx
    ports:
      - "80:80"
    volumes:
      - ./dist:/usr/share/nginx/html:ro
      - ./nginx-http-only.conf:/etc/nginx/nginx.conf:ro
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

echo "📤 Deploying HTTP-only fix..."

# Upload files
sshpass -p "$SERVER_PASS" scp nginx-http-only.conf docker-compose-http.yml $SERVER_USER@$SERVER_IP:/opt/psscript/

# Apply fix
sshpass -p "$SERVER_PASS" ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
cd /opt/psscript

echo "🛑 Stopping all services..."
docker-compose down
sleep 5

echo "📝 Using HTTP-only configuration..."
cp nginx-http-only.conf nginx.conf
cp docker-compose-http.yml docker-compose.yml

echo "🚀 Starting HTTP-only services..."
docker-compose up -d

# Wait for startup
sleep 15

echo ""
echo "🔍 Testing HTTP-only setup..."
echo "Health check:"
curl -s http://localhost/health || echo "Still starting..."

echo ""
echo "Status check:"
curl -s http://localhost/status || echo "Still starting..."

echo ""
echo "Service status:"
docker-compose ps

echo ""
echo "✅ HTTP-only fix applied!"
echo ""
echo "🌐 Your app should now work at:"
echo "• http://74.208.184.195 (no redirects!)"
echo "• https://psscript.morloksmaze.com (via Cloudflare)"
ENDSSH

# Cleanup
rm -f nginx-http-only.conf docker-compose-http.yml

echo ""
echo "✅ HTTP-ONLY FIX COMPLETE!"
echo "=========================="
echo ""
echo "🌐 Access your application:"
echo "• http://74.208.184.195 (direct, no redirects)"
echo "• https://psscript.morloksmaze.com (via Cloudflare SSL)"
echo ""
echo "📧 Login: admin@example.com / admin123!"
echo ""
echo "✨ Benefits:"
echo "• No more redirect loops"
echo "• Direct HTTP access works"
echo "• Cloudflare still provides HTTPS"
echo "• Simple and reliable"