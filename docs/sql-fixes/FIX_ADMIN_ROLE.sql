DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin') THEN
    CREATE ROLE admin NOLOGIN;
    RAISE NOTICE 'Created admin role';
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO admin;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO admin;
GRANT SELECT ON public.affiliate_products TO admin;

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

ALTER TABLE public.affiliate_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_active_products" ON public.affiliate_products FOR SELECT USING (is_active = true);

SELECT 'Done. Grants and policy applied for admin role.' as status;
