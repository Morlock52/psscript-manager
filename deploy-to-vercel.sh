#!/bin/bash

# PSScript Vercel Deployment Script
# This script automates the deployment of PSScript to Vercel

set -e  # Exit on any error

echo "🚀 PSScript Vercel Deployment Script"
echo "======================================"

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

# Step 1: Clean and prepare frontend
echo -e "${BLUE}📦 Step 1: Preparing frontend build...${NC}"
cd src/frontend

# Clean previous builds
rm -rf dist/ node_modules/.cache

# Install dependencies
echo "Installing frontend dependencies..."
npm ci

# Run linting and type checking
echo "Running code quality checks..."
npm run lint --if-present || echo "No lint script found, skipping..."

# Build the application
echo "Building frontend application..."
npm run build

# Verify build output
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Build failed: dist directory not created${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Frontend build completed successfully${NC}"
cd ../..

# Step 2: Deploy to Vercel
echo -e "${BLUE}🌐 Step 2: Deploying to Vercel...${NC}"

# Check if already logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo -e "${YELLOW}🔐 Please log in to Vercel:${NC}"
    vercel login
fi

# Deploy to Vercel
echo "Deploying to Vercel..."
vercel --prod

echo -e "${GREEN}✅ Deployment completed!${NC}"

# Step 3: Configure custom domain (if not already done)
echo -e "${BLUE}🌍 Step 3: Domain configuration reminder${NC}"
echo -e "${YELLOW}📝 Don't forget to:${NC}"
echo "1. Add your custom domain in Vercel dashboard"
echo "2. Update your DNS settings to point to Vercel"
echo "3. Configure environment variables for production"

# Step 4: Health check
echo -e "${BLUE}🏥 Step 4: Running health checks...${NC}"

# Get the deployment URL
DEPLOYMENT_URL=$(vercel ls --scope=personal | grep psscript | head -1 | awk '{print $2}' || echo "")

if [ -n "$DEPLOYMENT_URL" ]; then
    echo "Testing deployment at: https://$DEPLOYMENT_URL"
    
    # Simple HTTP check
    if curl -s -f "https://$DEPLOYMENT_URL" > /dev/null; then
        echo -e "${GREEN}✅ Website is responding correctly${NC}"
    else
        echo -e "${YELLOW}⚠️  Website may still be deploying or having issues${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Could not determine deployment URL${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Deployment process completed!${NC}"
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Visit your Vercel dashboard to configure custom domain"
echo "2. Set up environment variables for production"
echo "3. Monitor deployment in Vercel dashboard"
echo "4. Test all navigation links and functionality"

echo ""
echo -e "${BLUE}🔗 Useful Commands:${NC}"
echo "  vercel --prod                    # Deploy to production"
echo "  vercel dev                       # Run development server"
echo "  vercel logs                      # View deployment logs"
echo "  vercel domains add <domain>      # Add custom domain"
help_text