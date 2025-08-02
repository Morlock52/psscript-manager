#!/bin/bash

# PSScript Deployment Script to Ubuntu Server
# Server: 74.208.184.195
# Domain: psscript.morlocksmaze.com

set -e

echo "🚀 Starting PSScript deployment to production server..."

# Configuration
SERVER_IP="74.208.184.195"
SERVER_USER="root"
DOMAIN="psscript.morlocksmaze.com"
REMOTE_APP_DIR="/var/www/psscript"
LOCAL_DIR="$(pwd)"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}📦 Building frontend...${NC}"
cd src/frontend
npm install
npm run build
cd ../..

echo -e "${YELLOW}📦 Building backend...${NC}"
cd src/backend
npm install
# Skip TypeScript build for now, will run from source
cd ../..

echo -e "${YELLOW}📤 Creating deployment package...${NC}"
# Create temporary deployment directory
rm -rf .deploy-tmp
mkdir -p .deploy-tmp

# Copy necessary files
cp -r src/backend/src .deploy-tmp/backend
cp -r src/backend/node_modules .deploy-tmp/backend/
cp src/backend/package.json .deploy-tmp/backend/
cp src/backend/tsconfig.json .deploy-tmp/backend/
cp -r src/frontend/dist .deploy-tmp/frontend
cp -r src/db .deploy-tmp/

# Create production environment file
cat > .deploy-tmp/backend/.env << EOF
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://psscript.morlocksmaze.com

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=psscript
DB_USER=psscript
DB_PASSWORD=psscript_secure_password_2025

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Configuration
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)

# Session Configuration
SESSION_SECRET=$(openssl rand -base64 32)

# API Keys (to be configured)
OPENAI_API_KEY=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Security
CORS_ORIGIN=https://psscript.morlocksmaze.com
EOF

# Create deployment archive
tar -czf deployment.tar.gz -C .deploy-tmp .

echo -e "${YELLOW}🚀 Deploying to server...${NC}"
# Transfer files to server
scp deployment.tar.gz $SERVER_USER@$SERVER_IP:/tmp/

# Execute deployment on server
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
set -e

echo "📁 Setting up application directory..."
mkdir -p /var/www/psscript
cd /var/www/psscript

echo "📦 Extracting deployment package..."
tar -xzf /tmp/deployment.tar.gz
rm /tmp/deployment.tar.gz

echo "🐘 Setting up PostgreSQL..."
# Install PostgreSQL if not already installed
if ! command -v psql &> /dev/null; then
    apt-get update
    apt-get install -y postgresql postgresql-contrib
fi

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE IF NOT EXISTS psscript;
CREATE USER IF NOT EXISTS psscript WITH ENCRYPTED PASSWORD 'psscript_secure_password_2025';
GRANT ALL PRIVILEGES ON DATABASE psscript TO psscript;
ALTER DATABASE psscript OWNER TO psscript;
EOF

echo "🔄 Running database migrations..."
cd /var/www/psscript
sudo -u postgres psql -d psscript < db/schema.sql
for migration in db/migrations/*.sql; do
    echo "Running migration: $migration"
    sudo -u postgres psql -d psscript < "$migration"
done

echo "🔴 Setting up Redis..."
# Install Redis if not already installed
if ! command -v redis-server &> /dev/null; then
    apt-get install -y redis-server
    systemctl enable redis-server
    systemctl start redis-server
fi

echo "🔧 Installing PM2..."
npm install -g pm2

echo "🚀 Starting backend with PM2..."
cd /var/www/psscript/backend
pm2 stop psscript-backend || true
pm2 delete psscript-backend || true
# Use ts-node to run TypeScript directly
npm install -g ts-node typescript
pm2 start npm --name psscript-backend -- run dev
pm2 save
pm2 startup systemd -u root --hp /root

echo "🌐 Setting up Nginx..."
# Install Nginx if not already installed
if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx
fi

# Create Nginx configuration
cat > /etc/nginx/sites-available/psscript << 'NGINX'
server {
    listen 80;
    server_name psscript.morlocksmaze.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name psscript.morlocksmaze.com;
    
    # SSL certificates (to be configured with Let's Encrypt)
    # ssl_certificate /etc/letsencrypt/live/psscript.morlocksmaze.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/psscript.morlocksmaze.com/privkey.pem;
    
    root /var/www/psscript/frontend;
    index index.html;
    
    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://psscript.morlocksmaze.com;" always;
    
    # Frontend routes
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API proxy
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
NGINX

# Enable site
ln -sf /etc/nginx/sites-available/psscript /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t
systemctl reload nginx

echo "🔒 Setting up SSL with Let's Encrypt..."
# Install Certbot if not already installed
if ! command -v certbot &> /dev/null; then
    apt-get install -y certbot python3-certbot-nginx
fi

# Uncomment after DNS is properly configured
# certbot --nginx -d psscript.morlocksmaze.com --non-interactive --agree-tos --email admin@morlocksmaze.com

echo "🔥 Setting up firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "✅ Deployment complete!"
echo "📊 Checking application status..."
pm2 status
systemctl status nginx
systemctl status redis-server
systemctl status postgresql

ENDSSH

# Cleanup
rm -rf .deploy-tmp
rm -f deployment.tar.gz

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Your application should be accessible at: https://psscript.morlocksmaze.com${NC}"
echo -e "${YELLOW}📝 Note: SSL certificate needs to be configured after DNS propagation${NC}"