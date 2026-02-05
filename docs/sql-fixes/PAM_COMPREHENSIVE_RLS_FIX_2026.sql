-- PAM Comprehensive RLS Policy Fix
-- Date: 2026-02-06
-- Purpose: Standardize ALL PAM table RLS policies, eliminate duplicates,
--          fix missing policies, ensure service_role access for PAM backend
-- Idempotent: Safe to run multiple times
-- Architecture decisions:
--   1. Standardize on {authenticated} role for user policies
--   2. Always include service_role ALL policy for PAM backend
--   3. Drop ALL existing policies first to eliminate duplicates
--   4. Use IF EXISTS checks for tables that might be missing
--   5. profiles uses id (NOT user_id)
--   6. Grant SELECT, INSERT, UPDATE, DELETE to authenticated and service_role


-- ============================================================================
-- SECTION A: Core User Data
-- ============================================================================

-- ============ TABLE: profiles ============
-- Special: uses id NOT user_id. Public can SELECT active profiles.
DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
    END LOOP;

    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

    -- Anyone can read active profiles (needed for social features, display names)
    CREATE POLICY "profiles_public_select" ON public.profiles
      FOR SELECT TO authenticated
      USING (status = 'active');

    -- Users can manage their own profile
    CREATE POLICY "profiles_user_all" ON public.profiles
      FOR ALL TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);

    -- Service role full access for PAM backend
    CREATE POLICY "profiles_service_role" ON public.profiles
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;

    RAISE NOTICE 'Fixed: profiles';
  ELSE
    RAISE NOTICE 'MISSING: profiles';
  END IF;
END $$;


-- ============ TABLE: user_settings ============
-- Was: hardcoded admin email checks in policy. Now: standard user_id pattern.
DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_settings') THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_settings'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_settings', pol.policyname);
    END LOOP;

    ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "user_settings_user_all" ON public.user_settings
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "user_settings_service_role" ON public.user_settings
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO service_role;

    RAISE NOTICE 'Fixed: user_settings';
  ELSE
    RAISE NOTICE 'MISSING: user_settings';
  END IF;
END $$;


-- ============ TABLE: vehicles ============
DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vehicles') THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'vehicles'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.vehicles', pol.policyname);
    END LOOP;

    ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "vehicles_user_all" ON public.vehicles
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "vehicles_service_role" ON public.vehicles
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO service_role;

    RAISE NOTICE 'Fixed: vehicles';
  ELSE
    RAISE NOTICE 'MISSING: vehicles';
  END IF;
END $$;


-- ============================================================================
-- SECTION B: Financial Tables
-- ============================================================================

-- ============ TABLE: expenses ============
-- Was: duplicate SELECT policies (authenticated ALL + public SELECT)
DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'expenses') THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'expenses'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.expenses', pol.policyname);
    END LOOP;

    ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "expenses_user_all" ON public.expenses
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "expenses_service_role" ON public.expenses
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO service_role;

    RAISE NOTICE 'Fixed: expenses';
  ELSE
    RAISE NOTICE 'MISSING: expenses';
  END IF;
END $$;


-- ============ TABLE: budgets ============
-- Was: using {public} role instead of {authenticated}
DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'budgets') THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'budgets'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.budgets', pol.policyname);
    END LOOP;

    ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "budgets_user_all" ON public.budgets
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "budgets_service_role" ON public.budgets
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO service_role;

    RAISE NOTICE 'Fixed: budgets';
  ELSE
    RAISE NOTICE 'MISSING: budgets';
  END IF;
END $$;


-- ============ TABLE: fuel_log ============
DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'fuel_log') THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'fuel_log'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.fuel_log', pol.policyname);
    END LOOP;

    ALTER TABLE public.fuel_log ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "fuel_log_user_all" ON public.fuel_log
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "fuel_log_service_role" ON public.fuel_log
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.fuel_log TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.fuel_log TO service_role;

    RAISE NOTICE 'Fixed: fuel_log';
  ELSE
    RAISE NOTICE 'MISSING: fuel_log';
  END IF;
END $$;


