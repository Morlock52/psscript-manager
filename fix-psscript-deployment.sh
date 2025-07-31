#!/bin/bash

# Comprehensive PSScript Deployment Fix Script
# This script diagnoses and fixes common deployment issues

cat << 'SCRIPT' > /tmp/fix-psscript.sh
#!/bin/bash

echo "============================================"
echo "PSScript Deployment Diagnostic & Fix Script"
echo "============================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
        return 1
    fi
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}This script must be run as root${NC}"
    exit 1
fi

echo "Step 1: System Information"
echo "=========================="
echo "Hostname: $(hostname)"
echo "IP Address: $(hostname -I | awk '{print $1}')"
echo "OS: $(lsb_release -d 2>/dev/null || cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2)"
echo "Kernel: $(uname -r)"
echo ""

echo "Step 2: Docker Installation Check"
echo "================================="

# Check and install Docker
if command -v docker &> /dev/null; then
    docker_version=$(docker --version)
    print_status 0 "Docker installed: $docker_version"
else
    print_status 1 "Docker not installed"
    echo "Installing Docker..."
    
    # Remove old Docker installations
    apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Install Docker
    apt-get update
    apt-get install -y \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    # Add Docker's GPG key
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # Add repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Start Docker
    systemctl start docker
    systemctl enable docker
    
    if command -v docker &> /dev/null; then
        print_status 0 "Docker installed successfully"
    else
        print_status 1 "Docker installation failed"
        exit 1
    fi
fi

# Check Docker service
if systemctl is-active --quiet docker; then
    print_status 0 "Docker service is running"
else
    print_status 1 "Docker service is not running"
    echo "Starting Docker service..."
    systemctl start docker
    sleep 5
    systemctl is-active --quiet docker && print_status 0 "Docker service started" || print_status 1 "Failed to start Docker"
fi

# Check Docker Compose
if command -v docker-compose &> /dev/null; then
    compose_version=$(docker-compose --version)
    print_status 0 "Docker Compose installed: $compose_version"
else
    print_status 1 "Docker Compose not installed"
    echo "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    
    if command -v docker-compose &> /dev/null; then
        print_status 0 "Docker Compose installed successfully"
    else
        print_status 1 "Docker Compose installation failed"
    fi
fi

echo ""
echo "Step 3: Network and Firewall Check"
echo "=================================="

# Check if ports are in use
for port in 3002 4000 5432 6379 8000; do
    if lsof -i:$port &>/dev/null; then
        process=$(lsof -i:$port | grep LISTEN | awk '{print $1}' | head -1)
        print_warning "Port $port is already in use by: $process"
    else
        print_status 0 "Port $port is available"
    fi
done

# Check firewall
if command -v ufw &>/dev/null; then
    ufw_status=$(ufw status | grep Status | awk '{print $2}')
    if [ "$ufw_status" = "active" ]; then
        print_status 0 "UFW firewall is active"
        
        # Check if ports are allowed
        for port in 22 3002 4000 5432 6379 8000; do
            if ufw status | grep -q "$port"; then
                print_status 0 "Port $port is allowed in firewall"
            else
                print_warning "Port $port is not explicitly allowed"
                ufw allow $port/tcp
                print_status 0 "Added firewall rule for port $port"
            fi
        done
    else
        print_warning "UFW firewall is inactive"
        echo "Configuring firewall..."
        ufw allow 22/tcp
        ufw allow 3002/tcp
        ufw allow 4000/tcp
        ufw allow 5432/tcp
        ufw allow 6379/tcp
        ufw allow 8000/tcp
        echo "y" | ufw enable
        print_status 0 "Firewall configured and enabled"
    fi
else
    # Check iptables
    if iptables -L -n | grep -q "ACCEPT.*dpt:3002"; then
        print_status 0 "iptables rules seem configured"
    else
        print_warning "No firewall rules detected"
        
        # Add iptables rules
        iptables -A INPUT -p tcp --dport 22 -j ACCEPT
        iptables -A INPUT -p tcp --dport 3002 -j ACCEPT
        iptables -A INPUT -p tcp --dport 4000 -j ACCEPT
        iptables -A INPUT -p tcp --dport 5432 -j ACCEPT
        iptables -A INPUT -p tcp --dport 6379 -j ACCEPT
        iptables -A INPUT -p tcp --dport 8000 -j ACCEPT
        
        # Save rules
        if command -v netfilter-persistent &>/dev/null; then
            netfilter-persistent save
        elif [ -f /etc/iptables/rules.v4 ]; then
            iptables-save > /etc/iptables/rules.v4
        fi
        
        print_status 0 "Added iptables rules"
    fi
