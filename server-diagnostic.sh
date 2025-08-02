#!/bin/bash

echo "=== PSScript Server Diagnostic Report ==="
echo "Date: $(date)"
echo "Server: 74.208.184.195"
echo ""

echo "=== System Information ==="
uname -a
echo "Uptime: $(uptime)"
echo "Free memory: $(free -h)"
echo "Disk usage: $(df -h /)"
echo ""

echo "=== Service Status ==="
echo "--- Nginx ---"
sudo systemctl is-active nginx
sudo systemctl status nginx --no-pager -l

echo "--- PostgreSQL ---"
sudo systemctl is-active postgresql
sudo systemctl status postgresql --no-pager -l

echo "--- Redis ---"
sudo systemctl is-active redis
sudo systemctl status redis --no-pager -l

echo "--- PSScript Backend ---"
if systemctl is-active psscript-backend >/dev/null 2>&1; then
    sudo systemctl status psscript-backend --no-pager -l
elif command -v pm2 >/dev/null 2>&1; then
    echo "PM2 Status:"
    pm2 status
    pm2 logs --lines 10
else
    echo "Backend service not found in systemd or PM2"
fi
echo ""

echo "=== Network and Ports ==="
echo "Listening ports:"
sudo netstat -tlnp | grep -E "(80|8080|3000|5432|6379)"
echo ""

echo "Firewall status:"
if command -v ufw >/dev/null 2>&1; then
    sudo ufw status
else
    echo "UFW not available, checking iptables:"
    sudo iptables -L INPUT | grep -E "(80|8080|3000)"
fi
echo ""

echo "=== File System Check ==="
echo "Project directory:"
ls -la /var/www/psscript/ 2>/dev/null || ls -la /opt/psscript/ 2>/dev/null || echo "Project directory not found"

echo "Frontend build directory:"
find /var/www -name "build" -type d 2>/dev/null | head -5
find /opt -name "build" -type d 2>/dev/null | head -5
echo ""

echo "=== Nginx Configuration ==="
echo "Nginx config test:"
sudo nginx -t

echo "Active sites:"
ls -la /etc/nginx/sites-enabled/

echo "PSScript site config:"
cat /etc/nginx/sites-available/psscript 2>/dev/null || echo "PSScript nginx config not found"
echo ""

echo "=== API Testing ==="
echo "Testing backend health endpoint:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3000/health 2>/dev/null || echo "Backend not responding on localhost:3000"

echo "Testing through nginx proxy:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://74.208.184.195:8080/api/health 2>/dev/null || echo "Nginx proxy not responding"

echo "Testing frontend:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://74.208.184.195:8080/ 2>/dev/null || echo "Frontend not responding"
echo ""

echo "=== Process Information ==="
echo "Node.js processes:"
ps aux | grep node | grep -v grep

echo "Nginx processes:"
ps aux | grep nginx | grep -v grep
echo ""

echo "=== Recent Logs ==="
echo "--- Nginx Error Log (last 10 lines) ---"
sudo tail -10 /var/log/nginx/error.log 2>/dev/null || echo "Nginx error log not accessible"

echo "--- Nginx Access Log (last 5 lines) ---"
sudo tail -5 /var/log/nginx/access.log 2>/dev/null || echo "Nginx access log not accessible"

echo "--- System Log (PSScript related, last 10 lines) ---"
sudo journalctl -u psscript-backend --no-pager -l -n 10 2>/dev/null || echo "No systemd logs for psscript-backend"
echo ""

echo "=== Diagnostic Complete ==="