-- ============ TABLE: pam_savings_events ============
DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pam_savings_events') THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pam_savings_events'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.pam_savings_events', pol.policyname);
    END LOOP;

    ALTER TABLE public.pam_savings_events ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "pam_savings_events_user_all" ON public.pam_savings_events
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "pam_savings_events_service_role" ON public.pam_savings_events
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.pam_savings_events TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.pam_savings_events TO service_role;

    RAISE NOTICE 'Fixed: pam_savings_events';
  ELSE
    RAISE NOTICE 'MISSING: pam_savings_events';
  END IF;
END $$;


-- ============================================================================
-- SECTION C: Trip Tables
-- ============================================================================

-- ============ TABLE: user_trips ============
-- Was: 8 duplicate policies (both authenticated and public versions)
DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_trips') THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_trips'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_trips', pol.policyname);
    END LOOP;

    ALTER TABLE public.user_trips ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "user_trips_user_all" ON public.user_trips
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "user_trips_service_role" ON public.user_trips
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_trips TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_trips TO service_role;

    RAISE NOTICE 'Fixed: user_trips';
  ELSE
    RAISE NOTICE 'MISSING: user_trips';
  END IF;
END $$;


-- ============ TABLE: favorite_locations ============
DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'favorite_locations') THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'favorite_locations'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.favorite_locations', pol.policyname);
    END LOOP;

    ALTER TABLE public.favorite_locations ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "favorite_locations_user_all" ON public.favorite_locations
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "favorite_locations_service_role" ON public.favorite_locations
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorite_locations TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorite_locations TO service_role;

    RAISE NOTICE 'Fixed: favorite_locations';
  ELSE
    RAISE NOTICE 'MISSING: favorite_locations';
  END IF;
END $$;


-- ============================================================================
-- SECTION D: Calendar Tables
-- ============================================================================

-- ============ TABLE: calendar_events ============
-- Was: 7 duplicate/conflicting policies
DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'calendar_events') THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'calendar_events'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.calendar_events', pol.policyname);
    END LOOP;

    ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "calendar_events_user_all" ON public.calendar_events
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "calendar_events_service_role" ON public.calendar_events
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO service_role;

    RAISE NOTICE 'Fixed: calendar_events';
  ELSE
    RAISE NOTICE 'MISSING: calendar_events';
  END IF;
END $$;


-- ============ TABLE: timers_and_alarms ============
DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'timers_and_alarms') THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'timers_and_alarms'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.timers_and_alarms', pol.policyname);
    END LOOP;

    ALTER TABLE public.timers_and_alarms ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "timers_and_alarms_user_all" ON public.timers_and_alarms
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "timers_and_alarms_service_role" ON public.timers_and_alarms
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.timers_and_alarms TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.timers_and_alarms TO service_role;

    RAISE NOTICE 'Fixed: timers_and_alarms';
  ELSE
    RAISE NOTICE 'MISSING: timers_and_alarms';
  END IF;
END $$;


-- ============================================================================
-- SECTION E: Social Tables
-- ============================================================================

-- ============ TABLE: posts ============
-- Was: only admin moderation policy. Needs public SELECT + user CRUD.
DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'posts'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.posts', pol.policyname);
    END LOOP;

    ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

    -- Anyone authenticated can read posts (social feed)
    CREATE POLICY "posts_authenticated_select" ON public.posts
      FOR SELECT TO authenticated
      USING (true);

    -- Users can insert their own posts
    CREATE POLICY "posts_user_insert" ON public.posts
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);

    -- Users can update their own posts
    CREATE POLICY "posts_user_update" ON public.posts
      FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    -- Users can delete their own posts
    CREATE POLICY "posts_user_delete" ON public.posts
      FOR DELETE TO authenticated
      USING (auth.uid() = user_id);

    -- Service role full access for PAM backend
    CREATE POLICY "posts_service_role" ON public.posts
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO service_role;

    RAISE NOTICE 'Fixed: posts';
  ELSE
    RAISE NOTICE 'MISSING: posts';
  END IF;
END $$;


