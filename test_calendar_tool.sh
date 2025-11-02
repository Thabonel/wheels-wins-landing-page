#!/bin/bash

# Test Calendar Tool - Verify PAM can create calendar events
# This tests the fix for calendar tool loading issue

echo "🧪 Testing PAM Calendar Tool..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Backend URL
BACKEND_URL="https://wheels-wins-backend-staging.onrender.com"

echo "1️⃣ Testing backend health..."
HEALTH_STATUS=$(curl -s "$BACKEND_URL/api/health" | python3 -c "import sys, json; print(json.load(sys.stdin)['status'])" 2>&1)

if [ "$HEALTH_STATUS" = "healthy" ]; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend is not healthy${NC}"
    exit 1
fi

echo ""
echo "2️⃣ Testing PAM service..."
PAM_STATUS=$(curl -s "$BACKEND_URL/api/v1/pam/health" | python3 -c "import sys, json; print(json.load(sys.stdin)['status'])" 2>&1)

if [ "$PAM_STATUS" = "healthy" ]; then
    echo -e "${GREEN}✅ PAM service is healthy${NC}"
else
    echo -e "${RED}❌ PAM service is not healthy${NC}"
    exit 1
fi

echo ""
echo "3️⃣ Manual Test Required:"
echo ""
echo -e "${YELLOW}To verify the calendar tool is working:${NC}"
echo ""
echo "1. Open: https://wheels-wins-staging.netlify.app"
echo "2. Click on PAM chat icon (bottom right)"
echo "3. Send one of these test messages:"
echo ""
echo "   ${GREEN}\"Add a meeting tomorrow at 2pm called Team Sync\"${NC}"
echo "   ${GREEN}\"Schedule a dentist appointment on Friday at 10am\"${NC}"
echo "   ${GREEN}\"Create a reminder for lunch at noon\"${NC}"
echo ""
echo "Expected behavior:"
echo "  ✅ PAM should create the calendar event"
echo "  ✅ PAM should confirm: 'I've created the event...'"
echo "  ✅ Event should appear in your calendar"
echo ""
echo "If PAM says it can't create events, the tool isn't loaded."
echo ""
echo "📋 To check tool count in Render logs:"
echo "   Go to: https://dashboard.render.com/web/srv-ctapfu5ds78s73aqe3p0/logs"
echo "   Search for: 'PAM Tool Registry initialized'"
echo "   Should see: '40+ tools available' (not 3)"
echo ""
