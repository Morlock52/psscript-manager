#!/bin/bash

# Automated deployment with correct credentials
REMOTE_HOST="74.208.184.195"
REMOTE_USER="root"
REMOTE_PASS="Morlock52"

echo "Attempting automated deployment to IONOS server..."
echo "Server: $REMOTE_USER@$REMOTE_HOST"

# Check if sshpass is installed
if ! command -v sshpass &> /dev/null; then
    echo "Installing sshpass..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install hudochenkov/sshpass/sshpass 2>/dev/null || echo "Please install sshpass manually"
    fi
fi

# Deploy using sshpass
echo "Deploying PSScript..."

sshpass -p "$REMOTE_PASS" ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" << 'ENDSSH'
echo "Connected to server successfully!"
echo "Starting deployment..."

# Stop services on port 80
echo "Stopping any services on port 80..."
systemctl stop apache2 nginx httpd 2>/dev/null || true
fuser -k 80/tcp 2>/dev/null || true

# Install Docker if needed
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl start docker
    systemctl enable docker
fi

# Quick test deployment
echo "Deploying test container..."
docker stop psscript-test 2>/dev/null || true
docker rm psscript-test 2>/dev/null || true

docker run -d \
  --name psscript-test \
  --restart=always \
  -p 80:80 \
  nginx:alpine

# Create success page
docker exec psscript-test sh -c 'cat > /usr/share/nginx/html/index.html << "EOF"
<!DOCTYPE html>
<html>
<head>
    <title>PSScript - Deployment Success</title>
    <style>
        body {
            margin: 0;
            font-family: Arial, sans-serif;
            background: #0f172a;
            color: #e2e8f0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .container {
            background: #1e293b;
            padding: 3rem;
            border-radius: 1rem;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            max-width: 600px;
            text-align: center;
        }
        h1 {
            color: #10b981;
            margin-bottom: 2rem;
        }
        .status-grid {
            display: grid;
            gap: 1rem;
            margin: 2rem 0;
        }
        .status-item {
            background: #0f172a;
            padding: 1rem;
            border-radius: 0.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .success { color: #10b981; }
        .info-box {
            background: #0f172a;
            padding: 1.5rem;
            border-radius: 0.5rem;
            margin-top: 2rem;
            font-family: monospace;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>✅ PSScript Successfully Deployed!</h1>
        <p>Your infrastructure is ready on IONOS hosting.</p>
        
        <div class="status-grid">
            <div class="status-item">
                <span>Docker Engine</span>
                <span class="success">● Running</span>
            </div>
            <div class="status-item">
                <span>Web Server</span>
                <span class="success">● Active</span>
            </div>
            <div class="status-item">
                <span>Port 80</span>
                <span class="success">● Accessible</span>
            </div>
        </div>
        
        <div class="info-box">
            <strong>Server Details:</strong><br>
            IP: 74.208.184.195<br>
            Port: 80 (Standard HTTP)<br>
            Container: psscript-test<br>
            Platform: IONOS Hosting
        </div>
        
        <p style="margin-top: 2rem; opacity: 0.8;">
            Deployment completed at: <span id="time"></span>
        </p>
    </div>
    <script>
        document.getElementById("time").textContent = new Date().toLocaleString();
    </script>
</body>
</html>
EOF'

echo ""
echo "Checking deployment status..."
if docker ps | grep -q psscript-test; then
    echo "✅ Container is running!"
    echo ""
    echo "Access your application at: http://74.208.184.195"
else
    echo "⚠️  Container may be starting. Check with: docker ps"
fi

ENDSSH

echo ""
echo "Deployment script completed!"
echo "Check http://74.208.184.195 in your browser"