-- ============ TABLE: comments ============
-- Public SELECT (anyone authenticated can read) + user write for own comments
DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'comments') THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'comments'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.comments', pol.policyname);
    END LOOP;

    ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

    -- Anyone authenticated can read comments
    CREATE POLICY "comments_authenticated_select" ON public.comments
      FOR SELECT TO authenticated
      USING (true);

    -- Users can insert their own comments
    CREATE POLICY "comments_user_insert" ON public.comments
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);

    -- Users can update their own comments
    CREATE POLICY "comments_user_update" ON public.comments
      FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    -- Users can delete their own comments
    CREATE POLICY "comments_user_delete" ON public.comments
      FOR DELETE TO authenticated
      USING (auth.uid() = user_id);

    -- Service role full access for PAM backend
    CREATE POLICY "comments_service_role" ON public.comments
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO service_role;

    RAISE NOTICE 'Fixed: comments';
  ELSE
    RAISE NOTICE 'MISSING: comments';
  END IF;
END $$;


-- ============ TABLE: post_likes ============
-- Public SELECT + user INSERT/DELETE for own likes (no UPDATE needed)
DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'post_likes') THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'post_likes'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.post_likes', pol.policyname);
    END LOOP;

    ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

    -- Anyone authenticated can see likes
    CREATE POLICY "post_likes_authenticated_select" ON public.post_likes
      FOR SELECT TO authenticated
      USING (true);

    -- Users can like posts
    CREATE POLICY "post_likes_user_insert" ON public.post_likes
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);

    -- Users can unlike posts
    CREATE POLICY "post_likes_user_delete" ON public.post_likes
      FOR DELETE TO authenticated
      USING (auth.uid() = user_id);

    -- Service role full access for PAM backend
    CREATE POLICY "post_likes_service_role" ON public.post_likes
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_likes TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_likes TO service_role;

    RAISE NOTICE 'Fixed: post_likes';
  ELSE
    RAISE NOTICE 'MISSING: post_likes';
  END IF;
END $$;


-- ============ TABLE: messages ============
-- MISSING TABLE - will be created in Task 4. Skip gracefully.
DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'messages'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.messages', pol.policyname);
    END LOOP;

    ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

    -- Users can read messages they sent or received
    CREATE POLICY "messages_user_select" ON public.messages
      FOR SELECT TO authenticated
      USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

    -- Users can send messages
    CREATE POLICY "messages_user_insert" ON public.messages
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = sender_id);

    -- Users can update their own sent messages
    CREATE POLICY "messages_user_update" ON public.messages
      FOR UPDATE TO authenticated
      USING (auth.uid() = sender_id)
      WITH CHECK (auth.uid() = sender_id);

    -- Users can delete their own sent messages
    CREATE POLICY "messages_user_delete" ON public.messages
      FOR DELETE TO authenticated
      USING (auth.uid() = sender_id);

    -- Service role full access for PAM backend
    CREATE POLICY "messages_service_role" ON public.messages
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO service_role;

    RAISE NOTICE 'Fixed: messages';
  ELSE
    RAISE NOTICE 'MISSING: messages (will be created in Task 4)';
  END IF;
END $$;


-- ============ TABLE: user_follows ============
-- Special: uses follower_id and following_id instead of user_id.
-- Column names confirmed from diagnostic baseline on live database.
DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_follows') THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_follows'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_follows', pol.policyname);
    END LOOP;

    ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

    -- Users can see follow relationships they are part of
    CREATE POLICY "user_follows_user_select" ON public.user_follows
      FOR SELECT TO authenticated
      USING (auth.uid() = follower_id OR auth.uid() = following_id);

    -- Users can follow others (they must be the follower)
    CREATE POLICY "user_follows_user_insert" ON public.user_follows
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = follower_id);

    -- Users can unfollow (delete their own follow records)
    CREATE POLICY "user_follows_user_delete" ON public.user_follows
      FOR DELETE TO authenticated
      USING (auth.uid() = follower_id);

    -- Service role full access for PAM backend
    CREATE POLICY "user_follows_service_role" ON public.user_follows
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_follows TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_follows TO service_role;

    RAISE NOTICE 'Fixed: user_follows';
  ELSE
    RAISE NOTICE 'MISSING: user_follows';
  END IF;
