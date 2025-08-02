#!/bin/bash

# PSScript Server Recovery Script
# Run this once you can access the server at 74.208.184.195

set -e

echo "🔧 PSScript Server Recovery"
echo "=========================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Step 1: Restarting core services...${NC}"
systemctl restart nginx || echo "Nginx restart failed"
systemctl restart postgresql || echo "PostgreSQL restart failed"  
systemctl restart redis-server || echo "Redis restart failed"

echo -e "${BLUE}Step 2: Checking PM2 backend...${NC}"
pm2 restart all || echo "PM2 restart failed"
pm2 status

echo -e "${BLUE}Step 3: Fixing firewall...${NC}"
ufw allow 80/tcp
ufw allow 443/tcp  
ufw allow 8080/tcp
ufw allow 3000/tcp
ufw allow 22/tcp

echo -e "${BLUE}Step 4: Testing services...${NC}"
echo "Nginx status:"
systemctl status nginx --no-pager || echo "Nginx not running"

echo "PostgreSQL status:"
systemctl status postgresql --no-pager || echo "PostgreSQL not running"

echo "Redis status:"
systemctl status redis-server --no-pager || echo "Redis not running"

echo -e "${BLUE}Step 5: Testing connectivity...${NC}"
echo "Testing local nginx:"
curl -I http://localhost:8080 || echo "Nginx not responding on 8080"

echo "Testing backend API:"
curl -I http://localhost:3000 || echo "Backend not responding on 3000"

echo -e "${BLUE}Step 6: Checking what's listening...${NC}"
echo "Open ports:"
netstat -tlnp | grep -E ":80|:8080|:3000" || echo "No services listening on expected ports"

echo -e "${GREEN}🎯 Recovery complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Test external access: curl -I http://74.208.184.195:8080"
echo "2. Configure DNS A record: psscript.morlocksmaze.com → 74.208.184.195"
echo "3. Test domain: curl -I http://psscript.morlocksmaze.com"
echo ""
echo -e "${BLUE}If issues persist, check logs:${NC}"
echo "- journalctl -u nginx -n 50"
echo "- journalctl -u postgresql -n 50"
echo "- pm2 logs --lines 50"