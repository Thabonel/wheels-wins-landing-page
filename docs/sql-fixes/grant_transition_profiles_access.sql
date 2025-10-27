-- Fix for 403 Forbidden / Permission Denied error on transition_profiles
-- Issue: RLS policies exist but table-level permissions not granted
-- PostgreSQL Error: 42501 (insufficient_privilege)

-- Grant table access to authenticated users
GRANT ALL ON transition_profiles TO authenticated;
GRANT ALL ON transition_profiles TO anon;

-- Also grant sequence access (for ID generation)
GRANT USAGE, SELECT ON SEQUENCE transition_profiles_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE transition_profiles_id_seq TO anon;

-- Verify grants
SELECT
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'transition_profiles'
AND table_schema = 'public'
ORDER BY grantee, privilege_type;
