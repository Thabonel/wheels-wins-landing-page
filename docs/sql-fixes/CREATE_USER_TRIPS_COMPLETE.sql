-- Safe creation of user_trips table for PAM trip editing support
-- This script ensures the table exists with proper structure, RLS, and indexes
-- Execute in Supabase SQL Editor

-- =========================================================================
-- 1. CREATE USER_TRIPS TABLE (IF NOT EXISTS)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.user_trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),
    trip_type TEXT DEFAULT 'road_trip' CHECK (trip_type IN ('road_trip', 'camping', 'rv_travel', 'business', 'vacation')),
    total_budget DECIMAL(10,2),
    spent_budget DECIMAL(10,2) DEFAULT 0,
    privacy_level TEXT DEFAULT 'private' CHECK (privacy_level IN ('private', 'friends', 'public')),

    -- CRITICAL: metadata JSONB field for storing route_data and PAM context
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =========================================================================

CREATE INDEX IF NOT EXISTS idx_user_trips_user_id ON public.user_trips(user_id);
CREATE INDEX IF NOT EXISTS idx_user_trips_status ON public.user_trips(status);
CREATE INDEX IF NOT EXISTS idx_user_trips_created_at ON public.user_trips(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_trips_updated_at ON public.user_trips(updated_at DESC);

-- Index for PAM trips (created_by: "pam_ai")
CREATE INDEX IF NOT EXISTS idx_user_trips_pam_created
ON public.user_trips USING GIN (metadata)
WHERE (metadata->>'created_by') = 'pam_ai';

-- =========================================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- =========================================================================

ALTER TABLE public.user_trips ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 4. CREATE RLS POLICIES
-- =========================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own trips" ON public.user_trips;
DROP POLICY IF EXISTS "Users can insert own trips" ON public.user_trips;
DROP POLICY IF EXISTS "Users can update own trips" ON public.user_trips;
DROP POLICY IF EXISTS "Users can delete own trips" ON public.user_trips;

-- Users can see their own trips
CREATE POLICY "Users can view own trips" ON public.user_trips
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own trips
CREATE POLICY "Users can insert own trips" ON public.user_trips
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own trips
CREATE POLICY "Users can update own trips" ON public.user_trips
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own trips
CREATE POLICY "Users can delete own trips" ON public.user_trips
    FOR DELETE USING (auth.uid() = user_id);

-- =========================================================================
-- 5. CREATE UPDATE TRIGGER FOR updated_at
-- =========================================================================

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_user_trips_updated_at ON public.user_trips;

-- Create trigger
CREATE TRIGGER update_user_trips_updated_at
    BEFORE UPDATE ON public.user_trips
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 6. VERIFY TABLE CREATION
-- =========================================================================

DO $$
DECLARE
    table_exists BOOLEAN;
    column_count INTEGER;
    rls_enabled BOOLEAN;
    policy_count INTEGER;
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'user_trips'
    ) INTO table_exists;

    -- Count columns
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_trips'
    INTO column_count;

    -- Check RLS status
    SELECT rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'user_trips'
    INTO rls_enabled;

    -- Count policies
    SELECT COUNT(*)
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'user_trips'
    INTO policy_count;

    -- Output results
    IF table_exists THEN
        RAISE NOTICE '✅ user_trips table created successfully';
        RAISE NOTICE '📊 Columns: %', column_count;

        IF rls_enabled THEN
            RAISE NOTICE '🔒 RLS enabled';
        ELSE
            RAISE WARNING '⚠️ RLS not enabled';
        END IF;

        RAISE NOTICE '🛡️ Policies: %', policy_count;
    ELSE
        RAISE WARNING '❌ user_trips table creation failed';
    END IF;
END $$;

-- =========================================================================
-- 7. VALIDATION QUERIES
-- =========================================================================

-- Count total trips
SELECT 'Total trips in user_trips table:' as info, COUNT(*) as count FROM public.user_trips;

-- Count PAM trips
SELECT 'PAM-created trips:' as info, COUNT(*) as count
FROM public.user_trips
WHERE (metadata->>'created_by') = 'pam_ai';

-- Show table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'user_trips'
ORDER BY ordinal_position;