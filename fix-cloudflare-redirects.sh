#!/bin/bash

# Complete Fix for Cloudflare Redirect Issues
set -e

echo "🔧 Applying comprehensive redirect fix..."

SERVER_IP="74.208.184.195"
SERVER_USER="root"
SERVER_PASS="Morlock52"

# Create nginx config with NO redirects
cat > nginx-no-redirects.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Security and performance
    server_tokens off;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
    
    # HTTP server - NO REDIRECTS
    server {
        listen 80;
        server_name _;
        
        # Basic security headers for HTTP
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        
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
        
        # API endpoints
        location /api {
            limit_req zone=api burst=20 nodelay;
            
            location = /api/auth/login {
                limit_req zone=login burst=3 nodelay;
                proxy_pass http://backend:4000;
                proxy_http_version 1.1;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $http_x_forwarded_proto;
            }
            
            proxy_pass http://backend:4000;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $http_x_forwarded_proto;
        }
        
        # Health check
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
        
        # Debug endpoint
        location /debug {
            access_log off;
            return 200 "Server: HTTP\nHost: $host\nX-Forwarded-Proto: $http_x_forwarded_proto\nCloudflare-Ray: $http_cf_ray\n";
            add_header Content-Type text/plain;
        }
    }
    
    # HTTPS server (for direct access)
    server {
        listen 443 ssl http2;
        server_name _;
        
        # SSL configuration
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        
        # Modern SSL settings
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_timeout 1d;
        ssl_session_cache shared:SSL:10m;
        ssl_session_tickets off;
        
        # Security headers for HTTPS
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        
        # Frontend
        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;
            
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
        }
        
        # API endpoints
        location /api {
            limit_req zone=api burst=20 nodelay;
            
            location = /api/auth/login {
                limit_req zone=login burst=3 nodelay;
                proxy_pass http://backend:4000;
                proxy_http_version 1.1;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto https;
            }
            
            proxy_pass http://backend:4000;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto https;
        }
        
        # Health check
        location /health {
            access_log off;
            return 200 "healthy-ssl\n";
            add_header Content-Type text/plain;
        }
        
        # Debug endpoint
        location /debug {
            access_log off;
            return 200 "Server: HTTPS\nHost: $host\nSSL: Active\n";
            add_header Content-Type text/plain;
        }
    }
}
EOF

echo "📤 Deploying no-redirect configuration..."

# Upload and apply
sshpass -p "$SERVER_PASS" scp nginx-no-redirects.conf $SERVER_USER@$SERVER_IP:/opt/psscript/

sshpass -p "$SERVER_PASS" ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
cd /opt/psscript

# Stop services
docker-compose stop

# Use no-redirect config
cp nginx-no-redirects.conf nginx.conf

# Start services
docker-compose up -d

# Wait for startup
sleep 15

echo "🔍 Testing all endpoints..."
echo ""
echo "1. HTTP health check:"
curl -s http://localhost/health || echo "Failed"

echo ""
echo "2. HTTPS health check:"
curl -k -s https://localhost/health || echo "Failed"

echo ""
echo "3. HTTP debug:"
curl -s http://localhost/debug || echo "Failed"

echo ""
echo "4. Service status:"
docker-compose ps

echo ""
echo "✅ No-redirect configuration applied!"
ENDSSH

# Cleanup
rm -f nginx-no-redirects.conf

echo ""
echo "✅ Redirect issues should now be fixed!"
echo ""
echo "🌐 Access your application:"
echo "• https://psscript.morloksmaze.com (via Cloudflare)"
echo "• http://74.208.184.195 (direct HTTP)"
echo "• https://74.208.184.195 (direct HTTPS)"
echo ""
echo "🔧 What was changed:"
echo "• Removed ALL server-side redirects"
echo "• HTTP and HTTPS servers work independently"
echo "• Let Cloudflare handle SSL enforcement"
echo ""
echo "⚙️  Cloudflare Settings Needed:"
echo "1. Go to SSL/TLS > Overview"
echo "2. Set encryption mode to 'Full'"
echo "3. Turn OFF 'Always Use HTTPS' (if enabled)"
echo ""
echo "📧 Login: admin@example.com / admin123!"