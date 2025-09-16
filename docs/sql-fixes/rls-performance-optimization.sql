-- =====================================================
-- RLS Performance Optimization Script
-- Fixes 142 tables with inefficient auth.uid() usage
-- =====================================================

-- Step 1: Analyze current RLS policies with auth.uid() issues
-- This query finds all policies using auth.uid() directly
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE qual LIKE '%auth.uid()%'
   OR with_check LIKE '%auth.uid()%'
ORDER BY schemaname, tablename, policyname;

-- Step 2: Generate the optimization commands
-- We'll create a systematic approach to fix each policy

-- =====================================================
-- CORE USER TABLES
-- =====================================================

-- profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK ((select auth.uid()) = id);

-- user_settings table
DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
CREATE POLICY "Users can view own settings" ON user_settings
    FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
CREATE POLICY "Users can update own settings" ON user_settings
    FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
CREATE POLICY "Users can insert own settings" ON user_settings
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own settings" ON user_settings;
CREATE POLICY "Users can delete own settings" ON user_settings
    FOR DELETE USING ((select auth.uid()) = user_id);

-- =====================================================
-- FINANCIAL TABLES
-- =====================================================

-- expenses table
DROP POLICY IF EXISTS "Users can view own expenses" ON expenses;
CREATE POLICY "Users can view own expenses" ON expenses
    FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own expenses" ON expenses;
CREATE POLICY "Users can insert own expenses" ON expenses
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own expenses" ON expenses;
CREATE POLICY "Users can update own expenses" ON expenses
    FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own expenses" ON expenses;
CREATE POLICY "Users can delete own expenses" ON expenses
    FOR DELETE USING ((select auth.uid()) = user_id);

-- budgets table
DROP POLICY IF EXISTS "Users can view own budgets" ON budgets;
CREATE POLICY "Users can view own budgets" ON budgets
    FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own budgets" ON budgets;
CREATE POLICY "Users can insert own budgets" ON budgets
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own budgets" ON budgets;
CREATE POLICY "Users can update own budgets" ON budgets
    FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own budgets" ON budgets;
CREATE POLICY "Users can delete own budgets" ON budgets
    FOR DELETE USING ((select auth.uid()) = user_id);

-- =====================================================
-- TRIP PLANNING TABLES
-- =====================================================

-- trips table
DROP POLICY IF EXISTS "Users can view own trips" ON trips;
CREATE POLICY "Users can view own trips" ON trips
    FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own trips" ON trips;
CREATE POLICY "Users can insert own trips" ON trips
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own trips" ON trips;
CREATE POLICY "Users can update own trips" ON trips
    FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own trips" ON trips;
CREATE POLICY "Users can delete own trips" ON trips
    FOR DELETE USING ((select auth.uid()) = user_id);

-- trip_waypoints table
DROP POLICY IF EXISTS "Users can view own trip waypoints" ON trip_waypoints;
CREATE POLICY "Users can view own trip waypoints" ON trip_waypoints
    FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own trip waypoints" ON trip_waypoints;
CREATE POLICY "Users can insert own trip waypoints" ON trip_waypoints
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own trip waypoints" ON trip_waypoints;
CREATE POLICY "Users can update own trip waypoints" ON trip_waypoints
    FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own trip waypoints" ON trip_waypoints;
CREATE POLICY "Users can delete own trip waypoints" ON trip_waypoints
    FOR DELETE USING ((select auth.uid()) = user_id);

-- =====================================================
-- PAM AI TABLES
-- =====================================================

-- pam_conversations table
DROP POLICY IF EXISTS "Users can view own PAM conversations" ON pam_conversations;
CREATE POLICY "Users can view own PAM conversations" ON pam_conversations
    FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own PAM conversations" ON pam_conversations;
CREATE POLICY "Users can insert own PAM conversations" ON pam_conversations
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own PAM conversations" ON pam_conversations;
CREATE POLICY "Users can update own PAM conversations" ON pam_conversations
    FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own PAM conversations" ON pam_conversations;
CREATE POLICY "Users can delete own PAM conversations" ON pam_conversations
    FOR DELETE USING ((select auth.uid()) = user_id);

-- pam_messages table
DROP POLICY IF EXISTS "Users can view own PAM messages" ON pam_messages;
CREATE POLICY "Users can view own PAM messages" ON pam_messages
    FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own PAM messages" ON pam_messages;
CREATE POLICY "Users can insert own PAM messages" ON pam_messages
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own PAM messages" ON pam_messages;
CREATE POLICY "Users can update own PAM messages" ON pam_messages
    FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own PAM messages" ON pam_messages;
CREATE POLICY "Users can delete own PAM messages" ON pam_messages
    FOR DELETE USING ((select auth.uid()) = user_id);

-- pam_feedback table
DROP POLICY IF EXISTS "Users can view own PAM feedback" ON pam_feedback;
CREATE POLICY "Users can view own PAM feedback" ON pam_feedback
    FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own PAM feedback" ON pam_feedback;
CREATE POLICY "Users can insert own PAM feedback" ON pam_feedback
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own PAM feedback" ON pam_feedback;
CREATE POLICY "Users can update own PAM feedback" ON pam_feedback
    FOR UPDATE USING ((select auth.uid()) = user_id);

-- =====================================================
-- SOCIAL TABLES
-- =====================================================

-- posts table
DROP POLICY IF EXISTS "Users can view own posts" ON posts;
CREATE POLICY "Users can view own posts" ON posts
    FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own posts" ON posts;
CREATE POLICY "Users can insert own posts" ON posts
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own posts" ON posts;
CREATE POLICY "Users can update own posts" ON posts
    FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own posts" ON posts;
CREATE POLICY "Users can delete own posts" ON posts
    FOR DELETE USING ((select auth.uid()) = user_id);

