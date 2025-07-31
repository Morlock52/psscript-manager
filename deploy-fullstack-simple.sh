#!/bin/bash

# Simple Full Stack Deployment for PSScript
set -e

echo "🚀 Deploying PSScript Full Stack to IONOS..."

SERVER_IP="74.208.184.195"
SERVER_USER="root"
SERVER_PASS="Morlock52"

# Create deployment files
echo "📦 Creating deployment package..."

# Create docker-compose for full stack
cat > docker-compose-prod.yml << 'EOFDOCKER'
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: psscript-nginx
    ports:
      - "80:80"
    volumes:
      - ./dist:/usr/share/nginx/html:ro
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - backend
    restart: unless-stopped

  backend:
    image: node:18-alpine
    container_name: psscript-backend
    working_dir: /app
    command: sh -c "npm install && npm run build && npm start"
    environment:
      - NODE_ENV=production
      - PORT=4000
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=psscript
      - DB_USER=postgres
      - DB_PASSWORD=postgres
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=production_jwt_secret_key_here
      - AI_SERVICE_URL=http://ai-service:8000
    volumes:
      - ./backend:/app
      - /app/node_modules
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:4000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  ai-service:
    image: python:3.11-slim
    container_name: psscript-ai
    working_dir: /app
    command: sh -c "pip install -r requirements.txt && uvicorn main:app --host 0.0.0.0 --port 8000"
    environment:
      - MOCK_MODE=true
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=psscript
      - DB_USER=postgres
      - DB_PASSWORD=postgres
    volumes:
      - ./ai:/app
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: pgvector/pgvector:pg15
    container_name: psscript-postgres
    environment:
      - POSTGRES_DB=psscript
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro
      - ./db/seeds/01-initial-data.sql:/docker-entrypoint-initdb.d/02-seed.sql:ro
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: psscript-redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:

networks:
  default:
    name: psscript-network
EOFDOCKER

# Create nginx config
cat > nginx.conf << 'EOFNGINX'
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
EOFNGINX

# Create deployment archive
echo "📦 Creating deployment archive..."
mkdir -p deploy-temp
cp nginx.conf docker-compose-prod.yml deploy-temp/
cp -r src/frontend/dist deploy-temp/
cp -r src/backend deploy-temp/
cp -r src/ai deploy-temp/
cp -r src/db deploy-temp/
cd deploy-temp
tar -czf ../fullstack-deploy.tar.gz .
cd ..
rm -rf deploy-temp

# Deploy to server
echo "📤 Deploying to server..."

if command -v sshpass &> /dev/null; then
    # Stop existing containers
    sshpass -p "$SERVER_PASS" ssh $SERVER_USER@$SERVER_IP << 'EOF'
cd /opt/psscript
docker-compose down 2>/dev/null || true
docker stop $(docker ps -q) 2>/dev/null || true
EOF

    # Upload new deployment
    sshpass -p "$SERVER_PASS" scp fullstack-deploy.tar.gz $SERVER_USER@$SERVER_IP:/opt/psscript/
    
    # Extract and start services
    sshpass -p "$SERVER_PASS" ssh $SERVER_USER@$SERVER_IP << 'EOF'
cd /opt/psscript
tar -xzf fullstack-deploy.tar.gz
mv docker-compose-prod.yml docker-compose.yml
docker-compose up -d

echo "⏳ Waiting for services to start..."
sleep 60

echo "📊 Service status:"
docker-compose ps

echo "🔍 Checking health..."
curl -s http://localhost/health && echo "✅ Nginx is healthy"
curl -s http://localhost/api/health && echo "✅ API is healthy"

echo "✅ Deployment complete!"
EOF

else
    echo "⚠️  sshpass not found. Manual deployment required."
    echo "1. Copy fullstack-deploy.tar.gz to server"
    echo "2. Extract and run docker-compose up -d"
fi

# Cleanup
rm -f nginx.conf docker-compose-prod.yml fullstack-deploy.tar.gz

echo "✅ Full stack deployment complete!"
echo "🌐 Access PSScript at: http://$SERVER_IP"
echo "📧 Login: admin@example.com"
echo "🔑 Password: admin123!"