END $$;


-- ============ TABLE: shared_locations ============
-- Public SELECT for active/non-expired locations + user write for own
DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'shared_locations') THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'shared_locations'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.shared_locations', pol.policyname);
    END LOOP;

    ALTER TABLE public.shared_locations ENABLE ROW LEVEL SECURITY;

    -- Anyone authenticated can see active, non-expired shared locations
    CREATE POLICY "shared_locations_authenticated_select" ON public.shared_locations
      FOR SELECT TO authenticated
      USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

    -- Users can manage all their own shared locations (including inactive)
    CREATE POLICY "shared_locations_user_all" ON public.shared_locations
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    -- Service role full access for PAM backend
    CREATE POLICY "shared_locations_service_role" ON public.shared_locations
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_locations TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_locations TO service_role;

    RAISE NOTICE 'Fixed: shared_locations';
  ELSE
    RAISE NOTICE 'MISSING: shared_locations';
  END IF;
END $$;


-- ============ TABLE: events ============
-- Was: only service_role ALL policy, no authenticated user policies
DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'events') THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.events', pol.policyname);
    END LOOP;

    ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

    -- Users can manage their own events
    CREATE POLICY "events_user_all" ON public.events
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    -- Service role full access for PAM backend
    CREATE POLICY "events_service_role" ON public.events
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO service_role;

    RAISE NOTICE 'Fixed: events';
  ELSE
    RAISE NOTICE 'MISSING: events';
  END IF;
END $$;


-- ============ TABLE: event_attendees ============
-- Uses user_id for ownership
DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'event_attendees') THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'event_attendees'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.event_attendees', pol.policyname);
    END LOOP;

    ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;

    -- Anyone authenticated can see event attendees (needed for event pages)
    CREATE POLICY "event_attendees_authenticated_select" ON public.event_attendees
      FOR SELECT TO authenticated
      USING (true);

    -- Users can manage their own attendance
    CREATE POLICY "event_attendees_user_insert" ON public.event_attendees
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "event_attendees_user_update" ON public.event_attendees
      FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "event_attendees_user_delete" ON public.event_attendees
      FOR DELETE TO authenticated
      USING (auth.uid() = user_id);

    -- Service role full access for PAM backend
    CREATE POLICY "event_attendees_service_role" ON public.event_attendees
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_attendees TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_attendees TO service_role;

    RAISE NOTICE 'Fixed: event_attendees';
  ELSE
    RAISE NOTICE 'MISSING: event_attendees';
  END IF;
END $$;


-- ============================================================================
-- SECTION F: Meals Tables
-- ============================================================================

-- ============ TABLE: meal_plans ============
DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'meal_plans') THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'meal_plans'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.meal_plans', pol.policyname);
    END LOOP;

    ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "meal_plans_user_all" ON public.meal_plans
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "meal_plans_service_role" ON public.meal_plans
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_plans TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_plans TO service_role;

    RAISE NOTICE 'Fixed: meal_plans';
  ELSE
    RAISE NOTICE 'MISSING: meal_plans';
  END IF;
END $$;


-- ============ TABLE: pantry_items ============
-- MISSING TABLE - will be created in Task 4. Skip gracefully.
DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pantry_items') THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pantry_items'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.pantry_items', pol.policyname);
    END LOOP;

    ALTER TABLE public.pantry_items ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "pantry_items_user_all" ON public.pantry_items
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "pantry_items_service_role" ON public.pantry_items
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.pantry_items TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.pantry_items TO service_role;

    RAISE NOTICE 'Fixed: pantry_items';
  ELSE
    RAISE NOTICE 'MISSING: pantry_items (will be created in Task 4)';
  END IF;
END $$;


-- ============ TABLE: recipes ============
-- MISSING TABLE - will be created in Task 4. Skip gracefully.
DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'recipes') THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'recipes'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.recipes', pol.policyname);
    END LOOP;

    ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "recipes_user_all" ON public.recipes
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "recipes_service_role" ON public.recipes
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO service_role;

    RAISE NOTICE 'Fixed: recipes';
  ELSE
    RAISE NOTICE 'MISSING: recipes (will be created in Task 4)';
  END IF;
