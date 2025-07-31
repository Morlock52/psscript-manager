#!/bin/bash

# Simple SSL Setup for PSScript
set -e

echo "🔒 Setting up SSL for PSScript..."

SERVER_IP="74.208.184.195"
SERVER_USER="root"
SERVER_PASS="Morlock52"

# Create self-signed certificate for immediate HTTPS
cat > create-ssl-cert.sh << 'EOF'
#!/bin/bash
set -e

cd /opt/psscript

echo "🔒 Creating SSL certificate..."

# Create SSL directory
mkdir -p ssl

# Generate self-signed certificate (valid for 1 year)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout ssl/server.key \
    -out ssl/server.crt \
    -subj "/C=US/ST=State/L=City/O=PSScript/CN=psscript.local"

# Create Diffie-Hellman parameter for enhanced security
openssl dhparam -out ssl/dhparam.pem 2048

echo "✅ SSL certificate created"
EOF

# Create nginx config with SSL
cat > nginx-https.conf << 'EOF'
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
        return 301 https://$host$request_uri;
    }
    
    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name _;
        
        # SSL configuration
        ssl_certificate /etc/nginx/ssl/server.crt;
        ssl_certificate_key /etc/nginx/ssl/server.key;
        ssl_dhparam /etc/nginx/ssl/dhparam.pem;
        
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_timeout 1d;
        ssl_session_cache shared:MozSSL:10m;
        ssl_session_tickets off;
        
        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
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

# Create docker-compose with SSL
cat > docker-compose-https.yml << 'EOF'
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
      - ./nginx-https.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
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

echo "📤 Deploying SSL configuration..."

# Upload files
sshpass -p "$SERVER_PASS" scp create-ssl-cert.sh nginx-https.conf docker-compose-https.yml $SERVER_USER@$SERVER_IP:/opt/psscript/

# Execute SSL setup
sshpass -p "$SERVER_PASS" ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
cd /opt/psscript

# Make script executable
chmod +x create-ssl-cert.sh

# Generate SSL certificate
./create-ssl-cert.sh

# Backup current setup
cp docker-compose.yml docker-compose-http.yml.bak 2>/dev/null || true

# Stop current services
docker-compose down

# Use HTTPS compose file
cp docker-compose-https.yml docker-compose.yml

# Update nginx config
cp nginx-https.conf nginx.conf

# Start services with HTTPS
docker-compose up -d

# Wait for services
echo "⏳ Waiting for services to start..."
sleep 20

# Test HTTPS
echo ""
echo "🔍 Testing HTTPS..."
curl -k https://localhost/health && echo " ✅ HTTPS is working!"

echo ""
echo "📊 Service status:"
docker-compose ps

echo ""
echo "✅ SSL/HTTPS setup complete!"
ENDSSH

# Cleanup
rm -f create-ssl-cert.sh nginx-https.conf docker-compose-https.yml

echo ""
echo "✅ SSL/HTTPS Setup Complete!"
echo ""
echo "🔒 Secure Access:"
echo "https://$SERVER_IP"
echo ""
echo "⚠️  Note: You'll see a certificate warning because it's self-signed."
echo "This is normal. Click 'Advanced' and 'Proceed' to continue."
echo ""
echo "📧 Login Credentials:"
echo "Email: admin@example.com"
echo "Password: admin123!"
echo ""
echo "🛡️ Security Features Enabled:"
echo "• HTTPS encryption (TLS 1.2/1.3)"
echo "• HTTP to HTTPS auto-redirect"
echo "• Security headers (HSTS, X-Frame-Options, etc.)"
echo "• Secure session cookies"
echo ""
echo "🌐 For production with a domain:"
echo "Run: ./setup-ssl.sh yourdomain.com your@email.com"
echo "This will set up Let's Encrypt certificates"