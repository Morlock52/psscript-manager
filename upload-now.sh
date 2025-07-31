#!/bin/bash

# Simple GitHub Upload Script
set -e

echo "🚀 PSScript Manager - Quick GitHub Upload"
echo "========================================"
echo ""

# Check if we're in the right directory
if [ ! -f "CLAUDE.md" ]; then
    echo "❌ Please run this from the PSScript project directory"
    exit 1
fi

echo "📊 Repository Status:"
echo "• Files ready: $(git status --porcelain | wc -l) changes"
echo "• Last commit: $(git log -1 --pretty=format:'%h - %s')"
echo "• Remote: $(git remote get-url origin)"
echo ""

echo "🔐 GitHub Authentication Options:"
echo ""
echo "Option 1 - Personal Access Token (Recommended):"
echo "1. Visit: https://github.com/settings/tokens"
echo "2. Click 'Generate new token (classic)'"
echo "3. Select 'repo' scope"
echo "4. Copy the token"
echo ""

echo "Option 2 - GitHub CLI (if installed):"
if command -v gh &> /dev/null; then
    echo "✅ GitHub CLI is available"
    echo "Run: gh auth login"
    echo ""
else
    echo "❌ GitHub CLI not installed"
    echo "Install with: brew install gh"
    echo ""
fi

echo "🚀 Ready to upload? Choose your method:"
echo ""
echo "A) I have a Personal Access Token"
echo "B) Use GitHub CLI"
echo "C) Show me the commands to run manually"
echo ""

read -p "Choose (A/B/C): " choice

case $choice in
    [Aa]* )
        echo ""
        echo "🔑 Enter your GitHub Personal Access Token:"
        echo "(The token will be hidden as you type)"
        read -s token
        echo ""
        
        # Set up credentials helper
        git config credential.helper store
        
        # Create credentials file temporarily
        echo "https://Morlock52:$token@github.com" > ~/.git-credentials
        
        echo "📤 Uploading to GitHub..."
        if git push -u origin main; then
            echo ""
            echo "🎉 SUCCESS! Your repository is now on GitHub!"
            echo "🔗 Visit: https://github.com/Morlock52/psscript-manager"
            
            # Clean up credentials
            rm -f ~/.git-credentials
            git config --unset credential.helper
        else
            echo "❌ Upload failed. Check your token and try again."
            rm -f ~/.git-credentials
            git config --unset credential.helper
        fi
        ;;
        
    [Bb]* )
        if command -v gh &> /dev/null; then
            echo "🔐 Authenticating with GitHub CLI..."
            gh auth login
            
            echo "📤 Uploading to GitHub..."
            if git push -u origin main; then
                echo ""
                echo "🎉 SUCCESS! Your repository is now on GitHub!"
                echo "🔗 Visit: https://github.com/Morlock52/psscript-manager"
            else
                echo "❌ Upload failed."
            fi
        else
            echo "❌ GitHub CLI not installed. Please choose option A or install with: brew install gh"
        fi
        ;;
        
    [Cc]* )
        echo ""
        echo "📋 Manual Upload Commands:"
        echo "=========================="
        echo ""
        echo "1. Get a Personal Access Token:"
        echo "   https://github.com/settings/tokens"
        echo ""
        echo "2. Run this command:"
        echo "   cd \"/Users/morlock/fun/psscript 4\""
        echo "   git push -u origin main"
        echo ""
        echo "3. When prompted:"
        echo "   Username: Morlock52"
        echo "   Password: [paste your token]"
        echo ""
        echo "4. Success! Visit:"
        echo "   https://github.com/Morlock52/psscript-manager"
        ;;
        
    * )
        echo "Invalid choice. Please run the script again."
        ;;
esac

echo ""
echo "📖 Need help? Check GITHUB_UPLOAD_INSTRUCTIONS.md"