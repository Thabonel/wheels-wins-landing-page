-- Phase 1: Database Fixes
-- Run this in Supabase SQL Editor
-- Created: December 8, 2025

-- ============================================
-- STEP 1: Check current state (run first to see baseline)
-- ============================================

-- Check if user_locations table exists and has RLS enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'user_locations';

-- Check existing policies on user_locations
SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'user_locations';

-- Check current search_path
SHOW search_path;

-- Check if storage schema tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'storage';

-- ============================================
-- STEP 2: Fix user_locations RLS policies
-- ============================================

-- Enable RLS if not already enabled
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if any) to recreate correctly
DROP POLICY IF EXISTS "Users can view own locations" ON user_locations;
DROP POLICY IF EXISTS "Users can insert own locations" ON user_locations;
DROP POLICY IF EXISTS "Users can update own locations" ON user_locations;
DROP POLICY IF EXISTS "Users can delete own locations" ON user_locations;

-- SELECT policy (uses USING)
CREATE POLICY "Users can view own locations"
ON user_locations FOR SELECT TO authenticated
USING ((select auth.uid()) = user_id);

-- INSERT policy (CRITICAL: uses WITH CHECK, not USING)
CREATE POLICY "Users can insert own locations"
ON user_locations FOR INSERT TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

-- UPDATE policy (uses both USING and WITH CHECK)
CREATE POLICY "Users can update own locations"
ON user_locations FOR UPDATE TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- DELETE policy (uses USING)
CREATE POLICY "Users can delete own locations"
ON user_locations FOR DELETE TO authenticated
USING ((select auth.uid()) = user_id);

-- ============================================
-- STEP 3: Fix storage search_path (if needed)
-- ============================================

-- Check if storage is in search_path
-- If this returns empty or missing 'storage', run the ALTER below
SELECT * FROM information_schema.tables WHERE table_schema = 'storage';

-- If storage tables are missing from search_path, uncomment and run:
-- ALTER DATABASE postgres SET search_path TO public, storage, extensions;

-- ============================================
-- STEP 4: Add performance indexes
-- ============================================

-- Index on user_locations for faster user queries
CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON user_locations(user_id);

-- Index on profiles for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);

-- Index on expenses for budget queries
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- Index on calendar_events for quick retrieval
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_date ON calendar_events(start_date);

-- Index on pam_conversations for chat history
CREATE INDEX IF NOT EXISTS idx_pam_conversations_user_id ON pam_conversations(user_id);

-- Index on pam_messages for message retrieval
CREATE INDEX IF NOT EXISTS idx_pam_messages_conversation_id ON pam_messages(conversation_id);

-- ============================================
-- STEP 5: Verify fixes
-- ============================================

-- Verify RLS policies were created correctly
SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'user_locations';

-- Verify indexes exist
SELECT indexname, tablename FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename;
