#!/bin/bash

# Deep Clean Repository and Upload
set -e

echo "🧹 Deep Cleaning Repository for GitHub Upload"
echo "============================================"
echo ""

# Check we're in the right directory
if [ ! -f "CLAUDE.md" ]; then
    echo "❌ Please run from PSScript directory"
    exit 1
fi

echo "📦 Current repository size: $(du -sh . | cut -f1)"
echo ""

# Create a new clean repository without Docker images
echo "🔧 Creating clean repository without large files..."
echo ""

# Create temporary directory
TEMP_DIR="../psscript-clean-upload"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

# Copy all files except large ones
echo "📋 Copying files (excluding large Docker images)..."
rsync -av --progress \
    --exclude='.git' \
    --exclude='deploy/images/*.tar' \
    --exclude='*.tar' \
    --exclude='*.tar.gz' \
    --exclude='node_modules' \
    --exclude='.DS_Store' \
    . "$TEMP_DIR/"

# Initialize new git repo
cd "$TEMP_DIR"
git init
git config user.name "Morlock52"
git config user.email "morlok52@gmail.com"

# Create comprehensive .gitignore
echo "📝 Creating .gitignore..."
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Production
dist/
build/

# Environment
.env
.env.local
.env.*.local

# Logs
logs/
*.log

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Docker images (large files)
deploy/images/
*.tar
*.tar.gz

# Database
*.db
*.sqlite

# Temporary files
tmp/
temp/
*.tmp

# Certificates (keep ssl directory but not contents)
ssl/*.crt
ssl/*.key
ssl/*.pem
EOF

# Add all files
echo "📁 Adding files to repository..."
git add .

# Commit
echo "💾 Creating initial commit..."
git commit -m "Initial commit: PSScript Manager v1.0.0

Complete PSScript management platform with:
- Frontend React application
- Backend Node.js API
- PostgreSQL with pgvector
- Redis caching
- AI service integration
- Docker deployment setup

Note: Docker images excluded from repo - use docker-compose build"

# Add remote
echo "🔗 Adding GitHub remote..."
git remote add origin https://github.com/Morlock52/psscript-manager.git

# Show what we're uploading
echo ""
echo "📊 Clean Repository Stats:"
echo "• Files: $(git ls-files | wc -l)"
echo "• Size: $(du -sh . | cut -f1)"
echo ""

# Push to GitHub
echo "🚀 Uploading clean repository to GitHub..."
if git push -u origin main --force; then
    echo ""
    echo "🎉 SUCCESS! PSScript Manager uploaded to GitHub!"
    echo ""
    echo "🔗 Your repository is now live at:"
    echo "   https://github.com/Morlock52/psscript-manager"
    echo ""
    
    # Create release
    echo "🏷️  Creating release tag..."
    git tag v1.0.0 -m "PSScript Manager v1.0.0"
    git push origin v1.0.0
    
    echo "✅ Complete! Your PSScript Manager is on GitHub!"
    echo ""
    echo "📝 Note: To build Docker images locally:"
    echo "   cd deploy && docker-compose build"
    
else
    echo ""
    echo "❌ Upload failed. Please check error messages above."
fi