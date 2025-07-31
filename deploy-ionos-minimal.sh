#!/bin/bash

# Minimal PSScript IONOS Deployment
# This script creates a minimal deployment package and transfers it to the server

set -e

REMOTE_HOST="74.208.184.195"
REMOTE_USER="root"
REMOTE_APP_DIR="/opt/psscript"

echo "========================================="
echo "PSScript Minimal IONOS Deployment"
echo "========================================="

# Create minimal deployment directory
DEPLOY_DIR="psscript-minimal-$(date +%Y%m%d%H%M%S)"
mkdir -p "$DEPLOY_DIR"

# Create a simple docker-compose.yml that works on port 80
cat > "$DEPLOY_DIR/docker-compose.yml" << 'EOF'
version: '3.8'

services:
  # Nginx on port 80 serving static content and proxying to backend
  web:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./html:/usr/share/nginx/html:ro
    depends_on:
      - api
    restart: unless-stopped

  # Simple API backend
  api:
    image: node:18-alpine
    working_dir: /app
    volumes:
      - ./api:/app
    command: ["node", "server.js"]
    environment:
      - PORT=3000
    restart: unless-stopped

volumes:
  app_data:
EOF

# Create nginx configuration
cat > "$DEPLOY_DIR/nginx.conf" << 'EOF'
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    server {
        listen 80;
        server_name _;
        
        root /usr/share/nginx/html;
        index index.html;

        # API proxy
        location /api/ {
            proxy_pass http://api:3000/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # Health check
        location /health {
            return 200 "OK\n";
            add_header Content-Type text/plain;
        }

        # Frontend
        location / {
            try_files $uri $uri/ /index.html;
        }
    }
}
EOF

# Create HTML directory and a simple frontend
mkdir -p "$DEPLOY_DIR/html"
cat > "$DEPLOY_DIR/html/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PSScript - PowerShell Script Repository</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            background: #f5f5f5;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
        }
        .header {
            background: #0078d4;
            color: white;
            padding: 2rem;
            text-align: center;
            margin-bottom: 2rem;
            border-radius: 8px;
        }
        .status {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 2rem;
        }
        .status h2 {
            margin-top: 0;
        }
        .status-item {
            display: flex;
            justify-content: space-between;
            padding: 0.5rem 0;
            border-bottom: 1px solid #eee;
        }
        .status-ok {
            color: #0f0;
            font-weight: bold;
        }
        .status-loading {
            color: #fa0;
        }
        .info {
            background: #e3f2fd;
            padding: 1rem;
            border-radius: 4px;
            margin-top: 1rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>PSScript</h1>
            <p>PowerShell Script Repository & Management System</p>
        </div>
        
        <div class="status">
            <h2>Deployment Status</h2>
            <div class="status-item">
                <span>Server:</span>
                <span class="status-ok">74.208.184.195</span>
            </div>
            <div class="status-item">
                <span>Web Server:</span>
                <span class="status-ok">✓ Running</span>
            </div>
            <div class="status-item">
                <span>API Status:</span>
                <span id="api-status" class="status-loading">Checking...</span>
            </div>
            <div class="status-item">
                <span>Port 80:</span>
                <span class="status-ok">✓ Active</span>
            </div>
        </div>
        
        <div class="info">
            <h3>Next Steps:</h3>
            <p>The basic infrastructure is now running. To deploy the full PSScript application:</p>
            <ol>
                <li>SSH into the server: <code>ssh root@74.208.184.195</code></li>
                <li>Navigate to: <code>cd /opt/psscript</code></li>
                <li>Deploy full application: <code>./deploy-full.sh</code></li>
            </ol>
        </div>
    </div>
    
    <script>
        // Check API status
        fetch('/api/health')
            .then(response => {
                const statusEl = document.getElementById('api-status');
                if (response.ok) {
                    statusEl.textContent = '✓ Running';
                    statusEl.className = 'status-ok';
                } else {
                    statusEl.textContent = '✗ Not responding';
                    statusEl.style.color = '#f00';
                }
            })
            .catch(() => {
                const statusEl = document.getElementById('api-status');
                statusEl.textContent = '✗ Not available';
                statusEl.style.color = '#f00';
            });
    </script>
</body>
</html>
EOF

# Create API directory and simple Node.js server
mkdir -p "$DEPLOY_DIR/api"
cat > "$DEPLOY_DIR/api/server.js" << 'EOF'
const http = require('http');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    if (req.url === '/health') {
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    } else if (req.url === '/') {
        res.writeHead(200);
        res.end(JSON.stringify({ 
            message: 'PSScript API Server',
            version: '1.0.0',
            endpoints: ['/health', '/']
        }));
    } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not Found' }));
    }
});

