#!/bin/bash

# Setup Let's Encrypt SSL Certificate (Direct Method)
set -e

echo "🔒 Setting up Let's Encrypt SSL Certificate..."

SERVER_IP="74.208.184.195"
SERVER_USER="root"
SERVER_PASS="Morlock52"
DOMAIN="psscript.morloksmaze.com"
EMAIL="morlok52@gmail.com"

echo "📝 Configuration:"
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo ""

echo "⚠️  IMPORTANT: This requires your domain to point directly to the server"
echo "Current DNS points to Cloudflare. You need to:"
echo "1. Go to Cloudflare dashboard"
echo "2. Click on the orange cloud icon next to your A record"
echo "3. Turn it gray (DNS only mode)"
echo "4. Wait 5 minutes for DNS to propagate"
echo ""
echo "Press ENTER when ready or Ctrl+C to cancel..."
read

# Create setup script for server
cat > setup-letsencrypt-direct-server.sh << 'EOFSCRIPT'
#!/bin/bash
set -e

DOMAIN="psscript.morloksmaze.com"
EMAIL="morlok52@gmail.com"

echo "🔒 Installing Let's Encrypt on server..."

cd /opt/psscript

# Install certbot and nginx plugin
echo "Installing certbot..."
apt-get update -qq
apt-get install -y certbot python3-certbot-nginx

# Create webroot directory
mkdir -p /var/www/certbot

# Create temporary nginx config for verification
cat > nginx-certbot-temp.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name psscript.morloksmaze.com;
        
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;
        }
    }
}
EOF

# Stop current nginx
docker-compose stop nginx || true

# Run temporary nginx for cert verification
docker run -d --name nginx-certbot-temp \
    -p 80:80 \
    -v $(pwd)/nginx-certbot-temp.conf:/etc/nginx/nginx.conf:ro \
    -v $(pwd)/dist:/usr/share/nginx/html:ro \
    -v /var/www/certbot:/var/www/certbot:rw \
    nginx:alpine

# Wait for nginx
sleep 5

# Get certificate
echo "📜 Obtaining SSL certificate..."
certbot certonly \
    --webroot \
    --webroot-path /var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --domains $DOMAIN \
    --non-interactive

# Stop temporary nginx
docker stop nginx-certbot-temp && docker rm nginx-certbot-temp

# Create SSL directory
mkdir -p ssl/letsencrypt

