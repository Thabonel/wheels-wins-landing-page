-- ============================================================================
-- FIX: 403 Forbidden Error on transition_profiles Table
-- ============================================================================
-- Error Code: 42501 (insufficient_privilege)
-- Error Message: "permission denied for table transition_profiles"
--
-- Root Cause: Table-level GRANT statements missing for authenticated/anon roles
-- Solution: Grant ALL privileges to authenticated and anon roles
-- ============================================================================

-- Step 1: Grant access to core transition tables
GRANT ALL ON transition_profiles TO authenticated;
GRANT ALL ON transition_profiles TO anon;

GRANT ALL ON transition_tasks TO authenticated;
GRANT ALL ON transition_tasks TO anon;

GRANT ALL ON transition_timeline TO authenticated;
GRANT ALL ON transition_timeline TO anon;

GRANT ALL ON transition_financial TO authenticated;
GRANT ALL ON transition_financial TO anon;

-- Step 2: Grant access to supplementary transition tables
GRANT ALL ON transition_inventory TO authenticated;
GRANT ALL ON transition_inventory TO anon;

GRANT ALL ON transition_equipment TO authenticated;
GRANT ALL ON transition_equipment TO anon;

GRANT ALL ON transition_vehicles TO authenticated;
GRANT ALL ON transition_vehicles TO anon;

GRANT ALL ON transition_community TO authenticated;
GRANT ALL ON transition_community TO anon;

-- Step 3: Verify grants were applied successfully
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

-- Step 4: Test query (should return empty result, NOT error)
SELECT COUNT(*) as profile_count FROM transition_profiles;

-- ============================================================================
-- Expected Output After Running This Script:
-- ============================================================================
--
-- Verification Query Results:
--   table_name                   | grantee       | privileges
--   ----------------------------+---------------+----------------------------------
--   transition_community         | anon          | DELETE, INSERT, REFERENCES, ...
--   transition_community         | authenticated | DELETE, INSERT, REFERENCES, ...
--   transition_equipment         | anon          | DELETE, INSERT, REFERENCES, ...
--   transition_equipment         | authenticated | DELETE, INSERT, REFERENCES, ...
--   transition_financial         | anon          | DELETE, INSERT, REFERENCES, ...
--   transition_financial         | authenticated | DELETE, INSERT, REFERENCES, ...
--   transition_inventory         | anon          | DELETE, INSERT, REFERENCES, ...
--   transition_inventory         | authenticated | DELETE, INSERT, REFERENCES, ...
--   transition_profiles          | anon          | DELETE, INSERT, REFERENCES, ...
--   transition_profiles          | authenticated | DELETE, INSERT, REFERENCES, ...
--   transition_tasks             | anon          | DELETE, INSERT, REFERENCES, ...
--   transition_tasks             | authenticated | DELETE, INSERT, REFERENCES, ...
--   transition_timeline          | anon          | DELETE, INSERT, REFERENCES, ...
--   transition_timeline          | authenticated | DELETE, INSERT, REFERENCES, ...
--   transition_vehicles          | anon          | DELETE, INSERT, REFERENCES, ...
--   transition_vehicles          | authenticated | DELETE, INSERT, REFERENCES, ...
--
-- Test Query Result:
--   profile_count
--   -------------
--   0 (or number of existing profiles)
--
-- ============================================================================
-- If you see these results, the fix worked! ✅
-- If you see an error, check Supabase logs for details.
-- ============================================================================
