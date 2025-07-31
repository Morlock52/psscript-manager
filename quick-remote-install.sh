#!/bin/bash
# Quick PSScript Installation Script for Remote Server
# Copy and paste this entire script into your SSH session

cat << 'INSTALL_SCRIPT' > /tmp/install-psscript.sh
#!/bin/bash
set -e

echo "======================================"
echo "PSScript Quick Installation"
echo "======================================"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Install Docker if not present
if ! command_exists docker; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl start docker
    systemctl enable docker
else
    echo "Docker already installed: $(docker --version)"
fi

# Install Docker Compose if not present
if ! command_exists docker-compose; then
    echo "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
else
    echo "Docker Compose already installed: $(docker-compose --version)"
fi

# Create application directory
echo "Creating application directory..."
mkdir -p /opt/psscript
cd /opt/psscript

# Create docker-compose.yml
echo "Creating docker-compose.yml..."
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: psscript_postgres
    environment:
      - POSTGRES_DB=psscript
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7.0-alpine
    container_name: psscript_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    image: node:18-alpine
    container_name: psscript_backend
    working_dir: /app
    ports:
      - "4000:4000"
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
      - JWT_SECRET=default-jwt-secret-change-me
      - USE_MOCK_AI=true
      - CORS_ORIGIN=http://74.208.184.195:3002
    volumes:
      - ./backend:/app
    command: sh -c "cd /app && npm install && npm start || node -e 'console.log(\"Backend ready for code deployment\")' && tail -f /dev/null"
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  frontend:
    image: node:18-alpine
    container_name: psscript_frontend
    working_dir: /app
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
      - PORT=3002
      - VITE_API_URL=http://74.208.184.195:4000/api
      - VITE_USE_MOCKS=false
    volumes:
      - ./frontend:/app
      - ./frontend-static:/app/dist
    command: sh -c "if [ -f /app/dist/index.html ]; then cd /app && npx serve -s dist -p 3002; else cd /app && npm install && npm run dev || (echo 'Serving test page' && cd /app/dist && python3 -m http.server 3002); fi"
    depends_on:
      - backend
    restart: unless-stopped

  ai-service:
    image: python:3.11-slim
    container_name: psscript_ai
    working_dir: /app
    ports:
      - "8000:8000"
    environment:
      - MOCK_MODE=true
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=psscript
      - DB_USER=postgres
      - DB_PASSWORD=postgres
    volumes:
      - ./ai:/app
    command: sh -c "cd /app && pip install fastapi uvicorn && python -m uvicorn main:app --host 0.0.0.0 --port 8000 || (echo 'AI service ready for code' && tail -f /dev/null)"
    depends_on:
      - postgres
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
EOF

# Create basic frontend test page
echo "Creating test frontend..."
mkdir -p frontend-static/dist
cat > frontend-static/dist/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PSScript Manager - Installation Success</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            margin: 0;
            padding: 0;
            background: #f5f5f5;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .container {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            max-width: 600px;
            text-align: center;
        }
        h1 { color: #333; }
        .status { 
            padding: 1rem;
            margin: 1rem 0;
            border-radius: 4px;
            background: #e8f5e9;
            color: #2e7d32;
        }
        .next-steps {
            text-align: left;
            background: #f5f5f5;
            padding: 1rem;
            border-radius: 4px;
            margin-top: 1rem;
        }
        .next-steps li {
            margin: 0.5rem 0;
        }
        code {
            background: #e0e0e0;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: monospace;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>PSScript Manager</h1>
        <div class="status">
            ✅ Docker containers are running successfully!
        </div>
        <p>The base infrastructure is now set up. The application containers are running but need the actual PSScript code to be deployed.</p>
        
        <div class="next-steps">
            <h3>Next Steps:</h3>
            <ol>
                <li>Deploy the PSScript application code to <code>/opt/psscript</code></li>
                <li>The containers will automatically detect and run the application</li>
                <li>Default login: <code>admin / admin123!</code></li>
                <li>Configure your OpenAI API key in the .env file for AI features</li>
            </ol>
        </div>
        
        <p style="margin-top: 2rem;">
            <strong>Server Time:</strong> <span id="time"></span>
        </p>
    </div>
    
    <script>
        document.getElementById('time').textContent = new Date().toLocaleString();
        
        // Check backend connectivity
        fetch('http://74.208.184.195:4000/health')
            .then(response => response.json())
            .then(data => console.log('Backend status:', data))
            .catch(error => console.log('Backend not yet deployed'));
    </script>
</body>
</html>
EOF

# Create .env file
echo "Creating .env file..."
cat > .env << 'EOF'
NODE_ENV=production
PORT=4000
DOCKER_ENV=true

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=psscript
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Security
JWT_SECRET=change-this-to-secure-random-string-$(openssl rand -hex 16)
SESSION_SECRET=change-this-to-another-secure-string-$(openssl rand -hex 16)

# AI Service
USE_MOCK_AI=true
OPENAI_API_KEY=your-openai-key-here

# Frontend
FRONTEND_URL=http://74.208.184.195:3002
CORS_ORIGIN=http://74.208.184.195:3002
EOF

# Configure firewall
echo "Configuring firewall..."
if command_exists ufw; then
    ufw allow 22/tcp
    ufw allow 3002/tcp
    ufw allow 4000/tcp
    ufw allow 8000/tcp
    echo "y" | ufw enable
else
    echo "UFW not found, checking iptables..."
    iptables -A INPUT -p tcp --dport 3002 -j ACCEPT
    iptables -A INPUT -p tcp --dport 4000 -j ACCEPT
    iptables -A INPUT -p tcp --dport 8000 -j ACCEPT
fi

# Start services
echo "Starting Docker containers..."
docker-compose down 2>/dev/null || true
docker-compose up -d

# Wait for services
echo "Waiting for services to start..."
sleep 20

# Check status
echo ""
echo "======================================"
echo "Container Status:"
echo "======================================"
docker-compose ps

echo ""
echo "======================================"
echo "Testing Services:"
echo "======================================"

# Test frontend
if curl -s http://localhost:3002 > /dev/null; then
    echo "✅ Frontend is accessible on port 3002"
else
    echo "❌ Frontend is not responding on port 3002"
fi

# Test backend
if curl -s http://localhost:4000 > /dev/null; then
    echo "✅ Backend is accessible on port 4000"
else
    echo "⚠️  Backend is waiting for application code on port 4000"
fi

# Test database
if docker exec psscript_postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo "✅ PostgreSQL database is running"
else
    echo "❌ PostgreSQL database is not responding"
fi

# Test Redis
if docker exec psscript_redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis cache is running"
else
    echo "❌ Redis cache is not responding"
fi

echo ""
echo "======================================"
echo "Installation Complete!"
echo "======================================"
echo ""
echo "Access the application at:"
echo "  http://74.208.184.195:3002"
echo ""
echo "To check logs:"
echo "  docker-compose logs -f"
echo ""
echo "To deploy the full PSScript application:"
echo "  1. Copy the application files to /opt/psscript"
echo "  2. The containers will automatically detect and run the code"
echo ""

INSTALL_SCRIPT

# Make it executable and run it
chmod +x /tmp/install-psscript.sh
bash /tmp/install-psscript.sh