# Copy certificates
echo "Copying certificates..."
cp -L /etc/letsencrypt/live/$DOMAIN/fullchain.pem ssl/letsencrypt/
cp -L /etc/letsencrypt/live/$DOMAIN/privkey.pem ssl/letsencrypt/
chmod 644 ssl/letsencrypt/*

# Create production nginx config
cat > nginx-letsencrypt.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Security
    server_tokens off;
    
    # Enable gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
    
    # HTTP redirect to HTTPS
    server {
        listen 80;
        server_name psscript.morloksmaze.com 74.208.184.195;
        
        # Allow Let's Encrypt renewal
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        # Redirect all to HTTPS
        location / {
            return 301 https://$host$request_uri;
        }
    }
    
    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name psscript.morloksmaze.com 74.208.184.195;
        
        # SSL certificates
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        
        # Modern SSL config
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_timeout 1d;
        ssl_session_cache shared:MozSSL:10m;
        ssl_session_tickets off;
        ssl_stapling on;
        ssl_stapling_verify on;
        
        # HSTS
        add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
        
        # Frontend
        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;
            
            # Cache static assets
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
        }
        
        # API proxy
        location /api {
            # Rate limiting
            limit_req zone=api burst=20 nodelay;
            
            # Special rate limit for login
            location = /api/auth/login {
                limit_req zone=login burst=3 nodelay;
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
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
EOF

# Create new docker-compose
cat > docker-compose-letsencrypt.yml << 'EOF'
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: psscript-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./dist:/usr/share/nginx/html:ro
      - ./nginx-letsencrypt.conf:/etc/nginx/nginx.conf:ro
      - ./ssl/letsencrypt/fullchain.pem:/etc/nginx/ssl/fullchain.pem:ro
      - ./ssl/letsencrypt/privkey.pem:/etc/nginx/ssl/privkey.pem:ro
      - /var/www/certbot:/var/www/certbot:ro
    depends_on:
      - backend
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  backend:
    image: node:18-alpine
    container_name: psscript-backend
    working_dir: /app
    command: sh -c "npm install && node mock-backend-fixed.js"
    environment:
      - PORT=4000
      - NODE_ENV=production
      - SECURE_COOKIES=true
      - TRUST_PROXY=true
    volumes:
      - ./mock-backend-fixed.js:/app/mock-backend-fixed.js:ro
      - ./package.json:/app/package.json:ro
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:4000/api/health"]
      interval: 10s
      timeout: 5s
      retries: 3

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
    command: redis-server --requirepass redis_secure_password
    restart: unless-stopped

networks:
  default:
    name: psscript-network
EOF

# Use new compose file
cp docker-compose-letsencrypt.yml docker-compose.yml

# Start services
docker-compose up -d

# Wait for services
sleep 15

# Test HTTPS
echo ""
echo "🔍 Testing HTTPS..."
curl -s https://$DOMAIN/health && echo " ✅ HTTPS is working!"

# Setup auto-renewal
echo ""
echo "⚙️  Setting up auto-renewal..."

# Create renewal script
cat > /opt/psscript/renew-ssl.sh << 'EOFRENEWAL'
#!/bin/bash
certbot renew --webroot --webroot-path /var/www/certbot --quiet --deploy-hook "cd /opt/psscript && cp -L /etc/letsencrypt/live/psscript.morloksmaze.com/*.pem ssl/letsencrypt/ && docker-compose restart nginx"
EOFRENEWAL

chmod +x /opt/psscript/renew-ssl.sh

# Add to cron
(crontab -l 2>/dev/null | grep -v "renew-ssl.sh"; echo "0 3 * * * /opt/psscript/renew-ssl.sh") | crontab -

echo "✅ Auto-renewal configured"

echo ""
echo "📊 Certificate info:"
certbot certificates

echo ""
echo "✅ Let's Encrypt SSL setup complete!"
EOFSCRIPT

echo "📤 Deploying Let's Encrypt setup..."

# First check DNS
echo "🔍 Checking if DNS is pointing directly to server..."
DNS_CHECK=$(dig +short $DOMAIN A | grep -c "^$SERVER_IP$" || true)

if [ "$DNS_CHECK" -eq 0 ]; then
    echo ""
    echo "⚠️  DNS is still pointing to Cloudflare!"
    echo "Please disable Cloudflare proxy first:"
    echo "1. Go to Cloudflare dashboard"
    echo "2. Find the A record for $DOMAIN"
    echo "3. Click the orange cloud to make it gray"
    echo "4. Wait 5 minutes"
    echo ""
    echo "Current DNS:"
    dig +short $DOMAIN A
    echo ""
    echo "Run this script again after changing DNS."
    exit 1
fi

echo "✅ DNS is pointing directly to server"

# Upload and execute
sshpass -p "$SERVER_PASS" scp setup-letsencrypt-direct-server.sh $SERVER_USER@$SERVER_IP:/opt/psscript/

echo "Executing setup on server..."
sshpass -p "$SERVER_PASS" ssh $SERVER_USER@$SERVER_IP "cd /opt/psscript && chmod +x setup-letsencrypt-direct-server.sh && ./setup-letsencrypt-direct-server.sh"

# Cleanup
rm -f setup-letsencrypt-direct-server.sh

echo ""
echo "✅ Let's Encrypt SSL Setup Complete!"
echo ""
echo "🔒 Your app now has a trusted SSL certificate!"
echo "Access at: https://$DOMAIN"
echo ""
echo "📧 Login: admin@example.com / admin123!"
echo ""
echo "🔍 Test your SSL:"
echo "https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"