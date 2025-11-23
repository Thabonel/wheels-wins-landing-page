GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public.affiliate_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.affiliate_products TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id)
);
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
$$;
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'affiliate_products'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON affiliate_products', pol.policyname);
    END LOOP;
END $$;
CREATE POLICY public_select_active
  ON public.affiliate_products
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);
CREATE POLICY admin_select_all
  ON public.affiliate_products
  FOR SELECT
  TO authenticated
  USING (public.is_admin());
CREATE POLICY admin_insert
  ON public.affiliate_products
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY admin_update
  ON public.affiliate_products
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY admin_delete
  ON public.affiliate_products
  FOR DELETE
  TO authenticated
  USING (public.is_admin());
INSERT INTO public.admin_users (user_id)
SELECT id FROM auth.users
WHERE email = 'user@domain.com';
CREATE INDEX IF NOT EXISTS idx_affiliate_products_active_sort
  ON public.affiliate_products (is_active, sort_order);
SELECT COUNT(*) AS total_products,
       COUNT(*) FILTER (WHERE is_active = true) AS active_products
FROM affiliate_products;
SELECT policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'affiliate_products'
ORDER BY policyname;
SELECT EXISTS (
  SELECT 1 FROM information_schema.table_privileges
  WHERE grantee = 'authenticated'
  AND table_name = 'affiliate_products'
  AND privilege_type = 'SELECT'
) AS authenticated_has_select_grant;
