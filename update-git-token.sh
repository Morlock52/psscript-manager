#!/bin/bash

echo "🔧 GitHub Token Update Script"
echo "============================="

# Check if token is provided
if [ -z "$1" ]; then
    echo "❌ Error: Please provide your GitHub token"
    echo ""
    echo "Usage: ./update-git-token.sh YOUR_GITHUB_TOKEN"
    echo ""
    echo "Get your token from: https://github.com/settings/tokens"
    echo "Make sure to select 'repo' and 'workflow' scopes"
    exit 1
fi

TOKEN=$1

echo "🔄 Updating git remote with new token..."

# Update git remote URL with token
git remote set-url origin https://$TOKEN@github.com/Morlock52/psscript-manager.git

echo "✅ Git remote updated successfully"
echo ""
echo "🚀 Now pushing to GitHub Pages..."

# Push to trigger deployment
git push origin main

echo ""
echo "🎉 Deployment initiated!"
echo "📱 Check progress at: https://github.com/Morlock52/psscript-manager/actions"
echo "🌐 Your app will be live at: https://morlock52.github.io/psscript-manager/"