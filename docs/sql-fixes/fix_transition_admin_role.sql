-- ============================================================================
-- FIX: Add admin role support to transition_profiles
-- ============================================================================
-- Problem: User has JWT role "admin" but policies only cover authenticated/anon
-- Solution: Add admin role to GRANT statements and RLS policies
-- ============================================================================

-- PART 1: Grant table-level permissions to admin role
GRANT ALL PRIVILEGES ON transition_profiles TO admin;

-- PART 2: Add admin-specific RLS policy (bypasses user_id check for admins)
CREATE POLICY "Admins can manage all transition profiles"
ON transition_profiles FOR ALL
TO admin
USING (true)
WITH CHECK (true);

-- PART 3: Verify all roles have access
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
-- Expected: 3 rows (authenticated, admin, anon) with full privileges

-- PART 4: Verify RLS policies
SELECT policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'transition_profiles'
ORDER BY policyname;
-- Expected: 5 policies (4 for authenticated + 1 for admin)

-- ============================================================================
-- CRITICAL: After running this SQL, you MUST:
-- 1. Log out completely
-- 2. Clear browser cache (Cmd+Shift+R or Ctrl+Shift+R)
-- 3. Log back in (to get fresh JWT token with new permissions)
-- 4. Try onboarding again
-- ============================================================================
