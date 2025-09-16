SELECT COUNT(*) as remaining_inefficient_policies
FROM pg_policies
WHERE (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%')
AND qual NOT LIKE '%(select auth.uid())%'
AND (with_check IS NULL OR with_check NOT LIKE '%(select auth.uid())%')
AND schemaname = 'public';

SELECT COUNT(*) as optimized_policies
FROM pg_policies
WHERE (qual LIKE '%(select auth.uid())%' OR with_check LIKE '%(select auth.uid())%')
AND schemaname = 'public';