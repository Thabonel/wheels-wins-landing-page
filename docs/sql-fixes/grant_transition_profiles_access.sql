-- Fix for 403 Forbidden / Permission Denied error on transition_profiles
-- Issue: RLS policies exist but table-level permissions not granted
-- PostgreSQL Error: 42501 (insufficient_privilege)

-- Grant table access to authenticated users
GRANT ALL ON transition_profiles TO authenticated;
GRANT ALL ON transition_profiles TO anon;

-- Note: No sequence grants needed - table uses UUID with gen_random_uuid()

-- Verify grants
SELECT
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'transition_profiles'
AND table_schema = 'public'
ORDER BY grantee, privilege_type;
