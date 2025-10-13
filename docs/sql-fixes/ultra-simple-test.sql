SELECT
    t.tablename::text,
    t.schemaname::text,
    t.rowsecurity::text,
    pg_typeof(t.tablename) as tablename_type,
    pg_typeof(t.schemaname) as schemaname_type
FROM pg_tables t
WHERE t.schemaname = 'public'
LIMIT 3;
