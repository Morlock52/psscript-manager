#!/bin/bash

# PSScript IONOS Deployment Script
# Deploys PSScript to IONOS server with port 80 restrictions

set -e

# Server details
REMOTE_HOST="74.208.184.195"
REMOTE_USER="root"
REMOTE_PASS="Morlock52b"
REMOTE_APP_DIR="/opt/psscript"

echo "========================================="
echo "PSScript IONOS Deployment Script"
echo "========================================="
echo "Target: $REMOTE_USER@$REMOTE_HOST"
echo "App directory: $REMOTE_APP_DIR"
echo ""

# Create deployment package
echo "Creating deployment package..."
DEPLOY_DIR="psscript-ionos-$(date +%Y%m%d%H%M%S)"
mkdir -p "$DEPLOY_DIR"

# Copy essential files
echo "Copying application files..."
cp -r src "$DEPLOY_DIR/"
cp package*.json "$DEPLOY_DIR/"
cp wait-for-it.sh "$DEPLOY_DIR/"

# Create IONOS-specific docker-compose.yml
cat > "$DEPLOY_DIR/docker-compose.yml" << 'EOF'
version: '3.8'

services:
  # Nginx reverse proxy on port 80
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - frontend-static:/usr/share/nginx/html
    depends_on:
      - frontend
      - backend
    restart: unless-stopped
    networks:
      - psscript-network

  # Frontend service (Production Build)
  frontend:
    build:
      context: ./src/frontend
      dockerfile: Dockerfile.prod
    volumes:
      - frontend-static:/app/dist
    environment:
      - NODE_ENV=production
      - VITE_API_URL=/api
      - VITE_USE_MOCKS=false
    restart: unless-stopped
    networks:
      - psscript-network

  # Backend API service
  backend:
    build:
      context: ./src/backend
      dockerfile: Dockerfile.prod
    environment:
      - NODE_ENV=production
      - PORT=4000
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=psscript
      - DB_USER=postgres
      - DB_PASSWORD=postgres
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - AI_SERVICE_URL=http://ai-service:8000
      - DOCKER_ENV=true
      - JWT_SECRET=${JWT_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - postgres
      - redis
      - ai-service
    restart: unless-stopped
    networks:
      - psscript-network

  # AI analysis service
  ai-service:
    build:
      context: ./src/ai
      dockerfile: Dockerfile.prod
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - MOCK_MODE=${MOCK_MODE:-true}
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=psscript
      - DB_USER=postgres
      - DB_PASSWORD=postgres
    depends_on:
      - postgres
    restart: unless-stopped
    networks:
      - psscript-network

  # PostgreSQL with pgvector
  postgres:
    image: pgvector/pgvector:pg15
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./src/db/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
      - ./src/db/seeds/01-initial-data.sql:/docker-entrypoint-initdb.d/02-seed-data.sql
    environment:
      - POSTGRES_DB=psscript
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    restart: unless-stopped
    networks:
      - psscript-network

  # Redis for caching
  redis:
    image: redis:7.0-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - psscript-network

volumes:
  postgres_data:
  redis_data:
  frontend-static:

networks:
  psscript-network:
    driver: bridge
EOF

# Create IONOS-optimized nginx.conf
cat > "$DEPLOY_DIR/nginx.conf" << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    server {
        listen 80;
        server_name _;
        
        root /usr/share/nginx/html;
        index index.html;

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # API endpoints
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            
            proxy_pass http://backend:4000;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }

        # Static files
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # SPA routing
        location / {
            try_files $uri $uri/ /index.html;
        }
    }
}
EOF

# Create Dockerfile.prod for frontend (optimized)
cat > "$DEPLOY_DIR/src/frontend/Dockerfile.prod" << 'EOF'
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /app/dist
EXPOSE 80
EOF

# Create Dockerfile.prod for backend (optimized)
cat > "$DEPLOY_DIR/src/backend/Dockerfile.prod" << 'EOF'
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 4000
CMD ["node", "index.js"]
EOF

# Create Dockerfile.prod for AI service (optimized)
cat > "$DEPLOY_DIR/src/ai/Dockerfile.prod" << 'EOF'
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
EOF

# Create remote installation script
cat > "$DEPLOY_DIR/install-ionos.sh" << 'EOF'
#!/bin/bash
set -e

