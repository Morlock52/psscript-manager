#\!/bin/bash

# Quick deployment script for PSScript
set -e

SERVER="root@74.208.184.195"
PASSWORD="Morlock52"

echo "🚀 Quick PSScript Deployment"
echo "=========================="

# Build frontend
echo "📦 Building frontend..."
cd src/frontend
npm install
npm run build
cd ../..

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd src/backend
npm install
cd ../..

# Deploy using rsync
echo "📤 Deploying to server..."
sshpass -p "$PASSWORD" rsync -avz --exclude 'node_modules' --exclude '.git' \
  --exclude '.env' --exclude 'logs' --exclude '*.log' \
  ./ $SERVER:/var/www/psscript/

# Setup and start on server
echo "🔧 Setting up on server..."
sshpass -p "$PASSWORD" ssh $SERVER << 'ENDSSH'
cd /var/www/psscript

# Install backend dependencies on server
cd src/backend
npm install

# Create production .env file
cat > .env << 'ENVEOF'
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://psscript.morlocksmaze.com

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=psscript
DB_USER=psscript
DB_PASSWORD=psscript_secure_2025

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Security
JWT_SECRET=your_jwt_secret_here_2025
SESSION_SECRET=your_session_secret_here_2025
CORS_ORIGIN=https://psscript.morlocksmaze.com
ENVEOF

# Setup PostgreSQL database
sudo -u postgres psql << SQLEOF
CREATE DATABASE IF NOT EXISTS psscript;
CREATE USER IF NOT EXISTS psscript WITH ENCRYPTED PASSWORD 'psscript_secure_2025';
GRANT ALL PRIVILEGES ON DATABASE psscript TO psscript;
\c psscript
CREATE EXTENSION IF NOT EXISTS vector;
SQLEOF

# Run database migrations
cd /var/www/psscript
sudo -u postgres psql -d psscript < src/db/schema.sql

# Install PM2 if not installed
npm install -g pm2 || true

# Start backend with PM2
cd /var/www/psscript/src/backend
pm2 stop psscript-backend || true
pm2 delete psscript-backend || true
pm2 start npm --name psscript-backend -- run dev
pm2 save

# Setup Nginx
cat > /etc/nginx/sites-available/psscript << 'NGINX'
server {
    listen 80;
    server_name psscript.morlocksmaze.com;
    
    root /var/www/psscript/src/frontend/dist;
    index index.html;
    
    # Frontend
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # API proxy
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINX

# Enable site
ln -sf /etc/nginx/sites-available/psscript /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

echo "✅ Deployment complete\!"
pm2 status
ENDSSH

echo "🎉 Deployment successful\!"
echo "🌐 Visit: http://psscript.morlocksmaze.com"
