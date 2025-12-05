BEGIN;

DROP POLICY IF EXISTS public_select_active ON public.affiliate_products;
DROP POLICY IF EXISTS admin_select_all ON public.affiliate_products;
DROP POLICY IF EXISTS admin_insert ON public.affiliate_products;
DROP POLICY IF EXISTS admin_update ON public.affiliate_products;
DROP POLICY IF EXISTS admin_delete ON public.affiliate_products;

CREATE POLICY public_select_active
  ON public.affiliate_products
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY admin_full_access
  ON public.affiliate_products
  FOR ALL
  TO authenticated
  USING (
    (current_setting('request.jwt.claims', true)::json->>'role')::text = 'admin'
  )
  WITH CHECK (
    (current_setting('request.jwt.claims', true)::json->>'role')::text = 'admin'
  );

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'affiliate_products'
ORDER BY policyname;

COMMIT;
