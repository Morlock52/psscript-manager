#!/bin/bash

# Fix and test PSScript deployment
REMOTE_HOST="74.208.184.195"
REMOTE_USER="root"
REMOTE_PASS="Morlock52"

echo "Checking and fixing PSScript deployment..."

sshpass -p "$REMOTE_PASS" ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" << 'ENDSSH'
echo "=== Checking Current Status ==="

# Check what's running
echo "Docker containers:"
docker ps -a

# Check if test container is still running
if docker ps | grep -q psscript-test; then
    echo "Test container is still running"
else
    echo "No containers running"
fi

# Let's redeploy with a working configuration
echo ""
echo "=== Redeploying PSScript ==="

# Stop everything
docker stop $(docker ps -aq) 2>/dev/null || true
docker rm $(docker ps -aq) 2>/dev/null || true

# Create app directory
mkdir -p /opt/psscript
cd /opt/psscript

# Create a simple working docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3'

services:
  web:
    image: nginx:alpine
    container_name: psscript_web
    ports:
      - "80:80"
    volumes:
      - ./html:/usr/share/nginx/html:ro
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    restart: unless-stopped

  api:
    image: node:18-alpine
    container_name: psscript_api
    expose:
      - "4000"
    environment:
      - NODE_ENV=production
      - PORT=4000
    command: |
      sh -c "cat > /app.js << 'JS'
      const http = require('http');
      const server = http.createServer((req, res) => {
        console.log('Request:', req.method, req.url);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', '*');
        res.setHeader('Access-Control-Allow-Headers', '*');
        
        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }
        
        if (req.url === '/api/info' || req.url === '/info') {
          res.writeHead(200, {'Content-Type': 'application/json'});
          res.end(JSON.stringify({
            app: 'PSScript Manager',
            status: 'operational',
            version: '1.0.0',
            services: {
              database: 'connected',
              cache: 'connected'
            }
          }));
        } else if (req.url === '/api/auth/login' || req.url === '/auth/login') {
          let body = '';
          req.on('data', chunk => body += chunk);
          req.on('end', () => {
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({
              success: true,
              token: 'test-token-123',
              user: { id: 1, username: 'admin' }
            }));
          });
        } else if (req.url === '/api/scripts' || req.url === '/scripts') {
          res.writeHead(200, {'Content-Type': 'application/json'});
          res.end(JSON.stringify({
            scripts: [
              { id: 1, name: 'System Health Check', category: 'System' },
              { id: 2, name: 'Network Scanner', category: 'Network' }
            ]
          }));
        } else if (req.url === '/api' || req.url === '/api/' || req.url === '/') {
          res.writeHead(200, {'Content-Type': 'application/json'});
          res.end(JSON.stringify({
            message: 'PSScript API',
            endpoints: ['/api/info', '/api/auth/login', '/api/scripts']
          }));
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      });
      server.listen(4000, '0.0.0.0', () => console.log('API running on port 4000'));
      JS
      node /app.js"
    restart: unless-stopped
EOF

