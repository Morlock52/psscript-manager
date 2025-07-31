#!/bin/bash

# Push to GitHub with Authentication Helper
set -e

echo "🚀 PSScript Manager - GitHub Push"
echo "================================="
echo ""

# Check if we're in the right directory
if [ ! -f "CLAUDE.md" ]; then
    echo "❌ Please run from PSScript project directory"
    exit 1
fi

echo "📊 Ready to push:"
echo "• Repository: $(git remote get-url origin)"
echo "• Files: $(git ls-files | wc -l) files ready"
echo "• Last commit: $(git log -1 --pretty=format:'%h - %s')"
echo ""

echo "🔑 GitHub Authentication Setup:"
echo "==============================="
echo ""
echo "You need a GitHub Personal Access Token."
echo ""
echo "1. Visit: https://github.com/settings/tokens"
echo "2. Click 'Generate new token (classic)'"
echo "3. Select 'repo' scope"
echo "4. Generate and copy the token"
echo ""

read -p "Do you have your GitHub token ready? (y/n): " ready

if [ "$ready" != "y" ]; then
    echo "Please get your token first, then run this script again."
    exit 1
fi

echo ""
echo "🔐 Setting up authentication..."
echo ""
echo "Enter your GitHub username (Morlock52):"
read -r username

echo ""
echo "Enter your GitHub Personal Access Token:"
echo "(Your token will be hidden as you type)"
read -s token

echo ""
echo "📤 Pushing to GitHub..."

# Set up temporary credential helper
git config credential.helper store

# Create URL with credentials
repo_url="https://${username}:${token}@github.com/Morlock52/psscript-manager.git"

# Update remote URL temporarily
git remote set-url origin "$repo_url"

# Push to GitHub
if git push -u origin main; then
    echo ""
    echo "🎉 SUCCESS! PSScript Manager uploaded to GitHub!"
    echo ""
    echo "🔗 Your repository is now live at:"
    echo "   https://github.com/Morlock52/psscript-manager"
    echo ""
    echo "📊 Upload completed:"
    echo "• Files uploaded: $(git ls-files | wc -l)"
    echo "• Repository size: $(du -sh . | cut -f1)"
    echo "• Latest commit: $(git rev-parse --short HEAD)"
    echo ""
    
    echo "🏷️  Creating release tag..."
    if git tag -a v1.0.0 -m "PSScript Manager v1.0.0 - Initial Release" 2>/dev/null; then
        git push origin v1.0.0
        echo "✅ Release v1.0.0 created!"
    else
        echo "ℹ️  Tag already exists, skipping release creation"
    fi
    
    echo ""
    echo "🌟 Next steps:"
    echo "1. Visit your repository: https://github.com/Morlock52/psscript-manager"
    echo "2. Add repository description"
    echo "3. Add topics: powershell, ai-analysis, react, nodejs, docker"
    echo "4. Enable Discussions and Wiki"
    echo "5. Star your own repository! ⭐"
    
else
    echo ""
    echo "❌ Push failed. Common issues:"
    echo "1. Check your token has 'repo' permissions"
    echo "2. Verify repository exists: https://github.com/Morlock52/psscript-manager"
    echo "3. Make sure token isn't expired"
    echo ""
    echo "Try creating the repository manually at: https://github.com/new"
fi

# Clean up credentials
git remote set-url origin "https://github.com/Morlock52/psscript-manager.git"
git config --unset credential.helper

echo ""
echo "🔒 Credentials cleaned up for security."