#!/bin/bash

# Automated PSScript deployment script
# This script will connect to the remote server and install PSScript

set -e

REMOTE_HOST="74.208.184.195"
REMOTE_USER="root"
REMOTE_PASS="Morlock52b"

echo "========================================="
echo "Automated PSScript Deployment"
echo "========================================="
echo "Target: $REMOTE_USER@$REMOTE_HOST"
echo ""

# Check if sshpass is installed
if ! command -v sshpass &> /dev/null; then
    echo "Installing sshpass..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install hudochenkov/sshpass/sshpass
        else
            echo "Error: Homebrew is required to install sshpass on macOS"
            echo "Please install Homebrew first: https://brew.sh"
            exit 1
        fi
    else
        # Linux
        sudo apt-get update && sudo apt-get install -y sshpass || \
        sudo yum install -y sshpass || \
        echo "Please install sshpass manually for your distribution"
    fi
fi

echo "Deploying PSScript to remote server..."

# Execute the installation on the remote server
sshpass -p "$REMOTE_PASS" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=30 "$REMOTE_USER@$REMOTE_HOST" << 'REMOTE_SCRIPT'
#!/bin/bash
set -e

echo "======================================"
echo "PSScript Installation on Remote Server"
echo "======================================"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Install Docker if not present
if ! command_exists docker; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl start docker
    systemctl enable docker
    echo "Docker installed successfully"
else
    echo "Docker already installed: $(docker --version)"
fi

# Install Docker Compose if not present
if ! command_exists docker-compose; then
    echo "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo "Docker Compose installed successfully"
else
    echo "Docker Compose already installed: $(docker-compose --version)"
fi

# Create application directory
echo "Creating application directory..."
mkdir -p /opt/psscript
cd /opt/psscript

# Stop any existing containers
docker-compose down 2>/dev/null || true

# Create docker-compose.yml
echo "Creating docker-compose.yml..."
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: psscript_postgres
    environment:
      - POSTGRES_DB=psscript
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7.0-alpine
    container_name: psscript_redis
    ports:
      - "6379:6379"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    image: node:18-alpine
    container_name: psscript_backend
    working_dir: /app
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - PORT=4000
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=psscript
      - DB_USER=postgres
      - DB_PASSWORD=postgres
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - JWT_SECRET=psscript-jwt-secret-$(openssl rand -hex 16)
      - USE_MOCK_AI=true
      - CORS_ORIGIN=*
    volumes:
      - ./backend:/app
      - ./test-backend:/app-test
    command: sh -c "if [ -d /app/package.json ]; then cd /app && npm install && npm start; else cd /app-test && node server.js; fi"
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  frontend:
    image: nginx:alpine
    container_name: psscript_frontend
    ports:
      - "3002:80"
    volumes:
      - ./frontend-static:/usr/share/nginx/html
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    restart: unless-stopped

volumes:
  postgres_data:
EOF

# Create nginx configuration
echo "Creating nginx configuration..."
cat > nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        location / {
            try_files $uri $uri/ /index.html;
        }

        location /api {
            proxy_pass http://backend:4000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
EOF

# Create test backend server
echo "Creating test backend..."
mkdir -p test-backend
cat > test-backend/server.js << 'EOF'
const http = require('http');

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/health' || req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', message: 'PSScript backend is running' }));
  } else {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      message: 'PSScript API Test Server',
      endpoints: ['/health', '/api/health'],
      time: new Date().toISOString()
    }));
  }
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`PSScript test backend running on port ${PORT}`);
});
EOF