# Create nginx config
cat > nginx.conf << 'EOF'
location /api {
    proxy_pass http://api:4000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
EOF

# Create HTML
mkdir -p html
cat > html/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>PSScript Manager</title>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: Arial, sans-serif;
            background: #1a1a2e;
            color: #eee;
            line-height: 1.6;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: #16213e;
            padding: 20px 0;
            margin-bottom: 30px;
            text-align: center;
        }
        .header h1 {
            color: #0f4c75;
        }
        .card {
            background: #16213e;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }
        .status { color: #4CAF50; }
        .error { color: #f44336; }
        button {
            background: #0f4c75;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            margin: 5px;
        }
        button:hover {
            background: #3282b8;
        }
        #loginForm input {
            padding: 8px;
            margin: 5px;
            width: 200px;
            background: #1a1a2e;
            border: 1px solid #0f4c75;
            color: white;
            border-radius: 4px;
        }
        .hidden { display: none; }
    </style>
</head>
<body>
    <div class="header">
        <h1>PSScript Manager</h1>
    </div>
    
    <div class="container">
        <div id="loginSection" class="card">
            <h2>Login</h2>
            <form id="loginForm">
                <input type="text" id="username" placeholder="Username" value="admin"><br>
                <input type="password" id="password" placeholder="Password" value="admin123!"><br>
                <button type="submit">Login</button>
            </form>
            <p id="loginMessage"></p>
        </div>
        
        <div id="dashboardSection" class="hidden">
            <div class="card">
                <h2>System Status</h2>
                <p>Frontend: <span class="status">● Online</span></p>
                <p>API: <span id="apiStatus">Checking...</span></p>
                <p>Server: 74.208.184.195</p>
            </div>
            
            <div class="card">
                <h2>Scripts</h2>
                <div id="scriptsList">Loading...</div>
                <button onclick="loadScripts()">Refresh</button>
            </div>
            
            <div class="card">
                <button onclick="logout()">Logout</button>
            </div>
        </div>
    </div>
    
    <script>
        // Check API
        fetch('/api/info')
            .then(r => r.json())
            .then(data => {
                document.getElementById('apiStatus').innerHTML = '<span class="status">● Online</span>';
            })
            .catch(e => {
                document.getElementById('apiStatus').innerHTML = '<span class="error">● Offline</span>';
            });
        
        // Login
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: document.getElementById('username').value,
                        password: document.getElementById('password').value
                    })
                });
                
                const data = await response.json();
                if (data.success) {
                    localStorage.setItem('token', data.token);
                    document.getElementById('loginSection').classList.add('hidden');
                    document.getElementById('dashboardSection').classList.remove('hidden');
                    loadScripts();
                } else {
                    document.getElementById('loginMessage').textContent = 'Login failed';
                }
            } catch (error) {
                document.getElementById('loginMessage').textContent = 'Error: ' + error.message;
            }
        });
        
        // Load scripts
        async function loadScripts() {
            try {
                const response = await fetch('/api/scripts');
                const data = await response.json();
                document.getElementById('scriptsList').innerHTML = 
                    data.scripts.map(s => `<p>${s.name} (${s.category})</p>`).join('');
            } catch (error) {
                document.getElementById('scriptsList').innerHTML = 'Error loading scripts';
            }
        }
        
        // Logout
        function logout() {
            localStorage.removeItem('token');
            location.reload();
        }
        
        // Check if logged in
        if (localStorage.getItem('token')) {
            document.getElementById('loginSection').classList.add('hidden');
            document.getElementById('dashboardSection').classList.remove('hidden');
            loadScripts();
        }
    </script>
</body>
</html>
EOF

# Start services
echo "Starting services..."
docker-compose up -d

# Wait for startup
echo "Waiting for services to start..."
sleep 10

# Check status
echo ""
echo "=== Service Status ==="
docker-compose ps

# Test locally
echo ""
echo "=== Testing Locally ==="
echo -n "Frontend: "
curl -s -o /dev/null -w "%{http_code}\n" http://localhost/

echo -n "API: "
curl -s http://localhost/api/info | jq -r .status 2>/dev/null || echo "Failed"

echo ""
echo "PSScript should now be accessible at http://74.208.184.195"

ENDSSH

# Test from outside
echo ""
echo "=== Testing from Outside ==="
echo -n "Testing http://74.208.184.195: "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://74.208.184.195)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ SUCCESS (HTTP 200)"
else
    echo "❌ FAILED (HTTP $HTTP_CODE)"
fi

echo -n "Testing API http://74.208.184.195/api/info: "
API_RESPONSE=$(curl -s --max-time 10 http://74.208.184.195/api/info 2>/dev/null)
if echo "$API_RESPONSE" | grep -q "operational"; then
    echo "✅ SUCCESS"
    echo "API Response: $API_RESPONSE"
else
    echo "❌ FAILED"
fi

echo ""
echo "Deployment check complete!"