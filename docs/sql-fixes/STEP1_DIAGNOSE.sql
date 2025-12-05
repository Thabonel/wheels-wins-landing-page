SELECT '=== STEP 1: Check if table exists ===' as diagnostic;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'affiliate_products';

SELECT '=== STEP 2: Check RLS status ===' as diagnostic;
SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'affiliate_products';

SELECT '=== STEP 3: List ALL policies on affiliate_products ===' as diagnostic;
SELECT policyname, permissive, roles, cmd, qual FROM pg_policies WHERE tablename = 'affiliate_products';

SELECT '=== STEP 4: Check table grants ===' as diagnostic;
SELECT grantee, privilege_type FROM information_schema.table_privileges WHERE table_name = 'affiliate_products';

SELECT '=== STEP 5: Check if admin function exists ===' as diagnostic;
SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE '%admin%';

SELECT '=== STEP 6: Check admin_users table ===' as diagnostic;
SELECT COUNT(*) as admin_count FROM public.admin_users;

SELECT '=== STEP 7: Test simple count (if this fails, its the base issue) ===' as diagnostic;
SELECT COUNT(*) as product_count FROM public.affiliate_products;
