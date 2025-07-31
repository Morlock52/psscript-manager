#!/bin/bash

# Safe GitHub Upload - No Token Storage
set -e

echo "🔒 SECURITY NOTICE:"
echo "=================="
echo "⚠️  Please revoke the token you shared earlier at:"
echo "   https://github.com/settings/tokens"
echo ""
echo "🔐 For security, this script will prompt you to enter"
echo "   your token safely without storing it anywhere."
echo ""

read -p "Press ENTER when you've revoked the old token..."

echo ""
echo "🚀 PSScript Manager - Safe Upload"
echo "================================="
echo ""

# Check directory
if [ ! -f "CLAUDE.md" ]; then
    echo "❌ Please run from PSScript project directory"
    exit 1
fi

echo "📊 Repository Status:"
echo "• Files ready: $(git status --porcelain | wc -l) changes"
echo "• Last commit: $(git log -1 --pretty=format:'%h - %s')"
echo "• Remote: $(git remote get-url origin)"
echo ""

echo "🔑 Create a NEW GitHub token:"
echo "1. Visit: https://github.com/settings/tokens"
echo "2. Click 'Generate new token (classic)'"
echo "3. Select 'repo' scope"
echo "4. Generate and COPY the token"
echo ""

read -p "Press ENTER when you have your NEW token ready..."

echo ""
echo "📤 Uploading to GitHub..."
echo "When prompted, enter:"
echo "Username: Morlock52"
echo "Password: [paste your NEW token]"
echo ""

# Push to GitHub
if git push -u origin main; then
    echo ""
    echo "🎉 SUCCESS! PSScript Manager uploaded!"
    echo ""
    echo "🔗 Repository: https://github.com/Morlock52/psscript-manager"
    echo ""
    echo "📊 Upload Statistics:"
    echo "• Total files: $(git ls-files | wc -l)"
    echo "• Repository size: $(du -sh . | cut -f1)"
    echo "• Commit: $(git rev-parse --short HEAD)"
    echo ""
    
    echo "🏷️  Creating release tag..."
    git tag -a v1.0.0 -m "PSScript Manager v1.0.0 - Initial Release

🚀 Complete PowerShell Script Management Platform

✨ Features:
- AI-powered script analysis and security scanning
- React frontend with TypeScript and Tailwind CSS  
- Node.js backend with PostgreSQL and Redis
- Docker-based deployment system
- Enterprise-grade authentication and security
- Real-time collaboration and advanced search
- Multi-agent AI system integration
- Comprehensive API and documentation

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

    if git push origin v1.0.0; then
        echo "✅ Release v1.0.0 created!"
    fi
    
    echo ""
    echo "🌟 Next Steps:"
    echo "1. Visit: https://github.com/Morlock52/psscript-manager"
    echo "2. Add description: 'A comprehensive PowerShell script management platform with AI-powered analysis'"
    echo "3. Add topics: powershell, ai-analysis, react, nodejs, docker, typescript"
    echo "4. Enable Discussions and Wiki"
    echo "5. Create your first GitHub release"
    echo ""
    echo "🎉 Your PSScript Manager is now live on GitHub!"
    
else
    echo ""
    echo "❌ Upload failed. Common solutions:"
    echo "1. Check your token has 'repo' permissions"
    echo "2. Verify repository name is correct"
    echo "3. Ensure token hasn't expired"
    echo ""
    echo "Try running: git push -u origin main --verbose"
fi