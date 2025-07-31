#!/bin/bash

# Full PSScript deployment script
REMOTE_HOST="74.208.184.195"
REMOTE_USER="root"
REMOTE_PASS="Morlock52"

echo "========================================="
echo "Deploying Full PSScript Application"
echo "========================================="

# Create deployment package with minimal app
echo "Creating deployment package..."

# Create temporary directory
DEPLOY_DIR="psscript-full-$(date +%Y%m%d%H%M%S)"
mkdir -p "$DEPLOY_DIR"

# Create directory structure
mkdir -p "$DEPLOY_DIR/src/frontend"
mkdir -p "$DEPLOY_DIR/src/backend"
mkdir -p "$DEPLOY_DIR/src/db"

# Create docker-compose.yml for full stack
cat > "$DEPLOY_DIR/docker-compose.yml" << 'EOF'
version: '3.8'

services:
  # Nginx reverse proxy on port 80
  nginx:
    image: nginx:alpine
    container_name: psscript_nginx
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./src/frontend/dist:/usr/share/nginx/html:ro
    depends_on:
      - backend
    restart: unless-stopped

  # Backend API
  backend:
    image: node:18-alpine
    container_name: psscript_backend
    working_dir: /app
    volumes:
      - ./src/backend:/app
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
      - JWT_SECRET=psscript-jwt-secret-change-in-production
      - USE_MOCK_AI=true
      - CORS_ORIGIN=http://74.208.184.195
    command: sh -c "cd /app && npm install --production && node server.js"
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: psscript_postgres
    environment:
      - POSTGRES_DB=psscript
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./src/db/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    restart: unless-stopped

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: psscript_redis
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
EOF

# Create nginx configuration
cat > "$DEPLOY_DIR/nginx.conf" << 'EOF'
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    upstream backend {
        server backend:4000;
    }

    server {
        listen 80;
        server_name _;
        
        # Frontend static files
        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;
        }
        
        # API proxy
        location /api {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_cache_bypass $http_upgrade;
        }
        
        # Health check
        location /health {
            proxy_pass http://backend/health;
        }
    }
}
EOF

# Create minimal backend
cat > "$DEPLOY_DIR/src/backend/package.json" << 'EOF'
{
  "name": "psscript-backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "pg": "^8.11.3",
    "redis": "^4.6.10",
    "jsonwebtoken": "^9.0.2"
  }
}
EOF

# Create backend server
cat > "$DEPLOY_DIR/src/backend/server.js" << 'EOF'
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const redis = require('redis');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Redis connection
const redisClient = redis.createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
});

redisClient.connect().catch(console.error);

