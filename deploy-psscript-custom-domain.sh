#!/bin/bash

# PSScript Custom Domain Deployment Script
# Deploys PSScript to psscript.morlocksmaze.com

set -e  # Exit on any error

echo "🚀 PSScript Custom Domain Deployment"
echo "Domain: psscript.morlocksmaze.com"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "vercel.json" ]; then
    echo -e "${RED}❌ Error: vercel.json not found. Are you in the PSScript root directory?${NC}"
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vercel CLI not found. Installing...${NC}"
    npm install -g vercel
fi

# Check if logged in to Vercel
echo -e "${BLUE}🔐 Step 1: Vercel Authentication${NC}"
if ! vercel whoami &> /dev/null; then
    echo -e "${YELLOW}Please log in to Vercel:${NC}"
    echo "You'll be redirected to your browser to authenticate."
    vercel login
    echo -e "${GREEN}✅ Logged in successfully${NC}"
else
    echo -e "${GREEN}✅ Already logged in to Vercel${NC}"
fi

# Step 2: Verify frontend build
echo -e "${BLUE}📦 Step 2: Verifying frontend build...${NC}"
if [ ! -d "src/frontend/dist" ]; then
    echo -e "${YELLOW}⚠️  Frontend not built. Building now...${NC}"
    cd src/frontend
    npm ci
    npm run build
    cd ../..
fi

# Verify build contents
if [ ! -f "src/frontend/dist/index.html" ]; then
    echo -e "${RED}❌ Build verification failed: index.html not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Frontend build verified${NC}"

# Step 3: Deploy to Vercel
echo -e "${BLUE}🌐 Step 3: Deploying to Vercel...${NC}"
echo "This will create a production deployment"

# Deploy to production
vercel --prod --yes

echo -e "${GREEN}✅ Deployment completed!${NC}"

# Step 4: Add custom domain
echo -e "${BLUE}🌍 Step 4: Configuring custom domain${NC}"
echo "Adding domain: psscript.morlocksmaze.com"

# Add the custom domain
vercel domains add psscript.morlocksmaze.com --scope=personal || echo "Domain might already be added or require verification"

# Link domain to project
vercel alias set psscript.morlocksmaze.com || echo "Alias might already be set"

echo -e "${GREEN}✅ Domain configuration completed${NC}"

# Step 5: DNS Configuration Instructions
echo -e "${BLUE}📋 Step 5: DNS Configuration Required${NC}"
echo -e "${YELLOW}IMPORTANT: You need to configure your DNS settings:${NC}"
echo ""
echo "For your domain psscript.morlocksmaze.com, add these DNS records:"
echo ""
echo "1. CNAME Record:"
echo "   Name: psscript"
echo "   Value: cname.vercel-dns.com"
echo "   TTL: 300 (or Auto)"
echo ""
echo "2. OR A Records (if CNAME not supported):"
echo "   Name: psscript"
echo "   Value: 76.76.19.61"
echo "   TTL: 300"
echo ""
echo "   Name: psscript" 
echo "   Value: 76.223.126.88"
echo "   TTL: 300"
echo ""

# Step 6: Health check
echo -e "${BLUE}🏥 Step 6: Testing deployment...${NC}"

# Wait a moment for deployment to propagate
sleep 5

# Test the deployment
echo "Testing https://psscript.morlocksmaze.com..."
if curl -s -f "https://psscript.morlocksmaze.com" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Custom domain is live and responding!${NC}"
elif curl -s -f "https://psscript.morlocksmaze.com" -k > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Domain responding but SSL may still be provisioning${NC}"
else
    echo -e "${YELLOW}⚠️  Domain not yet responding - DNS propagation may take up to 24 hours${NC}"
fi

# Get Vercel deployment URL as fallback
VERCEL_URL=$(vercel ls --scope=personal | grep psscript | head -1 | awk '{print $2}' 2>/dev/null || echo "")
if [ -n "$VERCEL_URL" ]; then
    echo "Vercel URL: https://$VERCEL_URL"
    if curl -s -f "https://$VERCEL_URL" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Vercel deployment is live${NC}"
    fi
fi

echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo -e "${BLUE}📋 Summary:${NC}"
echo "• Frontend deployed to Vercel"
echo "• Custom domain configured: psscript.morlocksmaze.com"
echo "• SSL certificate will be automatically provisioned"
echo "• DNS configuration required (see instructions above)"
echo ""
echo -e "${BLUE}🔗 Next Steps:${NC}"
echo "1. Configure DNS records with your domain provider"
echo "2. Wait for DNS propagation (up to 24 hours)"
echo "3. Test all functionality at https://psscript.morlocksmaze.com"
echo "4. Monitor deployment logs: vercel logs"
echo ""
echo -e "${BLUE}🔧 Useful Commands:${NC}"
echo "  vercel --prod                    # Redeploy to production"
echo "  vercel logs                      # View deployment logs"
echo "  vercel domains ls               # List configured domains"
echo "  vercel inspect                  # Get deployment details"