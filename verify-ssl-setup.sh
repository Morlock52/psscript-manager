#!/bin/bash

# Verify current SSL setup and provide options
set -e

echo "🔍 Checking current SSL setup..."

SERVER_IP="74.208.184.195"
DOMAIN="psscript.morloksmaze.com"

echo ""
echo "📊 Current Status:"
echo "=================="
echo "Server IP: $SERVER_IP"
echo "Domain: $DOMAIN"
echo ""

# Check what's currently running
echo "🌐 Testing direct IP access (self-signed cert):"
curl -k -s -o /dev/null -w "HTTPS Status: %{http_code}\n" https://$SERVER_IP/health || echo "Failed"

echo ""
echo "🌐 Testing domain access:"
curl -s -o /dev/null -w "HTTPS Status: %{http_code}\n" https://$DOMAIN/health 2>/dev/null || echo "Not accessible via HTTPS"

echo ""
echo "📝 DNS Information:"
dig +short $DOMAIN A

echo ""
echo "🔒 Your Options:"
echo "================"
echo ""
echo "1️⃣  Current Setup (Self-Signed Certificate):"
echo "   - Access via: https://$SERVER_IP"
echo "   - Status: Working, but shows certificate warning"
echo "   - To bypass warning in Chrome: Click 'Advanced' → 'Proceed to $SERVER_IP (unsafe)'"
echo "   - To bypass warning in Firefox: Click 'Advanced' → 'Accept the Risk and Continue'"
echo ""
echo "2️⃣  Using Cloudflare (Recommended if using Cloudflare):"
echo "   - Your domain appears to be using Cloudflare"
echo "   - Cloudflare provides automatic SSL"
echo "   - Access via: https://$DOMAIN"
echo "   - Make sure Cloudflare SSL mode is set to 'Flexible' or 'Full'"
echo ""
echo "3️⃣  Direct Let's Encrypt (Requires DNS changes):"
echo "   - Disable Cloudflare proxy (orange cloud → gray cloud)"
echo "   - Point domain directly to: $SERVER_IP"
echo "   - Then run: ./setup-letsencrypt.sh"
echo ""
echo "📧 Login Credentials (all methods):"
echo "Email: admin@example.com"
echo "Password: admin123!"