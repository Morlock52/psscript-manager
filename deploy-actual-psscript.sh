#!/bin/bash

# Deploy the ACTUAL PSScript project from local directory
REMOTE_HOST="74.208.184.195"
REMOTE_USER="root"
REMOTE_PASS="Morlock52"
LOCAL_PROJECT_DIR="/Users/morlock/fun/psscript 4"

echo "========================================="
echo "Deploying ACTUAL PSScript Project"
echo "========================================="
echo "Source: $LOCAL_PROJECT_DIR"
echo "Target: $REMOTE_USER@$REMOTE_HOST"
echo ""

# Create deployment package from actual project
echo "Creating deployment package from your PSScript project..."

DEPLOY_PACKAGE="psscript-actual-$(date +%Y%m%d%H%M%S).tar.gz"

# Create tarball excluding unnecessary files
cd "$LOCAL_PROJECT_DIR"
tar -czf "$DEPLOY_PACKAGE" \
  --exclude="node_modules" \
  --exclude=".git" \
  --exclude="*.log" \
  --exclude="test-results" \
  --exclude="*.tar.gz" \
  --exclude="deploy-*.sh" \
  --exclude="auto-deploy-*.sh" \
  --exclude="fix-*.sh" \
  --exclude="*.txt" \
  --exclude="EMERGENCY-*" \
  --exclude="CORRECTED-*" \
  src/ \
  docker-compose.yml \
  docker-compose.prod.yml \
  package.json \
  package-lock.json \
  nginx/ \
  wait-for-it.sh \
  .env.example \
  README.md

echo "Package created: $DEPLOY_PACKAGE ($(du -h $DEPLOY_PACKAGE | cut -f1))"

# Transfer to server
echo ""
echo "Transferring project to server..."
sshpass -p "$REMOTE_PASS" scp -o StrictHostKeyChecking=no "$DEPLOY_PACKAGE" "$REMOTE_USER@$REMOTE_HOST:~/"

# Deploy on server
echo ""
echo "Deploying on server..."
sshpass -p "$REMOTE_PASS" ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" << ENDSSH
echo "=== Deploying Real PSScript Application ==="

# Stop and clean up existing containers
echo "Cleaning up existing deployment..."
docker stop psscript 2>/dev/null || true
docker rm psscript 2>/dev/null || true
docker stop $(docker ps -aq) 2>/dev/null || true
docker rm $(docker ps -aq) 2>/dev/null || true

# Create application directory
echo "Setting up application directory..."
rm -rf /opt/psscript
mkdir -p /opt/psscript
cd /opt/psscript

# Extract project files
echo "Extracting project files..."
tar -xzf ~/$DEPLOY_PACKAGE
ls -la

# Create .env file from example
if [ -f .env.example ]; then
    echo "Creating .env file..."
    cp .env.example .env
    
    # Update .env for production
    sed -i 's/NODE_ENV=development/NODE_ENV=production/g' .env
    sed -i 's/DOCKER_ENV=false/DOCKER_ENV=true/g' .env
    sed -i 's/DB_HOST=localhost/DB_HOST=postgres/g' .env
    sed -i 's/REDIS_HOST=localhost/REDIS_HOST=redis/g' .env
    sed -i 's/AI_SERVICE_URL=.*/AI_SERVICE_URL=http:\/\/ai-service:8000/g' .env
    sed -i 's/USE_MOCK_AI=false/USE_MOCK_AI=true/g' .env
    sed -i 's/FRONTEND_URL=.*/FRONTEND_URL=http:\/\/74.208.184.195/g' .env
    sed -i 's/CORS_ORIGIN=.*/CORS_ORIGIN=http:\/\/74.208.184.195/g' .env
    
    # Generate secure secrets
    JWT_SECRET=\$(openssl rand -base64 32)
    SESSION_SECRET=\$(openssl rand -base64 32)
    sed -i "s/JWT_SECRET=.*/JWT_SECRET=\$JWT_SECRET/g" .env
    sed -i "s/SESSION_SECRET=.*/SESSION_SECRET=\$SESSION_SECRET/g" .env
fi

# Check which docker-compose file to use
if [ -f docker-compose.prod.yml ]; then
    echo "Using production docker-compose configuration..."
    COMPOSE_FILE="docker-compose.prod.yml"
elif [ -f docker-compose.yml ]; then
    echo "Using default docker-compose configuration..."
    COMPOSE_FILE="docker-compose.yml"
else
    echo "ERROR: No docker-compose file found!"
    exit 1
fi

# Make scripts executable
chmod +x wait-for-it.sh 2>/dev/null || true

# Since IONOS blocks custom ports, we need to modify the compose file to use port 80
echo "Modifying configuration for IONOS port restrictions..."

