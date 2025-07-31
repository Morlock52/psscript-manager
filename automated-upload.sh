#!/bin/bash

# Automated GitHub Upload Script for PSScript Manager
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 PSScript Manager - Automated GitHub Upload${NC}"
echo "=============================================="
echo ""

# Check if we're in the right directory
if [ ! -f "CLAUDE.md" ]; then
    echo -e "${RED}❌ Please run this from the PSScript project directory${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Repository Status:${NC}"
echo "• Files ready: $(git ls-files | wc -l) files"
echo "• Repository size: $(du -sh . | cut -f1)"
echo "• Target: https://github.com/Morlock52/psscript-manager"
echo ""

# Function to check if GitHub CLI is available and authenticated
check_gh_cli() {
    if command -v gh &> /dev/null; then
        if gh auth status &>/dev/null; then
            echo -e "${GREEN}✅ GitHub CLI is authenticated${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠️  GitHub CLI found but not authenticated${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  GitHub CLI not installed${NC}"
        return 1
    fi
}

# Function to install GitHub CLI
install_gh_cli() {
    echo -e "${BLUE}📦 Installing GitHub CLI...${NC}"
    if command -v brew &> /dev/null; then
        brew install gh
        echo -e "${GREEN}✅ GitHub CLI installed${NC}"
    else
        echo -e "${RED}❌ Homebrew not found. Please install manually:${NC}"
        echo "https://cli.github.com/"
        return 1
    fi
}

# Function to authenticate with GitHub CLI
auth_gh_cli() {
    echo -e "${BLUE}🔐 Authenticating with GitHub CLI...${NC}"
    echo "This will open your browser for secure authentication."
    echo ""
    
    if gh auth login --web --git-protocol https; then
        echo -e "${GREEN}✅ GitHub CLI authentication successful!${NC}"
        return 0
    else
        echo -e "${RED}❌ GitHub CLI authentication failed${NC}"
        return 1
    fi
}

# Function to create repository if it doesn't exist
create_repo() {
    echo -e "${BLUE}🏗️  Checking if repository exists...${NC}"
    
    if gh repo view Morlock52/psscript-manager &>/dev/null; then
        echo -e "${GREEN}✅ Repository already exists${NC}"
    else
        echo -e "${YELLOW}⚠️  Repository doesn't exist. Creating...${NC}"
        
        if gh repo create psscript-manager \
            --public \
            --description "A comprehensive PowerShell script management platform with AI-powered analysis, collaborative features, and enterprise-grade security." \
            --homepage "https://github.com/Morlock52/psscript-manager"; then
            echo -e "${GREEN}✅ Repository created successfully!${NC}"
        else
            echo -e "${RED}❌ Failed to create repository${NC}"
            return 1
        fi
    fi
}

# Function to push to GitHub
push_to_github() {
    echo -e "${BLUE}📤 Pushing to GitHub...${NC}"
    
    # Add any new files
    git add .
    
    # Check if there are changes to commit
    if ! git diff --staged --quiet; then
        git commit -m "Update: Final automated upload

🚀 PSScript Manager - Production Ready

✨ Complete platform featuring:
- AI-powered PowerShell script analysis
- React frontend with TypeScript
- Node.js backend with PostgreSQL
- Docker deployment system
- Enterprise security features
- Comprehensive documentation

🤖 Automated upload via script
Ready for production deployment!"
    fi
    
    # Push to GitHub
    if git push -u origin main; then
        echo -e "${GREEN}✅ Successfully pushed to GitHub!${NC}"
        return 0
    else
        echo -e "${RED}❌ Push failed${NC}"
        return 1
    fi
}

# Function to create release
create_release() {
    echo -e "${BLUE}🏷️  Creating release...${NC}"
    
    # Create tag if it doesn't exist
    if ! git tag -l | grep -q "v1.0.0"; then
        git tag -a v1.0.0 -m "PSScript Manager v1.0.0 - Initial Release

🚀 Complete PowerShell Script Management Platform

Features:
- AI-powered script analysis and security scanning
- Modern React frontend with TypeScript
- Robust Node.js backend with PostgreSQL
- Docker-based deployment system
- Enterprise-grade authentication and security
- Real-time collaboration features
- Advanced search and categorization
- Comprehensive API documentation

Ready for production deployment!

🤖 Generated with automated upload script"
        
        git push origin v1.0.0
    fi
    
    # Create GitHub release
    if gh release create v1.0.0 \
        --title "PSScript Manager v1.0.0 - Initial Release" \
        --notes "🚀 **PSScript Manager v1.0.0 - Production Ready!**

## 🌟 Features

- **AI-Powered Analysis**: Advanced script security scanning and optimization
- **Modern Frontend**: React 18 + TypeScript + Tailwind CSS
- **Robust Backend**: Node.js + Express + PostgreSQL + Redis
- **Enterprise Security**: Authentication, RBAC, audit logging
- **Docker Deployment**: Production-ready containerization
- **Comprehensive API**: RESTful API with full documentation

## 🚀 Quick Start

\`\`\`bash
git clone https://github.com/Morlock52/psscript-manager.git
cd psscript-manager
docker-compose up -d
\`\`\`

Access at: http://localhost:3000
Login: admin@example.com / admin123!

## 📚 Documentation

- [Installation Guide](README.md#quick-start)
- [API Documentation](README.md#api-documentation)
- [Contributing Guidelines](CONTRIBUTING.md)

**Total Files**: 3,361+ files
**Ready for Production**: ✅"; then
        echo -e "${GREEN}✅ Release v1.0.0 created!${NC}"
    else
        echo -e "${YELLOW}⚠️  Release creation failed, but upload was successful${NC}"
    fi
}

# Main execution flow
echo -e "${BLUE}🤖 Starting automated upload process...${NC}"
echo ""

# Step 1: Check/Install/Auth GitHub CLI
if ! check_gh_cli; then
    echo -e "${YELLOW}Setting up GitHub CLI...${NC}"
    
    if ! command -v gh &> /dev/null; then
        install_gh_cli || exit 1
    fi
    
    auth_gh_cli || exit 1
fi

# Step 2: Create repository if needed
create_repo || exit 1

# Step 3: Push to GitHub
push_to_github || exit 1

# Step 4: Create release
create_release

# Success message
echo ""
echo -e "${GREEN}🎉 SUCCESS! PSScript Manager uploaded to GitHub!${NC}"
echo ""
echo -e "${BLUE}🔗 Your repository is now live at:${NC}"
echo "   https://github.com/Morlock52/psscript-manager"
echo ""
echo -e "${BLUE}📊 Upload Statistics:${NC}"
echo "• Files uploaded: $(git ls-files | wc -l)"
echo "• Repository size: $(du -sh . | cut -f1)"
echo "• Latest commit: $(git rev-parse --short HEAD)"
echo "• Release: v1.0.0"
echo ""
echo -e "${BLUE}🌟 Next steps:${NC}"
echo "1. Visit your repository and add topics"
echo "2. Enable Discussions and Wiki"
echo "3. Add collaborators if needed"
echo "4. Star your own repository! ⭐"
echo ""
echo -e "${GREEN}Your PSScript Manager is now showcased on GitHub! 🚀${NC}"