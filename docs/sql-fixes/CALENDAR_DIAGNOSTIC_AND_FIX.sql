-- Calendar Events Diagnostic and Fix
-- Date: January 31, 2026
-- Purpose: Ensure PAM can access calendar events when users ask about their schedule

BEGIN;

-- =============================================================================
-- 1. DIAGNOSTIC QUERIES - Check Current State
-- =============================================================================

-- Check if calendar_events table exists and has proper structure
DO $$
DECLARE
    table_exists boolean;
    rls_status boolean;
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'calendar_events'
    ) INTO table_exists;

    IF NOT table_exists THEN
        RAISE NOTICE '❌ calendar_events table does not exist!';
        RAISE EXCEPTION 'calendar_events table missing';
    ELSE
        RAISE NOTICE '✅ calendar_events table exists';
    END IF;

    -- Check RLS status
    SELECT pg_class.relrowsecurity INTO rls_status
    FROM pg_class
    WHERE relname = 'calendar_events' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

    IF rls_status THEN
        RAISE NOTICE '✅ RLS is enabled on calendar_events';
    ELSE
        RAISE NOTICE '⚠️  RLS is disabled on calendar_events - this might be intentional';
    END IF;
END $$;

-- =============================================================================
-- 2. ENSURE TABLE EXISTS WITH PROPER SCHEMA
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    all_day BOOLEAN DEFAULT FALSE,
    event_type TEXT DEFAULT 'event',
    location_name TEXT,
    location_lat DECIMAL,
    location_lng DECIMAL,
    reminder_minutes INTEGER[],
    color TEXT DEFAULT '#3b82f6',
    is_private BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add updated_at trigger if it doesn't exist
CREATE OR REPLACE FUNCTION update_calendar_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_calendar_events_updated_at ON public.calendar_events;
CREATE TRIGGER trigger_update_calendar_events_updated_at
    BEFORE UPDATE ON public.calendar_events
    FOR EACH ROW
    EXECUTE FUNCTION update_calendar_events_updated_at();

-- =============================================================================
-- 3. CONFIGURE RLS AND PERMISSIONS FOR PAM ACCESS
-- =============================================================================

-- Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Remove any problematic existing policies
DROP POLICY IF EXISTS "Users manage own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can manage their own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Allow authenticated users to insert calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Allow user to insert own events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can view their own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can insert their own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can update their own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can delete their own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_select_policy" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_insert_policy" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_update_policy" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_delete_policy" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_select" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_insert" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_update" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_delete" ON public.calendar_events;

-- Create secure, working policies for authenticated users
CREATE POLICY "secure_calendar_select" ON public.calendar_events
    FOR SELECT
    USING (auth.uid()::uuid = user_id);

CREATE POLICY "secure_calendar_insert" ON public.calendar_events
    FOR INSERT
    WITH CHECK (auth.uid()::uuid = user_id);

CREATE POLICY "secure_calendar_update" ON public.calendar_events
    FOR UPDATE
    USING (auth.uid()::uuid = user_id)
    WITH CHECK (auth.uid()::uuid = user_id);

CREATE POLICY "secure_calendar_delete" ON public.calendar_events
    FOR DELETE
    USING (auth.uid()::uuid = user_id);

-- Service role can access all events (for PAM backend operations)
CREATE POLICY "service_role_calendar_access" ON public.calendar_events
    FOR ALL
    TO service_role
    WITH CHECK (true);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;

-- =============================================================================
-- 4. ADD PERFORMANCE INDEXES FOR CALENDAR QUERIES
-- =============================================================================

-- Index for user's upcoming events (most common PAM query)
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_upcoming
ON public.calendar_events(user_id, start_date)
WHERE start_date >= NOW();

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_calendar_events_date_range
ON public.calendar_events(start_date, end_date);

-- Index for event type filtering
CREATE INDEX IF NOT EXISTS idx_calendar_events_type_user
ON public.calendar_events(user_id, event_type);

COMMIT;

-- =============================================================================
-- 5. VERIFICATION QUERIES - Run after the fix
-- =============================================================================

-- Check table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'calendar_events'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    cmd,
    roles,
    '✅ POLICY ACTIVE' as status
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'calendar_events'
ORDER BY cmd, policyname;

-- Check permissions
SELECT
    grantee,
    privilege_type,
    '✅ PERMISSION GRANTED' as status
FROM information_schema.table_privileges
WHERE table_schema = 'public'
    AND table_name = 'calendar_events'
    AND grantee IN ('authenticated', 'service_role');

-- Check if user can access their events (test with current user)
SELECT
    auth.uid() as current_user_id,
    auth.role() as current_role,
    has_table_privilege('authenticated', 'calendar_events', 'SELECT') as can_select,
    has_table_privilege('authenticated', 'calendar_events', 'INSERT') as can_insert;

-- Test query for next week's events (example for testing)
SELECT
    COUNT(*) as events_count,
    MIN(start_date) as earliest_event,
    MAX(start_date) as latest_event
FROM calendar_events
WHERE user_id = auth.uid()
    AND start_date >= CURRENT_DATE
    AND start_date < CURRENT_DATE + INTERVAL '7 days';