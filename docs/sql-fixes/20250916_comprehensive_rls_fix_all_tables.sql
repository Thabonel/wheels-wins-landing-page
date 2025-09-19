-- Comprehensive RLS Fix for All Failing Tables
-- Fixes permission denied errors for authenticated users
-- Date: 2025-09-16
-- Target: All tables showing 403/42501 errors in console logs

-- =============================================================================
-- MEDICAL TABLES
-- =============================================================================

-- Fix medical_medications table
DROP POLICY IF EXISTS "Users can view own medications" ON public.medical_medications;
DROP POLICY IF EXISTS "Users can insert own medications" ON public.medical_medications;
DROP POLICY IF EXISTS "Users can update own medications" ON public.medical_medications;
DROP POLICY IF EXISTS "Users can delete own medications" ON public.medical_medications;

CREATE POLICY "Users can view own medications" ON public.medical_medications
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own medications" ON public.medical_medications
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own medications" ON public.medical_medications
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own medications" ON public.medical_medications
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- Fix medical_emergency_info table
DROP POLICY IF EXISTS "Users can view own emergency info" ON public.medical_emergency_info;
DROP POLICY IF EXISTS "Users can insert own emergency info" ON public.medical_emergency_info;
DROP POLICY IF EXISTS "Users can update own emergency info" ON public.medical_emergency_info;
DROP POLICY IF EXISTS "Users can delete own emergency info" ON public.medical_emergency_info;

CREATE POLICY "Users can view own emergency info" ON public.medical_emergency_info
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own emergency info" ON public.medical_emergency_info
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own emergency info" ON public.medical_emergency_info
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own emergency info" ON public.medical_emergency_info
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- Fix medical_records table
DROP POLICY IF EXISTS "Users can view own medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Users can insert own medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Users can update own medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Users can delete own medical records" ON public.medical_records;

CREATE POLICY "Users can view own medical records" ON public.medical_records
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own medical records" ON public.medical_records
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own medical records" ON public.medical_records
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own medical records" ON public.medical_records
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- =============================================================================
-- TRIPS AND TRAVEL TABLES
-- =============================================================================

-- Fix user_trips table
DROP POLICY IF EXISTS "Users can view own trips" ON public.user_trips;
DROP POLICY IF EXISTS "Users can insert own trips" ON public.user_trips;
DROP POLICY IF EXISTS "Users can update own trips" ON public.user_trips;
DROP POLICY IF EXISTS "Users can delete own trips" ON public.user_trips;

CREATE POLICY "Users can view own trips" ON public.user_trips
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trips" ON public.user_trips
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trips" ON public.user_trips
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own trips" ON public.user_trips
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- Fix trip_template_ratings table
DROP POLICY IF EXISTS "Users can view own ratings" ON public.trip_template_ratings;
DROP POLICY IF EXISTS "Users can insert own ratings" ON public.trip_template_ratings;
DROP POLICY IF EXISTS "Users can update own ratings" ON public.trip_template_ratings;
DROP POLICY IF EXISTS "Users can delete own ratings" ON public.trip_template_ratings;

CREATE POLICY "Users can view own ratings" ON public.trip_template_ratings
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ratings" ON public.trip_template_ratings
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ratings" ON public.trip_template_ratings
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ratings" ON public.trip_template_ratings
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- =============================================================================
-- STORAGE TABLES
-- =============================================================================

-- Fix storage_categories table
DROP POLICY IF EXISTS "Users can view own storage categories" ON public.storage_categories;
DROP POLICY IF EXISTS "Users can insert own storage categories" ON public.storage_categories;
DROP POLICY IF EXISTS "Users can update own storage categories" ON public.storage_categories;
DROP POLICY IF EXISTS "Users can delete own storage categories" ON public.storage_categories;

CREATE POLICY "Users can view own storage categories" ON public.storage_categories
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own storage categories" ON public.storage_categories
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own storage categories" ON public.storage_categories
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own storage categories" ON public.storage_categories
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- Fix storage_locations table
DROP POLICY IF EXISTS "Users can view own storage locations" ON public.storage_locations;
DROP POLICY IF EXISTS "Users can insert own storage locations" ON public.storage_locations;
DROP POLICY IF EXISTS "Users can update own storage locations" ON public.storage_locations;
DROP POLICY IF EXISTS "Users can delete own storage locations" ON public.storage_locations;

CREATE POLICY "Users can view own storage locations" ON public.storage_locations
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own storage locations" ON public.storage_locations
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own storage locations" ON public.storage_locations
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own storage locations" ON public.storage_locations
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- Fix storage_items table
DROP POLICY IF EXISTS "Users can view own storage items" ON public.storage_items;
DROP POLICY IF EXISTS "Users can insert own storage items" ON public.storage_items;
DROP POLICY IF EXISTS "Users can update own storage items" ON public.storage_items;
DROP POLICY IF EXISTS "Users can delete own storage items" ON public.storage_items;

CREATE POLICY "Users can view own storage items" ON public.storage_items
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own storage items" ON public.storage_items
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own storage items" ON public.storage_items
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own storage items" ON public.storage_items
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- =============================================================================
-- ENSURE RLS IS ENABLED ON ALL TABLES
-- =============================================================================

ALTER TABLE public.medical_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_emergency_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_template_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_items ENABLE ROW LEVEL SECURITY;

-- Force RLS for enhanced security
ALTER TABLE public.medical_medications FORCE ROW LEVEL SECURITY;
ALTER TABLE public.medical_emergency_info FORCE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_trips FORCE ROW LEVEL SECURITY;
ALTER TABLE public.trip_template_ratings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.storage_categories FORCE ROW LEVEL SECURITY;
ALTER TABLE public.storage_locations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.storage_items FORCE ROW LEVEL SECURITY;

-- =============================================================================
-- GRANT NECESSARY PERMISSIONS
-- =============================================================================

GRANT ALL ON public.medical_medications TO authenticated;
GRANT ALL ON public.medical_emergency_info TO authenticated;
GRANT ALL ON public.medical_records TO authenticated;
GRANT ALL ON public.user_trips TO authenticated;
GRANT ALL ON public.trip_template_ratings TO authenticated;
GRANT ALL ON public.storage_categories TO authenticated;
GRANT ALL ON public.storage_locations TO authenticated;
GRANT ALL ON public.storage_items TO authenticated;

-- =============================================================================
-- SPECIAL HANDLING FOR PROFILES TABLE (400 Bad Request fix)
-- =============================================================================

-- Fix profiles table that's showing 400 Bad Request
-- This suggests table structure mismatch
DROP POLICY IF EXISTS "Users can view any profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Allow authenticated users to view any profile (public data)
CREATE POLICY "Users can view any profile" ON public.profiles
    FOR SELECT TO authenticated
    USING (true);

-- Users can only modify their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
GRANT ALL ON public.profiles TO authenticated;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- These queries can be run to verify the policies are working
-- SELECT * FROM pg_policies WHERE tablename IN (
--   'medical_medications', 'medical_emergency_info', 'medical_records',
--   'user_trips', 'trip_template_ratings', 'storage_categories',
--   'storage_locations', 'storage_items', 'profiles'
-- );

-- Test authentication context
-- SELECT auth.uid(), auth.role();