echo "========================================="
echo "PSScript IONOS Installation"
echo "========================================="

# Update system
echo "Updating system packages..."
apt-get update -y

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
else
    echo "Docker is already installed"
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
else
    echo "Docker Compose is already installed"
fi

# Check if port 80 is in use
echo "Checking port 80..."
if lsof -Pi :80 -sTCP:LISTEN -t >/dev/null ; then
    echo "Port 80 is in use. Stopping existing services..."
    # Try to stop common web services
    systemctl stop apache2 2>/dev/null || true
    systemctl stop nginx 2>/dev/null || true
    systemctl stop httpd 2>/dev/null || true
    
    # Disable them
    systemctl disable apache2 2>/dev/null || true
    systemctl disable nginx 2>/dev/null || true
    systemctl disable httpd 2>/dev/null || true
    
    # Kill any remaining processes on port 80
    fuser -k 80/tcp 2>/dev/null || true
    
    sleep 5
fi

# Create .env file
cat > .env << 'ENVEOF'
NODE_ENV=production
DOCKER_ENV=true
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)
OPENAI_API_KEY=
MOCK_MODE=true
ENVEOF

# Make scripts executable
chmod +x wait-for-it.sh

# Stop any existing containers
echo "Stopping existing containers..."
docker-compose down 2>/dev/null || true

# Pull base images
echo "Pulling Docker images..."
docker pull node:18-alpine
docker pull python:3.11-slim
docker pull pgvector/pgvector:pg15
docker pull redis:7.0-alpine
docker pull nginx:alpine

# Build and start services
echo "Building and starting services..."
docker-compose up -d --build

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 30

# Check service status
echo ""
echo "Checking service status..."
docker-compose ps

# Check if port 80 is accessible
if curl -s -o /dev/null -w "%{http_code}" http://localhost/health | grep -q "200"; then
    echo ""
    echo "✅ PSScript is running successfully!"
else
    echo ""
    echo "⚠️  PSScript may not be fully started yet. Check logs with: docker-compose logs"
fi

echo ""
echo "========================================="
echo "PSScript Installation Complete!"
echo "========================================="
echo ""
echo "Access the application at:"
echo "  - http://$HOSTNAME"
echo "  - http://$(hostname -I | awk '{print $1}')"
echo ""
echo "Default login credentials:"
echo "  - Username: admin"
echo "  - Password: admin123!"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop services: docker-compose down"
echo ""
EOF

chmod +x "$DEPLOY_DIR/install-ionos.sh"

# Create deployment tarball
TARBALL="${DEPLOY_DIR}.tar.gz"
echo "Creating deployment package: $TARBALL"
tar -czf "$TARBALL" "$DEPLOY_DIR"
rm -rf "$DEPLOY_DIR"

echo ""
echo "Deployment package created: $TARBALL"
echo ""

# Install sshpass if needed
if ! command -v sshpass &> /dev/null; then
    echo "Installing sshpass for automated deployment..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install hudochenkov/sshpass/sshpass 2>/dev/null || echo "Please install sshpass manually"
    fi
fi

# Deploy to server
echo "Starting deployment to IONOS server..."
echo ""

# Transfer package
echo "Transferring deployment package..."
sshpass -p "$REMOTE_PASS" scp -o StrictHostKeyChecking=no "$TARBALL" "$REMOTE_USER@$REMOTE_HOST:~/"

# Execute remote deployment
echo "Executing remote deployment..."
sshpass -p "$REMOTE_PASS" ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" << ENDSSH
    # Create app directory
    mkdir -p $REMOTE_APP_DIR
    cd $REMOTE_APP_DIR
    
    # Extract package
    tar -xzf ~/$TARBALL --strip-components=1
    
    # Run installation
    bash install-ionos.sh
ENDSSH

echo ""
echo "========================================="
echo "Deployment completed!"
echo "========================================="
echo ""
echo "The application should now be accessible at:"
echo "  - http://$REMOTE_HOST"
echo ""
echo "Use default credentials:"
echo "  - Username: admin"
echo "  - Password: admin123!"
echo ""
echo "To check status on the server:"
echo "  ssh $REMOTE_USER@$REMOTE_HOST"
echo "  cd $REMOTE_APP_DIR"
echo "  docker-compose ps"
echo "  docker-compose logs"
echo ""

# Clean up local tarball
rm -f "$TARBALL"