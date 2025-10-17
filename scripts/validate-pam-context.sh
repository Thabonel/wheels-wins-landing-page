#!/bin/bash

##############################################################################
# PAM Context Validation Script
#
# Purpose: Prevent field name mismatches between frontend and backend
# Usage: npm run validate:pam-context
#
# This script:
# 1. Extracts all context.get() calls from backend Python code
# 2. Extracts all context fields from frontend TypeScript
# 3. Compares them and reports mismatches
# 4. FAILS CI/CD if critical mismatches found
##############################################################################

set -e

echo "🔍 PAM Context Field Validation"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Temporary files
BACKEND_FIELDS=$(mktemp)
FRONTEND_FIELDS=$(mktemp)
MISMATCHES=$(mktemp)

# Cleanup on exit
trap "rm -f $BACKEND_FIELDS $FRONTEND_FIELDS $MISMATCHES" EXIT

##############################################################################
# Extract backend context.get() calls
##############################################################################
echo "📂 Scanning backend Python code..."

grep -rh "context\.get(" backend/app/services/pam/ backend/app/api/v1/pam*.py 2>/dev/null | \
  grep -o 'context\.get("[^"]*")' | \
  sed 's/context\.get("\([^"]*\)")/\1/' | \
  sort -u > "$BACKEND_FIELDS"

BACKEND_COUNT=$(wc -l < "$BACKEND_FIELDS")
echo "   Found $BACKEND_COUNT unique context fields in backend"

##############################################################################
# Extract frontend context fields from TypeScript types
##############################################################################
echo "📂 Scanning frontend TypeScript types..."

# Extract from PamContext interface
grep -A 100 "export interface PamContext" src/types/pamContext.ts | \
  grep -E "^\s+[a-z_]+\?" | \
  sed 's/^\s*\([a-z_]*\)?.*/\1/' | \
  sort -u > "$FRONTEND_FIELDS"

FRONTEND_COUNT=$(wc -l < "$FRONTEND_FIELDS")
echo "   Found $FRONTEND_COUNT defined context fields in TypeScript"

##############################################################################
# Compare backend vs frontend
##############################################################################
echo ""
echo "🔄 Cross-referencing backend expectations with frontend types..."
echo ""

CRITICAL_MISMATCHES=0
WARNINGS=0

# Check each backend field
while IFS= read -r backend_field; do
  if ! grep -q "^${backend_field}$" "$FRONTEND_FIELDS"; then
    # Check if it's a known mapping issue
    case "$backend_field" in
      # These are known to be mapped by backend (pam_main.py)
      userLocation|vehicleInfo|travelStyle)
        echo -e "${YELLOW}⚠️  WARNING:${NC} Backend checks '$backend_field' (camelCase)"
        echo "           Frontend should use snake_case equivalent and rely on backend mapping"
        WARNINGS=$((WARNINGS + 1))
        ;;

      # These are critical mismatches
      *)
        echo -e "${RED}❌ ERROR:${NC} Backend checks '$backend_field' but NOT defined in PamContext TypeScript type"
        echo "         Fix: Add '$backend_field' to src/types/pamContext.ts PamContext interface"
        echo "$backend_field" >> "$MISMATCHES"
        CRITICAL_MISMATCHES=$((CRITICAL_MISMATCHES + 1))
        ;;
    esac
  fi
done < "$BACKEND_FIELDS"

##############################################################################
# Check for common wrong field names
##############################################################################
echo ""
echo "🔍 Checking for common field name mistakes in frontend code..."
echo ""

# Search for wrong field names in actual code
WRONG_FIELDS=(
  "location:"         # Should be user_location
  "userId:"           # Should be user_id (snake_case)
  "sessionId:"        # Should be session_id (snake_case)
  "latitude:"         # Should be lat (for weather tool)
  "longitude:"        # Should be lng (for weather tool)
)

CODE_ISSUES=0

for wrong_field in "${WRONG_FIELDS[@]}"; do
  # Search in pamService.ts specifically
  if grep -n "$wrong_field" src/services/pamService.ts 2>/dev/null | grep -v "//"; then
    echo -e "${RED}❌ FOUND:${NC} Wrong field name '$wrong_field' in src/services/pamService.ts"
    CODE_ISSUES=$((CODE_ISSUES + 1))
  fi
done

##############################################################################
# Validate user_location structure specifically
##############################################################################
echo ""
echo "🌍 Validating user_location structure..."
echo ""

# Check if weather tool expects lat/lng
if grep -q "user_loc\.get(\"lat\")" backend/app/services/pam/tools/openmeteo_weather_tool.py; then
  echo -e "${GREEN}✅${NC} Backend weather tool checks for 'lat' and 'lng' (correct)"

  # Now check if formatLocationForPam sends lat/lng
  if grep -q "lat: locationContext\.latitude" src/utils/pamLocationContext.ts; then
    echo -e "${GREEN}✅${NC} Frontend sends 'lat' and 'lng' to backend (correct)"
  else
    echo -e "${RED}❌${NC} Frontend does NOT send 'lat' and 'lng' to backend"
    echo "         Fix: Update formatLocationForPam() in src/utils/pamLocationContext.ts"
    CRITICAL_MISMATCHES=$((CRITICAL_MISMATCHES + 1))
  fi
else
  echo -e "${YELLOW}⚠️${NC}  Could not verify weather tool lat/lng checking"
fi

##############################################################################
# Final report
##############################################################################
echo ""
echo "================================"
echo "📊 Validation Summary"
echo "================================"
echo ""
echo "Backend fields checked:    $BACKEND_COUNT"
echo "Frontend fields defined:   $FRONTEND_COUNT"
echo ""
echo -e "Critical mismatches: ${RED}$CRITICAL_MISMATCHES${NC}"
echo -e "Warnings:            ${YELLOW}$WARNINGS${NC}"
echo -e "Code issues:         ${RED}$CODE_ISSUES${NC}"
echo ""

if [ $CRITICAL_MISMATCHES -gt 0 ] || [ $CODE_ISSUES -gt 0 ]; then
  echo -e "${RED}❌ VALIDATION FAILED${NC}"
  echo ""
  echo "Action required:"
  echo "1. Review errors above"
  echo "2. Update src/types/pamContext.ts to include missing fields"
  echo "3. Fix wrong field names in src/services/pamService.ts"
  echo "4. Update docs/PAM_BACKEND_CONTEXT_REFERENCE.md"
  echo "5. Run this script again"
  echo ""
  exit 1
else
  echo -e "${GREEN}✅ VALIDATION PASSED${NC}"
  echo ""
  if [ $WARNINGS -gt 0 ]; then
    echo "Note: $WARNINGS warnings found (non-blocking)"
    echo "Review warnings above and consider fixing for consistency"
  else
    echo "All context fields match between frontend and backend!"
  fi
  echo ""
  exit 0
fi
