#!/bin/bash

# Check Upload Status
echo "🔍 Checking PSScript Manager Upload Status"
echo "=========================================="
echo ""

# Check if upload is running
if ps -p 65113 > /dev/null 2>&1; then
    echo "⏳ Upload is in progress (PID: 65113)"
    echo ""
    echo "Recent activity:"
    tail -5 push-output.log 2>/dev/null || echo "Waiting for output..."
else
    echo "✅ Background upload completed!"
    echo ""
    echo "Output:"
    cat push-output.log 2>/dev/null || echo "No output file found"
fi

echo ""
echo "📊 Repository info:"
echo "• Local: $(git log -1 --pretty=format:'%h - %s')"
echo "• Size: $(du -sh . | cut -f1)"
echo ""
echo "🌐 Check online: https://github.com/Morlock52/psscript-manager"
echo ""
echo "If upload is complete, you should see your code at the link above!"