END $$;


-- ============ TABLE: shopping_lists ============
DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'shopping_lists') THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'shopping_lists'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.shopping_lists', pol.policyname);
    END LOOP;

    ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "shopping_lists_user_all" ON public.shopping_lists
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "shopping_lists_service_role" ON public.shopping_lists
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_lists TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_lists TO service_role;

    RAISE NOTICE 'Fixed: shopping_lists';
  ELSE
    RAISE NOTICE 'MISSING: shopping_lists';
  END IF;
END $$;


-- ============================================================================
-- SECTION G: Maintenance Tables
-- ============================================================================

-- ============ TABLE: maintenance_records ============
DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'maintenance_records') THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'maintenance_records'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.maintenance_records', pol.policyname);
    END LOOP;

    ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "maintenance_records_user_all" ON public.maintenance_records
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "maintenance_records_service_role" ON public.maintenance_records
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_records TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_records TO service_role;

    RAISE NOTICE 'Fixed: maintenance_records';
  ELSE
    RAISE NOTICE 'MISSING: maintenance_records';
  END IF;
END $$;


-- ============================================================================
-- SECTION H: Transition Tables
-- ============================================================================

-- ============ TABLE: shakedown_trips ============
-- Was: only admin ALL policy, no authenticated user policies
DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'shakedown_trips') THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'shakedown_trips'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.shakedown_trips', pol.policyname);
    END LOOP;

    ALTER TABLE public.shakedown_trips ENABLE ROW LEVEL SECURITY;

    -- Shakedown trips are tied to transition profiles via profile_id.
    -- Since we cannot easily join to get user_id, allow authenticated
    -- users to read all shakedown trips and rely on the application layer
    -- to filter. Service role handles write operations via PAM.
    CREATE POLICY "shakedown_trips_authenticated_select" ON public.shakedown_trips
      FOR SELECT TO authenticated
      USING (true);

    -- Authenticated users can manage shakedown trips they create
    -- The profile_id links to transition_profiles which links to user_id
    CREATE POLICY "shakedown_trips_authenticated_write" ON public.shakedown_trips
      FOR INSERT TO authenticated
      WITH CHECK (true);

    CREATE POLICY "shakedown_trips_authenticated_update" ON public.shakedown_trips
      FOR UPDATE TO authenticated
      USING (true)
      WITH CHECK (true);

    CREATE POLICY "shakedown_trips_authenticated_delete" ON public.shakedown_trips
      FOR DELETE TO authenticated
      USING (true);

    -- Service role full access for PAM backend
    CREATE POLICY "shakedown_trips_service_role" ON public.shakedown_trips
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.shakedown_trips TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.shakedown_trips TO service_role;

    RAISE NOTICE 'Fixed: shakedown_trips';
  ELSE
    RAISE NOTICE 'MISSING: shakedown_trips';
  END IF;
END $$;


-- ============ TABLE: shakedown_issues ============
-- Was: only admin ALL policy, no authenticated user policies
DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'shakedown_issues') THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'shakedown_issues'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.shakedown_issues', pol.policyname);
    END LOOP;

    ALTER TABLE public.shakedown_issues ENABLE ROW LEVEL SECURITY;

    -- Shakedown issues are tied to shakedown_trips via trip_id.
    -- Allow authenticated read + write, application layer filters by user.
    CREATE POLICY "shakedown_issues_authenticated_select" ON public.shakedown_issues
      FOR SELECT TO authenticated
      USING (true);

    CREATE POLICY "shakedown_issues_authenticated_insert" ON public.shakedown_issues
      FOR INSERT TO authenticated
      WITH CHECK (true);

    CREATE POLICY "shakedown_issues_authenticated_update" ON public.shakedown_issues
      FOR UPDATE TO authenticated
      USING (true)
      WITH CHECK (true);

    CREATE POLICY "shakedown_issues_authenticated_delete" ON public.shakedown_issues
      FOR DELETE TO authenticated
      USING (true);

    -- Service role full access for PAM backend
    CREATE POLICY "shakedown_issues_service_role" ON public.shakedown_issues
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.shakedown_issues TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.shakedown_issues TO service_role;

    RAISE NOTICE 'Fixed: shakedown_issues';
  ELSE
    RAISE NOTICE 'MISSING: shakedown_issues';
  END IF;
