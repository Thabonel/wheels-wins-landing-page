-- ============================================================================
-- FINAL FIX: Transition Tables 403 Forbidden Error
-- ============================================================================
-- Problem: Table-level GRANT statements missing for authenticated/anon roles
-- Solution: Grant ALL privileges to both roles on all 8 transition tables
-- ============================================================================

-- Grant table-level access to authenticated role (logged-in users)
GRANT ALL PRIVILEGES ON transition_profiles TO authenticated;
GRANT ALL PRIVILEGES ON transition_tasks TO authenticated;
GRANT ALL PRIVILEGES ON transition_timeline TO authenticated;
GRANT ALL PRIVILEGES ON transition_financial TO authenticated;
GRANT ALL PRIVILEGES ON transition_inventory TO authenticated;
GRANT ALL PRIVILEGES ON transition_equipment TO authenticated;
GRANT ALL PRIVILEGES ON transition_vehicles TO authenticated;
GRANT ALL PRIVILEGES ON transition_community TO authenticated;

-- Grant table-level access to anon role (anonymous users)
GRANT ALL PRIVILEGES ON transition_profiles TO anon;
GRANT ALL PRIVILEGES ON transition_tasks TO anon;
GRANT ALL PRIVILEGES ON transition_timeline TO anon;
GRANT ALL PRIVILEGES ON transition_financial TO anon;
GRANT ALL PRIVILEGES ON transition_inventory TO anon;
GRANT ALL PRIVILEGES ON transition_equipment TO anon;
GRANT ALL PRIVILEGES ON transition_vehicles TO anon;
GRANT ALL PRIVILEGES ON transition_community TO anon;

-- ============================================================================
-- Verification Query
-- ============================================================================
-- This should return 16 rows (8 tables × 2 roles)

SELECT
    table_name,
    grantee,
    string_agg(privilege_type, ', ' ORDER BY privilege_type) as privileges
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name LIKE 'transition_%'
AND grantee IN ('authenticated', 'anon')
GROUP BY table_name, grantee
ORDER BY table_name, grantee;

-- Expected output: 16 rows showing all 8 tables with authenticated and anon
-- Each should have: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

-- ============================================================================
-- Test Query as authenticated role
-- ============================================================================
-- This will prove the fix worked

SET ROLE authenticated;
SELECT COUNT(*) as test_count FROM transition_profiles;
RESET ROLE;

-- If this returns a count (even 0), the fix worked!
-- If this returns ERROR 42501, run the GRANT statements again
