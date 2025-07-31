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
