#!/bin/bash
# Pre-Push Security Hook for Wheels & Wins
# Based on Master Security Guide from UnimogCommunityHub
# Place this in .git/hooks/pre-push or run via npm script

remote="$1"
url="$2"

echo "🔒 Running Pre-Push Security Checks..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track if any checks fail
CHECKS_FAILED=0

# ============================================================================
# 1. SECRET DETECTION
# ============================================================================
echo "📝 Checking for secrets..."

# Check for common secret patterns (excluding test files and examples)
if grep -rE "(ANTHROPIC_API_KEY|OPENAI_API_KEY|GEMINI_API_KEY|SUPABASE_SERVICE_ROLE_KEY)" \
    --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
    --exclude="*.test.ts" --exclude="*.test.tsx" --exclude="*setup*.ts" \
    --exclude="APIKeyManagement.tsx" \
    src/ backend/app/ 2>/dev/null | \
    grep -v "\.env" | \
    grep -v "import.meta.env" | \
    grep -v "process.env" | \
    grep -v "test-api-key" | \
    grep -v "your-.*-key-here" | \
    grep -v "Error(" | \
    grep -v "logger.warn"; then
    echo -e "${RED}❌ FAIL: Hardcoded API keys detected${NC}"
    CHECKS_FAILED=1
else
    echo -e "${GREEN}✅ PASS: No hardcoded secrets${NC}"
fi

# Check for Supabase URLs
if grep -rE "ydevatqwkoccxhtejdor\.supabase\.co" \
    --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
    src/ 2>/dev/null | grep -v "\.env" | grep -v "import.meta.env"; then
    echo -e "${RED}❌ FAIL: Hardcoded Supabase URL detected${NC}"
    CHECKS_FAILED=1
else
    echo -e "${GREEN}✅ PASS: No hardcoded Supabase URLs${NC}"
fi

# ============================================================================
# 2. BUILD VALIDATION
# ============================================================================
echo "🔨 Validating build..."

if ! npm run build > /dev/null 2>&1; then
    echo -e "${RED}❌ FAIL: Build failed${NC}"
    echo "Run 'npm run build' to see errors"
    CHECKS_FAILED=1
else
    echo -e "${GREEN}✅ PASS: Build successful${NC}"
fi

# ============================================================================
# 3. TYPESCRIPT TYPE CHECKING
# ============================================================================
echo "📘 Checking TypeScript types..."

if ! npm run type-check > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  WARNING: TypeScript errors detected${NC}"
    echo "Run 'npm run type-check' to see errors"
    # Don't fail on type errors (warning only)
else
    echo -e "${GREEN}✅ PASS: No TypeScript errors${NC}"
fi

# ============================================================================
# 4. PLATFORM-SPECIFIC DEPENDENCIES
# ============================================================================
echo "💻 Checking for platform-specific dependencies..."

if grep -qE "@rollup/rollup-(darwin|linux|win32)" package.json; then
    echo -e "${RED}❌ FAIL: Platform-specific packages found${NC}"
    echo "Remove platform-specific rollup packages:"
    echo "  npm uninstall @rollup/rollup-darwin-x64"
    CHECKS_FAILED=1
else
    echo -e "${GREEN}✅ PASS: No platform-specific dependencies${NC}"
fi

# ============================================================================
# 5. ENVIRONMENT VARIABLE CHECK
# ============================================================================
echo "🌍 Checking environment variables..."

# Check if .env.example exists and is up to date
if [ -f ".env.example" ]; then
    # Get all VITE_ variables from source code
    VITE_VARS=$(grep -roh "import\.meta\.env\.VITE_[A-Z_]*" src/ | sort -u | sed 's/import\.meta\.env\.//')

    # Check if they're all in .env.example
    MISSING_VARS=0
    for var in $VITE_VARS; do
        if ! grep -q "^$var=" .env.example; then
            echo -e "${YELLOW}⚠️  WARNING: $var not in .env.example${NC}"
            MISSING_VARS=1
        fi
    done

    if [ $MISSING_VARS -eq 0 ]; then
        echo -e "${GREEN}✅ PASS: All env vars documented${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  WARNING: .env.example not found${NC}"
fi

# ============================================================================
# 6. SQL MIGRATION SAFETY
# ============================================================================
echo "🗃️  Checking SQL migrations..."

# Check for dangerous SQL patterns
UNSAFE_DROPS=$(ls supabase/migrations/*.sql 2>/dev/null | xargs grep "DROP TABLE" 2>/dev/null | grep -v "IF EXISTS" | grep -v "-- " || true)
if [ -n "$UNSAFE_DROPS" ]; then
    echo -e "${RED}❌ FAIL: Unsafe DROP TABLE without IF EXISTS${NC}"
    echo "$UNSAFE_DROPS"
    CHECKS_FAILED=1
fi

if ls supabase/migrations/*.sql 2>/dev/null | xargs grep -l "ALTER TABLE.*DROP COLUMN" | grep -v "--"; then
    echo -e "${YELLOW}⚠️  WARNING: Column drops detected${NC}"
    echo "Make sure data is backed up!"
fi

echo -e "${GREEN}✅ PASS: SQL migrations look safe${NC}"

# ============================================================================
# 7. GITLEAKS (if installed) - NON-BLOCKING
# ============================================================================
if command -v gitleaks > /dev/null 2>&1; then
    echo "🔍 Running gitleaks..."
    # Run gitleaks but don't fail the push (just warn)
    if ! gitleaks detect --no-git --exit-code 0 > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  WARNING: Gitleaks detected potential secrets${NC}"
        echo "Run 'gitleaks detect --verbose' for details"
        echo "(This is a warning only, not blocking push)"
        # NOT setting CHECKS_FAILED - gitleaks is advisory only
    else
        echo -e "${GREEN}✅ PASS: Gitleaks found no secrets${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  INFO: gitleaks not installed (optional)${NC}"
    echo "Install with: brew install gitleaks"
fi

# ============================================================================
# 8. BACKEND PYTHON SYNTAX (if pushing backend changes)
# ============================================================================
if git diff --name-only origin/staging...HEAD | grep -q "^backend/"; then
    echo "🐍 Checking Python syntax..."

    if command -v python3 > /dev/null 2>&1; then
        PYTHON_ERRORS=0
        for file in $(git diff --name-only origin/staging...HEAD | grep "\.py$"); do
            if [ -f "$file" ]; then
                if ! python3 -m py_compile "$file" 2>/dev/null; then
                    echo -e "${RED}❌ FAIL: Syntax error in $file${NC}"
                    PYTHON_ERRORS=1
                fi
            fi
        done

        if [ $PYTHON_ERRORS -eq 0 ]; then
            echo -e "${GREEN}✅ PASS: Python syntax valid${NC}"
        else
            CHECKS_FAILED=1
        fi
    else
        echo -e "${YELLOW}⚠️  WARNING: python3 not found, skipping Python checks${NC}"
    fi
fi

# ============================================================================
# FINAL DECISION
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $CHECKS_FAILED -eq 1 ]; then
    echo -e "${RED}❌ SECURITY CHECKS FAILED${NC}"
    echo "Fix the issues above before pushing."
    echo ""
    echo "To bypass (NOT RECOMMENDED):"
    echo "  git push --no-verify"
    exit 1
else
    echo -e "${GREEN}✅ ALL SECURITY CHECKS PASSED${NC}"
    echo "Safe to push!"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
exit 0
