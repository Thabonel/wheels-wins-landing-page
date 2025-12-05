DROP POLICY IF EXISTS "Anyone can view active products" ON public.affiliate_products;
DROP POLICY IF EXISTS "admin_select_all" ON public.affiliate_products;
DROP POLICY IF EXISTS "Public can view active products" ON public.affiliate_products;
DROP POLICY IF EXISTS "Admins can view all products" ON public.affiliate_products;
CREATE POLICY "Anyone can view active products" ON public.affiliate_products AS PERMISSIVE FOR SELECT TO authenticated, anon USING (is_active = true);
