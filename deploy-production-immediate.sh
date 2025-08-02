#!/bin/bash

echo "🚀 PSScript Production Deployment Script"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Frontend build ready at: $(pwd)/src/frontend/dist${NC}"
echo -e "${BLUE}Deployment package created: $(pwd)/psscript-frontend-deploy.tar.gz${NC}"

echo -e "\n${YELLOW}IMMEDIATE DEPLOYMENT OPTIONS:${NC}"
echo -e "${GREEN}1. Manual Upload to Netlify Drop${NC}"
echo "   - Go to: https://app.netlify.com/drop"
echo "   - Drag and drop the entire 'src/frontend/dist' folder"
echo "   - Get instant URL with SSL"
echo "   - Add custom domain: psscript.morlocksmaze.com"

echo -e "\n${GREEN}2. Vercel Manual Deploy${NC}"
echo "   - Go to: https://vercel.com/new"
echo "   - Upload the 'src/frontend/dist' folder"
echo "   - Add custom domain: psscript.morlocksmaze.com"

echo -e "\n${GREEN}3. GitHub Pages (if you have a GitHub repo)${NC}"
echo "   - Copy contents of 'src/frontend/dist' to a 'docs' folder"
echo "   - Enable GitHub Pages in repo settings"
echo "   - Add CNAME file with your domain"

echo -e "\n${GREEN}4. Firebase Hosting${NC}"
echo "   - Run: npm install -g firebase-tools"
echo "   - Run: firebase init hosting"
echo "   - Run: firebase deploy"

echo -e "\n${GREEN}5. DigitalOcean App Platform${NC}"
echo "   - Create new app from static site"
echo "   - Upload the build folder"
echo "   - Add custom domain"

echo -e "\n${YELLOW}DNS CONFIGURATION:${NC}"
echo "After deployment, point psscript.morlocksmaze.com to:"
echo "- For Netlify: Add CNAME record pointing to [your-site].netlify.app"
echo "- For Vercel: Add CNAME record pointing to [your-site].vercel.app"
echo "- For custom: Add A record to the provided IP address"

echo -e "\n${YELLOW}SSL CERTIFICATES:${NC}"
echo "All recommended platforms provide automatic SSL certificates"

echo -e "\n${GREEN}FASTEST OPTION - Netlify Drop:${NC}"
echo "1. Go to https://app.netlify.com/drop"
echo "2. Drag 'src/frontend/dist' folder to the drop area"
echo "3. Get instant URL (e.g., zealous-curie-123456.netlify.app)"
echo "4. Add custom domain in site settings"
echo "5. Point psscript.morlocksmaze.com CNAME to your-site.netlify.app"

echo -e "\n${RED}SERVER INFO:${NC}"
echo "Your server at 74.208.184.195 is down. This static deployment will work independently."

# Test if the current build works locally
echo -e "\n${BLUE}Testing local build...${NC}"
cd src/frontend/dist

# Check if port 3000 is available
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}Port 3000 is busy, trying port 3001...${NC}"
    PORT=3001
else
    PORT=3000
fi

echo -e "${GREEN}Starting local test server on port ${PORT}...${NC}"
echo -e "${GREEN}Visit: http://localhost:${PORT}${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the test server${NC}"

python3 -m http.server $PORT --bind 127.0.0.1