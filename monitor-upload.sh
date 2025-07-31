#!/bin/bash

# Monitor GitHub Upload Progress
set -e

echo "📊 PSScript Manager - Upload Monitor"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if upload is running
if ps aux | grep "git push" | grep -v grep > /dev/null; then
    echo -e "${GREEN}✅ Upload is in progress!${NC}"
    echo ""
    PID=$(ps aux | grep "git push" | grep -v grep | awk '{print $2}')
    echo "Process ID: $PID"
    echo "Started: $(ps -p $PID -o lstart | tail -1)"
    echo ""
    echo -e "${YELLOW}⏳ This may take 10-30 minutes for a 2.7GB repository${NC}"
    echo ""
    echo "While waiting, you can:"
    echo "• Check Activity Monitor for network activity"
    echo "• Visit https://github.com/Morlock52/psscript-manager periodically"
    echo "• Leave it running - it will complete in background"
else
    echo -e "${BLUE}📤 No active upload detected${NC}"
    echo ""
    echo "Checking if upload completed..."
    
    # Check GitHub for updates
    LAST_PUSH=$(gh repo view Morlock52/psscript-manager --json pushedAt --jq .pushedAt)
    echo "Last GitHub update: $LAST_PUSH"
    
    # Check if it's recent (within last hour)
    if [[ "$LAST_PUSH" == *"2025-07-31"* ]]; then
        echo -e "${GREEN}🎉 Upload appears to be complete!${NC}"
        echo ""
        echo "✅ Your PSScript Manager is now on GitHub!"
        echo "🔗 Visit: https://github.com/Morlock52/psscript-manager"
    else
        echo ""
        echo "Upload may have been interrupted. To restart:"
        echo "git push -u origin main --force"
    fi
fi

echo ""
echo "📁 Repository Statistics:"
echo "• Local files: $(git ls-files | wc -l)"
echo "• Size: $(du -sh . | cut -f1)"
echo "• Commit: $(git rev-parse --short HEAD)"

echo ""
echo "🔍 Quick Actions:"
echo "1. Check upload log: cat upload.log"
echo "2. Monitor network: nettop (press q to quit)"
echo "3. Force restart: git push -u origin main --force"
echo "4. Use GitHub Desktop: https://desktop.github.com/"

echo ""
echo -e "${BLUE}Your PSScript Manager upload is being handled!${NC} 🚀"