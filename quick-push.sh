#!/bin/bash

# Quick GitHub Push Script
set -e

echo "🚀 Quick Push to GitHub"
echo "======================"
echo ""

# Check directory
if [ ! -f "CLAUDE.md" ]; then
    echo "❌ Run from PSScript directory"
    exit 1
fi

echo "📊 Repository Status (3,361 files ready)"
echo "📍 Target: https://github.com/Morlock52/psscript-manager"
echo ""

echo "🔑 STEP 1: Get GitHub Token"
echo "=========================="
echo "1. Open: https://github.com/settings/tokens"
echo "2. Click 'Generate new token (classic)'"
echo "3. Check 'repo' scope"
echo "4. Generate and copy token"
echo ""

echo "🚀 STEP 2: Push Command"
echo "======================"
echo "Run this command and paste your token when prompted:"
echo ""
echo "git config credential.helper store"
echo "git push -u origin main"
echo ""

echo "When Git asks for credentials:"
echo "Username: Morlock52"
echo "Password: [paste your token]"
echo ""

echo "🎉 STEP 3: After Success"
echo "======================="
echo "Your repository will be live at:"
echo "https://github.com/Morlock52/psscript-manager"
echo ""

echo "Ready to push? The commands are above! 🚀"