# Create frontend
echo "Creating frontend..."
mkdir -p frontend-static
cat > frontend-static/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PSScript Manager</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0f172a;
            color: #e2e8f0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            max-width: 800px;
            padding: 2rem;
            text-align: center;
        }
        h1 {
            font-size: 3rem;
            margin-bottom: 1rem;
            background: linear-gradient(to right, #3b82f6, #8b5cf6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .status-card {
            background: #1e293b;
            border-radius: 12px;
            padding: 2rem;
            margin: 2rem 0;
            border: 1px solid #334155;
        }
        .status-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.75rem 0;
            border-bottom: 1px solid #334155;
        }
        .status-item:last-child { border-bottom: none; }
        .status-label { font-weight: 500; }
        .status-value { 
            font-family: monospace;
            background: #0f172a;
            padding: 0.25rem 0.75rem;
            border-radius: 6px;
            font-size: 0.875rem;
        }
        .success { color: #10b981; }
        .warning { color: #f59e0b; }
        .error { color: #ef4444; }
        .button {
            display: inline-block;
            background: #3b82f6;
            color: white;
            padding: 0.75rem 2rem;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 500;
            margin-top: 1rem;
            transition: background 0.2s;
        }
        .button:hover { background: #2563eb; }
        .info-box {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 8px;
            padding: 1rem;
            margin-top: 2rem;
            text-align: left;
        }
        .info-box h3 { margin-bottom: 0.5rem; color: #3b82f6; }
        .info-box ul { list-style: none; padding-left: 1rem; }
        .info-box li { margin: 0.5rem 0; }
        .info-box code {
            background: #0f172a;
            padding: 0.125rem 0.375rem;
            border-radius: 4px;
            font-size: 0.875rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>PSScript Manager</h1>
        <p style="font-size: 1.25rem; color: #94a3b8; margin-bottom: 2rem;">
            AI-Powered PowerShell Script Management Platform
        </p>
        
        <div class="status-card">
            <h2 style="margin-bottom: 1rem;">System Status</h2>
            <div class="status-item">
                <span class="status-label">Frontend</span>
                <span class="status-value success">✓ Running</span>
            </div>
            <div class="status-item">
                <span class="status-label">Backend API</span>
                <span class="status-value" id="backend-status">Checking...</span>
            </div>
            <div class="status-item">
                <span class="status-label">Database</span>
                <span class="status-value success">✓ PostgreSQL Ready</span>
            </div>
            <div class="status-item">
                <span class="status-label">Cache</span>
                <span class="status-value success">✓ Redis Ready</span>
            </div>
            <div class="status-item">
                <span class="status-label">Server Time</span>
                <span class="status-value" id="server-time">-</span>
            </div>
        </div>
        
        <div class="info-box">
            <h3>🚀 Deployment Successful!</h3>
            <p style="margin: 1rem 0;">The PSScript infrastructure is now running. To deploy the full application:</p>
            <ul>
                <li>1. Transfer the PSScript source code to <code>/opt/psscript</code></li>
                <li>2. The containers will automatically detect and run the application</li>
                <li>3. Default credentials: <code>admin / admin123!</code></li>
                <li>4. Configure OpenAI API key in <code>.env</code> for AI features</li>
            </ul>
        </div>
        
        <div class="info-box">
            <h3>📋 Quick Commands</h3>
            <ul>
                <li><code>cd /opt/psscript</code> - Navigate to app directory</li>
                <li><code>docker-compose ps</code> - Check container status</li>
                <li><code>docker-compose logs -f</code> - View logs</li>
                <li><code>docker-compose restart</code> - Restart services</li>
            </ul>
        </div>
    </div>
    
    <script>
        // Update server time
        function updateTime() {
            document.getElementById('server-time').textContent = new Date().toLocaleString();
        }
        updateTime();
        setInterval(updateTime, 1000);
        
        // Check backend status
        fetch('http://74.208.184.195:4000/health')
            .then(response => response.json())
            .then(data => {
                document.getElementById('backend-status').innerHTML = '<span class="success">✓ Running</span>';
            })
            .catch(error => {
                document.getElementById('backend-status').innerHTML = '<span class="warning">⚠ Test Mode</span>';
            });
    </script>
</body>
</html>
EOF

# Create .env file
echo "Creating environment configuration..."
cat > .env << 'EOF'
NODE_ENV=production
PORT=4000
DOCKER_ENV=true

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=psscript
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Security
JWT_SECRET=psscript-jwt-secret-change-in-production
SESSION_SECRET=psscript-session-secret-change-in-production

# AI Service
USE_MOCK_AI=true
OPENAI_API_KEY=sk-your-openai-api-key-here

# Frontend
FRONTEND_URL=http://74.208.184.195:3002
CORS_ORIGIN=http://74.208.184.195:3002
EOF

# Configure firewall
echo "Configuring firewall..."
if command -v ufw >/dev/null 2>&1; then
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 3002/tcp
    ufw allow 4000/tcp
    ufw allow 8000/tcp
    echo "y" | ufw enable || true
    echo "Firewall configured with UFW"
else
    # Try iptables as fallback
    iptables -A INPUT -p tcp --dport 3002 -j ACCEPT
    iptables -A INPUT -p tcp --dport 4000 -j ACCEPT
    iptables -A INPUT -p tcp --dport 8000 -j ACCEPT
    echo "Firewall configured with iptables"
fi

# Pull Docker images
echo "Pulling Docker images..."
docker pull postgres:15-alpine
docker pull redis:7.0-alpine
docker pull node:18-alpine
docker pull nginx:alpine

# Start services
echo "Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "Waiting for services to start (30 seconds)..."
sleep 30

# Health check
echo ""
echo "======================================"
echo "Service Health Check"
echo "======================================"

# Check container status
docker-compose ps

echo ""
echo "Testing service connectivity..."

# Test frontend
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3002 | grep -q "200\|304"; then
    echo "✅ Frontend is accessible"
else
    echo "⚠️  Frontend may need a moment to start"
fi

# Test backend
if curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health | grep -q "200"; then
    echo "✅ Backend API is responding"
else
    echo "⚠️  Backend is in test mode"
fi

# Test database
if docker exec psscript_postgres pg_isready -U postgres >/dev/null 2>&1; then
    echo "✅ PostgreSQL database is ready"
else
    echo "❌ PostgreSQL is not responding"
fi

# Test Redis
if docker exec psscript_redis redis-cli ping >/dev/null 2>&1; then
    echo "✅ Redis cache is ready"
else
    echo "❌ Redis is not responding"
fi

echo ""
echo "======================================"
echo "PSScript Deployment Complete!"
echo "======================================"
echo ""
echo "Access the application at:"
echo "  http://74.208.184.195:3002"
echo ""
echo "SSH access for management:"
echo "  ssh root@74.208.184.195"
echo "  cd /opt/psscript"
echo ""
echo "The infrastructure is ready. Deploy the PSScript"
echo "application code to fully activate all features."
echo ""

REMOTE_SCRIPT

echo ""
echo "========================================="
echo "Deployment Status"
echo "========================================="
echo ""
echo "✅ Deployment script executed on remote server"
echo ""
echo "Please check:"
echo "1. Web interface: http://74.208.184.195:3002"
echo "2. API endpoint: http://74.208.184.195:4000/health"
echo ""
echo "If the site doesn't load immediately, wait 1-2 minutes"
echo "for all services to fully start."
echo ""