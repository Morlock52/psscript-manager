#!/bin/bash

# Setup SSL/HTTPS for PSScript Production
set -e

echo "🔒 Setting up SSL/HTTPS for PSScript..."

SERVER_IP="74.208.184.195"
SERVER_USER="root"
SERVER_PASS="Morlock52"
DOMAIN="${1:-psscript.morloksmaze.com}"
EMAIL="${2:-admin@morloksmaze.com}"

echo "📝 Configuration:"
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo ""

# Create nginx config with SSL support
cat > nginx-ssl.conf << 'EOF'
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
    
    # HTTP to HTTPS redirect
    server {
        listen 80;
        server_name DOMAIN_PLACEHOLDER;
        
        # Allow Let's Encrypt verification
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        # Redirect all other traffic to HTTPS
        location / {
            return 301 https://$server_name$request_uri;
        }
    }
    
    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name DOMAIN_PLACEHOLDER;
        
        # SSL certificates (will be created by certbot)
        ssl_certificate /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/privkey.pem;
        
        # SSL configuration
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
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Content-Security-Policy "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' https:; media-src 'self' https:; object-src 'none'; frame-ancestors 'self'; base-uri 'self'; form-action 'self';" always;
        add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" always;
        
        # Frontend
        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;
            
            # Cache static assets
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
        }
        
        # API proxy with rate limiting
        location /api {
            # Rate limiting for API
            limit_req zone=api burst=20 nodelay;
            
            # Special rate limit for login
            location = /api/auth/login {
                limit_req zone=login burst=3 nodelay;
                proxy_pass http://backend:4000;
                include /etc/nginx/proxy_params;
            }
            
            proxy_pass http://backend:4000;
            include /etc/nginx/proxy_params;
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

# Create proxy params file
cat > proxy_params << 'EOF'
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection 'upgrade';
proxy_set_header Host $host;
proxy_cache_bypass $http_upgrade;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host $host;
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;
EOF

# Create docker-compose with SSL support
cat > docker-compose-ssl.yml << 'EOF'
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
      - ./nginx-ssl.conf:/etc/nginx/nginx.conf:ro
      - ./proxy_params:/etc/nginx/proxy_params:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - backend
    restart: unless-stopped
    command: "/bin/sh -c 'while :; do sleep 6h & wait $${!}; nginx -s reload; done & nginx -g \"daemon off;\"'"

  certbot:
    image: certbot/certbot
    container_name: psscript-certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"
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
    restart: unless-stopped

networks:
  default:
    name: psscript-network
EOF

# Setup script for server
cat > setup-ssl-server.sh << 'EOFSCRIPT'
#!/bin/bash
set -e

DOMAIN="DOMAIN_PLACEHOLDER"
EMAIL="EMAIL_PLACEHOLDER"

echo "🔒 Setting up SSL on server..."

# Update system
apt-get update -qq

# Install certbot if not present
if ! command -v certbot &> /dev/null; then
    apt-get install -y certbot
fi

# Create directories
mkdir -p /opt/psscript/certbot/{conf,www}
cd /opt/psscript

# Stop nginx temporarily
docker-compose stop nginx || true

# Replace domain in nginx config
sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" nginx-ssl.conf

# Create temporary nginx for cert generation
cat > nginx-temp.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name DOMAIN_PLACEHOLDER;
        
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        location / {
            return 404;
        }
    }
}
EOF

sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" nginx-temp.conf

# Start temporary nginx
docker run -d --name nginx-temp \
    -p 80:80 \
    -v $(pwd)/nginx-temp.conf:/etc/nginx/nginx.conf:ro \
    -v $(pwd)/certbot/www:/var/www/certbot:ro \
    nginx:alpine

# Wait for nginx to start
sleep 5

# Get SSL certificate
echo "📜 Obtaining SSL certificate..."
certbot certonly \
    --webroot \
    --webroot-path=/opt/psscript/certbot/www \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d $DOMAIN

# Stop temporary nginx
docker stop nginx-temp && docker rm nginx-temp

# Copy certificates to Docker volume
cp -r /etc/letsencrypt/* /opt/psscript/certbot/conf/

# Use SSL compose file
mv docker-compose.yml docker-compose.yml.bak
mv docker-compose-ssl.yml docker-compose.yml

# Start all services with SSL
docker-compose up -d

# Wait for services
sleep 20

# Setup auto-renewal cron
(crontab -l 2>/dev/null; echo "0 0,12 * * * cd /opt/psscript && docker-compose run --rm certbot renew") | crontab -

echo "✅ SSL setup complete!"
echo ""
echo "🔒 HTTPS Access:"
echo "https://$DOMAIN"
echo ""
echo "📊 Certificate info:"
certbot certificates
EOFSCRIPT

# Replace placeholders
sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" setup-ssl-server.sh
sed -i "s/EMAIL_PLACEHOLDER/$EMAIL/g" setup-ssl-server.sh

echo "📤 Deploying SSL configuration..."

# Upload files
sshpass -p "$SERVER_PASS" scp nginx-ssl.conf proxy_params docker-compose-ssl.yml setup-ssl-server.sh $SERVER_USER@$SERVER_IP:/opt/psscript/

# Execute SSL setup
sshpass -p "$SERVER_PASS" ssh $SERVER_USER@$SERVER_IP "cd /opt/psscript && chmod +x setup-ssl-server.sh && ./setup-ssl-server.sh"

# Cleanup
rm -f nginx-ssl.conf proxy_params docker-compose-ssl.yml setup-ssl-server.sh

echo ""
echo "✅ SSL/HTTPS Setup Complete!"
echo ""
echo "🔒 Secure Access:"
echo "https://$DOMAIN"
echo ""
echo "📧 Login Credentials:"
echo "Email: admin@example.com"
echo "Password: admin123!"
echo ""
echo "🛡️ Security Features:"
echo "• SSL/TLS encryption"
echo "• HTTP to HTTPS redirect"
echo "• Security headers (HSTS, CSP, etc.)"
echo "• Rate limiting on API endpoints"
echo "• Auto-renewal of SSL certificate"