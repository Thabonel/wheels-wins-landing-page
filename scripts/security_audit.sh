#!/bin/bash

# =====================================================
# SECURITY AUDIT RUNNER SCRIPT
# =====================================================
# Purpose: Execute comprehensive security audit and generate report
# Usage: ./scripts/security_audit.sh
# Requirements: Must have Supabase access credentials
# =====================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
ORANGE='\033[0;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AUDIT_SQL_FILE="docs/sql-fixes/SECURITY_AUDIT_COMPREHENSIVE.sql"
REPORT_DIR="docs/security/audit_results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="${REPORT_DIR}/security_audit_${TIMESTAMP}.txt"

echo -e "${BLUE}================================="
echo -e "🔒 WHEELS & WINS SECURITY AUDIT"
echo -e "=================================${NC}"
echo ""

# Check if audit SQL file exists
if [ ! -f "$AUDIT_SQL_FILE" ]; then
    echo -e "${RED}❌ Error: Audit SQL file not found at $AUDIT_SQL_FILE${NC}"
    echo -e "   Please ensure the security audit SQL file exists."
    exit 1
fi

# Create report directory if it doesn't exist
mkdir -p "$REPORT_DIR"

echo -e "${BLUE}📋 Starting security audit...${NC}"
echo -e "   Audit Script: $AUDIT_SQL_FILE"
echo -e "   Report File: $REPORT_FILE"
echo ""

# Check for Supabase credentials
if [ -z "$SUPABASE_DB_URL" ] && [ -z "$DATABASE_URL" ]; then
    echo -e "${ORANGE}⚠️  WARNING: No database connection string found${NC}"
    echo -e "   Please set SUPABASE_DB_URL or DATABASE_URL environment variable"
    echo -e "   Example: export SUPABASE_DB_URL='postgresql://user:pass@host:port/db'"
    echo ""
    echo -e "${BLUE}📖 MANUAL AUDIT INSTRUCTIONS:${NC}"
    echo -e "1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/kycoklimpzkyrecbjecn/sql"
    echo -e "2. Copy and paste the content from: $AUDIT_SQL_FILE"
    echo -e "3. Run the queries and review the results"
    echo -e "4. Compare findings with: docs/security/SECURITY_ASSESSMENT_REPORT.md"
    echo ""
    echo -e "${RED}🔴 CRITICAL: Fix any issues marked as 'CRITICAL' immediately${NC}"
    echo -e "${ORANGE}🟠 HIGH: Address 'HIGH' severity issues within 1 week${NC}"
    exit 1
fi

# Determine database connection string
DB_URL="${SUPABASE_DB_URL:-$DATABASE_URL}"

echo -e "${BLUE}🔌 Connecting to database...${NC}"

# Run the security audit
if command -v psql >/dev/null 2>&1; then
    echo -e "${BLUE}📊 Running comprehensive security audit...${NC}"

    # Execute audit and capture output
    psql "$DB_URL" -f "$AUDIT_SQL_FILE" > "$REPORT_FILE" 2>&1

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Security audit completed successfully${NC}"
        echo -e "   Report saved to: $REPORT_FILE"
    else
        echo -e "${RED}❌ Error running security audit${NC}"
        echo -e "   Check database connection and permissions"
        exit 1
    fi
else
    echo -e "${RED}❌ Error: psql command not found${NC}"
    echo -e "   Please install PostgreSQL client tools"
    echo -e "   - macOS: brew install postgresql"
    echo -e "   - Ubuntu: apt-get install postgresql-client"
    exit 1
fi

echo ""
echo -e "${BLUE}📊 AUDIT RESULTS SUMMARY:${NC}"

# Extract and display critical findings
if [ -f "$REPORT_FILE" ]; then
    # Look for critical issues in the report
    CRITICAL_ISSUES=$(grep -i "critical" "$REPORT_FILE" | wc -l || echo "0")
    HIGH_ISSUES=$(grep -i "high" "$REPORT_FILE" | wc -l || echo "0")

    if [ "$CRITICAL_ISSUES" -gt 0 ]; then
        echo -e "${RED}🔴 CRITICAL ISSUES FOUND: $CRITICAL_ISSUES${NC}"
        echo -e "   ⚠️  IMMEDIATE ACTION REQUIRED"
    fi

    if [ "$HIGH_ISSUES" -gt 0 ]; then
        echo -e "${ORANGE}🟠 HIGH PRIORITY ISSUES: $HIGH_ISSUES${NC}"
        echo -e "   📅 Fix within 1 week"
    fi

    # Show top security issues found
    echo ""
    echo -e "${BLUE}🔍 TOP SECURITY ISSUES FOUND:${NC}"
    grep -A 2 -B 1 "CRITICAL:\|HIGH:" "$REPORT_FILE" | head -20 || echo "No pattern match found"
fi

echo ""
echo -e "${BLUE}📋 NEXT STEPS:${NC}"
echo -e "1. ${GREEN}Review detailed audit report:${NC} $REPORT_FILE"
echo -e "2. ${GREEN}Read security assessment:${NC} docs/security/SECURITY_ASSESSMENT_REPORT.md"
echo -e "3. ${RED}Fix CRITICAL issues immediately${NC}"
echo -e "4. ${ORANGE}Address HIGH priority issues within 1 week${NC}"
echo -e "5. ${BLUE}Re-run audit after fixes to validate improvements${NC}"

echo ""
echo -e "${BLUE}📚 ADDITIONAL RESOURCES:${NC}"
echo -e "• Security fixes directory: docs/sql-fixes/"
echo -e "• Database schema reference: docs/DATABASE_SCHEMA_REFERENCE.md"
echo -e "• Supabase dashboard: https://supabase.com/dashboard/project/kycoklimpzkyrecbjecn"

echo ""
echo -e "${GREEN}✅ Security audit completed at $(date)${NC}"

# Create a quick summary file
SUMMARY_FILE="${REPORT_DIR}/latest_summary.txt"
cat > "$SUMMARY_FILE" << EOF
WHEELS & WINS SECURITY AUDIT SUMMARY
Generated: $(date)
Report: $REPORT_FILE

Critical Issues: $CRITICAL_ISSUES
High Priority Issues: $HIGH_ISSUES

Status: $([ "$CRITICAL_ISSUES" -eq 0 ] && echo "READY FOR PRODUCTION" || echo "REQUIRES IMMEDIATE ATTENTION")

Next audit recommended: $(date -d "+1 week" 2>/dev/null || date -v +1w 2>/dev/null || echo "1 week from now")
EOF

echo -e "${BLUE}📄 Summary saved to: $SUMMARY_FILE${NC}"