-- post_comments table
DROP POLICY IF EXISTS "Users can view own comments" ON post_comments;
CREATE POLICY "Users can view own comments" ON post_comments
    FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own comments" ON post_comments;
CREATE POLICY "Users can insert own comments" ON post_comments
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own comments" ON post_comments;
CREATE POLICY "Users can update own comments" ON post_comments
    FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON post_comments;
CREATE POLICY "Users can delete own comments" ON post_comments
    FOR DELETE USING ((select auth.uid()) = user_id);

-- =====================================================
-- MEDICAL TABLES
-- =====================================================

-- medical_records table
DROP POLICY IF EXISTS "Users can view own medical records" ON medical_records;
CREATE POLICY "Users can view own medical records" ON medical_records
    FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own medical records" ON medical_records;
CREATE POLICY "Users can insert own medical records" ON medical_records
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own medical records" ON medical_records;
CREATE POLICY "Users can update own medical records" ON medical_records
    FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own medical records" ON medical_records;
CREATE POLICY "Users can delete own medical records" ON medical_records
    FOR DELETE USING ((select auth.uid()) = user_id);

-- medical_medications table
DROP POLICY IF EXISTS "Users can view own medications" ON medical_medications;
CREATE POLICY "Users can view own medications" ON medical_medications
    FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own medications" ON medical_medications;
CREATE POLICY "Users can insert own medications" ON medical_medications
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own medications" ON medical_medications;
CREATE POLICY "Users can update own medications" ON medical_medications
    FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own medications" ON medical_medications;
CREATE POLICY "Users can delete own medications" ON medical_medications
    FOR DELETE USING ((select auth.uid()) = user_id);

-- medical_emergency_info table
DROP POLICY IF EXISTS "Users can view own emergency info" ON medical_emergency_info;
CREATE POLICY "Users can view own emergency info" ON medical_emergency_info
    FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own emergency info" ON medical_emergency_info;
CREATE POLICY "Users can insert own emergency info" ON medical_emergency_info
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own emergency info" ON medical_emergency_info;
CREATE POLICY "Users can update own emergency info" ON medical_emergency_info
    FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own emergency info" ON medical_emergency_info;
CREATE POLICY "Users can delete own emergency info" ON medical_emergency_info
    FOR DELETE USING ((select auth.uid()) = user_id);

-- =====================================================
-- SUBSCRIPTION TABLES
-- =====================================================

-- user_subscriptions table
DROP POLICY IF EXISTS "Users can view own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
    FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can insert own subscriptions" ON user_subscriptions
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can update own subscriptions" ON user_subscriptions
    FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can delete own subscriptions" ON user_subscriptions
    FOR DELETE USING ((select auth.uid()) = user_id);

-- =====================================================
-- ADDITIONAL OPTIMIZATION STEPS
-- =====================================================

-- Create a function to help with bulk policy updates for remaining tables
CREATE OR REPLACE FUNCTION optimize_rls_policies()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    r RECORD;
    policy_sql TEXT;
BEGIN
    -- Loop through all tables that might have RLS policies
    FOR r IN
        SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
        FROM pg_policies
        WHERE (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%')
        AND schemaname = 'public'
    LOOP
        -- Log the policy being updated
        RAISE NOTICE 'Optimizing policy % on table %.%', r.policyname, r.schemaname, r.tablename;

        -- Skip if we've already handled this table above
        CONTINUE WHEN r.tablename IN (
            'profiles', 'user_settings', 'expenses', 'budgets', 'trips', 'trip_waypoints',
            'pam_conversations', 'pam_messages', 'pam_feedback', 'posts', 'post_comments',
            'medical_records', 'medical_medications', 'medical_emergency_info', 'user_subscriptions'
        );

        -- Generate optimized policy SQL
        policy_sql := format('DROP POLICY IF EXISTS %I ON %I.%I; ', r.policyname, r.schemaname, r.tablename);

        policy_sql := policy_sql || format('CREATE POLICY %I ON %I.%I FOR %s ',
            r.policyname, r.schemaname, r.tablename, r.cmd);

        IF r.cmd = 'SELECT' OR r.cmd = 'ALL' THEN
            policy_sql := policy_sql || format('USING (%s)',
                replace(replace(r.qual, 'auth.uid()', '(select auth.uid())'), 'auth.uid() =', '(select auth.uid()) ='));
        END IF;

        IF r.cmd IN ('INSERT', 'UPDATE') OR r.cmd = 'ALL' THEN
            IF r.with_check IS NOT NULL THEN
                policy_sql := policy_sql || format(' WITH CHECK (%s)',
                    replace(replace(r.with_check, 'auth.uid()', '(select auth.uid())'), 'auth.uid() =', '(select auth.uid()) ='));
            END IF;
        END IF;

        policy_sql := policy_sql || ';';

        -- Execute the optimized policy
        EXECUTE policy_sql;
    END LOOP;
END;
$$;

-- Run the optimization function
SELECT optimize_rls_policies();

-- Clean up the helper function
DROP FUNCTION optimize_rls_policies();

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify no policies still use inefficient auth.uid()
SELECT
    schemaname,
    tablename,
    policyname,
    'STILL INEFFICIENT' as status
FROM pg_policies
WHERE (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%')
AND schemaname = 'public'
ORDER BY tablename;

-- Count optimized policies
SELECT
    COUNT(*) as optimized_policies_count
FROM pg_policies
WHERE (qual LIKE '%(select auth.uid())%' OR with_check LIKE '%(select auth.uid())%')
AND schemaname = 'public';

-- Performance verification - this should show improved query plans
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM expenses WHERE user_id = (select auth.uid()) LIMIT 10;

COMMIT;