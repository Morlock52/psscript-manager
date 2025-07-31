#!/bin/bash

# GitHub Upload Script for PSScript Manager
set -e

echo "🚀 Preparing PSScript Manager for GitHub upload..."

REPO_URL="https://github.com/Morlock52/psscript-manager.git"
BRANCH="main"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if git is installed
if ! command -v git &> /dev/null; then
    print_error "Git is not installed. Please install git first."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "CLAUDE.md" ]; then
    print_error "Not in PSScript project directory. Please run from project root."
    exit 1
fi

print_status "Preparing files for upload..."

# Create proper README.md
if [ -f "README-MAIN.md" ]; then
    cp README-MAIN.md README.md
    print_success "README.md created from README-MAIN.md"
else
    print_warning "README-MAIN.md not found, using existing README.md"
fi

# Create .env.example if it doesn't exist
if [ ! -f ".env.example" ]; then
    cat > .env.example << 'EOF'
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/psscript
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your-jwt-secret-key-here
JWT_EXPIRES_IN=7d

# AI Services
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key

# Application Configuration
NODE_ENV=development
PORT=4000
FRONTEND_PORT=3000

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-email-password

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=.ps1,.psm1,.psd1

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log
EOF
    print_success ".env.example created"
fi

# Create quick-install.sh script
cat > quick-install.sh << 'EOF'
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
EOF

chmod +x quick-install.sh
print_success "quick-install.sh created"

# Initialize git repository if not already initialized
if [ ! -d ".git" ]; then
    print_status "Initializing git repository..."
    git init
    print_success "Git repository initialized"
fi

# Configure git settings
print_status "Configuring git settings..."
git config --local core.autocrlf false
git config --local core.filemode false

# Add all files
print_status "Adding files to git..."
git add .

# Check if there are changes to commit
if git diff --staged --quiet; then
    print_warning "No changes to commit"
else
    # Create initial commit
    print_status "Creating initial commit..."
    git commit -m "Initial commit: PSScript Manager v1.0

✨ Features:
- Complete PowerShell script management platform
- AI-powered script analysis and security scanning
- React frontend with TypeScript and Tailwind CSS
- Node.js backend with PostgreSQL and Redis
- Docker-based deployment system
- Comprehensive authentication and authorization
- Advanced search and categorization
- Multi-agent AI system integration
- Enterprise-grade security features
- Real-time collaboration tools

🚀 Ready for production deployment!

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
    
    print_success "Initial commit created"
fi

# Set up remote origin
print_status "Setting up remote repository..."
if git remote get-url origin &> /dev/null; then
    print_warning "Remote origin already exists"
else
    git remote add origin $REPO_URL
    print_success "Remote origin added: $REPO_URL"
fi

# Set main branch
git branch -M $BRANCH

# Push to GitHub
print_status "Pushing to GitHub..."
echo ""
echo "🔐 You'll need to authenticate with GitHub."
echo "If you haven't set up authentication:"
echo "1. Create a personal access token: https://github.com/settings/tokens"
echo "2. Use your GitHub username and the token as password"
echo ""

if git push -u origin $BRANCH; then
    print_success "Successfully pushed to GitHub!"
    echo ""
    echo "🎉 PSScript Manager is now available on GitHub!"
    echo "📁 Repository: $REPO_URL"
    echo ""
    echo "🔗 Next steps:"
    echo "1. Visit your GitHub repository"
    echo "2. Add repository description and topics"
    echo "3. Create releases for version management"
    echo "4. Set up GitHub Actions for CI/CD"
    echo "5. Configure GitHub Pages for documentation"
    echo ""
    echo "📊 Repository stats:"
    echo "• Files: $(find . -type f ! -path './.git/*' | wc -l)"
    echo "• Size: $(du -sh . | cut -f1)"
    echo "• Commit: $(git rev-parse --short HEAD)"
else
    print_error "Failed to push to GitHub"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "1. Check your GitHub authentication"
    echo "2. Verify repository exists and you have push access"
    echo "3. Try: git push origin $BRANCH --force (if needed)"
    exit 1
fi

# Create GitHub repository information
cat > GITHUB_INFO.md << 'EOF'
# GitHub Repository Information

## Repository Details
- **URL**: https://github.com/Morlock52/psscript-manager
- **License**: MIT
- **Language**: TypeScript, JavaScript, Python
- **Framework**: React, Node.js, Express

## Repository Setup Complete ✅

### What was uploaded:
- ✅ Complete source code
- ✅ Documentation (README.md)
- ✅ Configuration files
- ✅ Docker setup
- ✅ AI services
- ✅ Database schemas
- ✅ Test suites
- ✅ Deployment scripts

### Excluded from upload (.gitignore):
- ❌ node_modules/
- ❌ .env files
- ❌ Logs and cache
- ❌ Build artifacts
- ❌ Sensitive data
- ❌ Temporary files

## Next Steps

### 1. Repository Configuration
```bash
# Add repository topics on GitHub
Topics: powershell, script-management, ai-analysis, react, nodejs, docker
```

### 2. Create Release
```bash
# Tag and create first release
git tag -a v1.0.0 -m "PSScript Manager v1.0.0 - Initial Release"
git push origin v1.0.0
```

### 3. GitHub Actions (Optional)
Create `.github/workflows/ci.yml` for automated testing:
```yaml
name: CI/CD Pipeline
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
```

### 4. Documentation
- Update README.md with your specific deployment URLs
- Add CONTRIBUTING.md guidelines
- Create GitHub wiki for detailed documentation

### 5. Community
- Enable GitHub Discussions
- Add issue templates
- Set up pull request templates

## Maintenance

### Regular Updates
```bash
# Pull latest changes
git pull origin main

# Add new features
git add .
git commit -m "feat: add new feature"
git push origin main
```

### Releases
```bash
# Create new release
git tag -a v1.1.0 -m "Release v1.1.0"
git push origin v1.1.0
```

Happy coding! 🚀
EOF

print_success "GITHUB_INFO.md created with next steps"

print_success "🎉 Upload complete! Your PSScript Manager is now on GitHub!"
echo ""
echo "🔗 Repository: $REPO_URL"
echo "📖 Setup guide: GITHUB_INFO.md"