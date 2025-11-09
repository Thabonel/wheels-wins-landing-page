-- Cleanup: Remove excessive permissions from views
-- Views should only have SELECT permissions for security

-- =============================================================================
-- Revoke all permissions from anon on budget_utilization
-- Only authenticated users need access to budget data
-- =============================================================================

REVOKE ALL ON public.budget_utilization FROM anon;

-- =============================================================================
-- Ensure signup_health_check doesn't have anon access
-- (Already handled in the main fix, but being explicit)
-- =============================================================================

REVOKE ALL ON public.signup_health_check FROM anon;

-- =============================================================================
-- Remove unnecessary permissions from authenticated role
-- Views don't need INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER
-- They only need SELECT (read-only)
-- =============================================================================

-- Clean up budget_utilization
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON public.budget_utilization
FROM authenticated;

-- Ensure SELECT is granted
GRANT SELECT ON public.budget_utilization TO authenticated;

-- Clean up signup_health_check
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON public.signup_health_check
FROM authenticated;

-- Ensure SELECT is granted
GRANT SELECT ON public.signup_health_check TO authenticated;

-- =============================================================================
-- Verification: Check final permissions
-- =============================================================================

SELECT
    table_name,
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name IN ('signup_health_check', 'budget_utilization')
AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, grantee, privilege_type;

-- Expected result:
-- budget_utilization | authenticated | SELECT
-- signup_health_check | authenticated | SELECT
-- (anon should have NO permissions)
