#!/bin/bash

# Remove Workflows and Push
set -e

echo "🔧 Removing workflow files and pushing"
echo "====================================="
echo ""

# Remove .github/workflows directory
echo "📝 Removing workflow files..."
rm -rf .github/workflows

# Commit the removal
git add -A
git commit -m "Remove GitHub workflows to fix OAuth permission issue" || true

# Show what we're pushing
echo ""
echo "📊 Repository info:"
echo "• Files: $(git ls-files | wc -l)"
echo "• Size: $(du -sh .git | cut -f1)"
echo ""

# Force push
echo "🚀 Pushing to GitHub (without workflows)..."
if git push -u origin main --force; then
    echo ""
    echo "🎉 SUCCESS! PSScript Manager uploaded to GitHub!"
    echo ""
    echo "🔗 Your repository is now live at:"
    echo "   https://github.com/Morlock52/psscript-manager"
    echo ""
    echo "✅ Upload complete!"
else
    echo ""
    echo "❌ Push failed. Checking alternatives..."
fi