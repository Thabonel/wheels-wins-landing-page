-- =============================================================================
-- VERIFICATION QUERIES - Run these after executing TARGETED_SECURITY_FIX.sql
-- =============================================================================

-- 1. Check that no WITH CHECK (true) policies remain on target tables
SELECT
    tablename,
    policyname,
    cmd,
    with_check,
    CASE
        WHEN with_check = 'true' THEN '🚨 STILL INSECURE'
        ELSE '✅ SECURE'
    END as security_status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('affiliate_product_clicks', 'product_issue_reports', 'trip_locations')
ORDER BY tablename, cmd;

-- 2. Check RLS is enabled
SELECT
    t.table_name,
    CASE WHEN pc.relrowsecurity THEN '✅ RLS ENABLED' ELSE '❌ RLS DISABLED' END as rls_status
FROM information_schema.tables t
JOIN pg_class pc ON pc.relname = t.table_name
WHERE t.table_schema = 'public'
  AND t.table_name IN ('affiliate_product_clicks', 'product_issue_reports', 'trip_locations');

-- 3. Show new secure policies
SELECT
    tablename,
    policyname,
    cmd,
    roles,
    '✅ NEW SECURE POLICY' as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('affiliate_product_clicks', 'product_issue_reports', 'trip_locations')
  AND policyname LIKE 'secure_%'
ORDER BY tablename, cmd;

-- 4. Count total policies per table (should be reasonable number)
SELECT
    tablename,
    COUNT(*) as policy_count,
    CASE
        WHEN COUNT(*) > 10 THEN '⚠️ HIGH POLICY COUNT'
        WHEN COUNT(*) = 0 THEN '❌ NO POLICIES'
        ELSE '✅ NORMAL'
    END as policy_status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('affiliate_product_clicks', 'product_issue_reports', 'trip_locations')
GROUP BY tablename
ORDER BY tablename;