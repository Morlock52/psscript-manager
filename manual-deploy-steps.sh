#!/bin/bash

# Manual deployment steps for PSScript
# Run these commands one by one on the remote server

cat << 'EOF'
========================================
PSScript Manual Deployment Steps
========================================

Step 1: Connect to the server
------------------------------
ssh root@74.208.184.195
# Password: Morlock52b

Step 2: Update system and install Docker
----------------------------------------
# Update package lists
apt-get update -y

# Install required packages
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    software-properties-common

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -

# Add Docker repository
add-apt-repository \
   "deb [arch=amd64] https://download.docker.com/linux/ubuntu \
   $(lsb_release -cs) \
   stable"

# Install Docker
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io

# Start Docker
systemctl start docker
systemctl enable docker

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verify installations
docker --version
docker-compose --version

Step 3: Create application directory
------------------------------------
mkdir -p /opt/psscript
cd /opt/psscript

Step 4: Create minimal docker-compose.yml
-----------------------------------------
cat > docker-compose.yml << 'EOFDOCKER'
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=psscript
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7.0-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped

  backend:
    image: node:18-alpine
    working_dir: /app
    command: sh -c "npm install && npm run dev"
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=development
      - PORT=4000
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=psscript
      - DB_USER=postgres
      - DB_PASSWORD=postgres
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - JWT_SECRET=your-secret-key-here
      - USE_MOCK_AI=true
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  frontend:
    image: node:18-alpine
    working_dir: /app
    command: sh -c "npm install && npm run dev"
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=development
      - PORT=3002
      - VITE_API_URL=http://YOUR_SERVER_IP:4000/api
      - VITE_USE_MOCKS=false
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
EOFDOCKER

# IMPORTANT: Replace YOUR_SERVER_IP with actual IP
sed -i 's/YOUR_SERVER_IP/74.208.184.195/g' docker-compose.yml

Step 5: Create .env file
------------------------
cat > .env << 'EOFENV'
NODE_ENV=production
PORT=4000
DOCKER_ENV=true

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=psscript
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Security
JWT_SECRET=change-this-to-secure-random-string
SESSION_SECRET=change-this-to-another-secure-string

# AI Service
USE_MOCK_AI=true
OPENAI_API_KEY=your-openai-key-here

# Frontend
FRONTEND_URL=http://74.208.184.195:3002
CORS_ORIGIN=http://74.208.184.195:3002
EOFENV

Step 6: Configure firewall
--------------------------
# If using ufw
ufw allow 22/tcp
ufw allow 3002/tcp
ufw allow 4000/tcp
ufw allow 8000/tcp
ufw --force enable

# If using iptables
iptables -A INPUT -p tcp --dport 3002 -j ACCEPT
iptables -A INPUT -p tcp --dport 4000 -j ACCEPT
iptables -A INPUT -p tcp --dport 8000 -j ACCEPT
iptables-save > /etc/iptables/rules.v4

Step 7: Start basic services first
-----------------------------------
# Pull images
docker pull postgres:15
docker pull redis:7.0-alpine
docker pull node:18-alpine

# Start database and redis first
docker-compose up -d postgres redis

# Wait for them to be ready
sleep 30

# Check if they're running
docker-compose ps

Step 8: Test database connection
--------------------------------
# Test PostgreSQL
docker exec -it psscript_postgres_1 psql -U postgres -c "SELECT version();"

# Test Redis
docker exec -it psscript_redis_1 redis-cli ping

Step 9: Troubleshooting commands
--------------------------------
# Check all running containers
docker ps -a

# Check logs for a specific service
docker-compose logs postgres
docker-compose logs redis

# Check network connectivity
curl http://localhost:5432
curl http://localhost:6379

# Check disk space
df -h

# Check memory
free -h

# Remove all containers and start fresh
docker-compose down
docker system prune -a
docker-compose up -d

EOF