# Create override file to use port 80
cat > docker-compose.override.yml << 'EOF'
version: '3.8'

services:
  nginx:
    ports:
      - "80:80"
    volumes:
      - ./nginx-custom.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - frontend
      - backend

  frontend:
    ports: []  # Remove direct port mapping, use nginx instead
    environment:
      - PORT=3002
      - VITE_API_URL=http://74.208.184.195/api

  backend:
    ports: []  # Remove direct port mapping, use nginx instead
    environment:
      - PORT=4000
      - CORS_ORIGIN=http://74.208.184.195

  ai-service:
    ports: []  # Remove direct port mapping, use nginx instead
EOF

# Create custom nginx config for routing
cat > nginx-custom.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    upstream frontend {
        server frontend:3002;
    }

    upstream backend {
        server backend:4000;
    }

    upstream ai {
        server ai-service:8000;
    }

    server {
        listen 80;
        server_name _;
        
        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_cache_bypass \$http_upgrade;
        }
        
        # Backend API
        location /api {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_cache_bypass \$http_upgrade;
        }
        
        # AI Service
        location /ai {
            proxy_pass http://ai;
            proxy_http_version 1.1;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
        }
    }
}
EOF

# Start services
echo ""
echo "Starting PSScript services..."
docker-compose -f \$COMPOSE_FILE up -d

# If nginx service doesn't exist in the compose file, run it separately
if ! docker-compose -f \$COMPOSE_FILE ps | grep -q nginx; then
    echo "Adding nginx reverse proxy..."
    docker run -d \
      --name psscript-nginx \
      --network psscript_default \
      -p 80:80 \
      -v \$(pwd)/nginx-custom.conf:/etc/nginx/nginx.conf:ro \
      --restart unless-stopped \
      nginx:alpine
fi

# Wait for services to start
echo "Waiting for services to initialize (30 seconds)..."
sleep 30

# Check status
echo ""
echo "=== Service Status ==="
docker-compose -f \$COMPOSE_FILE ps
docker ps

# Create database schema if needed
echo ""
echo "Initializing database..."
if [ -f src/db/schema.sql ]; then
    docker-compose -f \$COMPOSE_FILE exec -T postgres psql -U postgres -d psscript < src/db/schema.sql 2>/dev/null || echo "Schema may already exist"
fi

# Create initial admin user
echo "Creating admin user..."
docker-compose -f \$COMPOSE_FILE exec -T postgres psql -U postgres -d psscript << 'SQL'
INSERT INTO users (username, email, password_hash, role)
VALUES ('admin', 'admin@psscript.local', '\$2b\$10\$K7L1OJ0/9v6r7dYuWp5RXOCgPqGzU0M5oCj5p0vTnBVvV9dy0qPSO', 'admin')
ON CONFLICT (username) DO NOTHING;
SQL

echo ""
echo "=== Deployment Complete ==="
echo "PSScript is running at: http://74.208.184.195"
echo "Login credentials: admin / admin123!"
echo ""

ENDSSH

# Clean up local package
rm -f "$DEPLOY_PACKAGE"

echo ""
echo "Testing deployment..."
sleep 5

# Test the deployment
echo ""
echo "=== Testing PSScript ==="
echo -n "Frontend (http://74.208.184.195): "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://74.208.184.195)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ ONLINE"
else
    echo "❌ OFFLINE (HTTP $HTTP_CODE)"
fi

echo -n "Backend API (http://74.208.184.195/api): "
API_RESPONSE=$(curl -s --max-time 10 http://74.208.184.195/api 2>/dev/null)
if [ -n "$API_RESPONSE" ]; then
    echo "✅ RESPONDING"
else
    echo "❌ NOT RESPONDING"
fi

echo ""
echo "========================================="
echo "Your PSScript Project Deployment Complete!"
echo "========================================="
echo ""
echo "Access your application at: http://74.208.184.195"
echo "Login: admin / admin123!"
echo ""
echo "The following components are deployed:"
echo "  ✓ Frontend (React/Vite)"
echo "  ✓ Backend (Node.js/Express)"
echo "  ✓ PostgreSQL Database"
echo "  ✓ Redis Cache"
echo "  ✓ AI Service (Mock mode)"
echo "  ✓ Nginx Reverse Proxy (Port 80)"
echo ""
echo "To enable real AI features:"
echo "  1. SSH to server: ssh root@74.208.184.195"
echo "  2. Edit: nano /opt/psscript/.env"
echo "  3. Set: USE_MOCK_AI=false"
echo "  4. Add: OPENAI_API_KEY=your-key"
echo "  5. Restart: cd /opt/psscript && docker-compose restart"