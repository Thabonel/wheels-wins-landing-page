SELECT
    proname as function_name,
    prosrc as source_code
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND proname LIKE '%health%'
ORDER BY proname;
