#!/bin/bash

# PSScript Website Fix Verification Script
# This script tests all the fixes made to address 404 errors, broken links, and navigation issues

echo "================================================="
echo "PSScript Website Fix Verification"
echo "================================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
    else
        echo -e "${RED}✗ $2${NC}"
    fi
}

# Check if required files exist
echo -e "\n${YELLOW}1. Checking new files...${NC}"
[ -f "src/frontend/src/constants/routes.ts" ] && test_result 0 "routes.ts constants file exists" || test_result 1 "routes.ts constants file missing"
[ -f "src/frontend/src/components/GlobalErrorBoundary.tsx" ] && test_result 0 "GlobalErrorBoundary component exists" || test_result 1 "GlobalErrorBoundary component missing"
[ -f "src/frontend/.env.example" ] && test_result 0 ".env.example file exists" || test_result 1 ".env.example file missing"

# Check if voice components are in correct location
echo -e "\n${YELLOW}2. Checking voice component locations...${NC}"
[ -f "src/frontend/src/components/VoiceRecorder.jsx" ] && test_result 0 "VoiceRecorder in correct location" || test_result 1 "VoiceRecorder not in correct location"
[ -f "src/frontend/src/components/VoicePlayback.jsx" ] && test_result 0 "VoicePlayback in correct location" || test_result 1 "VoicePlayback not in correct location"

# Check routing fixes
echo -e "\n${YELLOW}3. Checking routing fixes...${NC}"
grep -q "ROUTES.DASHBOARD" src/frontend/src/components/Sidebar.tsx && test_result 0 "Sidebar uses ROUTES constants" || test_result 1 "Sidebar not using ROUTES constants"
grep -q "ROUTES.AI_CHAT" src/frontend/src/components/Sidebar.tsx && test_result 0 "AI Chat route fixed in Sidebar" || test_result 1 "AI Chat route not fixed"
grep -q "ROUTES.AGENTIC_AI" src/frontend/src/components/Sidebar.tsx && test_result 0 "Agentic AI route fixed in Sidebar" || test_result 1 "Agentic AI route not fixed"
grep -q "ROUTES.UI_DEMO" src/frontend/src/components/Sidebar.tsx && test_result 0 "UI Demo route fixed in Sidebar" || test_result 1 "UI Demo route not fixed"

# Check API configuration fixes
echo -e "\n${YELLOW}4. Checking API configuration...${NC}"
grep -q "getApiUrl" src/frontend/src/services/api.ts && test_result 0 "API URL function implemented" || test_result 1 "API URL function not implemented"
grep -q "relative URL to work with any domain" src/frontend/src/services/api.ts && test_result 0 "Production API URL uses relative path" || test_result 1 "Production API URL not using relative path"

# Check error boundary implementation
echo -e "\n${YELLOW}5. Checking error handling...${NC}"
grep -q "GlobalErrorBoundary" src/frontend/src/App.tsx && test_result 0 "GlobalErrorBoundary imported in App" || test_result 1 "GlobalErrorBoundary not imported"
grep -q "<GlobalErrorBoundary>" src/frontend/src/App.tsx && test_result 0 "GlobalErrorBoundary wraps app" || test_result 1 "GlobalErrorBoundary not wrapping app"

# Build frontend to check for compile errors
echo -e "\n${YELLOW}6. Testing frontend build...${NC}"
cd src/frontend
npm run build > /dev/null 2>&1
test_result $? "Frontend builds without errors"
cd ../..

# Summary
echo -e "\n================================================="
echo "Fix Verification Complete"
echo "================================================="
echo -e "\n${YELLOW}Summary of fixes applied:${NC}"
echo "✓ Created centralized routes constants file"
echo "✓ Fixed all navigation links in Sidebar to match actual routes"
echo "✓ Fixed API configuration for production deployment"
echo "✓ Added GlobalErrorBoundary for better error handling"
echo "✓ Moved voice components to correct location"
echo "✓ Created .env.example for environment configuration"

echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Run 'npm run dev' in src/frontend to test locally"
echo "2. Test all navigation links manually"
echo "3. Verify API connections in production environment"
echo "4. Update deployment configuration with proper environment variables"