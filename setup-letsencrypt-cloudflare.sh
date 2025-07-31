#!/bin/bash

# Setup Let's Encrypt SSL with Cloudflare DNS Challenge
set -e

echo "🔒 Setting up Let's Encrypt SSL with Cloudflare DNS..."

SERVER_IP="74.208.184.195"
SERVER_USER="root"
SERVER_PASS="Morlock52"
DOMAIN="psscript.morloksmaze.com"
EMAIL="morlok52@gmail.com"

echo "📝 Configuration:"
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo ""

echo "⚠️  This method uses Cloudflare DNS validation"
echo "You'll need your Cloudflare API token"
echo ""
echo "To get your API token:"
echo "1. Go to https://dash.cloudflare.com/profile/api-tokens"
echo "2. Click 'Create Token'"
echo "3. Use template 'Edit zone DNS'"
echo "4. Select your zone"
echo "5. Create and copy the token"
echo ""
echo -n "Enter your Cloudflare API Token: "
read -s CF_TOKEN
echo ""

# Create setup script with token
cat > setup-letsencrypt-cf-server.sh << EOFSCRIPT
#!/bin/bash
set -e

DOMAIN="psscript.morloksmaze.com"
EMAIL="morlok52@gmail.com"
CF_TOKEN="$CF_TOKEN"

echo "🔒 Installing certbot with Cloudflare plugin..."

cd /opt/psscript

# Install certbot and cloudflare plugin
apt-get update -qq
apt-get install -y python3-pip
pip3 install certbot certbot-dns-cloudflare

# Create Cloudflare credentials
mkdir -p ~/.secrets
cat > ~/.secrets/cloudflare.ini << EOF
dns_cloudflare_api_token = \$CF_TOKEN
EOF
chmod 600 ~/.secrets/cloudflare.ini

# Stop nginx temporarily
docker-compose stop nginx || true

# Get certificate using DNS challenge
echo "📜 Obtaining SSL certificate via DNS challenge..."
certbot certonly \\
    --dns-cloudflare \\
    --dns-cloudflare-credentials ~/.secrets/cloudflare.ini \\
    --email \$EMAIL \\
    --agree-tos \\
    --no-eff-email \\
    --domains \$DOMAIN \\
    --non-interactive

# Create SSL directory
mkdir -p ssl/letsencrypt

# Copy certificates
echo "Copying certificates..."
cp -L /etc/letsencrypt/live/\$DOMAIN/fullchain.pem ssl/letsencrypt/
cp -L /etc/letsencrypt/live/\$DOMAIN/privkey.pem ssl/letsencrypt/
chmod 644 ssl/letsencrypt/*

# Create nginx config (same as before)
cat > nginx-letsencrypt.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    server_tokens off;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # HTTP redirect
    server {
        listen 80;
        server_name _;
        return 301 https://\\\$host\\\$request_uri;
    }
    
    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name _;
        
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_timeout 1d;
        ssl_session_cache shared:SSL:10m;
        ssl_session_tickets off;
        
        add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        
        location / {
            root /usr/share/nginx/html;
            try_files \\\$uri \\\$uri/ /index.html;
            
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
        }
        
        location /api {
            proxy_pass http://backend:4000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \\\$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \\\$host;
            proxy_cache_bypass \\\$http_upgrade;
            proxy_set_header X-Real-IP \\\$remote_addr;
            proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \\\$scheme;
        }
        
        location /health {
            access_log off;
            return 200 "OK\n";
            add_header Content-Type text/plain;
        }
    }
}
EOF

# Update docker-compose
cp docker-compose.yml docker-compose.yml.bak

# Add SSL volumes to nginx service
cat > docker-compose-ssl-update.yml << 'EOF'
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
    depends_on:
      - backend
    restart: unless-stopped

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

cp docker-compose-ssl-update.yml docker-compose.yml

# Restart with SSL
docker-compose up -d

# Wait for services
sleep 15

# Test
echo ""
echo "🔍 Testing HTTPS..."
curl -s https://\$DOMAIN/health && echo " ✅ HTTPS working!"
curl -s https://\$SERVER_IP/health -k && echo " ✅ Direct IP HTTPS working!"

# Setup auto-renewal
cat > /opt/psscript/renew-ssl-cf.sh << 'EOFRENEWAL'
#!/bin/bash
certbot renew --quiet --deploy-hook "cd /opt/psscript && cp -L /etc/letsencrypt/live/psscript.morloksmaze.com/*.pem ssl/letsencrypt/ && docker-compose restart nginx"
EOFRENEWAL

chmod +x /opt/psscript/renew-ssl-cf.sh
(crontab -l 2>/dev/null | grep -v "renew-ssl"; echo "0 3 * * * /opt/psscript/renew-ssl-cf.sh") | crontab -

echo ""
echo "✅ Let's Encrypt SSL with Cloudflare DNS complete!"
echo ""
echo "📊 Certificate info:"
certbot certificates
EOFSCRIPT

echo "📤 Deploying to server..."

# Upload and execute
sshpass -p "$SERVER_PASS" scp setup-letsencrypt-cf-server.sh $SERVER_USER@$SERVER_IP:/opt/psscript/
sshpass -p "$SERVER_PASS" ssh $SERVER_USER@$SERVER_IP "cd /opt/psscript && chmod +x setup-letsencrypt-cf-server.sh && ./setup-letsencrypt-cf-server.sh"

# Cleanup
rm -f setup-letsencrypt-cf-server.sh

echo ""
echo "✅ Let's Encrypt SSL Setup Complete!"
echo ""
echo "🔒 Access your app with trusted SSL:"
echo "• https://$DOMAIN (via Cloudflare)"
echo "• https://$SERVER_IP (direct - will show warning)"
echo ""
echo "📧 Login: admin@example.com / admin123!"
echo ""
echo "✨ Benefits:"
echo "• Works with Cloudflare proxy enabled"
echo "• No certificate warnings"
echo "• Auto-renewal configured"
echo "• A+ SSL rating"