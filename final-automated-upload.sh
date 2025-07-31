#!/bin/bash

# Final Automated GitHub Upload - Fixed Authentication
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 PSScript Manager - Final Automated Upload${NC}"
echo "============================================="
echo ""

# Check directory
if [ ! -f "CLAUDE.md" ]; then
    echo -e "${RED}❌ Run from PSScript project directory${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Repository Status:${NC}"
echo "• Files ready: $(git ls-files | wc -l) files"
echo "• Size: $(du -sh . | cut -f1)"
echo ""

# Check if GitHub CLI is authenticated
if ! gh auth status &>/dev/null; then
    echo -e "${BLUE}🔐 Authenticating with GitHub CLI...${NC}"
    gh auth login --web --git-protocol https
fi

echo -e "${GREEN}✅ GitHub CLI authenticated${NC}"

# Configure Git to use GitHub CLI for authentication
echo -e "${BLUE}🔧 Configuring Git authentication...${NC}"
gh auth setup-git

# Add and commit any changes
echo -e "${BLUE}📝 Preparing files...${NC}"
git add .

if ! git diff --staged --quiet; then
    git commit -m "Final upload: PSScript Manager v1.0.0

🚀 Complete PowerShell script management platform ready for production

Features:
- AI-powered script analysis and security scanning
- React frontend with TypeScript and Tailwind CSS
- Node.js backend with PostgreSQL and Redis
- Docker-based deployment system
- Enterprise-grade security and authentication
- Real-time collaboration and advanced search
- Comprehensive API documentation

🤖 Automated upload completed"
fi

# Create repository if it doesn't exist
echo -e "${BLUE}🏗️  Ensuring repository exists...${NC}"
gh repo create psscript-manager --public --description "A comprehensive PowerShell script management platform with AI-powered analysis" 2>/dev/null || echo "Repository already exists"

# Push to GitHub using GitHub CLI authentication
echo -e "${BLUE}📤 Pushing to GitHub...${NC}"
if git push -u origin main; then
    echo ""
    echo -e "${GREEN}🎉 SUCCESS! Upload completed!${NC}"
    
    # Create release
    echo -e "${BLUE}🏷️  Creating release v1.0.0...${NC}"
    
    # Create tag if doesn't exist
    if ! git tag -l | grep -q "v1.0.0"; then
        git tag -a v1.0.0 -m "PSScript Manager v1.0.0 - Initial Release"
        git push origin v1.0.0
    fi
    
    # Create GitHub release
    gh release create v1.0.0 \
        --title "PSScript Manager v1.0.0 - Production Ready" \
        --notes "🚀 **Complete PowerShell Script Management Platform**

## ✨ Features
- AI-powered script analysis and security scanning
- Modern React frontend with TypeScript
- Robust Node.js backend with PostgreSQL
- Docker-based deployment system  
- Enterprise-grade security features
- Real-time collaboration tools

## 🚀 Quick Start
\`\`\`bash
git clone https://github.com/Morlock52/psscript-manager.git
cd psscript-manager
docker-compose up -d
\`\`\`

**Login**: admin@example.com / admin123!
**Files**: $(git ls-files | wc -l)+ production-ready files" 2>/dev/null || echo "Release creation skipped"
    
    echo ""
    echo -e "${GREEN}🎉 COMPLETE SUCCESS!${NC}"
    echo ""
    echo -e "${BLUE}🔗 Your PSScript Manager is now live at:${NC}"
    echo "   https://github.com/Morlock52/psscript-manager"
    echo ""
    echo -e "${BLUE}📊 Upload Statistics:${NC}"
    echo "• Total files: $(git ls-files | wc -l)"
    echo "• Repository size: $(du -sh . | cut -f1)" 
    echo "• Commit: $(git rev-parse --short HEAD)"
    echo "• Release: v1.0.0"
    echo ""
    echo -e "${GREEN}🌟 Your professional PSScript Manager is now on GitHub! 🚀${NC}"
    
else
    echo -e "${RED}❌ Push failed. Let's try manual authentication...${NC}"
    echo ""
    echo "Run these commands:"
    echo "1. gh auth refresh -h github.com -s repo"
    echo "2. git push -u origin main"
fi