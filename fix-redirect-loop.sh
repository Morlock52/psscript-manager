#!/bin/bash

# Fix Redirect Loop Issue
set -e

echo "🔧 Fixing redirect loop issue..."

SERVER_IP="74.208.184.195"
SERVER_USER="root"
SERVER_PASS="Morlock52"
DOMAIN="psscript.morloksmaze.com"

echo "📝 The redirect loop happens when:"
echo "• Cloudflare is set to 'Always Use HTTPS'"
echo "• Your server also redirects HTTP to HTTPS"
echo "• This creates an infinite loop"
echo ""

# Create fixed nginx config
cat > nginx-cloudflare-compatible.conf << 'EOF'
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
    
    # Single server block that handles both HTTP and HTTPS
    server {
        listen 80;
        listen 443 ssl http2;
        server_name _;
        
        # SSL configuration (only applies when on port 443)
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        
        # Modern SSL settings
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_timeout 1d;
        ssl_session_cache shared:MozSSL:10m;
        ssl_session_tickets off;
        
        # Security headers (only for HTTPS)
        add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        
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
        
        # API endpoints with rate limiting
        location /api {
            # General API rate limiting
            limit_req zone=api burst=20 nodelay;
            
            # Special handling for login endpoint
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
                proxy_set_header X-Forwarded-Host $host;
            }
            
            # All other API endpoints
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
        
        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
        
        # Debug endpoint to check headers
        location /debug {
            access_log off;
            return 200 "Protocol: $scheme\nHost: $host\nX-Forwarded-Proto: $http_x_forwarded_proto\nCloudflare: $http_cf_ray\n";
            add_header Content-Type text/plain;
        }
    }
}
EOF

echo "📤 Deploying fix to server..."

# Upload fixed config
sshpass -p "$SERVER_PASS" scp nginx-cloudflare-compatible.conf $SERVER_USER@$SERVER_IP:/opt/psscript/

# Apply fix
sshpass -p "$SERVER_PASS" ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
cd /opt/psscript

# Backup current config
cp nginx.conf nginx.conf.bak.redirect

# Use fixed config
cp nginx-cloudflare-compatible.conf nginx.conf

# Restart nginx
docker-compose restart nginx

# Wait for restart
sleep 10

echo "🔍 Testing configuration..."
echo ""
echo "Local HTTP test:"
curl -s http://localhost/health && echo " ✅ HTTP working"

echo ""
echo "Local HTTPS test:"
curl -k -s https://localhost/health && echo " ✅ HTTPS working"

echo ""
echo "Debug info:"
curl -s http://localhost/debug

echo ""
echo "✅ Configuration updated!"
ENDSSH

# Cleanup
rm -f nginx-cloudflare-compatible.conf

echo ""
echo "✅ Redirect loop fix applied!"
echo ""
echo "🌐 Your application should now work at:"
echo "• https://$DOMAIN (via Cloudflare)"
echo "• http://$SERVER_IP (direct access)"
echo "• https://$SERVER_IP (direct SSL access)"
echo ""
echo "🔧 What was fixed:"
echo "• Removed HTTP to HTTPS redirect on server"
echo "• Let Cloudflare handle HTTPS enforcement"
echo "• Single server block handles both protocols"
echo ""
echo "📧 Login: admin@example.com / admin123!"
echo ""
echo "💡 Cloudflare SSL Settings:"
echo "Set SSL/TLS mode to 'Full' in Cloudflare dashboard"
echo "Disable 'Always Use HTTPS' if still having issues"