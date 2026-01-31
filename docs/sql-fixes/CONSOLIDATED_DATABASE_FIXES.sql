-- CONSOLIDATED DATABASE FIXES - ALL IN ONE
-- Date: January 31, 2026
-- Combines: RLS Security + Calendar Fix + Performance Optimizations
-- Execute this single script in Supabase SQL Editor

-- =============================================================================
-- PART 1: RLS SECURITY FIX (CRITICAL)
-- =============================================================================

BEGIN;

-- Fix affiliate_product_clicks
DROP POLICY IF EXISTS "Anyone can insert clicks" ON affiliate_product_clicks;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON affiliate_product_clicks;
DROP POLICY IF EXISTS "Users can insert affiliate clicks" ON affiliate_product_clicks;

CREATE POLICY "secure_affiliate_clicks_insert" ON affiliate_product_clicks
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'affiliate_product_clicks' AND column_name = 'user_id' AND table_schema = 'public'
    ) THEN
        DROP POLICY IF EXISTS "Users can read own clicks" ON affiliate_product_clicks;
        CREATE POLICY "secure_affiliate_clicks_select" ON affiliate_product_clicks
            FOR SELECT TO authenticated USING (user_id = auth.uid());
    END IF;
END $$;

-- Fix product_issue_reports
DROP POLICY IF EXISTS "allow_insert_reports" ON product_issue_reports;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON product_issue_reports;
DROP POLICY IF EXISTS "Users can submit reports" ON product_issue_reports;

CREATE POLICY "secure_issue_reports_insert" ON product_issue_reports
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND (
            NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'product_issue_reports' AND column_name = 'user_id' AND table_schema = 'public'
            ) OR user_id = auth.uid()
        )
    );

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'product_issue_reports' AND column_name = 'user_id' AND table_schema = 'public'
    ) THEN
        DROP POLICY IF EXISTS "Users can read own reports" ON product_issue_reports;
        CREATE POLICY "secure_issue_reports_select" ON product_issue_reports
            FOR SELECT TO authenticated USING (user_id = auth.uid());
    END IF;
END $$;

-- Fix trip_locations
DROP POLICY IF EXISTS "Allow service role locations" ON trip_locations;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON trip_locations;
DROP POLICY IF EXISTS "Users can insert locations" ON trip_locations;

CREATE POLICY "secure_trip_locations_service" ON trip_locations
    FOR ALL TO service_role WITH CHECK (true);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'trip_locations' AND column_name = 'user_id' AND table_schema = 'public'
    ) THEN
        CREATE POLICY "secure_trip_locations_user_insert" ON trip_locations
            FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
        CREATE POLICY "secure_trip_locations_user_select" ON trip_locations
            FOR SELECT TO authenticated USING (user_id = auth.uid());
        CREATE POLICY "secure_trip_locations_user_update" ON trip_locations
            FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
        CREATE POLICY "secure_trip_locations_user_delete" ON trip_locations
            FOR DELETE TO authenticated USING (user_id = auth.uid());
    ELSE
        CREATE POLICY "secure_trip_locations_readonly" ON trip_locations
            FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

-- Enable RLS on all affected tables
ALTER TABLE affiliate_product_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_issue_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_locations ENABLE ROW LEVEL SECURITY;

COMMIT;

-- =============================================================================
-- PART 2: CALENDAR FIX FOR PAM
-- =============================================================================

BEGIN;

-- Ensure calendar_events table exists
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

-- Add updated_at trigger
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
    FOR EACH ROW EXECUTE FUNCTION update_calendar_events_updated_at();

-- Configure RLS for calendar
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Remove existing policies
DROP POLICY IF EXISTS "Users manage own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can manage their own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_select" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_insert" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_update" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_delete" ON public.calendar_events;

-- Create secure policies
CREATE POLICY "secure_calendar_select" ON public.calendar_events
    FOR SELECT USING (auth.uid()::uuid = user_id);
CREATE POLICY "secure_calendar_insert" ON public.calendar_events
    FOR INSERT WITH CHECK (auth.uid()::uuid = user_id);
CREATE POLICY "secure_calendar_update" ON public.calendar_events
    FOR UPDATE USING (auth.uid()::uuid = user_id) WITH CHECK (auth.uid()::uuid = user_id);
CREATE POLICY "secure_calendar_delete" ON public.calendar_events
    FOR DELETE USING (auth.uid()::uuid = user_id);
CREATE POLICY "service_role_calendar_access" ON public.calendar_events
    FOR ALL TO service_role WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;

COMMIT;

-- =============================================================================
-- PART 3: PERFORMANCE OPTIMIZATIONS
-- =============================================================================

BEGIN;

-- Remove duplicate indexes
DROP INDEX IF EXISTS idx_fuel_logs_vehicle_id;
DROP INDEX IF EXISTS post_shares_post_id_index;
DROP INDEX IF EXISTS posts_user_id_index;
DROP INDEX IF EXISTS idx_posts_created_at;
DROP INDEX IF EXISTS idx_posts_visibility;
DROP INDEX IF EXISTS idx_posts_post_type;
DROP INDEX IF EXISTS idx_community_posts_category_created;
DROP INDEX IF EXISTS idx_posts_user_id_created_at;
DROP INDEX IF EXISTS idx_posts_metadata;

-- Add high-performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_user_id_active
ON profiles(user_id) WHERE active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_user_date_desc
ON expenses(user_id, date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_recent
ON expenses(user_id, date DESC) WHERE date >= CURRENT_DATE - INTERVAL '30 days';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_budgets_user_period
ON budgets(user_id, period_start, period_end);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_budgets
ON budgets(user_id, category) WHERE is_active = true AND period_end >= CURRENT_DATE;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pam_conversations_user_active
ON pam_conversations(user_id, created_at DESC) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calendar_events_user_upcoming
ON public.calendar_events(user_id, start_date) WHERE start_date >= NOW();

-- Auth performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auth_users_email_domain
ON auth.users(email) WHERE email LIKE '%@wheelsandwins.%';

-- Update statistics
ANALYZE profiles;
ANALYZE expenses;
ANALYZE budgets;
ANALYZE pam_conversations;
ANALYZE calendar_events;

COMMIT;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Check RLS security fixes
SELECT
    tablename, policyname, cmd,
    CASE WHEN with_check = 'true' THEN '🚨 STILL INSECURE' ELSE '✅ SECURE' END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('affiliate_product_clicks', 'product_issue_reports', 'trip_locations')
ORDER BY tablename, cmd;

-- Check calendar access
SELECT
    tablename, policyname, cmd, '✅ CALENDAR POLICY' as status
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'calendar_events'
ORDER BY cmd;

-- Check performance indexes
SELECT
    schemaname, tablename, indexname, '✅ PERFORMANCE INDEX' as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE '%_user_%'
  AND indexname LIKE '%_desc%';

-- Test calendar access
SELECT COUNT(*) as calendar_events_accessible FROM calendar_events WHERE user_id = auth.uid();