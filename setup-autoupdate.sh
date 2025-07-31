#!/bin/bash

# Setup Auto-Update System on Server
set -e

echo "🔧 Setting up PSScript Auto-Update System..."

SERVER_IP="74.208.184.195"
SERVER_USER="root"
SERVER_PASS="Morlock52"

# Upload update script
echo "📤 Uploading update client..."
sshpass -p "$SERVER_PASS" scp psscript-update-client.sh $SERVER_USER@$SERVER_IP:/opt/psscript/

# Configure on server
echo "⚙️  Configuring auto-update..."
sshpass -p "$SERVER_PASS" ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
# Make script executable
chmod +x /opt/psscript/psscript-update-client.sh

# Create version file
echo "1.0.0" > /opt/psscript/.version

# Create systemd service for monitoring
cat > /etc/systemd/system/psscript-monitor.service << 'EOF'
[Unit]
Description=PSScript Health Monitor
After=docker.service
Requires=docker.service

[Service]
Type=simple
Restart=always
RestartSec=30
ExecStart=/bin/bash -c 'while true; do \
    if ! curl -sf http://localhost/api/health > /dev/null; then \
        echo "Health check failed, restarting containers..."; \
        cd /opt/psscript && docker-compose restart; \
    fi; \
    sleep 300; \
done'

[Install]
WantedBy=multi-user.target
EOF

# Create systemd timer for auto-updates
cat > /etc/systemd/system/psscript-update.service << 'EOF'
[Unit]
Description=PSScript Auto Update
After=network.target

[Service]
Type=oneshot
ExecStart=/opt/psscript/psscript-update-client.sh
Environment="UPDATE_SERVER=https://updates.psscript.io"
Environment="WEBHOOK_URL=https://monitoring.psscript.io/webhook"
Environment="LOG_SHIP_URL=https://logs.psscript.io/ingest"
EOF

cat > /etc/systemd/system/psscript-update.timer << 'EOF'
[Unit]
Description=Run PSScript Auto Update every 4 hours
Requires=psscript-update.service

[Timer]
OnBootSec=10min
OnUnitActiveSec=4h
Persistent=true

[Install]
WantedBy=timers.target
EOF

# Enable services
systemctl daemon-reload
systemctl enable psscript-monitor.service
systemctl start psscript-monitor.service
systemctl enable psscript-update.timer
systemctl start psscript-update.timer

# Setup log rotation
cat > /etc/logrotate.d/psscript << 'EOF'
/var/log/psscript/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 root root
    postrotate
        # Ship logs before rotation
        if [ -n "$LOG_SHIP_URL" ]; then
            curl -s -X POST "$LOG_SHIP_URL" \
                -H "Content-Type: text/plain" \
                -H "X-Log-Type: rotation" \
                --data-binary @/var/log/psscript/auto-update.log || true
        fi
    endscript
}
EOF

# Create update info endpoint (mock for now)
cat > /opt/psscript/update-server-mock.js << 'EOF'
const http = require('http');

const server = http.createServer((req, res) => {
    if (req.url === '/api/check-update') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            has_update: false,
            current_version: "1.0.0",
            message: "You are running the latest version"
        }));
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

server.listen(8888, '127.0.0.1', () => {
    console.log('Mock update server running on port 8888');
});
EOF

# Start mock update server
nohup node /opt/psscript/update-server-mock.js > /var/log/psscript/update-server.log 2>&1 &

echo "✅ Auto-update system configured!"
echo ""
echo "📊 Status:"
systemctl status psscript-monitor.service --no-pager || true
echo ""
systemctl status psscript-update.timer --no-pager || true
echo ""
echo "🔍 Check logs at: /var/log/psscript/"
echo "⏰ Updates will run every 4 hours"
echo "🏥 Health monitoring runs every 5 minutes"
ENDSSH

echo "✅ Auto-update system setup complete!"
echo ""
echo "📋 Summary:"
echo "- Health monitoring: Every 5 minutes"
echo "- Auto-updates: Every 4 hours"
echo "- Automatic rollback on failure"
echo "- Log shipping configured"
echo "- Systemd integration for reliability"
echo ""
echo "🌐 Your PSScript app at http://$SERVER_IP is now:"
echo "✓ Self-updating"
echo "✓ Self-healing"
echo "✓ Monitored"
echo "✓ Logged"
echo ""
echo "📧 Login: admin@example.com"
echo "🔑 Password: admin123!"