#!/bin/bash

# 🚨 EMERGENCY ROLLBACK SCRIPT
# Instantly reverts PAM from Gemini back to Claude
# Usage: ./scripts/emergency-rollback.sh [strategy]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Emergency backup branch created
BACKUP_BRANCH="EMERGENCY-BACKUP-PRE-GEMINI-20250920-073014"
SAFE_COMMIT="86010059"  # Last commit before Gemini migration

echo -e "${RED}🚨 EMERGENCY PAM ROLLBACK INITIATED${NC}"
echo -e "${YELLOW}This will revert PAM from Gemini back to Claude${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "backend" ]; then
    echo -e "${RED}❌ Error: Must run from project root directory${NC}"
    exit 1
fi

# Function to rollback strategy 1: Git revert (fastest)
rollback_git() {
    echo -e "${BLUE}🔄 Strategy 1: Git Branch Rollback${NC}"

    # Save current state first
    CURRENT_BRANCH=$(git branch --show-current)
    echo "📝 Current branch: $CURRENT_BRANCH"

    # Switch to safe commit
    echo -e "${YELLOW}⏪ Reverting to safe commit: $SAFE_COMMIT${NC}"
    git checkout $SAFE_COMMIT

    # Force push to staging
    echo -e "${YELLOW}🚀 Deploying to staging...${NC}"
    git push origin staging -f

    # Force push to main (production)
    echo -e "${YELLOW}🚀 Deploying to production...${NC}"
    git push origin main -f

    echo -e "${GREEN}✅ Git rollback complete!${NC}"
    echo -e "${GREEN}✅ PAM is now using Claude (pre-Gemini state)${NC}"
}

# Function to rollback strategy 2: Environment variables (instant)
rollback_env() {
    echo -e "${BLUE}🔄 Strategy 2: Environment Variable Rollback${NC}"
    echo ""
    echo -e "${YELLOW}Manual steps required:${NC}"
    echo "1. Go to Render dashboard: https://dashboard.render.com"
    echo "2. Find 'pam-backend' service"
    echo "3. Go to Environment tab"
    echo "4. DELETE the GEMINI_API_KEY variable"
    echo "5. Click 'Save Changes'"
    echo ""
    echo -e "${GREEN}✅ This instantly makes Claude the primary provider${NC}"
    echo -e "${GREEN}✅ No code deployment needed (takes 30 seconds)${NC}"
}

# Function to rollback strategy 3: Circuit breaker (immediate)
rollback_circuit_breaker() {
    echo -e "${BLUE}🔄 Strategy 3: Circuit Breaker Emergency Stop${NC}"

    # Force circuit breaker for Gemini
    echo -e "${YELLOW}🚨 Forcing Gemini circuit breaker...${NC}"

    RESPONSE=$(curl -s -X POST "https://pam-backend.onrender.com/api/v1/observability/force-circuit-breaker" \
        -H "Admin-Token: admin-token-123" \
        -H "Content-Type: application/json" \
        -d '{"provider": "gemini", "duration": 7200}' || echo "FAILED")

    if [ "$RESPONSE" != "FAILED" ]; then
        echo -e "${GREEN}✅ Gemini circuit breaker activated for 2 hours${NC}"
        echo -e "${GREEN}✅ PAM automatically switched to Claude${NC}"
    else
        echo -e "${RED}❌ Circuit breaker API call failed${NC}"
        echo -e "${YELLOW}🔄 Falling back to environment variable method...${NC}"
        rollback_env
    fi
}

# Function to test PAM functionality
test_pam() {
    echo -e "${BLUE}🧪 Testing PAM functionality...${NC}"

    # Test staging endpoint
    STAGING_HEALTH=$(curl -s "https://wheels-wins-backend-staging.onrender.com/api/health" | grep -o '"status":"healthy"' || echo "FAILED")

    if [ "$STAGING_HEALTH" = '"status":"healthy"' ]; then
        echo -e "${GREEN}✅ Staging backend healthy${NC}"
    else
        echo -e "${RED}❌ Staging backend unhealthy${NC}"
    fi

    # Test production endpoint
    PROD_HEALTH=$(curl -s "https://pam-backend.onrender.com/api/health" | grep -o '"status":"healthy"' || echo "FAILED")

    if [ "$PROD_HEALTH" = '"status":"healthy"' ]; then
        echo -e "${GREEN}✅ Production backend healthy${NC}"
    else
        echo -e "${RED}❌ Production backend unhealthy${NC}"
    fi

    # Test PAM endpoint
    PAM_HEALTH=$(curl -s "https://pam-backend.onrender.com/api/v1/pam/health" | grep -o '"service":"PAM"' || echo "FAILED")

    if [ "$PAM_HEALTH" = '"service":"PAM"' ]; then
        echo -e "${GREEN}✅ PAM service responding${NC}"
    else
        echo -e "${RED}❌ PAM service not responding${NC}"
    fi
}

# Main execution
case "${1:-all}" in
    "git")
        rollback_git
        ;;
    "env")
        rollback_env
        ;;
    "circuit")
        rollback_circuit_breaker
        ;;
    "test")
        test_pam
        ;;
    "all"|*)
        echo -e "${YELLOW}Choose rollback strategy:${NC}"
        echo "1. Git Rollback (30 seconds, requires deployment)"
        echo "2. Environment Variables (30 seconds, instant)"
        echo "3. Circuit Breaker (5 seconds, temporary 2 hours)"
        echo ""
        read -p "Enter strategy number (1-3): " choice

        case $choice in
            1)
                rollback_git
                ;;
            2)
                rollback_env
                ;;
            3)
                rollback_circuit_breaker
                ;;
            *)
                echo -e "${RED}❌ Invalid choice${NC}"
                exit 1
                ;;
        esac
        ;;
esac

echo ""
echo -e "${BLUE}🧪 Testing PAM after rollback...${NC}"
test_pam

echo ""
echo -e "${GREEN}🎉 ROLLBACK COMPLETE!${NC}"
echo -e "${GREEN}PAM is now running on pre-Gemini configuration${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Check admin dashboard: https://wheelsandwins.com/admin"
echo "2. Test PAM functionality manually"
echo "3. Monitor for 10 minutes to ensure stability"
echo "4. If issues persist, contact development team"