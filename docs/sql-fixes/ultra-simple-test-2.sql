SELECT
    p.tablename::text,
    p.schemaname::text,
    p.policyname::text,
    pg_typeof(p.tablename) as tablename_type,
    pg_typeof(p.schemaname) as schemaname_type
FROM pg_policies p
WHERE p.schemaname = 'public'
LIMIT 3;