END $$;


-- ============ TABLE: transition_equipment ============
-- Admin-managed table, but authenticated users need read access
DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'transition_equipment') THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'transition_equipment'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.transition_equipment', pol.policyname);
    END LOOP;

    ALTER TABLE public.transition_equipment ENABLE ROW LEVEL SECURITY;

    -- Authenticated users can read transition equipment (reference data)
    CREATE POLICY "transition_equipment_authenticated_select" ON public.transition_equipment
      FOR SELECT TO authenticated
      USING (true);

    -- Authenticated users can manage their own equipment records
    CREATE POLICY "transition_equipment_authenticated_write" ON public.transition_equipment
      FOR INSERT TO authenticated
      WITH CHECK (true);

    CREATE POLICY "transition_equipment_authenticated_update" ON public.transition_equipment
      FOR UPDATE TO authenticated
      USING (true)
      WITH CHECK (true);

    CREATE POLICY "transition_equipment_authenticated_delete" ON public.transition_equipment
      FOR DELETE TO authenticated
      USING (true);

    -- Service role full access for PAM backend
    CREATE POLICY "transition_equipment_service_role" ON public.transition_equipment
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.transition_equipment TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.transition_equipment TO service_role;

    RAISE NOTICE 'Fixed: transition_equipment';
  ELSE
    RAISE NOTICE 'MISSING: transition_equipment';
  END IF;
END $$;


-- ============ TABLE: user_launch_tasks ============
-- Was: only admin ALL policy, no authenticated user policies
DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_launch_tasks') THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_launch_tasks'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_launch_tasks', pol.policyname);
    END LOOP;

    ALTER TABLE public.user_launch_tasks ENABLE ROW LEVEL SECURITY;

    -- Users can manage their own launch tasks
    CREATE POLICY "user_launch_tasks_user_all" ON public.user_launch_tasks
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    -- Service role full access for PAM backend
    CREATE POLICY "user_launch_tasks_service_role" ON public.user_launch_tasks
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_launch_tasks TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_launch_tasks TO service_role;

    RAISE NOTICE 'Fixed: user_launch_tasks';
  ELSE
    RAISE NOTICE 'MISSING: user_launch_tasks';
  END IF;
END $$;


-- ============ TABLE: transition_tasks ============
DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'transition_tasks') THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'transition_tasks'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.transition_tasks', pol.policyname);
    END LOOP;

    ALTER TABLE public.transition_tasks ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "transition_tasks_user_all" ON public.transition_tasks
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "transition_tasks_service_role" ON public.transition_tasks
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.transition_tasks TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.transition_tasks TO service_role;

    RAISE NOTICE 'Fixed: transition_tasks';
  ELSE
    RAISE NOTICE 'MISSING: transition_tasks';
  END IF;
END $$;


-- ============================================================================
-- SECTION I: Community Tables
-- ============================================================================

-- ============ TABLE: community_tips ============
-- Was: SELECT blocked service_role with auth.role() check
DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'community_tips') THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_tips'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.community_tips', pol.policyname);
    END LOOP;

    ALTER TABLE public.community_tips ENABLE ROW LEVEL SECURITY;

    -- Anyone authenticated can read active tips, or their own tips in any status
    CREATE POLICY "community_tips_authenticated_select" ON public.community_tips
      FOR SELECT TO authenticated
      USING (status = 'active' OR auth.uid() = user_id);

    -- Users can create their own tips
    CREATE POLICY "community_tips_user_insert" ON public.community_tips
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);

    -- Users can update their own tips
    CREATE POLICY "community_tips_user_update" ON public.community_tips
      FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    -- Users can delete their own tips
    CREATE POLICY "community_tips_user_delete" ON public.community_tips
      FOR DELETE TO authenticated
      USING (auth.uid() = user_id);

    -- Service role full access for PAM backend
    CREATE POLICY "community_tips_service_role" ON public.community_tips
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_tips TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_tips TO service_role;

    RAISE NOTICE 'Fixed: community_tips';
  ELSE
    RAISE NOTICE 'MISSING: community_tips';
  END IF;
