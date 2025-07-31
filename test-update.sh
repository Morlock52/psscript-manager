#!/bin/bash

# Test Update System
set -e

echo "🧪 Testing PSScript Auto-Update System..."

SERVER_IP="74.208.184.195"
SERVER_USER="root"
SERVER_PASS="Morlock52"

# Create a test update with a visible change
echo "📦 Creating test update package..."

# Create a modified index.html to show update worked
mkdir -p test-update
cp -r src/frontend/dist test-update/

# Modify the frontend to show version
cat > test-update/test-version.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>PSScript v1.0.1 - Update Test</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .update-box {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 500px;
        }
        .version {
            font-size: 24px;
            color: #667eea;
            font-weight: bold;
        }
        .success {
            color: #4caf50;
            font-size: 48px;
            margin: 20px 0;
        }
        .timestamp {
            color: #666;
            font-size: 14px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="update-box">
        <div class="success">✅</div>
        <h1>Auto-Update Successful!</h1>
        <p class="version">Version 1.0.1</p>
        <p>The auto-update system is working correctly.</p>
        <p>This page confirms that the update was applied successfully.</p>
        <p class="timestamp">Updated: <span id="time"></span></p>
        <script>
            document.getElementById('time').textContent = new Date().toLocaleString();
        </script>
    </div>
</body>
</html>
EOF

# Add test version page to nginx
cat > test-update/nginx-update.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    server {
        listen 80;
        server_name _;
        
        # Test update page
        location = /update-test {
            alias /usr/share/nginx/html/test-version.html;
        }
        
        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;
        }
        
        location /api {
            proxy_pass http://backend:4000;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
        
        location /health {
            return 200 "OK\n";
            add_header Content-Type text/plain;
        }
    }
}
EOF

# Create update package
cd test-update
tar -czf ../test-update-1.0.1.tar.gz dist test-version.html nginx-update.conf
cd ..

# Calculate hash
UPDATE_HASH=$(sha256sum test-update-1.0.1.tar.gz | cut -d' ' -f1)

# Create mock update server that returns update available
echo "🔧 Setting up mock update server with test update..."

sshpass -p "$SERVER_PASS" ssh $SERVER_USER@$SERVER_IP << EOF
# Kill existing mock server
pkill -f update-server-mock.js || true

# Create new mock server with update
cat > /opt/psscript/update-server-mock.js << 'EOFJS'
const http = require('http');
const fs = require('fs');

const UPDATE_INFO = {
    has_update: true,
    version: "1.0.1",
    download_url: "http://localhost:8888/test-update-1.0.1.tar.gz",
    sha256: "$UPDATE_HASH",
    changelog: "Test update to verify auto-update system"
};

const server = http.createServer((req, res) => {
    console.log('Request:', req.method, req.url);
    
    if (req.url === '/api/check-update') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(UPDATE_INFO));
    } else if (req.url === '/test-update-1.0.1.tar.gz') {
        // Serve the update file
        const filePath = '/opt/psscript/test-update-1.0.1.tar.gz';
        if (fs.existsSync(filePath)) {
            res.writeHead(200, { 'Content-Type': 'application/gzip' });
            fs.createReadStream(filePath).pipe(res);
        } else {
            res.writeHead(404);
            res.end('Update file not found');
        }
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

server.listen(8888, '127.0.0.1', () => {
    console.log('Mock update server running on port 8888');
    console.log('Update available:', UPDATE_INFO);
});
EOFJS

# Start the server
nohup node /opt/psscript/update-server-mock.js > /var/log/psscript/update-server.log 2>&1 &

# Update the update client to use local server
sed -i 's|UPDATE_SERVER:-https://your-update-server.com|UPDATE_SERVER:-http://localhost:8888|' /opt/psscript/psscript-update-client.sh
EOF

# Upload test update package
echo "📤 Uploading test update package..."
sshpass -p "$SERVER_PASS" scp test-update-1.0.1.tar.gz $SERVER_USER@$SERVER_IP:/opt/psscript/

# Run the update
echo "🚀 Triggering update..."
sshpass -p "$SERVER_PASS" ssh $SERVER_USER@$SERVER_IP << 'EOF'
cd /opt/psscript
export UPDATE_SERVER="http://localhost:8888"
./psscript-update-client.sh
EOF

# Cleanup
rm -rf test-update test-update-1.0.1.tar.gz

echo "✅ Update test complete!"
echo "🔍 Check the update at: http://$SERVER_IP/update-test"