-- Rollback Script for RLS Security Fixes
-- Date: January 31, 2026
-- Purpose: Restore original policies if the security fix breaks functionality
-- WARNING: This restores the insecure WITH CHECK (true) policies

-- =============================================================================
-- EMERGENCY ROLLBACK - ONLY USE IF SECURITY FIX BREAKS FUNCTIONALITY
-- =============================================================================

BEGIN;

-- 1. Restore affiliate_product_clicks original policy
DROP POLICY IF EXISTS "Users can track product clicks" ON affiliate_product_clicks;

-- Restore original insecure policy (temporary measure)
CREATE POLICY "Anyone can insert clicks" ON affiliate_product_clicks
    FOR INSERT
    WITH CHECK (true); -- INSECURE: Allows unrestricted access

-- 2. Restore agent_logs original policy
DROP POLICY IF EXISTS "Service role can insert agent logs" ON agent_logs;
DROP POLICY IF EXISTS "Authenticated users can insert own logs" ON agent_logs;

-- Restore original insecure policy (temporary measure)
CREATE POLICY "System can insert agent logs" ON agent_logs
    FOR INSERT
    WITH CHECK (true); -- INSECURE: Allows unrestricted access

-- 3. Restore product_issue_reports original policy
DROP POLICY IF EXISTS "Users can submit issue reports" ON product_issue_reports;

-- Restore original insecure policy (temporary measure)
CREATE POLICY "allow_insert_reports" ON product_issue_reports
    FOR INSERT
    WITH CHECK (true); -- INSECURE: Allows unrestricted access

-- 4. Restore trip_locations original policy
DROP POLICY IF EXISTS "Service role can manage trip locations" ON trip_locations;
DROP POLICY IF EXISTS "Users can insert own trip locations" ON trip_locations;

-- Restore original insecure policy (temporary measure)
CREATE POLICY "Allow service role locations" ON trip_locations
    FOR INSERT
    WITH CHECK (true); -- INSECURE: Allows unrestricted access

-- 5. Remove any added SELECT policies (optional)
DROP POLICY IF EXISTS "Users can read own agent logs" ON agent_logs;
DROP POLICY IF EXISTS "Users can read own reports" ON product_issue_reports;
DROP POLICY IF EXISTS "Users can read own trip locations" ON trip_locations;

COMMIT;

-- =============================================================================
-- Post-Rollback Actions Required
-- =============================================================================

-- After rollback, you MUST:
-- 1. Identify why the security fix broke functionality
-- 2. Test the specific operations that failed
-- 3. Create a more targeted security fix that preserves functionality
-- 4. Apply the improved security fix
-- 5. Never leave WITH CHECK (true) policies in production long-term

-- =============================================================================
-- Verification After Rollback
-- =============================================================================

-- Check that original policies are restored
SELECT
    tablename,
    policyname,
    cmd,
    with_check,
    'RESTORED (INSECURE)' as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('affiliate_product_clicks', 'agent_logs', 'product_issue_reports', 'trip_locations')
  AND with_check = 'true'
ORDER BY tablename;