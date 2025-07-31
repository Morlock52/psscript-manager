#!/bin/bash

# Setup Let's Encrypt SSL Certificate for PSScript
set -e

echo "🔒 Setting up Let's Encrypt SSL Certificate..."

SERVER_IP="74.208.184.195"
SERVER_USER="root"
SERVER_PASS="Morlock52"
DOMAIN="psscript.morloksmaze.com"
EMAIL="admin@morloksmaze.com"

echo "📝 Configuration:"
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo ""

# Check DNS first
echo "🔍 Checking DNS configuration..."
DNS_IP=$(dig +short $DOMAIN A | head -n1)
if [ "$DNS_IP" = "$SERVER_IP" ]; then
    echo "✅ DNS is configured correctly ($DOMAIN -> $SERVER_IP)"
else
    echo "⚠️  WARNING: DNS not configured or pointing to different IP"
    echo "   Expected: $SERVER_IP"
    echo "   Got: ${DNS_IP:-NOT FOUND}"
    echo ""
    echo "Do you want to continue anyway? (y/n)"
    read -r response
    if [ "$response" != "y" ]; then
        echo "Please configure DNS first:"
        echo "Add an A record: $DOMAIN -> $SERVER_IP"
        exit 1
    fi
fi

# Create setup script for server
cat > setup-letsencrypt-server.sh << 'EOFSCRIPT'
#!/bin/bash
set -e

DOMAIN="psscript.morloksmaze.com"
EMAIL="admin@morloksmaze.com"

echo "🔒 Installing Let's Encrypt on server..."

cd /opt/psscript

# Stop nginx to free port 80
echo "Stopping nginx..."
docker-compose stop nginx

# Install certbot
echo "Installing certbot..."
apt-get update -qq
apt-get install -y certbot

# Get certificate using standalone mode
echo "📜 Obtaining SSL certificate..."
certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email $EMAIL \
    --domains $DOMAIN \
    --keep-until-expiring

# Create directories for Docker
mkdir -p ssl/letsencrypt

# Copy certificates
echo "Copying certificates..."
cp -L /etc/letsencrypt/live/$DOMAIN/fullchain.pem ssl/letsencrypt/
cp -L /etc/letsencrypt/live/$DOMAIN/privkey.pem ssl/letsencrypt/
chmod 644 ssl/letsencrypt/*

# Create nginx config with Let's Encrypt SSL
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
    
    # HTTP server - redirect to HTTPS
    server {
        listen 80;
        server_name _;
        
        # Allow Let's Encrypt renewal
        location /.well-known/acme-challenge/ {
            root /var/www/letsencrypt;
        }
        
        # Redirect everything else to HTTPS
        location / {
            return 301 https://$host$request_uri;
        }
    }
    
    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name _;
        
        # Let's Encrypt SSL certificates
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        
        # Modern SSL configuration
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_timeout 1d;
        ssl_session_cache shared:SSL:10m;
        ssl_session_tickets off;
        ssl_stapling on;
        ssl_stapling_verify on;
        
        # Security headers
        add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        
        # Frontend
        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;
            
            # Security headers for static files
            add_header X-Content-Type-Options "nosniff" always;
            
            # Cache static assets
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
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
            proxy_set_header X-Forwarded-Host $host;
            
            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }
        
        # Health check
        location /health {
            access_log off;
            return 200 "OK\n";
            add_header Content-Type text/plain;
        }
    }
}
EOF

# Update docker-compose to use Let's Encrypt certificates
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
      - ./letsencrypt-www:/var/www/letsencrypt:ro
    depends_on:
      - backend
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-check-certificate", "-q", "--spider", "https://localhost/health"]
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

# Create directory for Let's Encrypt challenges
mkdir -p letsencrypt-www

# Use new compose file
cp docker-compose-letsencrypt.yml docker-compose.yml

# Start services with Let's Encrypt SSL
docker-compose up -d

# Wait for services
echo "⏳ Waiting for services to start..."
sleep 20

# Test HTTPS
echo ""
echo "🔍 Testing HTTPS with Let's Encrypt certificate..."
curl -s https://$DOMAIN/health && echo " ✅ HTTPS is working with trusted certificate!"

# Setup auto-renewal
echo ""
echo "⚙️  Setting up auto-renewal..."

# Create renewal script
cat > /etc/cron.daily/psscript-ssl-renew << 'EOFRENEW'
#!/bin/bash
cd /opt/psscript
certbot renew --quiet --deploy-hook "cp -L /etc/letsencrypt/live/psscript.morloksmaze.com/*.pem /opt/psscript/ssl/letsencrypt/ && docker-compose restart nginx"
EOFRENEW

chmod +x /etc/cron.daily/psscript-ssl-renew

echo "✅ Auto-renewal configured"

echo ""
echo "📊 Service status:"
docker-compose ps

echo ""
echo "✅ Let's Encrypt SSL setup complete!"
echo ""
echo "🔒 Certificate Information:"
certbot certificates
EOFSCRIPT

echo "📤 Deploying Let's Encrypt setup..."

# Upload setup script
sshpass -p "$SERVER_PASS" scp setup-letsencrypt-server.sh $SERVER_USER@$SERVER_IP:/opt/psscript/

# Execute setup
sshpass -p "$SERVER_PASS" ssh $SERVER_USER@$SERVER_IP "cd /opt/psscript && chmod +x setup-letsencrypt-server.sh && ./setup-letsencrypt-server.sh"

# Cleanup
rm -f setup-letsencrypt-server.sh

echo ""
echo "✅ Let's Encrypt SSL Setup Complete!"
echo ""
echo "🔒 Secure Access (with trusted certificate):"
echo "https://$DOMAIN"
echo ""
echo "✨ Benefits:"
echo "• No more certificate warnings"
echo "• Trusted by all browsers"
echo "• Auto-renewal configured"
echo "• Grade A SSL configuration"
echo ""
echo "📧 Login Credentials:"
echo "Email: admin@example.com"
echo "Password: admin123!"
echo ""
echo "🔍 Test your SSL configuration:"
echo "https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"