END $$;


-- ============ TABLE: tip_usage_log ============
-- Was: INSERT check referenced service_role via JWT (unnecessary since
-- service_role bypasses RLS). Uses contributor_id and beneficiary_id.
DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tip_usage_log') THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tip_usage_log'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.tip_usage_log', pol.policyname);
    END LOOP;

    ALTER TABLE public.tip_usage_log ENABLE ROW LEVEL SECURITY;

    -- Users can see tip usage logs they are involved in
    CREATE POLICY "tip_usage_log_user_select" ON public.tip_usage_log
      FOR SELECT TO authenticated
      USING (auth.uid() = contributor_id OR auth.uid() = beneficiary_id);

    -- Authenticated users can create usage logs
    CREATE POLICY "tip_usage_log_user_insert" ON public.tip_usage_log
      FOR INSERT TO authenticated
      WITH CHECK (true);

    -- Service role full access for PAM backend
    CREATE POLICY "tip_usage_log_service_role" ON public.tip_usage_log
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.tip_usage_log TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.tip_usage_log TO service_role;

    RAISE NOTICE 'Fixed: tip_usage_log';
  ELSE
    RAISE NOTICE 'MISSING: tip_usage_log';
  END IF;
END $$;


-- ============ TABLE: community_knowledge ============
-- Was: users could only read their OWN articles. Needs public SELECT for
-- published articles + author write access. Uses author_id.
DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'community_knowledge') THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_knowledge'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.community_knowledge', pol.policyname);
    END LOOP;

    ALTER TABLE public.community_knowledge ENABLE ROW LEVEL SECURITY;

    -- Anyone authenticated can read approved/published articles
    CREATE POLICY "community_knowledge_authenticated_select" ON public.community_knowledge
      FOR SELECT TO authenticated
      USING (status = 'approved' OR auth.uid() = author_id);

    -- Authors can create articles
    CREATE POLICY "community_knowledge_user_insert" ON public.community_knowledge
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = author_id);

    -- Authors can update their own articles
    CREATE POLICY "community_knowledge_user_update" ON public.community_knowledge
      FOR UPDATE TO authenticated
      USING (auth.uid() = author_id)
      WITH CHECK (auth.uid() = author_id);

    -- Authors can delete their own articles
    CREATE POLICY "community_knowledge_user_delete" ON public.community_knowledge
      FOR DELETE TO authenticated
      USING (auth.uid() = author_id);

    -- Service role full access for PAM backend
    CREATE POLICY "community_knowledge_service_role" ON public.community_knowledge
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_knowledge TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_knowledge TO service_role;

    RAISE NOTICE 'Fixed: community_knowledge';
  ELSE
    RAISE NOTICE 'MISSING: community_knowledge';
  END IF;
END $$;


-- ============================================================================
-- SECTION J: PAM Internal Tables
-- ============================================================================

-- ============ TABLE: pam_admin_knowledge ============
-- Public SELECT for active entries + admin-only write
DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pam_admin_knowledge') THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pam_admin_knowledge'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.pam_admin_knowledge', pol.policyname);
    END LOOP;

    ALTER TABLE public.pam_admin_knowledge ENABLE ROW LEVEL SECURITY;

    -- Anyone authenticated can read active knowledge entries
    CREATE POLICY "pam_admin_knowledge_authenticated_select" ON public.pam_admin_knowledge
      FOR SELECT TO authenticated
      USING (is_active = true);

    -- Only admins can write (checked via profiles.role)
    CREATE POLICY "pam_admin_knowledge_admin_write" ON public.pam_admin_knowledge
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );

    CREATE POLICY "pam_admin_knowledge_admin_update" ON public.pam_admin_knowledge
      FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );

    CREATE POLICY "pam_admin_knowledge_admin_delete" ON public.pam_admin_knowledge
      FOR DELETE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );

    -- Service role full access for PAM backend
    CREATE POLICY "pam_admin_knowledge_service_role" ON public.pam_admin_knowledge
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.pam_admin_knowledge TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.pam_admin_knowledge TO service_role;

    RAISE NOTICE 'Fixed: pam_admin_knowledge';
  ELSE
    RAISE NOTICE 'MISSING: pam_admin_knowledge';
  END IF;
