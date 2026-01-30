-- Targeted RLS Security Fix - CRITICAL
-- Date: January 31, 2026
-- Analysis Results: 3 tables with confirmed security vulnerabilities
-- Status: IMMEDIATE ACTION REQUIRED

-- =============================================================================
-- CONFIRMED SECURITY VULNERABILITIES
-- =============================================================================
-- ✅ affiliate_product_clicks - Accessible with anon key (foreign key protection only)
-- ✅ product_issue_reports - Accessible with anon key (NOT NULL protection only)
-- ✅ trip_locations - Accessible with anon key (NOT NULL protection only)
-- ✅ agent_logs - Already secure (RLS working properly)

BEGIN;

-- =============================================================================
-- 1. FIX affiliate_product_clicks
-- =============================================================================

-- Find and drop existing permissive policies
DROP POLICY IF EXISTS "Anyone can insert clicks" ON affiliate_product_clicks;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON affiliate_product_clicks;
DROP POLICY IF EXISTS "Users can insert affiliate clicks" ON affiliate_product_clicks;

-- Create secure policy for affiliate click tracking
CREATE POLICY "secure_affiliate_clicks_insert" ON affiliate_product_clicks
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Must be authenticated user
        auth.uid() IS NOT NULL
        -- Note: Foreign key constraints provide additional protection
        -- Application should validate user has permission to track this product
    );

-- Ensure users can only read their own clicks (if user_id column exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'affiliate_product_clicks'
        AND column_name = 'user_id'
        AND table_schema = 'public'
    ) THEN
        DROP POLICY IF EXISTS "Users can read own clicks" ON affiliate_product_clicks;
        CREATE POLICY "secure_affiliate_clicks_select" ON affiliate_product_clicks
            FOR SELECT
            TO authenticated
            USING (user_id = auth.uid());
    END IF;
END $$;

-- =============================================================================
-- 2. FIX product_issue_reports
-- =============================================================================

-- Find and drop existing permissive policies
DROP POLICY IF EXISTS "allow_insert_reports" ON product_issue_reports;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON product_issue_reports;
DROP POLICY IF EXISTS "Users can submit reports" ON product_issue_reports;

-- Create secure policy for issue reports
CREATE POLICY "secure_issue_reports_insert" ON product_issue_reports
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Must be authenticated user
        auth.uid() IS NOT NULL
        -- If table has user_id, ensure it matches authenticated user
        AND (
            NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'product_issue_reports'
                AND column_name = 'user_id'
                AND table_schema = 'public'
            )
            OR user_id = auth.uid()
        )
    );

-- Allow users to read their own reports
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'product_issue_reports'
        AND column_name = 'user_id'
        AND table_schema = 'public'
    ) THEN
        DROP POLICY IF EXISTS "Users can read own reports" ON product_issue_reports;
        CREATE POLICY "secure_issue_reports_select" ON product_issue_reports
            FOR SELECT
            TO authenticated
            USING (user_id = auth.uid());
    END IF;
END $$;

-- =============================================================================
-- 3. FIX trip_locations
-- =============================================================================

-- Find and drop existing permissive policies
DROP POLICY IF EXISTS "Allow service role locations" ON trip_locations;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON trip_locations;
DROP POLICY IF EXISTS "Users can insert locations" ON trip_locations;

-- Create secure policy for trip locations - service role for system operations
CREATE POLICY "secure_trip_locations_service" ON trip_locations
    FOR ALL
    TO service_role
    WITH CHECK (true);

-- Allow authenticated users to manage their own trip locations
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'trip_locations'
        AND column_name = 'user_id'
        AND table_schema = 'public'
    ) THEN
        CREATE POLICY "secure_trip_locations_user_insert" ON trip_locations
            FOR INSERT
            TO authenticated
            WITH CHECK (user_id = auth.uid());

        CREATE POLICY "secure_trip_locations_user_select" ON trip_locations
            FOR SELECT
            TO authenticated
            USING (user_id = auth.uid());

        CREATE POLICY "secure_trip_locations_user_update" ON trip_locations
            FOR UPDATE
            TO authenticated
            USING (user_id = auth.uid())
            WITH CHECK (user_id = auth.uid());

        CREATE POLICY "secure_trip_locations_user_delete" ON trip_locations
            FOR DELETE
            TO authenticated
            USING (user_id = auth.uid());
    ELSE
        -- If no user_id column, only service role can modify
        CREATE POLICY "secure_trip_locations_readonly" ON trip_locations
            FOR SELECT
            TO authenticated
            USING (true);
    END IF;
END $$;

-- =============================================================================
-- 4. ENSURE RLS IS ENABLED
-- =============================================================================

-- Ensure RLS is enabled on all affected tables
ALTER TABLE affiliate_product_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_issue_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_locations ENABLE ROW LEVEL SECURITY;

-- agent_logs already has proper RLS (confirmed by analysis)

COMMIT;

-- =============================================================================
-- 5. VERIFICATION QUERIES
-- =============================================================================

-- Run these to verify the fix was applied correctly:

-- Check that no WITH CHECK (true) policies remain on target tables
SELECT
    tablename,
    policyname,
    cmd,
    with_check,
    CASE
        WHEN with_check = 'true' THEN '🚨 STILL INSECURE'
        ELSE '✅ SECURE'
    END as security_status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('affiliate_product_clicks', 'product_issue_reports', 'trip_locations')
ORDER BY tablename, cmd;

-- Check RLS is enabled
SELECT
    t.table_name,
    CASE WHEN pc.relrowsecurity THEN '✅ RLS ENABLED' ELSE '❌ RLS DISABLED' END as rls_status
FROM information_schema.tables t
JOIN pg_class pc ON pc.relname = t.table_name
WHERE t.table_schema = 'public'
  AND t.table_name IN ('affiliate_product_clicks', 'product_issue_reports', 'trip_locations');

-- Show new secure policies
SELECT
    tablename,
    policyname,
    cmd,
    roles,
    '✅ NEW SECURE POLICY' as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('affiliate_product_clicks', 'product_issue_reports', 'trip_locations')
  AND policyname LIKE 'secure_%'
ORDER BY tablename, cmd;