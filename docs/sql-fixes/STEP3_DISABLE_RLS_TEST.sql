ALTER TABLE public.affiliate_products DISABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.affiliate_products TO public;
SELECT 'RLS DISABLED - if this works, the issue is RLS policies' as status;
SELECT COUNT(*) as product_count FROM public.affiliate_products WHERE is_active = true;
