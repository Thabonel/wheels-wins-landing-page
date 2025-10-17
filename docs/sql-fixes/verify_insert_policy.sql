SELECT
    policyname,
    cmd,
    qual as using_clause,
    with_check
FROM pg_policies
WHERE tablename = 'calendar_events'
ORDER BY policyname;
