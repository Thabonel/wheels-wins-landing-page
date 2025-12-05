-- Step 1: See what tables actually exist in your database
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = 'public'
     AND table_name = t.table_name
     AND column_name = 'user_id') as has_user_id_column,
    (SELECT COUNT(*) FROM information_schema.table_constraints
     WHERE table_schema = 'public'
     AND table_name = t.table_name
     AND constraint_type = 'PRIMARY KEY') as has_primary_key
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Step 2: See what RLS policies currently exist
SELECT
    tablename,
    policyname,
    cmd as policy_type
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Step 3: Count total policies per table
SELECT
    tablename,
    COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY total_policies DESC, tablename;
