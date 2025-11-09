-- Comprehensive Calendar Disconnect Diagnosis
-- Run this in Supabase SQL Editor to find why calendar events aren't showing

-- =============================================================================
-- 1. Check if calendar_events table exists and has RLS enabled
-- =============================================================================
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    hasindexes,
    hastriggers
FROM pg_tables
WHERE tablename = 'calendar_events';

-- =============================================================================
-- 2. List all RLS policies on calendar_events
-- =============================================================================
SELECT
    policyname,
    permissive,
    roles,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'calendar_events'
ORDER BY policyname;

-- =============================================================================
-- 3. Count total events in table (bypasses RLS with service_role)
-- =============================================================================
SELECT COUNT(*) as total_calendar_events FROM calendar_events;

-- =============================================================================
-- 4. Show all calendar events with user info
-- =============================================================================
SELECT
    ce.id,
    ce.user_id,
    ce.title,
    ce.description,
    ce.start_date,
    ce.end_date,
    ce.event_type,
    ce.created_at,
    p.email as user_email
FROM calendar_events ce
LEFT JOIN profiles p ON p.id = ce.user_id
ORDER BY ce.created_at DESC
LIMIT 20;

-- =============================================================================
-- 5. Check if user_id matches actual user IDs in auth.users
-- =============================================================================
SELECT
    ce.user_id,
    ce.title,
    au.id as auth_user_id,
    au.email,
    CASE
        WHEN au.id IS NULL THEN 'USER NOT FOUND IN AUTH'
        WHEN ce.user_id = au.id THEN 'MATCH'
        ELSE 'MISMATCH'
    END as status
FROM calendar_events ce
LEFT JOIN auth.users au ON au.id = ce.user_id
ORDER BY ce.created_at DESC;

-- =============================================================================
-- 6. Test RLS policy for authenticated users (simulates frontend query)
-- =============================================================================
-- This shows what a regular user would see (should match their user_id)
SELECT
    id,
    user_id,
    title,
    start_date,
    created_at
FROM calendar_events
WHERE user_id = auth.uid()  -- This is what frontend uses
ORDER BY start_date ASC;

-- =============================================================================
-- 7. Check column data types match expected schema
-- =============================================================================
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'calendar_events'
ORDER BY ordinal_position;

-- =============================================================================
-- EXPECTED RESULTS:
-- =============================================================================
-- 1. RLS should be ENABLED (rowsecurity = true)
-- 2. Should have 4 policies: SELECT, INSERT, UPDATE, DELETE
-- 3. Total events > 0 if PAM created any
-- 4. user_id should MATCH auth.users.id (not MISMATCH)
-- 5. Test query should return events (if running as that user)
-- 6. start_date should be TIMESTAMP WITH TIME ZONE
-- 7. event_type should be TEXT
