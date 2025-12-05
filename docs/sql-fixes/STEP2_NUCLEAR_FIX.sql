ALTER TABLE public.affiliate_products DISABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'affiliate_products'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.affiliate_products', pol.policyname);
  END LOOP;
END $$;

GRANT USAGE ON SCHEMA public TO public;
GRANT SELECT ON public.affiliate_products TO public;

ALTER TABLE public.affiliate_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_can_read_active" ON public.affiliate_products AS PERMISSIVE FOR SELECT TO public USING (is_active = true);

SELECT 'Fix applied. Verifying...' as status;
SELECT COUNT(*) as product_count FROM public.affiliate_products WHERE is_active = true;
