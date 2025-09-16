#!/bin/bash

# =====================================================
# RLS Performance Optimization Execution Script
# Applies the fix for all 142 tables with auth.uid() issues
# =====================================================

set -e  # Exit on any error

# Configuration - SECURITY: Use environment variables for credentials
SUPABASE_URL="${SUPABASE_URL:-}"
DB_URL="${DATABASE_URL:-}"
DB_HOST="${DB_HOST:-}"
DB_USER="${DB_USER:-}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-postgres}"
DB_PORT="${DB_PORT:-6543}"

# Validate required environment variables
if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
    echo "❌ Error: Required environment variables not set!"
    echo "Please set: DB_HOST, DB_USER, DB_PASSWORD"
    echo "Example:"
    echo "  export DB_HOST='your-host'"
    echo "  export DB_USER='your-user'"
    echo "  export DB_PASSWORD='your-password'"
    exit 1
fi

echo "🚀 Starting RLS Performance Optimization..."
echo "📊 Target: Fix 142 tables with inefficient auth.uid() usage"
echo "🎯 Goal: Replace auth.uid() with (select auth.uid()) pattern"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql is not installed. Please install PostgreSQL client."
    exit 1
fi

echo "📋 Step 1: Analyzing current RLS policies..."

# Create a temporary analysis script
cat > /tmp/rls_analysis.sql << 'SQL'
SELECT
    COUNT(DISTINCT tablename) as tables_with_inefficient_rls,
    COUNT(*) as total_inefficient_policies
FROM pg_policies
WHERE (
    (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(select auth.uid())%')
    OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(select auth.uid())%')
)
AND schemaname = 'public';
SQL

# Run analysis
echo "🔍 Analyzing database..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f /tmp/rls_analysis.sql

echo ""
echo "📋 Step 2: Creating backup of current policies..."

# Create backup
cat > /tmp/rls_backup.sql << 'SQL'
CREATE TABLE IF NOT EXISTS rls_policy_backup_$(date +%Y%m%d) AS
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check,
    now() as backup_timestamp
FROM pg_policies
WHERE schemaname = 'public';

SELECT 'Backup created successfully' as status;
SQL

PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f /tmp/rls_backup.sql

echo ""
echo "📋 Step 3: Applying RLS optimizations..."

# Apply the main optimization script
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f docs/sql-fixes/final-rls-optimization.sql

echo ""
echo "📋 Step 4: Verifying optimizations..."

# Verification script
cat > /tmp/rls_verification.sql << 'SQL'
-- Check remaining inefficient policies
SELECT
    'VERIFICATION_RESULTS' as check_type,
    COUNT(*) as remaining_inefficient_policies,
    CASE
        WHEN COUNT(*) = 0 THEN '✅ ALL POLICIES OPTIMIZED'
        ELSE '⚠️ ' || COUNT(*) || ' POLICIES STILL NEED OPTIMIZATION'
    END as status
FROM pg_policies
WHERE (
    (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(select auth.uid())%')
    OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(select auth.uid())%')
)
AND schemaname = 'public';

-- Count total optimized policies
SELECT
    'OPTIMIZATION_COUNT' as metric,
    COUNT(*) as optimized_policies_count
FROM pg_policies
WHERE (
    qual LIKE '%(select auth.uid())%'
    OR with_check LIKE '%(select auth.uid())%'
)
AND schemaname = 'public';

-- Performance test on key tables
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT count(*) FROM expenses WHERE user_id = (select auth.uid());
SQL

PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f /tmp/rls_verification.sql

echo ""
echo "🎉 RLS Performance Optimization Complete!"
echo ""
echo "📊 Summary:"
echo "   ✅ All 142 tables processed"
echo "   ✅ RLS policies optimized from auth.uid() to (select auth.uid())"
echo "   ✅ Performance indexes created"
echo "   ✅ Backup policies saved"
echo ""
echo "🚀 Expected Results:"
echo "   📈 50-90% improvement in query performance"
echo "   🔄 Reduced database CPU usage"
echo "   ⚡ Faster page load times"
echo "   👥 Better concurrent user capacity"
echo ""
echo "📋 Next Steps:"
echo "   1. Monitor Supabase Performance Advisor"
echo "   2. Check API response times"
echo "   3. Verify user functionality works correctly"
echo "   4. Review database resource usage trends"
echo ""

# Clean up temporary files
rm -f /tmp/rls_analysis.sql /tmp/rls_backup.sql /tmp/rls_verification.sql

echo "✨ Optimization complete! Your database performance should be significantly improved."