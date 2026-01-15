-- ============================================================================
-- FIX SECURITY VULNERABILITIES - Overly Permissive RLS Policies
-- ============================================================================
-- These policies use USING(true) or WITH CHECK(true) which bypasses RLS
-- ============================================================================

-- 1. pam_memory: CRITICAL - Remove anon access to ALL pam memory
DROP POLICY IF EXISTS "anon_access_pam_memory" ON public.pam_memory;

-- 2. shop_products: Restrict to owner only (if user_id column exists)
-- First check if shop_products has user_id column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shop_products' AND column_name = 'user_id'
  ) THEN
    DROP POLICY IF EXISTS "Allow authenticated users to add products" ON public.shop_products;
    DROP POLICY IF EXISTS "Allow authenticated users to delete products" ON public.shop_products;
    DROP POLICY IF EXISTS "Allow authenticated users to update products" ON public.shop_products;

    EXECUTE 'CREATE POLICY "Users can insert own products" ON public.shop_products FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id)';
    EXECUTE 'CREATE POLICY "Users can update own products" ON public.shop_products FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id)';
    EXECUTE 'CREATE POLICY "Users can delete own products" ON public.shop_products FOR DELETE TO authenticated USING ((select auth.uid()) = user_id)';

    RAISE NOTICE 'Fixed shop_products policies';
  ELSE
    RAISE NOTICE 'shop_products has no user_id column - skipping (may be admin-only table)';
  END IF;
END $$;

-- 3. predictive_models: Restrict to owner only
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'predictive_models' AND column_name = 'user_id'
  ) THEN
    DROP POLICY IF EXISTS "Allow authenticated users to create models" ON public.predictive_models;
    DROP POLICY IF EXISTS "Allow authenticated users to update models" ON public.predictive_models;
    DROP POLICY IF EXISTS "Allow authenticated users to delete models" ON public.predictive_models;

    EXECUTE 'CREATE POLICY "Users can insert own models" ON public.predictive_models FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id)';
    EXECUTE 'CREATE POLICY "Users can update own models" ON public.predictive_models FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id)';
    EXECUTE 'CREATE POLICY "Users can delete own models" ON public.predictive_models FOR DELETE TO authenticated USING ((select auth.uid()) = user_id)';

    RAISE NOTICE 'Fixed predictive_models policies';
  ELSE
    RAISE NOTICE 'predictive_models has no user_id column - skipping';
  END IF;
END $$;

-- 4. pam_intent_context: Restrict to owner only
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pam_intent_context' AND column_name = 'user_id'
  ) THEN
    DROP POLICY IF EXISTS "Allow authenticated users to insert intent contexts" ON public.pam_intent_context;
    DROP POLICY IF EXISTS "Allow authenticated users to update intent contexts" ON public.pam_intent_context;
    DROP POLICY IF EXISTS "Allow authenticated users to delete intent contexts" ON public.pam_intent_context;

    EXECUTE 'CREATE POLICY "Users can insert own intent contexts" ON public.pam_intent_context FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id)';
    EXECUTE 'CREATE POLICY "Users can update own intent contexts" ON public.pam_intent_context FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id)';
    EXECUTE 'CREATE POLICY "Users can delete own intent contexts" ON public.pam_intent_context FOR DELETE TO authenticated USING ((select auth.uid()) = user_id)';

    RAISE NOTICE 'Fixed pam_intent_context policies';
  ELSE
    RAISE NOTICE 'pam_intent_context has no user_id column - skipping';
  END IF;
END $$;

-- 5. social_groups: More restrictive policy
-- Keep read access but restrict write to group creators/admins
DROP POLICY IF EXISTS "Authenticated users can access" ON public.social_groups;

-- Allow anyone to read groups
CREATE POLICY "Anyone can view groups" ON public.social_groups
  FOR SELECT TO authenticated
  USING (true);

-- Only creator can modify (if created_by column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'social_groups' AND column_name = 'created_by'
  ) THEN
    EXECUTE 'CREATE POLICY "Creators can update groups" ON public.social_groups FOR UPDATE TO authenticated USING ((select auth.uid()) = created_by)';
    EXECUTE 'CREATE POLICY "Creators can delete groups" ON public.social_groups FOR DELETE TO authenticated USING ((select auth.uid()) = created_by)';
    EXECUTE 'CREATE POLICY "Users can create groups" ON public.social_groups FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = created_by)';
    RAISE NOTICE 'Fixed social_groups policies with created_by';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'social_groups' AND column_name = 'owner_id'
  ) THEN
    EXECUTE 'CREATE POLICY "Owners can update groups" ON public.social_groups FOR UPDATE TO authenticated USING ((select auth.uid()) = owner_id)';
    EXECUTE 'CREATE POLICY "Owners can delete groups" ON public.social_groups FOR DELETE TO authenticated USING ((select auth.uid()) = owner_id)';
    EXECUTE 'CREATE POLICY "Users can create groups" ON public.social_groups FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = owner_id)';
    RAISE NOTICE 'Fixed social_groups policies with owner_id';
  ELSE
    RAISE NOTICE 'social_groups has no created_by/owner_id column - leaving SELECT only';
  END IF;
END $$;

-- 6. qa_issues: Fix UPDATE policy to check ownership
DROP POLICY IF EXISTS "Users can update qa_issues" ON public.qa_issues;
CREATE POLICY "Users can update own qa_issues" ON public.qa_issues
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = reported_by OR (select auth.uid()) = updated_by)
  WITH CHECK ((select auth.uid()) = updated_by);

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Security policy fixes complete!';
  RAISE NOTICE 'Postgres version warning requires manual upgrade via Supabase dashboard';
  RAISE NOTICE '============================================';
END $$;
