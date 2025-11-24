ALTER TABLE public.affiliate_product_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_insert_clicks
  ON public.affiliate_product_clicks
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
CREATE POLICY admin_select_clicks
  ON public.affiliate_product_clicks
  FOR SELECT
  TO authenticated
  USING (public.is_admin());
CREATE POLICY user_select_own_clicks
  ON public.affiliate_product_clicks
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'affiliate_product_clicks'
ORDER BY policyname;
