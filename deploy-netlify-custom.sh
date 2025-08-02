#!/bin/bash

# Deploy PSScript to psscript.morlocksmaze.com via Netlify
# Usage: ./deploy-netlify-custom.sh

set -e

echo "🚀 PSScript → psscript.morlocksmaze.com (Netlify)"
echo "==============================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Navigate to project
cd "/Users/morlock/fun/psscript 4"

# Ensure frontend is built
echo -e "${BLUE}Checking frontend build...${NC}"
if [ ! -d "src/frontend/dist" ] || [ ! -f "src/frontend/dist/index.html" ]; then
    echo -e "${YELLOW}Building frontend...${NC}"
    cd src/frontend
    npm install
    npm run build
    cd ../..
fi
echo -e "${GREEN}✅ Frontend build ready${NC}"

# Check Netlify auth
echo -e "${BLUE}Checking Netlify authentication...${NC}"
if ! netlify status &> /dev/null; then
    echo -e "${YELLOW}Logging into Netlify...${NC}"
    netlify login
fi
echo -e "${GREEN}✅ Netlify authenticated${NC}"

# Deploy to Netlify
echo -e "${BLUE}Deploying to Netlify...${NC}"
cd src/frontend
netlify deploy --prod --dir=dist --site=psscript-morlock

# Get the site URL
SITE_URL=$(netlify status --json | jq -r '.site.url' 2>/dev/null || echo "https://psscript-morlock.netlify.app")

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "🌐 Temporary URL: $SITE_URL"
echo "🎯 Target URL: https://psscript.morlocksmaze.com"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "1. Go to Netlify dashboard: https://app.netlify.com"
echo "2. Find your site and go to Domain settings"
echo "3. Add custom domain: psscript.morlocksmaze.com"
echo "4. Add DNS record to your domain provider:"
echo "   Type: CNAME"
echo "   Name: psscript"
echo "   Value: [netlify-domain-from-dashboard]"
echo ""
echo -e "${GREEN}✅ Your PSScript is now deployed and ready!${NC}"