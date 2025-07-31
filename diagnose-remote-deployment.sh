#!/bin/bash

# PSScript Remote Deployment Diagnostic Script
# This script helps diagnose issues with the deployment

echo "========================================="
echo "PSScript Remote Deployment Diagnostics"
echo "========================================="
echo ""

REMOTE_HOST="74.208.184.195"
REMOTE_USER="root"
REMOTE_PASS="Morlock52b"

# Install sshpass if needed
if ! command -v sshpass &> /dev/null; then
    echo "sshpass not found. Please install it first:"
    echo "  macOS: brew install hudochenkov/sshpass/sshpass"
    echo "  Linux: apt-get install sshpass"
    exit 1
fi

echo "Connecting to $REMOTE_HOST..."
echo ""

# Run diagnostic commands on remote server
sshpass -p "$REMOTE_PASS" ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" << 'ENDSSH'
echo "=== System Information ==="
uname -a
echo ""

echo "=== Check if Docker is installed ==="
if command -v docker &> /dev/null; then
    echo "Docker version:"
    docker --version
else
    echo "Docker is NOT installed"
fi
echo ""

echo "=== Check if Docker Compose is installed ==="
if command -v docker-compose &> /dev/null; then
    echo "Docker Compose version:"
    docker-compose --version
else
    echo "Docker Compose is NOT installed"
fi
echo ""

echo "=== Check if application directory exists ==="
if [ -d "/opt/psscript" ]; then
    echo "Application directory exists at /opt/psscript"
    cd /opt/psscript
    echo "Contents:"
    ls -la
else
    echo "Application directory NOT found at /opt/psscript"
fi
echo ""

echo "=== Check Docker containers status ==="
if [ -d "/opt/psscript" ] && [ -f "/opt/psscript/docker-compose.yml" ]; then
    cd /opt/psscript
    docker-compose ps
else
    echo "Cannot check container status - docker-compose.yml not found"
fi
echo ""

echo "=== Check ports ==="
echo "Listening ports:"
netstat -tlnp | grep -E ':3002|:4000|:8000|:5432|:6379' || ss -tlnp | grep -E ':3002|:4000|:8000|:5432|:6379'
echo ""

echo "=== Check firewall status ==="
if command -v ufw &> /dev/null; then
    ufw status
elif command -v iptables &> /dev/null; then
    echo "iptables rules:"
    iptables -L -n | grep -E '3002|4000|8000' | head -10
else
    echo "No firewall tool detected"
fi
echo ""

echo "=== Check Docker logs (if containers exist) ==="
if [ -d "/opt/psscript" ] && [ -f "/opt/psscript/docker-compose.yml" ]; then
    cd /opt/psscript
    echo "Last 20 lines of container logs:"
    docker-compose logs --tail=20 2>&1 || echo "No containers running"
fi
echo ""

echo "=== Memory and Disk Usage ==="
free -h
echo ""
df -h | grep -E '^/|Filesystem'
echo ""

echo "=== Check for .env file ==="
if [ -f "/opt/psscript/.env" ]; then
    echo ".env file exists"
    echo "First few settings (without sensitive data):"
    grep -E '^(NODE_ENV|PORT|DOCKER_ENV|USE_MOCK_AI)' /opt/psscript/.env
else
    echo ".env file NOT found"
fi

ENDSSH

echo ""
echo "========================================="
echo "Diagnostic Summary"
echo "========================================="
echo ""
echo "Based on the output above, check for:"
echo "1. Docker and Docker Compose installation"
echo "2. Application files in /opt/psscript"
echo "3. Container status (should show 'Up')"
echo "4. Port availability (3002, 4000, 8000)"
echo "5. Firewall rules blocking access"
echo "6. Memory/disk space issues"
echo "7. Container logs for errors"
echo ""
echo "Common fixes:"
echo "- If Docker not installed: Run the install-and-run.sh script"
echo "- If containers not running: cd /opt/psscript && docker-compose up -d"
echo "- If ports blocked: Configure firewall to allow ports 3002, 4000, 8000"
echo "- If out of memory/disk: Free up resources"
echo ""