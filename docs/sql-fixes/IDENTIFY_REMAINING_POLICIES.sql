-- =====================================================
-- IDENTIFY REMAINING DANGEROUS POLICIES
-- =====================================================
-- Purpose: Find the 16 remaining dangerous policies to review
-- Run this to see what still needs fixing
-- =====================================================

-- Show the remaining policies with USING (true)
SELECT
    'REMAINING DANGEROUS POLICIES' as issue_type,
    tablename,
    policyname,
    cmd as policy_type,
    qual as using_clause,
    with_check,
    CASE
        WHEN tablename IN ('poi_categories', 'trip_templates', 'affiliate_products')
        THEN '✅ LIKELY OK (Reference data)'
        WHEN policyname ILIKE '%public%' OR policyname ILIKE '%read%'
        THEN '✅ LIKELY OK (Public read access)'
        WHEN tablename LIKE '%_categories' OR tablename LIKE '%_templates'
        THEN '✅ LIKELY OK (Reference data)'
        ELSE '⚠️ NEEDS REVIEW'
    END as assessment
FROM pg_policies
WHERE schemaname = 'public'
  AND qual = 'true'
  AND policyname NOT LIKE '%public%'
ORDER BY
    CASE
        WHEN tablename IN ('profiles', 'expenses', 'medical_records', 'pam_conversations')
        THEN 1  -- Critical user data tables first
        ELSE 2
    END,
    tablename, policyname;

-- Also check for any policies that might allow cross-user access
SELECT
    'POTENTIAL CROSS-USER ACCESS' as issue_type,
    tablename,
    policyname,
    qual as using_clause,
    '⚠️ May allow cross-user access' as concern
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'expenses', 'trips', 'calendar_events', 'medical_records', 'pam_conversations')
  AND (
    qual NOT ILIKE '%auth.uid()%'
    OR (qual ILIKE '%auth.uid()%' AND qual ILIKE '%OR%')
  )
ORDER BY tablename;

-- Summary of what we found
SELECT
    'SUMMARY' as info_type,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND qual = 'true' AND policyname NOT LIKE '%public%') as total_dangerous_policies,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND qual = 'true' AND tablename IN ('profiles', 'expenses', 'medical_records')) as critical_table_dangerous_policies,
    'Review the policies above and decide which need fixing' as next_step;