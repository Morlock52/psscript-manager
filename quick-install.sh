#!/bin/bash

# PSScript Manager - One-Line Installation Script
set -e

echo "🚀 Installing PSScript Manager..."

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is required but not installed."
    echo "Please install Docker and Docker Compose first:"
    echo "https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is required but not installed."
    echo "Please install Docker Compose first:"
    echo "https://docs.docker.com/compose/install/"
    exit 1
fi

# Clone repository
echo "📥 Cloning PSScript Manager..."
git clone https://github.com/Morlock52/psscript-manager.git
cd psscript-manager

# Copy environment file
cp .env.example .env
echo "📝 Environment file created. Edit .env to configure your installation."

# Start services
echo "🔧 Starting PSScript Manager..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo ""
    echo "✅ PSScript Manager installed successfully!"
    echo ""
    echo "🌐 Access your application:"
    echo "• Frontend: http://localhost:3000"
    echo "• API: http://localhost:4000"
    echo ""
    echo "📧 Default login credentials:"
    echo "• Email: admin@example.com"
    echo "• Password: admin123!"
    echo ""
    echo "📖 Documentation: https://github.com/Morlock52/psscript-manager/blob/main/README.md"
else
    echo "❌ Installation failed. Check logs with: docker-compose logs"
    exit 1
fi