server.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
});
EOF

# Create deployment script
cat > "$DEPLOY_DIR/deploy.sh" << 'EOF'
#!/bin/bash
set -e

echo "Starting PSScript deployment..."

# Check and stop services on port 80
if lsof -Pi :80 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Stopping services on port 80..."
    fuser -k 80/tcp 2>/dev/null || true
    systemctl stop apache2 2>/dev/null || true
    systemctl stop nginx 2>/dev/null || true
    systemctl stop httpd 2>/dev/null || true
    sleep 2
fi

# Install Docker if needed
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
fi

# Install Docker Compose if needed
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Start services
echo "Starting services..."
docker-compose down 2>/dev/null || true
docker-compose up -d

# Wait for services
sleep 5

# Check status
echo ""
echo "Checking deployment status..."
docker-compose ps

echo ""
if curl -s http://localhost/health >/dev/null; then
    echo "✅ Deployment successful!"
    echo "Access the application at: http://$(hostname -I | awk '{print $1}')"
else
    echo "⚠️  Deployment may still be starting. Check logs: docker-compose logs"
fi
EOF

chmod +x "$DEPLOY_DIR/deploy.sh"

# Create tarball
TARBALL="${DEPLOY_DIR}.tar.gz"
tar -czf "$TARBALL" "$DEPLOY_DIR"
rm -rf "$DEPLOY_DIR"

echo "Package created: $TARBALL"
echo ""

# Transfer and deploy
echo "Transferring to server..."

# Create a simple expect script for automation
cat > deploy-expect.exp << 'EOF'
#!/usr/bin/expect -f
set timeout 30
set host [lindex $argv 0]
set user [lindex $argv 1]
set password [lindex $argv 2]
set tarball [lindex $argv 3]
set remote_dir [lindex $argv 4]

# Copy file
spawn scp -o StrictHostKeyChecking=no $tarball $user@$host:~/
expect "password:"
send "$password\r"
expect eof

# Deploy
spawn ssh -o StrictHostKeyChecking=no $user@$host
expect "password:"
send "$password\r"
expect "# "
send "mkdir -p $remote_dir\r"
expect "# "
send "cd $remote_dir\r"
expect "# "
send "tar -xzf ~/$tarball --strip-components=1\r"
expect "# "
send "./deploy.sh\r"
expect "# "
send "exit\r"
expect eof
EOF

if command -v expect &> /dev/null; then
    chmod +x deploy-expect.exp
    ./deploy-expect.exp "$REMOTE_HOST" "$REMOTE_USER" "Morlock52b" "$TARBALL" "$REMOTE_APP_DIR"
    rm -f deploy-expect.exp
else
    echo "Manual deployment required. Follow these steps:"
    echo ""
    echo "1. Copy the file:"
    echo "   scp $TARBALL $REMOTE_USER@$REMOTE_HOST:~/"
    echo ""
    echo "2. SSH to server:"
    echo "   ssh $REMOTE_USER@$REMOTE_HOST"
    echo ""
    echo "3. Deploy:"
    echo "   mkdir -p $REMOTE_APP_DIR"
    echo "   cd $REMOTE_APP_DIR"
    echo "   tar -xzf ~/$TARBALL --strip-components=1"
    echo "   ./deploy.sh"
fi

# Cleanup
rm -f "$TARBALL"

echo ""
echo "Deployment process completed!"
echo "Check the application at: http://$REMOTE_HOST"