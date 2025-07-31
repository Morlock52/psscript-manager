#!/bin/bash

# Automated GitHub Upload using GitHub CLI
set -e

echo "🚀 Auto-uploading PSScript Manager to GitHub..."
echo ""

# Check if we're in the right directory
if [ ! -f "CLAUDE.md" ]; then
    echo "❌ Please run this from the PSScript project directory"
    exit 1
fi

# Check if GitHub CLI is available
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI not found. Installing..."
    if command -v brew &> /dev/null; then
        brew install gh
    else
        echo "Please install GitHub CLI manually: https://cli.github.com/"
        exit 1
    fi
fi

echo "🔐 Authenticating with GitHub CLI..."
echo "This will open your browser for authentication."
echo ""

# Authenticate with GitHub CLI
if gh auth login --web; then
    echo "✅ Authentication successful!"
else
    echo "❌ Authentication failed. Trying alternative method..."
    
    echo ""
    echo "📋 Manual Upload Instructions:"
    echo "=============================="
    echo ""
    echo "1. Get a Personal Access Token:"
    echo "   https://github.com/settings/tokens"
    echo ""
    echo "2. Run these commands:"
    echo "   cd \"/Users/morlock/fun/psscript 4\""
    echo "   git push -u origin main"
    echo ""
    echo "3. When prompted:"
    echo "   Username: Morlock52"
    echo "   Password: [paste your token]"
    exit 1
fi

echo ""
echo "📊 Checking repository status..."
git status --short

echo ""
echo "📤 Pushing to GitHub..."

# Create the repository if it doesn't exist
echo "🏗️  Creating repository on GitHub..."
gh repo create psscript-manager --public --description "A comprehensive PowerShell script management platform with AI-powered analysis, collaborative features, and enterprise-grade security." || echo "Repository might already exist, continuing..."

# Push to GitHub
if git push -u origin main; then
    echo ""
    echo "🎉 SUCCESS! PSScript Manager uploaded to GitHub!"
    echo ""
    echo "🔗 Repository URL: https://github.com/Morlock52/psscript-manager"
    echo ""
    echo "📊 Repository Stats:"
    echo "• Files uploaded: $(git ls-files | wc -l)"
    echo "• Commit: $(git rev-parse --short HEAD)"
    echo "• Branch: $(git branch --show-current)"
    echo ""
    echo "🏷️  Creating first release..."
    git tag -a v1.0.0 -m "PSScript Manager v1.0.0 - Initial Release

🚀 Features:
- Complete PowerShell script management platform
- AI-powered script analysis and security scanning
- React frontend with TypeScript and Tailwind CSS
- Node.js backend with PostgreSQL and Redis
- Docker-based deployment system
- Enterprise-grade security and authentication
- Real-time collaboration and advanced search

Ready for production deployment!"

    git push origin v1.0.0
    
    echo "✅ Release v1.0.0 created!"
    echo ""
    echo "🌟 Next steps:"
    echo "1. Visit your repository: https://github.com/Morlock52/psscript-manager"
    echo "2. Add repository topics: powershell, ai, react, nodejs, docker"
    echo "3. Enable discussions and wiki"
    echo "4. Star your own repository! ⭐"
    
else
    echo "❌ Push failed. Repository might need to be created manually."
    echo ""
    echo "🔧 Try this:"
    echo "1. Go to https://github.com/new"
    echo "2. Create repository: psscript-manager"
    echo "3. Run: git push -u origin main"
fi