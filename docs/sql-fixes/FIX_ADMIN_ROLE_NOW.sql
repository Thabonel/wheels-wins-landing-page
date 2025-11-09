-- ============================================================================
-- FIX: Add admin role support to transition_profiles
-- ============================================================================
-- Problem: User has JWT role "admin" but policies only cover authenticated/anon
-- Solution: Add admin role to GRANT statements and RLS policies
-- ============================================================================

-- STEP 1: Grant table-level permissions to admin role
GRANT ALL PRIVILEGES ON transition_profiles TO admin;

-- STEP 2: Add admin-specific RLS policy (bypasses user_id check for admins)
CREATE POLICY "Admins can manage all transition profiles"
ON transition_profiles FOR ALL
TO admin
USING (true)
WITH CHECK (true);

-- ============================================================================
-- VERIFICATION QUERIES (run these AFTER the above SQL)
-- ============================================================================

-- Check 1: Verify all three roles have privileges
SELECT
    table_name,
    grantee,
    string_agg(privilege_type, ', ' ORDER BY privilege_type) as privileges
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name = 'transition_profiles'
AND grantee IN ('authenticated', 'anon', 'admin')
GROUP BY table_name, grantee
ORDER BY grantee;
-- Expected: 3 rows (admin, anon, authenticated) with full privileges

-- Check 2: Verify RLS policies include admin
SELECT policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'transition_profiles'
ORDER BY policyname;
-- Expected: 5 policies total (4 for authenticated + 1 for admin)

-- ============================================================================
-- CRITICAL: After running this SQL, you MUST:
-- 1. Log out of the application completely
-- 2. Clear browser cache (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
-- 3. Log back in (this will give you a fresh JWT token with admin permissions)
-- 4. Try the Life Transition Navigator onboarding again
-- ============================================================================
