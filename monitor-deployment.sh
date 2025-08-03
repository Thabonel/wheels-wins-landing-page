#!/bin/bash

# Monitor script to check when frontend deployment completes and JWT auth starts working

echo "🔍 Monitoring PAM Authentication Status"
echo "======================================"
echo ""
echo "This script will help you monitor when the frontend deployment completes."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check auth-check.html
check_deployment() {
    local url="$1/auth-check.html"
    echo -n "Checking deployment status... "
    
    if curl -s --head "$url" | head -n 1 | grep -q "200\|301\|302"; then
        echo -e "${GREEN}✅ Frontend deployed!${NC}"
        return 0
    else
        echo -e "${RED}❌ Not deployed yet${NC}"
        return 1
    fi
}

# Function to check backend logs for JWT
check_backend_logs() {
    echo ""
    echo "Recent backend authentication logs:"
    echo "-----------------------------------"
    echo ""
    echo "Look for these patterns:"
    echo -e "${RED}❌ OLD:${NC} token=<uuid-format> (UUID)"
    echo -e "${YELLOW}⚠️  TEMP:${NC} TEMPORARY: Accepting UUID token"
    echo -e "${GREEN}✅ NEW:${NC} token=<jwt-format>... (JWT)"
    echo ""
}

# Main monitoring loop
echo "Enter your app URL (e.g., https://your-app.netlify.app):"
read -r APP_URL

echo ""
echo "Starting monitoring..."
echo "Press Ctrl+C to stop"
echo ""

while true; do
    clear
    echo "🔍 PAM Authentication Monitoring - $(date)"
    echo "==========================================="
    echo ""
    
    # Check deployment
    if check_deployment "$APP_URL"; then
        echo ""
        echo -e "${GREEN}🎉 Frontend has been deployed!${NC}"
        echo ""
        echo "Next steps:"
        echo "1. Open browser DevTools and check Network tab"
        echo "2. Look for WebSocket connection to verify JWT tokens"
        echo "3. Run: window.authTestSuite.runFullTestSuite()"
        echo "4. Monitor backend logs for JWT authentication"
        echo ""
        check_backend_logs
        echo ""
        echo "Once you see JWT tokens in backend logs, you can:"
        echo "- Remove UUID compatibility from backend"
        echo "- Redeploy backend without temporary fix"
        break
    else
        echo ""
        echo "Waiting for deployment... (checking every 30 seconds)"
        check_backend_logs
    fi
    
    sleep 30
done

echo ""
echo "Monitoring complete!"