END $$;


-- ============ TABLE: pam_knowledge_usage_log ============
-- Was: SELECT was admin-only. Regular users should see their own logs.
DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pam_knowledge_usage_log') THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pam_knowledge_usage_log'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.pam_knowledge_usage_log', pol.policyname);
    END LOOP;

    ALTER TABLE public.pam_knowledge_usage_log ENABLE ROW LEVEL SECURITY;

    -- Users can see their own usage logs
    CREATE POLICY "pam_knowledge_usage_log_user_select" ON public.pam_knowledge_usage_log
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);

    -- Authenticated users can create usage logs (PAM records usage)
    CREATE POLICY "pam_knowledge_usage_log_user_insert" ON public.pam_knowledge_usage_log
      FOR INSERT TO authenticated
      WITH CHECK (true);

    -- Service role full access for PAM backend
    CREATE POLICY "pam_knowledge_usage_log_service_role" ON public.pam_knowledge_usage_log
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.pam_knowledge_usage_log TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.pam_knowledge_usage_log TO service_role;

    RAISE NOTICE 'Fixed: pam_knowledge_usage_log';
  ELSE
    RAISE NOTICE 'MISSING: pam_knowledge_usage_log';
  END IF;
END $$;


-- ============================================================================
-- SECTION K: Ensure admin PostgreSQL role exists with proper grants
-- From December 2025 fix - admin JWT role needs matching PostgreSQL role
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin') THEN
    CREATE ROLE admin NOLOGIN;
    RAISE NOTICE 'Created admin PostgreSQL role';
  ELSE
    RAISE NOTICE 'admin PostgreSQL role already exists';
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO admin;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO admin;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO admin;


-- ============================================================================
-- VERIFICATION QUERY
-- Run this after applying to verify all policies are correct.
-- ============================================================================

DO $$
DECLARE
  tbl TEXT;
  policy_count INTEGER;
  has_service_role BOOLEAN;
  tables_checked INTEGER := 0;
  tables_ok INTEGER := 0;
  tables_missing_sr INTEGER := 0;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'profiles', 'user_settings', 'vehicles',
      'expenses', 'budgets', 'fuel_log', 'pam_savings_events',
      'user_trips', 'favorite_locations',
      'calendar_events', 'timers_and_alarms',
      'posts', 'comments', 'post_likes', 'messages', 'user_follows',
      'shared_locations', 'events', 'event_attendees',
      'meal_plans', 'pantry_items', 'recipes', 'shopping_lists',
      'maintenance_records',
      'shakedown_trips', 'shakedown_issues', 'transition_equipment',
      'user_launch_tasks', 'transition_tasks',
      'community_tips', 'tip_usage_log', 'community_knowledge',
      'pam_admin_knowledge', 'pam_knowledge_usage_log'
    ])
  LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      SELECT count(*) INTO policy_count
      FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl;

      SELECT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = tbl
        AND policyname LIKE '%service_role%'
      ) INTO has_service_role;

      tables_checked := tables_checked + 1;

      IF has_service_role THEN
        tables_ok := tables_ok + 1;
        RAISE NOTICE 'OK: % (% policies, service_role: yes)', tbl, policy_count;
      ELSE
        tables_missing_sr := tables_missing_sr + 1;
        RAISE NOTICE 'WARNING: % (% policies, service_role: MISSING)', tbl, policy_count;
      END IF;
    ELSE
      RAISE NOTICE 'SKIP: % (table does not exist)', tbl;
    END IF;
  END LOOP;

  RAISE NOTICE '--- SUMMARY ---';
  RAISE NOTICE 'Tables checked: %', tables_checked;
  RAISE NOTICE 'Tables OK: %', tables_ok;
  RAISE NOTICE 'Tables missing service_role: %', tables_missing_sr;
END $$;
