#!/bin/bash

# PSScript Remote Deployment Script
# This script prepares and deploys PSScript to a remote server
# Usage: ./deploy-psscript-remote.sh

set -e

# Remote server details
REMOTE_HOST="74.208.184.195"
REMOTE_USER="root"
REMOTE_PASS="Morlock52b"
REMOTE_APP_DIR="/opt/psscript"

echo "========================================="
echo "PSScript Remote Deployment Script"
echo "========================================="
echo "Target: $REMOTE_USER@$REMOTE_HOST"
echo "App directory: $REMOTE_APP_DIR"
echo ""

# Create deployment package
echo "Creating deployment package..."
DEPLOY_DIR="psscript-deploy-$(date +%Y%m%d%H%M%S)"
mkdir -p "$DEPLOY_DIR"

# Copy essential files
echo "Copying application files..."
cp -r src "$DEPLOY_DIR/"
cp -r docker-compose*.yml "$DEPLOY_DIR/"
cp -r nginx "$DEPLOY_DIR/"
cp package*.json "$DEPLOY_DIR/"
cp .env.example "$DEPLOY_DIR/"
cp wait-for-it.sh "$DEPLOY_DIR/"

# Create remote deployment script
cat > "$DEPLOY_DIR/install-and-run.sh" << 'EOF'
#!/bin/bash
set -e

echo "========================================="
echo "PSScript Installation Script"
echo "========================================="

# Update system
echo "Updating system packages..."
apt-get update -y

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    apt-get install -y apt-transport-https ca-certificates curl software-properties-common
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -
    add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io
    systemctl start docker
    systemctl enable docker
else
    echo "Docker is already installed"
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
else
    echo "Docker Compose is already installed"
fi

# Create .env file if not exists
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    
    # Generate secure secrets
    JWT_SECRET=$(openssl rand -base64 32)
    SESSION_SECRET=$(openssl rand -base64 32)
    
    # Update .env with production values
    sed -i "s/NODE_ENV=development/NODE_ENV=production/g" .env
    sed -i "s/DOCKER_ENV=false/DOCKER_ENV=true/g" .env
    sed -i "s/DB_HOST=localhost/DB_HOST=postgres/g" .env
    sed -i "s/REDIS_HOST=localhost/REDIS_HOST=redis/g" .env
    sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/g" .env
    sed -i "s/SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/g" .env
    sed -i "s/AI_SERVICE_URL=.*/AI_SERVICE_URL=http:\/\/ai-service:8000/g" .env
    sed -i "s/USE_MOCK_AI=false/USE_MOCK_AI=true/g" .env
    
    echo ""
    echo "IMPORTANT: Edit the .env file to add your OpenAI API key if you want to use AI features!"
    echo "Set USE_MOCK_AI=false and add your OPENAI_API_KEY to enable real AI functionality."
    echo ""
fi

# Make scripts executable
chmod +x wait-for-it.sh

# Stop any existing containers
echo "Stopping existing containers..."
docker-compose down || true

# Pull base images
echo "Pulling Docker images..."
docker pull node:18-alpine
docker pull python:3.11-slim
docker pull pgvector/pgvector:pg15
docker pull redis:7.0-alpine
docker pull nginx:alpine

# Build and start services
echo "Building and starting services..."
docker-compose up -d --build

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 30

# Check service status
echo ""
echo "Checking service status..."
docker-compose ps

echo ""
echo "========================================="
echo "PSScript Installation Complete!"
echo "========================================="
echo ""
echo "Access the application at:"
echo "  - Frontend: http://$HOSTNAME:3002 (or http://$(hostname -I | awk '{print $1}'):3002)"
echo "  - Backend API: http://$HOSTNAME:4000"
echo "  - AI Service: http://$HOSTNAME:8000"
echo ""
echo "Default login credentials:"
echo "  - Username: admin"
echo "  - Password: admin123!"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop services: docker-compose down"
echo "To restart services: docker-compose restart"
echo ""
echo "NEXT STEPS:"
echo "1. Edit .env file to add your OpenAI API key for AI features"
echo "2. Change the default admin password after first login"
echo "3. Configure firewall rules if needed"
echo ""
EOF

chmod +x "$DEPLOY_DIR/install-and-run.sh"

# Create tarball
TARBALL="${DEPLOY_DIR}.tar.gz"
echo "Creating deployment package: $TARBALL"
tar -czf "$TARBALL" "$DEPLOY_DIR"
rm -rf "$DEPLOY_DIR"

echo ""
echo "Deployment package created: $TARBALL"
echo ""
echo "Next steps:"
echo "1. Transfer the package to the remote server:"
echo "   scp $TARBALL $REMOTE_USER@$REMOTE_HOST:~/"
echo ""
echo "2. SSH into the server and extract:"
echo "   ssh $REMOTE_USER@$REMOTE_HOST"
echo "   mkdir -p $REMOTE_APP_DIR"
echo "   cd $REMOTE_APP_DIR"
echo "   tar -xzf ~/$TARBALL --strip-components=1"
echo ""
echo "3. Run the installation script:"
echo "   ./install-and-run.sh"
echo ""

# Ask if user wants to deploy automatically
echo "Would you like to deploy automatically now? (y/N)"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo ""
    echo "Starting automatic deployment..."
    
    # Install sshpass if needed
    if ! command -v sshpass &> /dev/null; then
        echo "Installing sshpass for automated deployment..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew install hudochenkov/sshpass/sshpass || echo "Please install sshpass manually"
        else
            apt-get install -y sshpass || yum install -y sshpass || echo "Please install sshpass manually"
        fi
    fi
    
    # Transfer and deploy
    echo "Transferring deployment package..."
    sshpass -p "$REMOTE_PASS" scp -o StrictHostKeyChecking=no "$TARBALL" "$REMOTE_USER@$REMOTE_HOST:~/"
    
    echo "Executing remote deployment..."
    sshpass -p "$REMOTE_PASS" ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" << ENDSSH
        mkdir -p $REMOTE_APP_DIR
        cd $REMOTE_APP_DIR
        tar -xzf ~/$TARBALL --strip-components=1
        ./install-and-run.sh
ENDSSH
    
    echo ""
    echo "Deployment completed!"
    echo "The application should now be accessible at http://$REMOTE_HOST:3002"
else
    echo ""
    echo "Manual deployment instructions printed above."
fi