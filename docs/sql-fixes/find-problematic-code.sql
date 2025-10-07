SELECT
    n.nspname as schema,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
    pg_get_functiondef(p.oid) LIKE '%bigint%uuid%'
    OR pg_get_functiondef(p.oid) LIKE '%uuid%bigint%'
    OR pg_get_functiondef(p.oid) LIKE '%COUNT(*)%=%'
  )
ORDER BY p.proname;
