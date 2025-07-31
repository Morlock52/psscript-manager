#!/bin/bash

# Final Clean Push to GitHub
set -e

echo "🚀 Final GitHub Upload - Removing Large Files"
echo "============================================"
echo ""

# Check current status
echo "📊 Checking current repository status..."
git status --porcelain

# Reset to last good commit before the problematic push attempts
echo "🔄 Resetting to clean state..."
git reset --hard cd03e70

# Remove ALL tar files from history
echo "🧹 Removing ALL tar files from Git history..."
git filter-branch -f --tree-filter 'rm -f deploy/images/*.tar' -- --all

# Clean up
echo "🧹 Cleaning up Git objects..."
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Update .gitignore
echo "📝 Updating .gitignore..."
cat >> .gitignore << 'EOF'

# Large files
deploy/images/
*.tar
*.tar.gz
EOF

git add .gitignore
git commit -m "Update .gitignore to exclude large files" || true

# Show new size
echo ""
echo "📊 Repository size after cleanup:"
du -sh .git

# Force push
echo ""
echo "🚀 Force pushing clean repository to GitHub..."
git push -u origin main --force

echo ""
echo "✅ Upload complete! Check https://github.com/Morlock52/psscript-manager"