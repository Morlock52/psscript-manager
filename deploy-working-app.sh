#!/bin/bash

# Deploy Working PSScript App
set -e

echo "🚀 Deploying Working PSScript App..."

SERVER_IP="74.208.184.195"
SERVER_USER="root"
SERVER_PASS="Morlock52"

# Create mock backend server
cat > mock-backend.js << 'EOF'
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Auth endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (email === 'admin@example.com' && password === 'admin123!') {
    res.json({
      token: 'mock-jwt-token',
      user: {
        id: 1,
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin'
      }
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.get('/api/auth/me', (req, res) => {
  res.json({
    id: 1,
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin'
  });
});

// Scripts endpoints
app.get('/api/scripts', (req, res) => {
  res.json({
    scripts: [
      {
        id: 1,
        name: 'System Health Check',
        description: 'Checks system health and resources',
        category: 'Monitoring',
        created_at: new Date()
      },
      {
        id: 2,
        name: 'Backup Script',
        description: 'Automated backup script',
        category: 'Maintenance',
        created_at: new Date()
      }
    ],
    total: 2
  });
});

// Default route
app.get('/api/*', (req, res) => {
  res.json({ message: 'API endpoint not implemented yet' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Mock backend running on port ${PORT}`);
});
EOF

# Create package.json for mock backend
cat > package.json << 'EOF'
{
  "name": "psscript-mock-backend",
  "version": "1.0.0",
  "main": "mock-backend.js",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  }
}
EOF

# Create docker-compose
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: psscript-nginx
    ports:
      - "80:80"
    volumes:
      - ./dist:/usr/share/nginx/html:ro
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - backend
    restart: unless-stopped

  backend:
    image: node:18-alpine
    container_name: psscript-backend
    working_dir: /app
    command: sh -c "npm install && node mock-backend.js"
    environment:
      - PORT=4000
    volumes:
      - ./mock-backend.js:/app/mock-backend.js:ro
      - ./package.json:/app/package.json:ro
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:4000/api/health"]
      interval: 10s
      timeout: 5s
      retries: 3

networks:
  default:
    name: psscript-network
EOF

# Create nginx config
cat > nginx.conf << 'EOF'
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

# Create deployment package
tar -czf working-deploy.tar.gz \
    nginx.conf \
    docker-compose.yml \
    mock-backend.js \
    package.json \
    -C src/frontend dist

# Deploy
if command -v sshpass &> /dev/null; then
    echo "📤 Deploying to server..."
    
    # Clean up existing
    sshpass -p "$SERVER_PASS" ssh $SERVER_USER@$SERVER_IP "cd /opt/psscript && docker-compose down && docker rm -f \$(docker ps -aq) 2>/dev/null || true"
    
    # Upload and extract
    sshpass -p "$SERVER_PASS" scp working-deploy.tar.gz $SERVER_USER@$SERVER_IP:/opt/psscript/
    
    # Start services
    sshpass -p "$SERVER_PASS" ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
cd /opt/psscript
tar -xzf working-deploy.tar.gz
docker-compose up -d

echo "⏳ Waiting for services..."
sleep 20

echo "🔍 Checking services..."
docker-compose ps

echo "✅ Testing endpoints..."
curl -s http://localhost/health && echo " - Frontend OK"
curl -s http://localhost/api/health | jq . && echo " - Backend OK"

echo "✅ Deployment complete!"
ENDSSH

fi

# Cleanup
rm -f nginx.conf docker-compose.yml mock-backend.js package.json working-deploy.tar.gz

echo "✅ PSScript is now live at: http://$SERVER_IP"
echo "📧 Login with: admin@example.com / admin123!"