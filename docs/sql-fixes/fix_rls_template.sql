-- Template: Fix RLS Performance for a Single Table
-- Replace TABLE_NAME and COLUMN_NAME with actual values from identify_rls_issues.sql results

-- EXAMPLE: If you have a table called "user_hustle_attempts" with column "user_id"
-- Replace both instances below and run in Supabase SQL Editor

BEGIN;

-- Drop existing policy (use exact name from identify_rls_issues.sql)
DROP POLICY IF EXISTS "policy_name_here" ON public.table_name_here;

-- Recreate with optimization
-- PATTERN 1: Simple user_id check (most common)
CREATE POLICY "policy_name_here"
ON public.table_name_here
FOR SELECT
USING (user_id = (SELECT auth.uid()));

-- PATTERN 2: For INSERT policies
-- CREATE POLICY "policy_name_here"
-- ON public.table_name_here
-- FOR INSERT
-- WITH CHECK (user_id = (SELECT auth.uid()));

-- PATTERN 3: For UPDATE policies (needs both USING and WITH CHECK)
-- CREATE POLICY "policy_name_here"
-- ON public.table_name_here
-- FOR UPDATE
-- USING (user_id = (SELECT auth.uid()))
-- WITH CHECK (user_id = (SELECT auth.uid()));

-- PATTERN 4: For DELETE policies
-- CREATE POLICY "policy_name_here"
-- ON public.table_name_here
-- FOR DELETE
-- USING (user_id = (SELECT auth.uid()));

-- PATTERN 5: For tables using 'id' instead of 'user_id' (like profiles table)
-- CREATE POLICY "policy_name_here"
-- ON public.profiles
-- FOR SELECT
-- USING (id = (SELECT auth.uid()));

COMMIT;

-- Verify the fix
SELECT
    policyname,
    CASE
        WHEN definition LIKE '%(SELECT auth.%' THEN '✅ OPTIMIZED'
        ELSE '❌ STILL NEEDS FIX'
    END as status,
    definition
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'table_name_here';
