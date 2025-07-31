#!/bin/bash

# Force Fix Redirect Issue
set -e

echo "🔧 Force fixing redirect issue..."

SERVER_IP="74.208.184.195"
SERVER_USER="root"
SERVER_PASS="Morlock52"

# Create the simplest possible nginx config with NO redirects
cat > nginx-simple.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    server_tokens off;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    
    # Single server for both HTTP and HTTPS
    server {
        listen 80;
        listen 443 ssl http2;
        server_name _;
        
        # SSL config (ignored for port 80)
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        
        # Frontend
        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;
        }
        
        # API
        location /api {
            proxy_pass http://backend:4000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # Health
        location /health {
            return 200 "OK\n";
            add_header Content-Type text/plain;
        }
    }
}
EOF

echo "📤 Force updating nginx configuration..."

# Upload and force update
sshpass -p "$SERVER_PASS" scp nginx-simple.conf $SERVER_USER@$SERVER_IP:/opt/psscript/

sshpass -p "$SERVER_PASS" ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
cd /opt/psscript

echo "Current config check:"
ls -la nginx.conf

# Force overwrite
cp nginx-simple.conf nginx.conf

echo "New config first few lines:"
head -10 nginx.conf

# Completely restart containers
docker-compose down
sleep 5
docker-compose up -d

# Wait for services
sleep 20

echo ""
echo "🔍 Testing after forced restart..."
echo "HTTP test:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost/health

echo ""
echo "HTTPS test:"
curl -k -s -o /dev/null -w "Status: %{http_code}\n" https://localhost/health

echo ""
echo "Container nginx config check:"
docker exec psscript-nginx head -15 /etc/nginx/nginx.conf

echo ""
echo "✅ Force fix completed!"
ENDSSH

# Cleanup
rm -f nginx-simple.conf

echo ""
echo "✅ Redirect loop should now be completely fixed!"
echo ""
echo "🌐 Test these URLs:"
echo "• https://psscript.morloksmaze.com"
echo "• http://74.208.184.195"
echo "• https://74.208.184.195"
echo ""
echo "📧 Login: admin@example.com / admin123!"