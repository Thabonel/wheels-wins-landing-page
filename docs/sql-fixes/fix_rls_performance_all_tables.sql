-- Fix RLS Performance: Replace auth.uid() with (SELECT auth.uid())
-- This migration optimizes all RLS policies to evaluate auth functions once per query instead of per row
-- IMPACT: Dramatic performance improvement for tables with many rows
-- Run this in Supabase SQL Editor

BEGIN;

-- ============================================================================
-- STEP 1: Drop existing policies (we'll recreate them with optimization)
-- ============================================================================

-- User Hustle Attempts
DROP POLICY IF EXISTS "Users can view their own hustle attempts" ON public.user_hustle_attempts;
DROP POLICY IF EXISTS "Users can insert their own hustle attempts" ON public.user_hustle_attempts;
DROP POLICY IF EXISTS "Users can update their own hustle attempts" ON public.user_hustle_attempts;
DROP POLICY IF EXISTS "Users can delete their own hustle attempts" ON public.user_hustle_attempts;

-- Profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Calendar Events
DROP POLICY IF EXISTS "Users can view their own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can insert their own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can update their own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can delete their own calendar events" ON public.calendar_events;

-- Expenses
DROP POLICY IF EXISTS "Users can view their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can insert their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete their own expenses" ON public.expenses;

-- Budgets
DROP POLICY IF EXISTS "Users can view their own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can insert their own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can update their own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can delete their own budgets" ON public.budgets;

-- Trips
DROP POLICY IF EXISTS "Users can view their own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can insert their own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can update their own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can delete their own trips" ON public.trips;

-- Fuel Log
DROP POLICY IF EXISTS "Users can view their own fuel logs" ON public.fuel_log;
DROP POLICY IF EXISTS "Users can insert their own fuel logs" ON public.fuel_log;
DROP POLICY IF EXISTS "Users can update their own fuel logs" ON public.fuel_log;
DROP POLICY IF EXISTS "Users can delete their own fuel logs" ON public.fuel_log;

-- Maintenance Records
DROP POLICY IF EXISTS "Users can view their own maintenance records" ON public.maintenance_records;
DROP POLICY IF EXISTS "Users can insert their own maintenance records" ON public.maintenance_records;
DROP POLICY IF EXISTS "Users can update their own maintenance records" ON public.maintenance_records;
DROP POLICY IF EXISTS "Users can delete their own maintenance records" ON public.maintenance_records;

-- PAM Conversations
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.pam_conversations;
DROP POLICY IF EXISTS "Users can insert their own conversations" ON public.pam_conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON public.pam_conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON public.pam_conversations;

-- PAM Messages
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.pam_messages;
DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON public.pam_messages;

-- PAM Savings Events
DROP POLICY IF EXISTS "Users can view their own savings events" ON public.pam_savings_events;
DROP POLICY IF EXISTS "Users can insert their own savings events" ON public.pam_savings_events;

-- Posts
DROP POLICY IF EXISTS "Users can view all posts" ON public.posts;
DROP POLICY IF EXISTS "Users can insert their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;

-- Comments
DROP POLICY IF EXISTS "Users can view all comments" ON public.comments;
DROP POLICY IF EXISTS "Users can insert their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;

-- Likes
DROP POLICY IF EXISTS "Users can view all likes" ON public.likes;
DROP POLICY IF EXISTS "Users can insert their own likes" ON public.likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON public.likes;

-- Storage Items
DROP POLICY IF EXISTS "Users can view their own storage items" ON public.storage_items;
DROP POLICY IF EXISTS "Users can insert their own storage items" ON public.storage_items;
DROP POLICY IF EXISTS "Users can update their own storage items" ON public.storage_items;
DROP POLICY IF EXISTS "Users can delete their own storage items" ON public.storage_items;

-- Storage Categories
DROP POLICY IF EXISTS "Users can view their own storage categories" ON public.storage_categories;
DROP POLICY IF EXISTS "Users can insert their own storage categories" ON public.storage_categories;
DROP POLICY IF EXISTS "Users can update their own storage categories" ON public.storage_categories;
DROP POLICY IF EXISTS "Users can delete their own storage categories" ON public.storage_categories;

-- Storage Locations
DROP POLICY IF EXISTS "Users can view their own storage locations" ON public.storage_locations;
DROP POLICY IF EXISTS "Users can insert their own storage locations" ON public.storage_locations;
DROP POLICY IF EXISTS "Users can update their own storage locations" ON public.storage_locations;
DROP POLICY IF EXISTS "Users can delete their own storage locations" ON public.storage_locations;

-- ============================================================================
-- STEP 2: Recreate policies with (SELECT auth.uid()) optimization
-- ============================================================================

-- User Hustle Attempts (OPTIMIZED)
CREATE POLICY "Users can view their own hustle attempts"
ON public.user_hustle_attempts
FOR SELECT
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own hustle attempts"
ON public.user_hustle_attempts
FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own hustle attempts"
ON public.user_hustle_attempts
FOR UPDATE
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own hustle attempts"
ON public.user_hustle_attempts
FOR DELETE
USING (user_id = (SELECT auth.uid()));

-- Profiles (OPTIMIZED)
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

-- Calendar Events (OPTIMIZED)
CREATE POLICY "Users can view their own calendar events"
ON public.calendar_events
FOR SELECT
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own calendar events"
ON public.calendar_events
FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own calendar events"
ON public.calendar_events
FOR UPDATE
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own calendar events"
ON public.calendar_events
FOR DELETE
USING (user_id = (SELECT auth.uid()));

-- Expenses (OPTIMIZED)
CREATE POLICY "Users can view their own expenses"
ON public.expenses
FOR SELECT
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own expenses"
ON public.expenses
FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own expenses"
ON public.expenses
FOR UPDATE
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own expenses"
ON public.expenses
FOR DELETE
USING (user_id = (SELECT auth.uid()));

-- Budgets (OPTIMIZED)
CREATE POLICY "Users can view their own budgets"
ON public.budgets
FOR SELECT
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own budgets"
ON public.budgets
FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own budgets"
ON public.budgets
FOR UPDATE
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own budgets"
ON public.budgets
FOR DELETE
USING (user_id = (SELECT auth.uid()));

-- Trips (OPTIMIZED)
CREATE POLICY "Users can view their own trips"
ON public.trips
FOR SELECT
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own trips"
ON public.trips
FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own trips"
ON public.trips
FOR UPDATE
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own trips"
ON public.trips
FOR DELETE
USING (user_id = (SELECT auth.uid()));

-- Fuel Log (OPTIMIZED)
CREATE POLICY "Users can view their own fuel logs"
ON public.fuel_log
FOR SELECT
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own fuel logs"
ON public.fuel_log
FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own fuel logs"
ON public.fuel_log
FOR UPDATE
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own fuel logs"
ON public.fuel_log
FOR DELETE
USING (user_id = (SELECT auth.uid()));

-- Maintenance Records (OPTIMIZED)
CREATE POLICY "Users can view their own maintenance records"
ON public.maintenance_records
FOR SELECT
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own maintenance records"
ON public.maintenance_records
FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own maintenance records"
ON public.maintenance_records
FOR UPDATE
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own maintenance records"
ON public.maintenance_records
FOR DELETE
USING (user_id = (SELECT auth.uid()));

-- PAM Conversations (OPTIMIZED)
CREATE POLICY "Users can view their own conversations"
ON public.pam_conversations
FOR SELECT
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own conversations"
ON public.pam_conversations
FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own conversations"
ON public.pam_conversations
FOR UPDATE
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own conversations"
ON public.pam_conversations
FOR DELETE
USING (user_id = (SELECT auth.uid()));

-- PAM Messages (OPTIMIZED)
CREATE POLICY "Users can view messages in their conversations"
ON public.pam_messages
FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM public.pam_conversations
    WHERE user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Users can insert messages in their conversations"
ON public.pam_messages
FOR INSERT
WITH CHECK (
  conversation_id IN (
    SELECT id FROM public.pam_conversations
    WHERE user_id = (SELECT auth.uid())
  )
);

-- PAM Savings Events (OPTIMIZED)
CREATE POLICY "Users can view their own savings events"
ON public.pam_savings_events
FOR SELECT
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own savings events"
ON public.pam_savings_events
FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

-- Posts (OPTIMIZED - Public read, own write)
CREATE POLICY "Users can view all posts"
ON public.posts
FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own posts"
ON public.posts
FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own posts"
ON public.posts
FOR UPDATE
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own posts"
ON public.posts
FOR DELETE
USING (user_id = (SELECT auth.uid()));

-- Comments (OPTIMIZED - Public read, own write)
CREATE POLICY "Users can view all comments"
ON public.comments
FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own comments"
ON public.comments
FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own comments"
ON public.comments
FOR UPDATE
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own comments"
ON public.comments
FOR DELETE
USING (user_id = (SELECT auth.uid()));

-- Likes (OPTIMIZED - Public read, own write)
CREATE POLICY "Users can view all likes"
ON public.likes
FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own likes"
ON public.likes
FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own likes"
ON public.likes
FOR DELETE
USING (user_id = (SELECT auth.uid()));

-- Storage Items (OPTIMIZED)
CREATE POLICY "Users can view their own storage items"
ON public.storage_items
FOR SELECT
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own storage items"
ON public.storage_items
FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own storage items"
ON public.storage_items
FOR UPDATE
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own storage items"
ON public.storage_items
FOR DELETE
USING (user_id = (SELECT auth.uid()));

-- Storage Categories (OPTIMIZED)
CREATE POLICY "Users can view their own storage categories"
ON public.storage_categories
FOR SELECT
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own storage categories"
ON public.storage_categories
FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own storage categories"
ON public.storage_categories
FOR UPDATE
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own storage categories"
ON public.storage_categories
FOR DELETE
USING (user_id = (SELECT auth.uid()));

-- Storage Locations (OPTIMIZED)
CREATE POLICY "Users can view their own storage locations"
ON public.storage_locations
FOR SELECT
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own storage locations"
ON public.storage_locations
FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own storage locations"
ON public.storage_locations
FOR UPDATE
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own storage locations"
ON public.storage_locations
FOR DELETE
USING (user_id = (SELECT auth.uid()));

COMMIT;

-- ============================================================================
-- Verification Query
-- ============================================================================

-- Run this after migration to verify all policies are optimized
SELECT
    schemaname,
    tablename,
    policyname,
    CASE
        WHEN definition LIKE '%(SELECT auth.%' THEN '✅ OPTIMIZED'
        WHEN definition LIKE '%auth.%' THEN '❌ NEEDS FIX'
        ELSE '⚠️ NO AUTH FUNCTION'
    END as status,
    definition
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY
    CASE
        WHEN definition LIKE '%(SELECT auth.%' THEN 2
        WHEN definition LIKE '%auth.%' THEN 1
        ELSE 3
    END,
    tablename,
    policyname;
