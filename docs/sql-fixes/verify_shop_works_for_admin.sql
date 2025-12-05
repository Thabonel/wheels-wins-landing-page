-- Quick test to verify shop works for admin user

-- 1. Test if the admin check function recognizes you
SELECT 'Testing admin recognition:' as status;
SELECT public.check_user_is_admin_from_jwt() as should_be_true;

-- 2. Count products you can see as admin
SELECT 'Products visible as admin:' as status;
SELECT COUNT(*) as should_see_81_products
FROM public.affiliate_products
WHERE is_active = true;

-- 3. Test the specific RLS policies
SELECT 'Testing RLS policies:' as status;
SELECT
    policyname,
    cmd as operation,
    roles
FROM pg_policies
WHERE tablename = 'affiliate_products'
ORDER BY policyname;

-- 4. Show a few actual products to confirm data access
SELECT 'Sample accessible products:' as status;
SELECT title, price, category
FROM public.affiliate_products
WHERE is_active = true
LIMIT 3;