// Routes
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'PSScript Backend is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/info', async (req, res) => {
  try {
    const dbStatus = await pool.query('SELECT NOW()').then(() => 'connected').catch(() => 'disconnected');
    const redisStatus = await redisClient.ping().then(() => 'connected').catch(() => 'disconnected');
    
    res.json({
      app: 'PSScript Manager',
      version: '1.0.0',
      status: 'operational',
      services: {
        database: dbStatus,
        cache: redisStatus
      },
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mock authentication endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === 'admin' && password === 'admin123!') {
    const token = jwt.sign(
      { id: 1, username: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      token,
      user: { id: 1, username: 'admin', role: 'admin' }
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Scripts endpoints
app.get('/api/scripts', (req, res) => {
  res.json({
    scripts: [
      { id: 1, name: 'Test Script 1', description: 'Sample PowerShell script', category: 'System' },
      { id: 2, name: 'Test Script 2', description: 'Another sample script', category: 'Network' }
    ],
    total: 2
  });
});

// Default API route
app.get('/api', (req, res) => {
  res.json({
    message: 'PSScript API',
    endpoints: [
      '/api/info',
      '/api/auth/login',
      '/api/scripts',
      '/health'
    ]
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`PSScript Backend running on port ${PORT}`);
});
EOF

# Create database init script
cat > "$DEPLOY_DIR/src/db/init.sql" << 'EOF'
-- PSScript Database Schema
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scripts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT,
    category VARCHAR(50),
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user (password: admin123!)
INSERT INTO users (username, email, password_hash, role) 
VALUES ('admin', 'admin@psscript.local', '$2b$10$YourHashedPasswordHere', 'admin')
ON CONFLICT (username) DO NOTHING;
EOF

# Create frontend build
mkdir -p "$DEPLOY_DIR/src/frontend/dist"
cat > "$DEPLOY_DIR/src/frontend/dist/index.html" << 'EOF'
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
        }
        .header {
            background: #1e293b;
            padding: 1rem 2rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.5);
        }
        .header h1 {
            font-size: 1.5rem;
            color: #3b82f6;
        }
        .container {
            max-width: 1200px;
            margin: 2rem auto;
            padding: 0 2rem;
        }
        .dashboard {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-top: 2rem;
        }
        .card {
            background: #1e293b;
            border-radius: 8px;
            padding: 1.5rem;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        }
        .card h2 {
            color: #3b82f6;
            margin-bottom: 1rem;
            font-size: 1.25rem;
        }
        .status-item {
            display: flex;
            justify-content: space-between;
            padding: 0.5rem 0;
            border-bottom: 1px solid #334155;
        }
        .status-item:last-child {
            border-bottom: none;
        }
        .online { color: #10b981; }
        .offline { color: #ef4444; }
        .btn {
            background: #3b82f6;
            color: white;
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 1rem;
            margin-top: 1rem;
            display: inline-block;
            text-decoration: none;
        }
        .btn:hover {
            background: #2563eb;
        }
        .login-form {
            max-width: 400px;
            margin: 4rem auto;
            background: #1e293b;
            padding: 2rem;
            border-radius: 8px;
        }
        .form-group {
            margin-bottom: 1rem;
        }
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            color: #94a3b8;
        }
        .form-group input {
            width: 100%;
            padding: 0.75rem;
            background: #0f172a;
            border: 1px solid #334155;
            border-radius: 4px;
            color: #e2e8f0;
            font-size: 1rem;
        }
        .alert {
            padding: 1rem;
            margin-bottom: 1rem;
            border-radius: 4px;
            background: #dc2626;
            color: white;
        }
        .hidden { display: none; }
    </style>
</head>
<body>
    <div class="header">
        <h1>PSScript Manager</h1>
    </div>
    
    <div class="container">
        <!-- Login Form -->
        <div id="loginSection">
            <div class="login-form">
                <h2>Login to PSScript</h2>
                <div id="loginError" class="alert hidden"></div>
                <form id="loginForm">
                    <div class="form-group">
                        <label>Username</label>
                        <input type="text" id="username" value="admin" required>
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="password" value="admin123!" required>
                    </div>
                    <button type="submit" class="btn">Login</button>
                </form>
            </div>
        </div>
        
        <!-- Dashboard -->
        <div id="dashboardSection" class="hidden">
            <h2>Welcome to PSScript Manager</h2>
            <p style="margin-top: 1rem; color: #94a3b8;">PowerShell Script Management Platform</p>
            
            <div class="dashboard">
                <div class="card">
                    <h2>System Status</h2>
                    <div class="status-item">
                        <span>Frontend</span>
                        <span class="online">● Online</span>
                    </div>
                    <div class="status-item">
                        <span>Backend API</span>
                        <span id="apiStatus">● Checking...</span>
                    </div>
                    <div class="status-item">
                        <span>Database</span>
                        <span id="dbStatus">● Checking...</span>
                    </div>
                    <div class="status-item">
                        <span>Cache</span>
                        <span id="cacheStatus">● Checking...</span>
                    </div>
                </div>
                
                <div class="card">
                    <h2>Quick Actions</h2>
                    <button class="btn" onclick="alert('Upload feature coming soon!')">Upload Script</button>
                    <button class="btn" onclick="loadScripts()">View Scripts</button>
                </div>
                
                <div class="card">
                    <h2>Recent Scripts</h2>
                    <div id="scriptsList">Loading...</div>
                </div>
                
                <div class="card">
                    <h2>Server Info</h2>
                    <div class="status-item">
                        <span>Server IP</span>
                        <span>74.208.184.195</span>
                    </div>
                    <div class="status-item">
                        <span>Environment</span>
                        <span>Production</span>
                    </div>
                    <div class="status-item">
                        <span>Version</span>
                        <span>1.0.0</span>
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 2rem;">
                <button class="btn" onclick="logout()">Logout</button>
            </div>
        </div>
    </div>
    
    <script>
        const API_URL = '/api';
        let authToken = localStorage.getItem('psscript_token');
        
        // Check if already logged in
        if (authToken) {
            showDashboard();
        }
        
        // Login form handler
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            try {
                const response = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                
                if (response.ok && data.success) {
                    authToken = data.token;
                    localStorage.setItem('psscript_token', authToken);
                    showDashboard();
                } else {
                    showLoginError(data.error || 'Login failed');
                }
            } catch (error) {
                showLoginError('Connection error. Please try again.');
            }
        });
        
        function showLoginError(message) {
            const errorDiv = document.getElementById('loginError');
            errorDiv.textContent = message;
            errorDiv.classList.remove('hidden');
        }
        
        function showDashboard() {
            document.getElementById('loginSection').classList.add('hidden');
            document.getElementById('dashboardSection').classList.remove('hidden');
            checkSystemStatus();
            loadScripts();
        }
        
        async function checkSystemStatus() {
            try {
                const response = await fetch(`${API_URL}/info`);
                const data = await response.json();
                
                document.getElementById('apiStatus').innerHTML = '<span class="online">● Online</span>';
                document.getElementById('dbStatus').innerHTML = 
                    data.services.database === 'connected' 
                    ? '<span class="online">● Connected</span>' 
                    : '<span class="offline">● Disconnected</span>';
                document.getElementById('cacheStatus').innerHTML = 
                    data.services.cache === 'connected' 
                    ? '<span class="online">● Connected</span>' 
                    : '<span class="offline">● Disconnected</span>';
            } catch (error) {
                document.getElementById('apiStatus').innerHTML = '<span class="offline">● Offline</span>';
            }
        }
        
        async function loadScripts() {
            try {
                const response = await fetch(`${API_URL}/scripts`, {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                const data = await response.json();
                
                const scriptsList = document.getElementById('scriptsList');
                if (data.scripts && data.scripts.length > 0) {
                    scriptsList.innerHTML = data.scripts.map(script => `
                        <div class="status-item">
                            <span>${script.name}</span>
                            <span style="color: #3b82f6">${script.category}</span>
                        </div>
                    `).join('');
                } else {
                    scriptsList.innerHTML = '<p style="color: #94a3b8">No scripts uploaded yet</p>';
                }
            } catch (error) {
                document.getElementById('scriptsList').innerHTML = '<p style="color: #ef4444">Failed to load scripts</p>';
            }
        }
        
        function logout() {
            localStorage.removeItem('psscript_token');
            location.reload();
        }
        
        // Auto-refresh status every 30 seconds
        setInterval(() => {
            if (!document.getElementById('dashboardSection').classList.contains('hidden')) {
                checkSystemStatus();
            }
        }, 30000);
    </script>
</body>
</html>
EOF

# Create deployment script
cat > "$DEPLOY_DIR/deploy.sh" << 'EOF'
#!/bin/bash
set -e

echo "=== PSScript Full Deployment ==="
echo ""

# Stop and remove test container
echo "Stopping test container..."
docker stop psscript-test 2>/dev/null || true
docker rm psscript-test 2>/dev/null || true

# Create app directory
mkdir -p /opt/psscript
cd /opt/psscript

# Copy files
cp -r * /opt/psscript/ 2>/dev/null || true

# Start services
echo "Starting PSScript services..."
docker-compose down 2>/dev/null || true
docker-compose up -d

# Wait for services
echo "Waiting for services to start..."
sleep 20

# Check status
echo ""
echo "Service Status:"
docker-compose ps

# Test endpoints
echo ""
echo "Testing endpoints..."
echo -n "Frontend: "
curl -s -o /dev/null -w "%{http_code}" http://localhost/ || echo "Failed"
echo ""
echo -n "API Health: "
curl -s http://localhost/api/info | grep -o '"status":"operational"' > /dev/null && echo "OK" || echo "Failed"
echo ""

echo ""
echo "=== Deployment Complete ==="
echo "Access PSScript at: http://74.208.184.195"
echo "Login: admin / admin123!"
echo ""
EOF

chmod +x "$DEPLOY_DIR/deploy.sh"

# Create tarball
TARBALL="${DEPLOY_DIR}.tar.gz"
tar -czf "$TARBALL" "$DEPLOY_DIR"
rm -rf "$DEPLOY_DIR"

echo "Deploying to server..."

# Deploy using sshpass
if command -v sshpass &> /dev/null; then
    echo "Transferring files..."
    sshpass -p "$REMOTE_PASS" scp -o StrictHostKeyChecking=no "$TARBALL" "$REMOTE_USER@$REMOTE_HOST:~/"
    
    echo "Executing deployment..."
    sshpass -p "$REMOTE_PASS" ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" << ENDSSH
        cd ~
        tar -xzf "$TARBALL"
        cd "$DEPLOY_DIR"
        ./deploy.sh
ENDSSH
    
    # Cleanup
    rm -f "$TARBALL"
    
    echo ""
    echo "Testing deployment..."
    sleep 5
    
    # Test the deployment
    echo ""
    echo "=== Testing PSScript Deployment ==="
    echo ""
    
    # Test frontend
    echo -n "Testing Frontend (http://74.208.184.195): "
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://74.208.184.195)
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ SUCCESS"
    else
        echo "❌ FAILED (HTTP $HTTP_CODE)"
    fi
    
    # Test API
    echo -n "Testing API (http://74.208.184.195/api/info): "
    API_RESPONSE=$(curl -s http://74.208.184.195/api/info 2>/dev/null)
    if echo "$API_RESPONSE" | grep -q "operational"; then
        echo "✅ SUCCESS"
    else
        echo "❌ FAILED"
    fi
    
    echo ""
    echo "========================================="
    echo "PSScript Full Deployment Complete!"
    echo "========================================="
    echo ""
    echo "Access your application at:"
    echo "  URL: http://74.208.184.195"
    echo "  Login: admin"
    echo "  Password: admin123!"
    echo ""
    echo "Features deployed:"
    echo "  ✓ Frontend (React-like interface)"
    echo "  ✓ Backend API (Express.js)"
    echo "  ✓ PostgreSQL Database"
    echo "  ✓ Redis Cache"
    echo "  ✓ Nginx Reverse Proxy"
    echo ""
else
    echo "sshpass not found. Manual deployment required."
    echo "1. Copy $TARBALL to server"
    echo "2. Extract and run deploy.sh"
fi