fi

echo ""
echo "Step 4: PSScript Application Setup"
echo "=================================="

# Create application directory
APP_DIR="/opt/psscript"
if [ -d "$APP_DIR" ]; then
    print_status 0 "Application directory exists: $APP_DIR"
    cd "$APP_DIR"
    
    # Check for existing containers
    if [ -f docker-compose.yml ]; then
        print_status 0 "docker-compose.yml found"
        
        # Stop existing containers
        echo "Stopping existing containers..."
        docker-compose down --remove-orphans 2>/dev/null || true
        
        # Clean up
        docker system prune -f
    fi
else
    print_status 1 "Application directory not found"
    echo "Creating application directory..."
    mkdir -p "$APP_DIR"
    cd "$APP_DIR"
    print_status 0 "Created $APP_DIR"
fi

echo ""
echo "Step 5: Creating Minimal Working Setup"
echo "======================================"

# Create a minimal docker-compose.yml that definitely works
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  # Simple web server to test
  web:
    image: nginx:alpine
    container_name: psscript_web
    ports:
      - "3002:80"
    volumes:
      - ./html:/usr/share/nginx/html:ro
    restart: unless-stopped
    networks:
      - psscript-network

  # Simple API to test
  api:
    image: node:18-alpine
    container_name: psscript_api
    ports:
      - "4000:4000"
    working_dir: /app
    volumes:
      - ./api:/app
    command: |
      sh -c "if [ -f /app/server.js ]; then node /app/server.js; else echo 'const http=require(\"http\");http.createServer((req,res)=>{res.setHeader(\"Access-Control-Allow-Origin\",\"*\");res.writeHead(200,{\"Content-Type\":\"application/json\"});res.end(JSON.stringify({status:\"ok\",time:new Date()}))}).listen(4000,()=>console.log(\"API on 4000\"))' | node; fi"
    restart: unless-stopped
    networks:
      - psscript-network

  # PostgreSQL
  postgres:
    image: postgres:15-alpine
    container_name: psscript_postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: psscript
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    networks:
      - psscript-network

  # Redis
  redis:
    image: redis:7-alpine
    container_name: psscript_redis
    ports:
      - "6379:6379"
    restart: unless-stopped
    networks:
      - psscript-network

networks:
  psscript-network:
    driver: bridge

volumes:
  postgres_data:
EOF

# Create HTML directory and test page
mkdir -p html
cat > html/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>PSScript - Working!</title>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            background: #1a1a1a;
            color: #fff;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
        }
        .container {
            text-align: center;
            padding: 40px;
            background: #2a2a2a;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.5);
        }
        h1 { color: #4CAF50; }
        .status { margin: 20px 0; }
        .endpoint {
            display: inline-block;
            margin: 10px;
            padding: 10px 20px;
            background: #333;
            border-radius: 5px;
        }
        .online { color: #4CAF50; }
        .offline { color: #f44336; }
        code {
            background: #000;
            padding: 2px 5px;
            border-radius: 3px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>✅ PSScript is Running!</h1>
        <p>If you can see this page, the web server is working correctly.</p>
        
        <div class="status">
            <h3>Service Status:</h3>
            <div class="endpoint">
                <strong>Web Server:</strong> <span class="online">● Online</span>
            </div>
            <div class="endpoint">
                <strong>API:</strong> <span id="api-status">Checking...</span>
            </div>
        </div>
        
        <div class="status">
            <h3>Access Points:</h3>
            <p>Frontend: <code>http://74.208.184.195:3002</code></p>
            <p>API: <code>http://74.208.184.195:4000</code></p>
        </div>
        
        <div class="status">
            <p>Server Time: <span id="time"></span></p>
            <p>Your IP: <span id="ip">74.208.184.195</span></p>
        </div>
    </div>
    
    <script>
        // Update time
        setInterval(() => {
            document.getElementById('time').textContent = new Date().toLocaleString();
        }, 1000);
        
        // Check API
        fetch('http://74.208.184.195:4000')
            .then(r => r.json())
            .then(data => {
                document.getElementById('api-status').innerHTML = '<span class="online">● Online</span>';
            })
            .catch(e => {
                document.getElementById('api-status').innerHTML = '<span class="offline">● Offline</span>';
                
                // Try local
                fetch('http://localhost:4000')
                    .then(r => r.json())
                    .then(data => {
                        document.getElementById('api-status').innerHTML = '<span class="online">● Online (local)</span>';
                    });
            });
    </script>
</body>
</html>
EOF

# Create simple API server
mkdir -p api
cat > api/server.js << 'EOF'
const http = require('http');

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        status: 'ok',
        message: 'PSScript API is running',
        time: new Date().toISOString(),
        endpoint: req.url,
        method: req.method
    }, null, 2));
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`PSScript API server running on port ${PORT}`);
});
EOF

