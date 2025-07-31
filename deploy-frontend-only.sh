#!/bin/bash

# Simple Frontend Deployment to IONOS
set -e

echo "🚀 Deploying PSScript Frontend to IONOS..."

SERVER_IP="74.208.184.195"
SERVER_USER="root"
SERVER_PASS="Morlock52"

# Create deployment files
echo "📦 Preparing deployment files..."

# Create a simple nginx config
cat > nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    server {
        listen 80;
        server_name _;
        
        root /usr/share/nginx/html;
        index index.html;
        
        location / {
            try_files $uri $uri/ /index.html;
        }
        
        location /health {
            return 200 "OK\n";
            add_header Content-Type text/plain;
        }
    }
}
EOF

# Create docker-compose for frontend only
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./dist:/usr/share/nginx/html:ro
    restart: unless-stopped
EOF

# Create deployment archive
tar -czf frontend-deploy.tar.gz nginx.conf docker-compose.yml -C src/frontend dist

# Deploy using sshpass
if command -v sshpass &> /dev/null; then
    echo "📤 Uploading to server..."
    sshpass -p "$SERVER_PASS" ssh $SERVER_USER@$SERVER_IP "mkdir -p /opt/psscript && cd /opt/psscript && docker-compose down 2>/dev/null || true"
    sshpass -p "$SERVER_PASS" scp frontend-deploy.tar.gz $SERVER_USER@$SERVER_IP:/opt/psscript/
    
    echo "🔧 Deploying on server..."
    sshpass -p "$SERVER_PASS" ssh $SERVER_USER@$SERVER_IP << 'EOF'
cd /opt/psscript
tar -xzf frontend-deploy.tar.gz
docker-compose up -d
sleep 5
docker-compose ps
echo "✅ Frontend deployed!"
EOF
else
    echo "⚠️  sshpass not found. Install it with: brew install hudochenkov/sshpass/sshpass"
    echo "Or manually deploy by:"
    echo "1. scp frontend-deploy.tar.gz root@74.208.184.195:/opt/psscript/"
    echo "2. ssh root@74.208.184.195"
    echo "3. cd /opt/psscript && tar -xzf frontend-deploy.tar.gz && docker-compose up -d"
fi

# Cleanup
rm -f nginx.conf docker-compose.yml frontend-deploy.tar.gz

echo "✅ Deployment complete!"
echo "🌐 Access your production site at: http://74.208.184.195"