#!/bin/bash

# PSScript Deployment Test Script
# Tests the live deployment at psscript.morlocksmaze.com

echo "🧪 Testing PSScript Deployment"
echo "Domain: psscript.morlocksmaze.com"
echo "==============================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DOMAIN="psscript.morlocksmaze.com"
URL="https://$DOMAIN"

echo -e "${BLUE}1. DNS Resolution Test${NC}"
if dig +short $DOMAIN | grep -q .; then
    echo -e "${GREEN}✅ DNS resolves${NC}"
    dig +short $DOMAIN
else
    echo -e "${RED}❌ DNS not resolving${NC}"
fi

echo ""
echo -e "${BLUE}2. HTTP Response Test${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $URL)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Site responding (HTTP $HTTP_CODE)${NC}"
elif [ "$HTTP_CODE" = "000" ]; then
    echo -e "${RED}❌ Site not reachable${NC}"
else
    echo -e "${YELLOW}⚠️  Site responding with HTTP $HTTP_CODE${NC}"
fi

echo ""
echo -e "${BLUE}3. SSL Certificate Test${NC}"
if curl -s -I $URL | grep -q "HTTP/2 200"; then
    echo -e "${GREEN}✅ SSL certificate valid${NC}"
else
    echo -e "${YELLOW}⚠️  SSL certificate may be provisioning${NC}"
fi

echo ""
echo -e "${BLUE}4. Content Test${NC}"
if curl -s $URL | grep -q "PSScript"; then
    echo -e "${GREEN}✅ Content loading correctly${NC}"
else
    echo -e "${RED}❌ Content not loading${NC}"
fi

echo ""
echo -e "${BLUE}5. Performance Test${NC}"
LOAD_TIME=$(curl -s -o /dev/null -w "%{time_total}" $URL)
echo "Load time: ${LOAD_TIME}s"
if (( $(echo "$LOAD_TIME < 2.0" | bc -l) )); then
    echo -e "${GREEN}✅ Fast loading${NC}"
else
    echo -e "${YELLOW}⚠️  Loading time could be improved${NC}"
fi

echo ""
echo -e "${BLUE}6. Mobile Optimization Test${NC}"
MOBILE_RESPONSE=$(curl -s -H "User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)" $URL | head -20)
if echo "$MOBILE_RESPONSE" | grep -q "viewport"; then
    echo -e "${GREEN}✅ Mobile optimized${NC}"
else
    echo -e "${YELLOW}⚠️  Mobile optimization could be improved${NC}"
fi

echo ""
echo -e "${BLUE}7. Security Headers Test${NC}"
HEADERS=$(curl -s -I $URL)
if echo "$HEADERS" | grep -q "X-Content-Type-Options"; then
    echo -e "${GREEN}✅ Security headers present${NC}"
else
    echo -e "${YELLOW}⚠️  Security headers missing${NC}"
fi

echo ""
echo -e "${BLUE}📊 Test Summary${NC}"
echo "🌐 URL: $URL"
echo "📈 Status: $(curl -s -o /dev/null -w "%{http_code}" $URL)"
echo "⚡ Load Time: ${LOAD_TIME}s"
echo "🔒 HTTPS: $(curl -s -I $URL | grep -q "HTTP/2" && echo "Yes" || echo "No")"

echo ""
echo -e "${GREEN}🎉 Testing complete!${NC}"
echo "Visit your site: $URL"