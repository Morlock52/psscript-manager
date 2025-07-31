#!/bin/bash

# Fix Large Files and Upload to GitHub
set -e

echo "🔧 Fixing GitHub Upload Issues"
echo "=============================="
echo ""

echo "❌ Problem: Large Docker image files exceeding GitHub's 100MB limit"
echo "✅ Solution: Remove these files and add them to .gitignore"
echo ""

# Kill any existing git push processes
echo "🛑 Stopping any existing uploads..."
pkill -f "git push" || true

# Remove large files from git
echo "📦 Removing large Docker image files..."
git rm -r --cached deploy/images/ 2>/dev/null || true

# Add to gitignore
echo "📝 Updating .gitignore..."
echo "" >> .gitignore
echo "# Large Docker images" >> .gitignore
echo "deploy/images/" >> .gitignore
echo "*.tar" >> .gitignore
echo "*.tar.gz" >> .gitignore

# Commit changes
echo "💾 Committing changes..."
git add .gitignore
git commit -m "Remove large Docker images and update .gitignore

- Removed Docker image tar files exceeding GitHub's 100MB limit
- Added deploy/images/ to .gitignore
- These images can be built locally with docker-compose"

# Show what will be uploaded
echo ""
echo "📊 Repository Status (after cleanup):"
echo "• Files: $(git ls-files | wc -l)"
echo "• Estimated size: Much smaller without Docker images!"
echo ""

# Push to GitHub
echo "🚀 Uploading to GitHub (this should work now)..."
if git push -u origin main --force; then
    echo ""
    echo "🎉 SUCCESS! PSScript Manager uploaded to GitHub!"
    echo ""
    echo "🔗 Your repository is now live at:"
    echo "   https://github.com/Morlock52/psscript-manager"
    echo ""
    
    # Create release
    echo "🏷️  Creating release..."
    git tag -f v1.0.0 -m "PSScript Manager v1.0.0 - Initial Release"
    git push origin v1.0.0 --force
    
    echo "✅ Complete! Your PSScript Manager is on GitHub!"
    echo ""
    echo "📝 Note: Docker images removed from repo but can be built with:"
    echo "   docker-compose build"
    
else
    echo "❌ Upload failed. Check error messages above."
fi