-- FIX_TRIPS_TABLE.sql
-- Fix for "Failed to load saved trips" error
-- This ensures the trips table has proper RLS policies and GRANT permissions
-- Run this in Supabase SQL Editor

-- Step 1: Ensure RLS is enabled
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop any conflicting policies
DROP POLICY IF EXISTS "Users can manage own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can view own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can insert own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can update own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can delete own trips" ON public.trips;
DROP POLICY IF EXISTS "trips_manage_own" ON public.trips;
DROP POLICY IF EXISTS "trips_select_own" ON public.trips;

-- Step 3: Create simple, working RLS policies
-- Policy for authenticated users to manage their own trips
CREATE POLICY "trips_select_own" ON public.trips
    FOR SELECT
    USING (auth.uid()::text = user_id::text);

CREATE POLICY "trips_insert_own" ON public.trips
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "trips_update_own" ON public.trips
    FOR UPDATE
    USING (auth.uid()::text = user_id::text)
    WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "trips_delete_own" ON public.trips
    FOR DELETE
    USING (auth.uid()::text = user_id::text);

-- Policy for viewing public trips
CREATE POLICY "trips_view_public" ON public.trips
    FOR SELECT
    USING (is_public = true);

-- Step 4: Ensure GRANT permissions for all roles
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trips TO authenticated;
GRANT SELECT ON public.trips TO anon;

-- Step 5: If admin role exists, grant permissions to it too
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin') THEN
        GRANT USAGE ON SCHEMA public TO admin;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.trips TO admin;
        RAISE NOTICE 'Granted trips permissions to admin role';
    END IF;
END $$;

-- Verify the fix
SELECT
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'trips' AND schemaname = 'public'
ORDER BY policyname;