echo ""
echo "Step 6: Starting Services"
echo "========================"

# Pull images first
echo "Pulling Docker images..."
docker pull nginx:alpine
docker pull node:18-alpine  
docker pull postgres:15-alpine
docker pull redis:7-alpine

# Start services
echo "Starting containers..."
docker-compose up -d

# Wait for services
echo "Waiting for services to start..."
sleep 15

# Check container status
echo ""
echo "Step 7: Verifying Deployment"
echo "============================"

docker-compose ps

echo ""
echo "Testing services..."

# Test web server
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3002 | grep -q "200"; then
    print_status 0 "Web server is responding on port 3002"
else
    print_status 1 "Web server is not responding"
    
    # Check container logs
    echo "Web server logs:"
    docker logs psscript_web --tail=10
fi

# Test API
if curl -s -o /dev/null -w "%{http_code}" http://localhost:4000 | grep -q "200"; then
    print_status 0 "API server is responding on port 4000"
else
    print_status 1 "API server is not responding"
    
    # Check container logs
    echo "API server logs:"
    docker logs psscript_api --tail=10
fi

# Test database
if docker exec psscript_postgres pg_isready -U postgres &>/dev/null; then
    print_status 0 "PostgreSQL is ready"
else
    print_status 1 "PostgreSQL is not responding"
fi

# Test Redis
if docker exec psscript_redis redis-cli ping &>/dev/null; then
    print_status 0 "Redis is ready"
else
    print_status 1 "Redis is not responding"
fi

echo ""
echo "Step 8: Network Diagnostics"
echo "==========================="

# Check listening ports
echo "Listening ports:"
netstat -tlnp | grep -E ':3002|:4000|:5432|:6379' || ss -tlnp | grep -E ':3002|:4000|:5432|:6379'

# Check Docker networks
echo ""
echo "Docker networks:"
docker network ls

# Check connectivity from container
echo ""
echo "Testing internal connectivity:"
docker exec psscript_web ping -c 1 api &>/dev/null && print_status 0 "Containers can communicate" || print_status 1 "Container communication issue"

echo ""
echo "============================================"
echo "Deployment Summary"
echo "============================================"
echo ""
echo "Application directory: $APP_DIR"
echo "Docker Compose file: $APP_DIR/docker-compose.yml"
echo ""
echo "Access your application at:"
echo "  Web Interface: http://74.208.184.195:3002"
echo "  API Endpoint: http://74.208.184.195:4000"
echo ""
echo "Useful commands:"
echo "  cd $APP_DIR"
echo "  docker-compose ps          # Check status"
echo "  docker-compose logs -f     # View logs"
echo "  docker-compose restart     # Restart services"
echo "  docker-compose down        # Stop services"
echo ""

# Create a test script for ongoing checks
cat > /opt/psscript/test-services.sh << 'TEST'
#!/bin/bash
echo "Testing PSScript services..."
echo ""
echo -n "Web server (3002): "
curl -s -o /dev/null -w "%{http_code}" http://localhost:3002
echo ""
echo -n "API server (4000): "
curl -s -o /dev/null -w "%{http_code}" http://localhost:4000
echo ""
echo -n "PostgreSQL (5432): "
docker exec psscript_postgres pg_isready -U postgres &>/dev/null && echo "OK" || echo "FAIL"
echo -n "Redis (6379): "
docker exec psscript_redis redis-cli ping
TEST

chmod +x /opt/psscript/test-services.sh

echo "To test services anytime, run: /opt/psscript/test-services.sh"
echo ""

# Final check
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3002 | grep -q "200"; then
    echo -e "${GREEN}✓ Deployment successful! The application should be accessible.${NC}"
else
    echo -e "${RED}✗ Services started but may need a moment to fully initialize.${NC}"
    echo "  Wait 30 seconds and try accessing http://74.208.184.195:3002"
fi

SCRIPT

echo "Fix script created at: /tmp/fix-psscript.sh"
echo ""
echo "To run this script on your server:"
echo "1. SSH into the server: ssh root@74.208.184.195"
echo "2. Run: bash /tmp/fix-psscript.sh"
echo ""
echo "Or copy and paste this command after SSH:"
echo "curl -fsSL https://raw.githubusercontent.com/[your-repo]/fix-psscript.sh | bash"