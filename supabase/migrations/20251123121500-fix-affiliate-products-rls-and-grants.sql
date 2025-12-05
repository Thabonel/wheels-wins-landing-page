-- Fix affiliate_products GRANTs and RLS to unblock admin panel
-- Date: 2025-11-23
-- Summary:
-- - Ensure required GRANTs for anon/authenticated
-- - Keep public shop read-only to active products
-- - Allow CRUD only for verified admins (based on admin_users)
-- - Ensure clicks table allows anonymous inserts
-- - Add performance index

-- 1) Ensure schema usage
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 2) Table grants
-- Public/anon can read active rows via RLS, but still needs SELECT privilege
GRANT SELECT ON TABLE public.affiliate_products TO anon;

-- Authenticated will be gated by RLS for admin-only CRUD, but needs GRANTs
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.affiliate_products TO authenticated;

-- Clicks table: allow inserts from anon/authenticated (RLS will permit anonymously)
GRANT SELECT, INSERT ON TABLE public.affiliate_product_clicks TO anon, authenticated;

-- In case sequences are used by defaults
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 3) Create a simple admin check if not already present (rely on existing function if exists)
-- Uses previously-defined function public.check_user_is_admin(uuid)
-- If it doesn't exist in your project, uncomment the block below.
--
-- CREATE OR REPLACE FUNCTION public.check_user_is_admin(check_user_id uuid)
-- RETURNS boolean
-- LANGUAGE sql
-- STABLE
-- AS $$
--   SELECT EXISTS (
--     SELECT 1 FROM public.admin_users 
--     WHERE user_id = check_user_id 
--       AND role = 'admin' 
--       AND status = 'active'
--   );
-- $$;

-- 4) Recreate clean, permissive RLS policies
-- Drop existing policies on affiliate_products to avoid conflicts
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'affiliate_products'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.affiliate_products', pol.policyname);
  END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.affiliate_products ENABLE ROW LEVEL SECURITY;

-- Public/anon: can SELECT only active products (public shop)
CREATE POLICY public_select_active
  ON public.affiliate_products
  AS PERMISSIVE
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Admin (authenticated): view ALL products
CREATE POLICY admin_select_all
  ON public.affiliate_products
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (public.check_user_is_admin(auth.uid()));

-- Admin (authenticated): INSERT
CREATE POLICY admin_insert
  ON public.affiliate_products
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (public.check_user_is_admin(auth.uid()));

-- Admin (authenticated): UPDATE
CREATE POLICY admin_update
  ON public.affiliate_products
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (public.check_user_is_admin(auth.uid()))
  WITH CHECK (public.check_user_is_admin(auth.uid()));

-- Admin (authenticated): DELETE
CREATE POLICY admin_delete
  ON public.affiliate_products
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (public.check_user_is_admin(auth.uid()));

-- Click tracking table policies: allow anonymous and authenticated inserts
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'affiliate_product_clicks'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.affiliate_product_clicks', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE public.affiliate_product_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY clicks_insert_anyone
  ON public.affiliate_product_clicks
  AS PERMISSIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 5) Performance index used by shop queries
CREATE INDEX IF NOT EXISTS idx_affiliate_products_active_sort
  ON public.affiliate_products (is_active, sort_order);

-- 6) Verification helpers (non-fatal if pg_policies is restricted)
-- SELECT policyname, roles, cmd, permissive, qual
-- FROM pg_policies
-- WHERE tablename = 'affiliate_products'
-- ORDER BY policyname;

