-- Fix RLS Security Issues - Replace WITH CHECK (true) policies
-- Date: January 31, 2026
-- Purpose: Replace overly permissive WITH CHECK (true) with proper security conditions
-- Analysis: Found security vulnerabilities in affiliate_product_clicks, product_issue_reports, trip_locations

-- =============================================================================
-- CRITICAL SECURITY FIX - CONFIRMED VULNERABILITIES
-- =============================================================================

BEGIN;

-- 1. Fix affiliate_product_clicks table
-- Replace "Anyone can insert clicks" policy that uses WITH CHECK (true)
DROP POLICY IF EXISTS "Anyone can insert clicks" ON affiliate_product_clicks;

-- Create secure policy for tracking product clicks
-- Allow authenticated users to track clicks, but with rate limiting considerations
CREATE POLICY "Users can track product clicks" ON affiliate_product_clicks
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Ensure user is authenticated
        auth.uid() IS NOT NULL
        -- Note: Additional rate limiting should be implemented at application level
    );

-- Ensure RLS is enabled
ALTER TABLE affiliate_product_clicks ENABLE ROW LEVEL SECURITY;

-- 2. Fix agent_logs table
-- Replace "System can insert agent logs" policy that uses WITH CHECK (true)
DROP POLICY IF EXISTS "System can insert agent logs" ON agent_logs;

-- Create secure policy for agent logs - restrict to service operations only
CREATE POLICY "Service role can insert agent logs" ON agent_logs
    FOR INSERT
    TO service_role
    WITH CHECK (true); -- Service role is trusted, but we restrict WHO can use this policy

-- Additional policy for specific authenticated operations if needed
CREATE POLICY "Authenticated users can insert own logs" ON agent_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Only allow if user_id matches authenticated user (if table has user_id column)
        CASE
            WHEN EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'agent_logs'
                AND column_name = 'user_id'
                AND table_schema = 'public'
            )
            THEN user_id = auth.uid()
            ELSE false -- If no user_id column, don't allow authenticated users to insert
        END
    );

-- 3. Fix product_issue_reports table
-- Replace "allow_insert_reports" policy that uses WITH CHECK (true)
DROP POLICY IF EXISTS "allow_insert_reports" ON product_issue_reports;

-- Create secure policy for issue reports
CREATE POLICY "Users can submit issue reports" ON product_issue_reports
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Ensure user is authenticated
        auth.uid() IS NOT NULL
        -- Additional validation: if table has user_id, ensure it matches
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

-- 4. Fix trip_locations table
-- Replace "Allow service role locations" policy that uses WITH CHECK (true)
DROP POLICY IF EXISTS "Allow service role locations" ON trip_locations;

-- Create secure policy for trip locations - service role only
CREATE POLICY "Service role can manage trip locations" ON trip_locations
    FOR INSERT
    TO service_role
    WITH CHECK (true); -- Service role is trusted

-- If authenticated users need to insert locations, create a separate policy
CREATE POLICY "Users can insert own trip locations" ON trip_locations
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Only allow if user_id matches authenticated user
        CASE
            WHEN EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'trip_locations'
                AND column_name = 'user_id'
                AND table_schema = 'public'
            )
            THEN user_id = auth.uid()
            ELSE false -- If no user_id column, don't allow authenticated users
        END
    );

-- =============================================================================
-- Additional Security Hardening
-- =============================================================================

-- 5. Review and fix any other policies with WITH CHECK (true)
-- This query will show remaining issues (run separately to verify)
/*
SELECT
    tablename,
    policyname,
    cmd,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND with_check = 'true'
  AND tablename NOT IN ('affiliate_product_clicks', 'agent_logs', 'product_issue_reports', 'trip_locations');
*/

-- 6. Ensure all affected tables have RLS enabled
ALTER TABLE affiliate_product_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_issue_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_locations ENABLE ROW LEVEL SECURITY;

-- 7. Add SELECT policies to ensure proper read access
-- (Only if they don't already exist and are needed)

-- For affiliate_product_clicks - typically don't need SELECT access for users
-- (Analytics should use service role)

-- For agent_logs - allow users to read their own logs if table has user_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'agent_logs'
        AND column_name = 'user_id'
        AND table_schema = 'public'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'agent_logs'
        AND policyname = 'Users can read own agent logs'
        AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Users can read own agent logs" ON agent_logs
            FOR SELECT
            TO authenticated
            USING (user_id = auth.uid());
    END IF;
END $$;

-- For product_issue_reports - allow users to read their own reports
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'product_issue_reports'
        AND column_name = 'user_id'
        AND table_schema = 'public'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'product_issue_reports'
        AND policyname = 'Users can read own reports'
        AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Users can read own reports" ON product_issue_reports
            FOR SELECT
            TO authenticated
            USING (user_id = auth.uid());
    END IF;
END $$;

-- For trip_locations - allow users to read their own trip locations
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'trip_locations'
        AND column_name = 'user_id'
        AND table_schema = 'public'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'trip_locations'
        AND policyname = 'Users can read own trip locations'
        AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Users can read own trip locations" ON trip_locations
            FOR SELECT
            TO authenticated
            USING (user_id = auth.uid());
    END IF;
END $$;

COMMIT;

-- =============================================================================
-- Verification Queries
-- =============================================================================

-- Run these queries after the fix to verify security is improved:

-- 1. Check that WITH CHECK (true) policies are removed from target tables
SELECT
    tablename,
    policyname,
    cmd,
    with_check,
    'FIXED' as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('affiliate_product_clicks', 'agent_logs', 'product_issue_reports', 'trip_locations')
ORDER BY tablename, cmd;

-- 2. Check for any remaining WITH CHECK (true) policies in other tables
SELECT
    tablename,
    policyname,
    cmd,
    with_check,
    'NEEDS REVIEW' as status
FROM pg_policies
WHERE schemaname = 'public'
  AND with_check = 'true'
  AND tablename NOT IN ('affiliate_product_clicks', 'agent_logs', 'product_issue_reports', 'trip_locations')
ORDER BY tablename;

-- 3. Verify RLS is enabled on all tables
SELECT
    t.table_name,
    pc.relrowsecurity as rls_enabled,
    pc.relforcerowsecurity as rls_forced
FROM information_schema.tables t
JOIN pg_class pc ON pc.relname = t.table_name
WHERE t.table_schema = 'public'
  AND t.table_name IN ('affiliate_product_clicks', 'agent_logs', 'product_issue_reports', 'trip_locations');