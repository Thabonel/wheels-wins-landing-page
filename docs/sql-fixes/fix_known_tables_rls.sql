-- Fix RLS Performance for Known Tables
-- Based on DATABASE_SCHEMA_REFERENCE.md
-- Run each section separately in Supabase SQL Editor

-- ============================================================================
-- PROFILES TABLE (uses 'id' not 'user_id')
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

-- ============================================================================
-- CALENDAR_EVENTS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own events" ON public.calendar_events;
CREATE POLICY "Users can view their own events"
ON public.calendar_events FOR SELECT
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own events" ON public.calendar_events;
CREATE POLICY "Users can insert their own events"
ON public.calendar_events FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own events" ON public.calendar_events;
CREATE POLICY "Users can update their own events"
ON public.calendar_events FOR UPDATE
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own events" ON public.calendar_events;
CREATE POLICY "Users can delete their own events"
ON public.calendar_events FOR DELETE
USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- EXPENSES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own expenses" ON public.expenses;
CREATE POLICY "Users can view their own expenses"
ON public.expenses FOR SELECT
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own expenses" ON public.expenses;
CREATE POLICY "Users can insert their own expenses"
ON public.expenses FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own expenses" ON public.expenses;
CREATE POLICY "Users can update their own expenses"
ON public.expenses FOR UPDATE
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own expenses" ON public.expenses;
CREATE POLICY "Users can delete their own expenses"
ON public.expenses FOR DELETE
USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- BUDGETS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own budgets" ON public.budgets;
CREATE POLICY "Users can view their own budgets"
ON public.budgets FOR SELECT
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own budgets" ON public.budgets;
CREATE POLICY "Users can insert their own budgets"
ON public.budgets FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own budgets" ON public.budgets;
CREATE POLICY "Users can update their own budgets"
ON public.budgets FOR UPDATE
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own budgets" ON public.budgets;
CREATE POLICY "Users can delete their own budgets"
ON public.budgets FOR DELETE
USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- TRIPS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own trips" ON public.trips;
CREATE POLICY "Users can view their own trips"
ON public.trips FOR SELECT
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own trips" ON public.trips;
CREATE POLICY "Users can insert their own trips"
ON public.trips FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own trips" ON public.trips;
CREATE POLICY "Users can update their own trips"
ON public.trips FOR UPDATE
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own trips" ON public.trips;
CREATE POLICY "Users can delete their own trips"
ON public.trips FOR DELETE
USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- FUEL_LOG TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own fuel logs" ON public.fuel_log;
CREATE POLICY "Users can view their own fuel logs"
ON public.fuel_log FOR SELECT
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own fuel logs" ON public.fuel_log;
CREATE POLICY "Users can insert their own fuel logs"
ON public.fuel_log FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own fuel logs" ON public.fuel_log;
CREATE POLICY "Users can update their own fuel logs"
ON public.fuel_log FOR UPDATE
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own fuel logs" ON public.fuel_log;
CREATE POLICY "Users can delete their own fuel logs"
ON public.fuel_log FOR DELETE
USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- MAINTENANCE_RECORDS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own maintenance" ON public.maintenance_records;
CREATE POLICY "Users can view their own maintenance"
ON public.maintenance_records FOR SELECT
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own maintenance" ON public.maintenance_records;
CREATE POLICY "Users can insert their own maintenance"
ON public.maintenance_records FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own maintenance" ON public.maintenance_records;
CREATE POLICY "Users can update their own maintenance"
ON public.maintenance_records FOR UPDATE
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own maintenance" ON public.maintenance_records;
CREATE POLICY "Users can delete their own maintenance"
ON public.maintenance_records FOR DELETE
USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- PAM_CONVERSATIONS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.pam_conversations;
CREATE POLICY "Users can view their own conversations"
ON public.pam_conversations FOR SELECT
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own conversations" ON public.pam_conversations;
CREATE POLICY "Users can insert their own conversations"
ON public.pam_conversations FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own conversations" ON public.pam_conversations;
CREATE POLICY "Users can update their own conversations"
ON public.pam_conversations FOR UPDATE
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own conversations" ON public.pam_conversations;
CREATE POLICY "Users can delete their own conversations"
ON public.pam_conversations FOR DELETE
USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- PAM_SAVINGS_EVENTS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own savings" ON public.pam_savings_events;
CREATE POLICY "Users can view their own savings"
ON public.pam_savings_events FOR SELECT
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own savings" ON public.pam_savings_events;
CREATE POLICY "Users can insert their own savings"
ON public.pam_savings_events FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================================================
-- POSTS TABLE (public read, own write)
-- ============================================================================
DROP POLICY IF EXISTS "Users can insert their own posts" ON public.posts;
CREATE POLICY "Users can insert their own posts"
ON public.posts FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
CREATE POLICY "Users can update their own posts"
ON public.posts FOR UPDATE
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
CREATE POLICY "Users can delete their own posts"
ON public.posts FOR DELETE
USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- COMMENTS TABLE (public read, own write)
-- ============================================================================
DROP POLICY IF EXISTS "Users can insert their own comments" ON public.comments;
CREATE POLICY "Users can insert their own comments"
ON public.comments FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
CREATE POLICY "Users can update their own comments"
ON public.comments FOR UPDATE
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;
CREATE POLICY "Users can delete their own comments"
ON public.comments FOR DELETE
USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- LIKES TABLE (public read, own write)
-- ============================================================================
DROP POLICY IF EXISTS "Users can insert their own likes" ON public.likes;
CREATE POLICY "Users can insert their own likes"
ON public.likes FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own likes" ON public.likes;
CREATE POLICY "Users can delete their own likes"
ON public.likes FOR DELETE
USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- STORAGE_ITEMS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own storage items" ON public.storage_items;
CREATE POLICY "Users can view their own storage items"
ON public.storage_items FOR SELECT
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own storage items" ON public.storage_items;
CREATE POLICY "Users can insert their own storage items"
ON public.storage_items FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own storage items" ON public.storage_items;
CREATE POLICY "Users can update their own storage items"
ON public.storage_items FOR UPDATE
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own storage items" ON public.storage_items;
CREATE POLICY "Users can delete their own storage items"
ON public.storage_items FOR DELETE
USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- STORAGE_CATEGORIES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own categories" ON public.storage_categories;
CREATE POLICY "Users can view their own categories"
ON public.storage_categories FOR SELECT
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own categories" ON public.storage_categories;
CREATE POLICY "Users can insert their own categories"
ON public.storage_categories FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own categories" ON public.storage_categories;
CREATE POLICY "Users can update their own categories"
ON public.storage_categories FOR UPDATE
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own categories" ON public.storage_categories;
CREATE POLICY "Users can delete their own categories"
ON public.storage_categories FOR DELETE
USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- STORAGE_LOCATIONS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own locations" ON public.storage_locations;
CREATE POLICY "Users can view their own locations"
ON public.storage_locations FOR SELECT
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own locations" ON public.storage_locations;
CREATE POLICY "Users can insert their own locations"
ON public.storage_locations FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own locations" ON public.storage_locations;
CREATE POLICY "Users can update their own locations"
ON public.storage_locations FOR UPDATE
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own locations" ON public.storage_locations;
CREATE POLICY "Users can delete their own locations"
ON public.storage_locations FOR DELETE
USING (user_id = (SELECT auth.uid()));
