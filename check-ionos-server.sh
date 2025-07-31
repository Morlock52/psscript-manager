#!/bin/bash

# Check IONOS Server Status
REMOTE_HOST="74.208.184.195"
REMOTE_USER="root"
REMOTE_PASS="Morlock52b"

echo "Checking IONOS server status..."
echo ""

# Check what's running on port 80
sshpass -p "$REMOTE_PASS" ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" << 'ENDSSH'
    echo "=== System Information ==="
    uname -a
    echo ""
    
    echo "=== Checking Port 80 ==="
    if lsof -Pi :80 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "Port 80 is in use by:"
        lsof -Pi :80 -sTCP:LISTEN
    else
        echo "Port 80 is available"
    fi
    echo ""
    
    echo "=== Checking for Web Services ==="
    systemctl is-active apache2 2>/dev/null && echo "Apache2 is running" || echo "Apache2 is not running"
    systemctl is-active nginx 2>/dev/null && echo "Nginx is running" || echo "Nginx is not running"
    systemctl is-active httpd 2>/dev/null && echo "Httpd is running" || echo "Httpd is not running"
    echo ""
    
    echo "=== Checking Docker ==="
    if command -v docker &> /dev/null; then
        echo "Docker is installed:"
        docker --version
        echo "Docker containers:"
        docker ps -a
    else
        echo "Docker is not installed"
    fi
    echo ""
    
    echo "=== Checking Firewall ==="
    if command -v ufw &> /dev/null; then
        ufw status
    elif command -v iptables &> /dev/null; then
        echo "iptables rules:"
        iptables -L -n | head -20
    fi
    echo ""
    
    echo "=== Available Ports ==="
    netstat -tuln | grep LISTEN | head -20
ENDSSH