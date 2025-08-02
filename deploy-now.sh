#!/bin/bash

# One-Command PSScript Deployment to psscript.morlocksmaze.com
# Usage: ./deploy-now.sh

set -e

echo "🚀 PSScript → psscript.morlocksmaze.com"
echo "======================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Ensure we're in the right directory
cd "/Users/morlock/fun/psscript 4"

# Check Vercel auth
echo -e "${BLUE}Checking Vercel authentication...${NC}"
if ! vercel whoami &> /dev/null; then
    echo -e "${YELLOW}Please log into Vercel first:${NC}"
    echo "Run: vercel login"
    echo "Then run this script again."
    exit 1
fi

echo -e "${GREEN}✅ Vercel authenticated${NC}"

# Deploy to production
echo -e "${BLUE}Deploying to production...${NC}"
vercel --prod --yes

# Configure domain
echo -e "${BLUE}Configuring custom domain...${NC}"
vercel domains add psscript.morlocksmaze.com 2>/dev/null || echo "Domain already added"
vercel alias set psscript.morlocksmaze.com 2>/dev/null || echo "Alias already set"

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "🌐 Your site: https://psscript.morlocksmaze.com"
echo ""
echo -e "${YELLOW}⚠️  DNS Configuration Required:${NC}"
echo "Add this CNAME record to your DNS:"
echo "  Name: psscript"
echo "  Value: cname.vercel-dns.com"
echo ""
echo "Check status: vercel domains ls"