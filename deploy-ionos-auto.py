#!/usr/bin/env python3

import os
import sys
import subprocess
import tempfile
import tarfile
from datetime import datetime

# Server configuration
REMOTE_HOST = "74.208.184.195"
REMOTE_USER = "root"
REMOTE_PASS = "Morlock52b"
REMOTE_APP_DIR = "/opt/psscript"

def create_deployment_package():
    """Create a minimal deployment package"""
    print("Creating deployment package...")
    
    deploy_dir = f"psscript-deploy-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    os.makedirs(deploy_dir, exist_ok=True)
    
    # Create docker-compose.yml
    with open(f"{deploy_dir}/docker-compose.yml", "w") as f:
        f.write("""version: '3.8'

services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./html:/usr/share/nginx/html:ro
    restart: unless-stopped
""")
    
    # Create nginx.conf
    with open(f"{deploy_dir}/nginx.conf", "w") as f:
        f.write("""events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name _;
        
        location / {
            root /usr/share/nginx/html;
            index index.html;
        }
        
        location /health {
            return 200 "OK\\n";
            add_header Content-Type text/plain;
        }
    }
}
""")
    
    # Create HTML directory and index
    os.makedirs(f"{deploy_dir}/html", exist_ok=True)
    with open(f"{deploy_dir}/html/index.html", "w") as f:
        f.write("""<!DOCTYPE html>
<html>
<head>
    <title>PSScript - Deployment Successful</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            max-width: 800px; 
            margin: 50px auto; 
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #0078d4; }
        .status { 
            background: #e8f5e9; 
            padding: 15px; 
            border-radius: 5px;
            margin: 20px 0;
        }
        code {
            background: #f5f5f5;
            padding: 2px 5px;
            border-radius: 3px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎉 PSScript Deployment Successful!</h1>
        <div class="status">
            <p><strong>✅ Web server is running on port 80</strong></p>
            <p>Server IP: """ + REMOTE_HOST + """</p>
        </div>
        <h2>Next Steps:</h2>
        <ol>
            <li>SSH into the server: <code>ssh root@""" + REMOTE_HOST + """</code></li>
            <li>Navigate to: <code>cd """ + REMOTE_APP_DIR + """</code></li>
            <li>Check Docker status: <code>docker-compose ps</code></li>
            <li>Deploy the full application when ready</li>
        </ol>
        <p>This is a minimal deployment to confirm port 80 is working correctly.</p>
    </div>
</body>
</html>
""")
    
    # Create deployment script
    with open(f"{deploy_dir}/deploy.sh", "w") as f:
        f.write("""#!/bin/bash
set -e

echo "=== PSScript Deployment ==="

# Stop services on port 80
echo "Checking port 80..."
if lsof -Pi :80 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Stopping services on port 80..."
    systemctl stop apache2 nginx httpd 2>/dev/null || true
    fuser -k 80/tcp 2>/dev/null || true
    sleep 2
fi

# Install Docker
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Start services
echo "Starting services..."
docker-compose down 2>/dev/null || true
docker-compose up -d

# Check status
sleep 5
echo ""
echo "Status:"
docker-compose ps
echo ""
if curl -s http://localhost/health >/dev/null; then
    echo "✅ Deployment successful!"
else
    echo "⚠️  Check logs: docker-compose logs"
fi
""")
    
    os.chmod(f"{deploy_dir}/deploy.sh", 0o755)
    
    # Create tarball
    tarball = f"{deploy_dir}.tar.gz"
    with tarfile.open(tarball, "w:gz") as tar:
        tar.add(deploy_dir, arcname=os.path.basename(deploy_dir))
    
    # Cleanup
    subprocess.run(["rm", "-rf", deploy_dir])
    
    return tarball

def deploy_to_server(tarball):
    """Deploy to the IONOS server"""
    print(f"\nDeploying to {REMOTE_HOST}...")
    
    # Create SSH commands file
    ssh_commands = f"""
mkdir -p {REMOTE_APP_DIR}
cd {REMOTE_APP_DIR}
tar -xzf ~/{os.path.basename(tarball)} --strip-components=1
./deploy.sh
"""
    
    # Try to use sshpass if available
    if subprocess.run(["which", "sshpass"], capture_output=True).returncode == 0:
        print("Using sshpass for automated deployment...")
        
        # Copy file
        print("Copying deployment package...")
        cmd = f"sshpass -p '{REMOTE_PASS}' scp -o StrictHostKeyChecking=no {tarball} {REMOTE_USER}@{REMOTE_HOST}:~/"
        subprocess.run(cmd, shell=True)
        
        # Execute deployment
        print("Executing deployment script...")
        cmd = f"sshpass -p '{REMOTE_PASS}' ssh -o StrictHostKeyChecking=no {REMOTE_USER}@{REMOTE_HOST} '{ssh_commands}'"
        subprocess.run(cmd, shell=True)
        
        print(f"\n✅ Deployment complete! Check: http://{REMOTE_HOST}")
        
    else:
        print("\nsshpass not found. Manual deployment required:")
        print("\n1. Copy the deployment package:")
        print(f"   scp {tarball} {REMOTE_USER}@{REMOTE_HOST}:~/")
        print(f"\n2. SSH to the server:")
        print(f"   ssh {REMOTE_USER}@{REMOTE_HOST}")
        print(f"   Password: {REMOTE_PASS}")
        print(f"\n3. Run these commands:")
        print(ssh_commands)
        print(f"\n4. Access the application at: http://{REMOTE_HOST}")

def main():
    print("========================================")
    print("PSScript IONOS Auto-Deployment")
    print("========================================")
    print(f"Target: {REMOTE_USER}@{REMOTE_HOST}")
    print(f"App directory: {REMOTE_APP_DIR}")
    
    # Create deployment package
    tarball = create_deployment_package()
    print(f"Package created: {tarball}")
    
    # Deploy to server
    deploy_to_server(tarball)
    
    # Cleanup
    os.remove(tarball)

if __name__ == "__main__":
    main()