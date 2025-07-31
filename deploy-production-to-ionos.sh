#!/bin/bash

# Deploy PSScript Production Build to IONOS Server
# Server: 74.208.184.195
# User: root
# Password: Morlock52b

set -e

echo "🚀 Starting PSScript Production Deployment to IONOS..."

# Server details
SERVER_IP="74.208.184.195"
SERVER_USER="root"
SERVER_DIR="/opt/psscript"

# Build production assets
echo "📦 Building production assets..."
cd src/frontend
npm run build
cd ../..

# Create deployment package
echo "📦 Creating deployment package..."
rm -rf deploy-package
mkdir -p deploy-package

# Copy production files
cp -r src/frontend/dist deploy-package/html
cp -r docker-compose.prod.yml deploy-package/docker-compose.yml
cp -r nginx deploy-package/
cp -r src/backend deploy-package/
cp -r src/ai deploy-package/
cp -r src/db deploy-package/

# Create simplified nginx config for production
cat > deploy-package/nginx/nginx.conf << 'EOF'
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
        
        # Frontend
        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;
        }
        
        # API proxy
        location /api {
            proxy_pass http://backend:4000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # Health check
        location /health {
            return 200 "OK\n";
            add_header Content-Type text/plain;
        }
    }
}
EOF

# Create production docker-compose
cat > deploy-package/docker-compose.yml << 'EOF'
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./html:/usr/share/nginx/html:ro
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - backend
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    environment:
      - NODE_ENV=production
      - PORT=4000
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=psscript
      - DB_USER=postgres
      - DB_PASSWORD=postgres
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=production_jwt_secret_key
      - AI_SERVICE_URL=http://ai-service:8000
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  ai-service:
    build:
      context: ./ai
      dockerfile: Dockerfile.prod
    environment:
      - MOCK_MODE=true
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=psscript
      - DB_USER=postgres
      - DB_PASSWORD=postgres
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: pgvector/pgvector:pg15
    environment:
      - POSTGRES_DB=psscript
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

volumes:
  postgres_data:
EOF

# Create deployment script for server
cat > deploy-package/deploy.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Deploying PSScript on server..."

# Stop any existing containers
docker-compose down 2>/dev/null || true

# Build and start services
docker-compose up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check services
docker-compose ps

echo "✅ Deployment complete!"
echo "🌐 Access the application at: http://74.208.184.195"
EOF

chmod +x deploy-package/deploy.sh

# Create tarball
echo "📦 Creating deployment archive..."
tar -czf psscript-deploy.tar.gz -C deploy-package .

# Deploy to server
echo "🚀 Deploying to IONOS server..."
echo "📤 Uploading files to server..."

# Use sshpass if available, otherwise prompt for password
if command -v sshpass &> /dev/null; then
    sshpass -p "Morlock52b" scp psscript-deploy.tar.gz $SERVER_USER@$SERVER_IP:$SERVER_DIR/
    
    echo "🔧 Running deployment on server..."
    sshpass -p "Morlock52b" ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
cd /opt/psscript
tar -xzf psscript-deploy.tar.gz
./deploy.sh
ENDSSH
else
    echo "📤 Please enter password when prompted..."
    scp psscript-deploy.tar.gz $SERVER_USER@$SERVER_IP:$SERVER_DIR/
    
    echo "🔧 Please enter password again to run deployment..."
    ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
cd /opt/psscript
tar -xzf psscript-deploy.tar.gz
./deploy.sh
ENDSSH
fi

# Cleanup
rm -rf deploy-package psscript-deploy.tar.gz

echo "✅ Deployment complete!"
echo "🌐 Your production PSScript is now available at: http://74.208.184.195"
echo "📱 You can also access it at: http://74.208.184.195:80"