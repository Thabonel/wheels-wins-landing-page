-- ============================================================================
-- COMPREHENSIVE DUPLICATE POLICY CLEANUP
-- ============================================================================
-- Removes duplicate policies keeping one service_role + one user policy per table
-- ============================================================================

DO $$
DECLARE
  dropped int := 0;
BEGIN
  RAISE NOTICE 'Starting comprehensive policy cleanup...';

  -- PAM_USER_CONTEXT: Keep 2, drop 3
  DROP POLICY IF EXISTS "Users manage own PAM context" ON public.pam_user_context;
  DROP POLICY IF EXISTS "service_role_access_pam_context" ON public.pam_user_context;
  DROP POLICY IF EXISTS "users_manage_own_pam_context" ON public.pam_user_context;
  dropped := dropped + 3;
  RAISE NOTICE 'Cleaned pam_user_context';

  -- PAM_CONVERSATIONS: Keep 2, drop 3
  DROP POLICY IF EXISTS "pam_conversations_admin_role_full_access" ON public.pam_conversations;
  DROP POLICY IF EXISTS "pam_conversations_manage_admin_role" ON public.pam_conversations;
  DROP POLICY IF EXISTS "pam_conversations_view_own_admin_role" ON public.pam_conversations;
  dropped := dropped + 3;
  RAISE NOTICE 'Cleaned pam_conversations';

  -- PAM_CONVERSATION_MEMORY: Keep 2, drop 2
  DROP POLICY IF EXISTS "service_role_access_pam_memory" ON public.pam_conversation_memory;
  DROP POLICY IF EXISTS "users_manage_own_pam_memory" ON public.pam_conversation_memory;
  dropped := dropped + 2;
  RAISE NOTICE 'Cleaned pam_conversation_memory';

  RAISE NOTICE 'Phase 1 complete: % policies dropped', dropped;
END $$;

-- DRAWERS: Check and clean INSERT duplicates
DO $$
DECLARE
  pol record;
  kept boolean := false;
  dropped int := 0;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'drawers' AND cmd = 'INSERT'
    ORDER BY policyname
  LOOP
    IF NOT kept THEN
      kept := true;
      RAISE NOTICE 'Keeping drawers INSERT: %', pol.policyname;
    ELSE
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.drawers', pol.policyname);
      dropped := dropped + 1;
    END IF;
  END LOOP;
  RAISE NOTICE 'Cleaned drawers: % dropped', dropped;
END $$;

-- PREDICTIVE_MODELS: Clean all duplicates
DO $$
DECLARE
  pol record;
  cmd_kept text[] := '{}';
  dropped int := 0;
BEGIN
  FOR pol IN
    SELECT policyname, cmd FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'predictive_models'
    ORDER BY cmd, policyname
  LOOP
    IF pol.cmd = ANY(cmd_kept) THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.predictive_models', pol.policyname);
      dropped := dropped + 1;
    ELSE
      cmd_kept := array_append(cmd_kept, pol.cmd);
      RAISE NOTICE 'Keeping predictive_models %: %', pol.cmd, pol.policyname;
    END IF;
  END LOOP;
  RAISE NOTICE 'Cleaned predictive_models: % dropped', dropped;
END $$;

-- SOCIAL_POSTS: Clean duplicates
DO $$
DECLARE
  pol record;
  cmd_kept text[] := '{}';
  dropped int := 0;
BEGIN
  FOR pol IN
    SELECT policyname, cmd FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'social_posts'
    ORDER BY cmd, policyname
  LOOP
    IF pol.cmd = ANY(cmd_kept) THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.social_posts', pol.policyname);
      dropped := dropped + 1;
    ELSE
      cmd_kept := array_append(cmd_kept, pol.cmd);
    END IF;
  END LOOP;
  RAISE NOTICE 'Cleaned social_posts: % dropped', dropped;
END $$;

-- SAVED_TRIPS: Clean SELECT duplicates
DO $$
DECLARE
  pol record;
  kept boolean := false;
  dropped int := 0;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'saved_trips' AND cmd = 'SELECT'
    ORDER BY policyname
  LOOP
    IF NOT kept THEN
      kept := true;
    ELSE
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.saved_trips', pol.policyname);
      dropped := dropped + 1;
    END IF;
  END LOOP;
  RAISE NOTICE 'Cleaned saved_trips: % dropped', dropped;
END $$;

-- PROFILES: Clean SELECT duplicates
DO $$
DECLARE
  pol record;
  kept boolean := false;
  dropped int := 0;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd = 'SELECT'
    ORDER BY policyname
  LOOP
    IF NOT kept THEN
      kept := true;
    ELSE
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
      dropped := dropped + 1;
    END IF;
  END LOOP;
  RAISE NOTICE 'Cleaned profiles: % dropped', dropped;
END $$;

-- SUPPORT_TICKETS: Clean duplicates
DO $$
DECLARE
  pol record;
  cmd_kept text[] := '{}';
  dropped int := 0;
BEGIN
  FOR pol IN
    SELECT policyname, cmd FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'support_tickets'
    ORDER BY cmd, policyname
  LOOP
    IF pol.cmd = ANY(cmd_kept) THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.support_tickets', pol.policyname);
      dropped := dropped + 1;
    ELSE
      cmd_kept := array_append(cmd_kept, pol.cmd);
    END IF;
  END LOOP;
  RAISE NOTICE 'Cleaned support_tickets: % dropped', dropped;
END $$;

-- POST_VOTES: Clean duplicates
DO $$
DECLARE
  pol record;
  cmd_kept text[] := '{}';
  dropped int := 0;
BEGIN
  FOR pol IN
    SELECT policyname, cmd FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'post_votes'
    ORDER BY cmd, policyname
  LOOP
    IF pol.cmd = ANY(cmd_kept) THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.post_votes', pol.policyname);
      dropped := dropped + 1;
    ELSE
      cmd_kept := array_append(cmd_kept, pol.cmd);
    END IF;
  END LOOP;
  RAISE NOTICE 'Cleaned post_votes: % dropped', dropped;
END $$;

-- CALENDAR_EVENTS: Clean duplicates
DO $$
DECLARE
  pol record;
  cmd_kept text[] := '{}';
  dropped int := 0;
BEGIN
  FOR pol IN
    SELECT policyname, cmd FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'calendar_events'
    ORDER BY cmd, policyname
  LOOP
    IF pol.cmd = ANY(cmd_kept) THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.calendar_events', pol.policyname);
      dropped := dropped + 1;
    ELSE
      cmd_kept := array_append(cmd_kept, pol.cmd);
    END IF;
  END LOOP;
  RAISE NOTICE 'Cleaned calendar_events: % dropped', dropped;
END $$;

-- Final verification
SELECT tablename, cmd, count(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public' AND permissive = 'PERMISSIVE'
GROUP BY tablename, cmd
HAVING count(*) > 1
ORDER BY count(*) DESC
LIMIT 20;
