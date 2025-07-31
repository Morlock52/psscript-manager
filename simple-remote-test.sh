#!/bin/bash

# Simple test deployment for PSScript
# This creates a minimal setup to test if Docker works on the server

echo "Creating minimal test deployment package..."

# Create a test directory
TEST_DIR="psscript-test-$(date +%Y%m%d%H%M%S)"
mkdir -p "$TEST_DIR"

# Create a simple test docker-compose.yml
cat > "$TEST_DIR/docker-compose.yml" << 'EOF'
version: '3.8'

services:
  test-web:
    image: nginx:alpine
    ports:
      - "8080:80"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost"]
      interval: 30s
      timeout: 10s
      retries: 3

  test-db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=testdb
      - POSTGRES_USER=testuser
      - POSTGRES_PASSWORD=testpass
    ports:
      - "5433:5432"
    restart: unless-stopped
EOF

# Create a test script
cat > "$TEST_DIR/test-deploy.sh" << 'EOF'
#!/bin/bash
set -e

echo "=== PSScript Test Deployment ==="
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed!"
    echo "Installing Docker..."
    
    # Quick Docker install for Ubuntu/Debian
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

echo "Docker version: $(docker --version)"
echo "Docker Compose version: $(docker-compose --version)"
echo ""

# Start test services
echo "Starting test services..."
docker-compose up -d

echo ""
echo "Waiting for services to start..."
sleep 15

# Check status
echo ""
echo "=== Service Status ==="
docker-compose ps

echo ""
echo "=== Test Results ==="

# Test nginx
if curl -s http://localhost:8080 > /dev/null; then
    echo "✓ Nginx test server is working on port 8080"
else
    echo "✗ Nginx test server is NOT working"
fi

# Test postgres
if docker-compose exec -T test-db psql -U testuser -d testdb -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✓ PostgreSQL test database is working on port 5433"
else
    echo "✗ PostgreSQL test database is NOT working"
fi

echo ""
echo "=== Port Check ==="
netstat -tlnp | grep -E ':8080|:5433' || ss -tlnp | grep -E ':8080|:5433'

echo ""
echo "To check logs: docker-compose logs"
echo "To stop services: docker-compose down"
echo ""
echo "If the test services work, we can proceed with full PSScript deployment."
EOF

chmod +x "$TEST_DIR/test-deploy.sh"

# Create deployment commands
cat > deploy-test-to-server.sh << EOF
#!/bin/bash

echo "Deploying test to 74.208.184.195..."

# Create tarball
tar -czf ${TEST_DIR}.tar.gz ${TEST_DIR}

# Copy to server (you'll need to enter password)
scp ${TEST_DIR}.tar.gz root@74.208.184.195:~/

echo ""
echo "Now SSH into the server and run:"
echo "  ssh root@74.208.184.195"
echo "  tar -xzf ${TEST_DIR}.tar.gz"
echo "  cd ${TEST_DIR}"
echo "  ./test-deploy.sh"
echo ""
echo "After testing, clean up with:"
echo "  docker-compose down"
echo "  cd .."
echo "  rm -rf ${TEST_DIR} ${TEST_DIR}.tar.gz"
EOF

chmod +x deploy-test-to-server.sh

echo ""
echo "Test deployment package created: ${TEST_DIR}.tar.gz"
echo ""
echo "To deploy the test, run: ./deploy-test-to-server.sh"
echo ""
echo "This will test if Docker works properly on the server before"
echo "deploying the full PSScript application."