-- Step 1: Identify tables with RLS performance issues
-- Run this in Supabase SQL Editor to see which tables need fixing

SELECT
    schemaname,
    tablename,
    policyname,
    CASE
        WHEN definition LIKE '%(SELECT auth.%' OR definition LIKE '%(select auth.%' THEN '✅ Already Optimized'
        WHEN definition LIKE '%auth.uid()%' THEN '❌ Needs Optimization'
        WHEN definition LIKE '%auth.%' THEN '⚠️ Uses auth function (check manually)'
        ELSE 'ℹ️ No auth function'
    END as status,
    definition
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    definition LIKE '%auth.uid()%'
    OR definition LIKE '%auth.email()%'
    OR definition LIKE '%auth.role()%'
  )
  AND definition NOT LIKE '%(SELECT auth.%'
  AND definition NOT LIKE '%(select auth.%'
ORDER BY tablename, policyname;

-- Summary by table
SELECT
    tablename,
    COUNT(*) as policies_needing_optimization
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    definition LIKE '%auth.uid()%'
    OR definition LIKE '%auth.email()%'
    OR definition LIKE '%auth.role()%'
  )
  AND definition NOT LIKE '%(SELECT auth.%'
  AND definition NOT LIKE '%(select auth.%'
GROUP BY tablename
ORDER BY policies_needing_optimization DESC, tablename;
