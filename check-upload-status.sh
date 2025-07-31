#!/bin/bash

# Check GitHub Upload Status
set -e

echo "🔍 Checking GitHub Upload Status..."
echo "==================================="
echo ""

# Check if push is still running
if pgrep -f "git push" > /dev/null; then
    echo "⏳ Upload is still in progress..."
    echo "This is normal for large repositories (2.7GB)"
    echo ""
    echo "You can:"
    echo "1. Wait for it to complete (recommended)"
    echo "2. Check progress in Activity Monitor"
    echo "3. Leave it running in background"
else
    echo "✅ No active upload detected"
fi

echo ""
echo "📊 Local Repository Status:"
git status --short
echo "• Total files: $(git ls-files | wc -l)"
echo "• Repository size: $(du -sh . | cut -f1)"
echo "• Current branch: $(git branch --show-current)"
echo "• Last commit: $(git log -1 --pretty=format:'%h - %s')"

echo ""
echo "🌐 Remote Repository Status:"
gh repo view Morlock52/psscript-manager --json pushedAt,isEmpty | jq -r '"Last push: \(.pushedAt)\nIs empty: \(.isEmpty)"'

echo ""
echo "🚀 Options:"
echo ""
echo "1. Check if upload is complete:"
echo "   Visit: https://github.com/Morlock52/psscript-manager"
echo ""
echo "2. Start fresh upload in background:"
echo "   nohup git push -u origin main --force > upload.log 2>&1 &"
echo "   Then check: tail -f upload.log"
echo ""
echo "3. Use GitHub Desktop for easier upload:"
echo "   https://desktop.github.com/"
echo ""
echo "The large repository (2.7GB) may take 10-30 minutes to upload."
echo "Your PSScript Manager will be live once complete! 🎉"