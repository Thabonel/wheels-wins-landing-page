ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_admin_check_read" ON public.admin_users;
DROP POLICY IF EXISTS "Users can check own admin status" ON public.admin_users;
CREATE POLICY "Users can check own admin status" ON public.admin_users AS PERMISSIVE FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "admin_select_all" ON public.affiliate_products;
CREATE POLICY "admin_select_all" ON public.affiliate_products AS PERMISSIVE FOR SELECT TO authenticated USING ((SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.user_id = (SELECT auth.uid()) AND admin_users.role = 'admin' AND admin_users.status = 'active')));
