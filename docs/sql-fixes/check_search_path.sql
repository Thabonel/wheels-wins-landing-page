-- Check search_path for different roles
-- This determines which schemas are searched when queries don't specify schema names

-- 1. Show current search path
SHOW search_path;

-- 2. Check search_path configuration for authenticated role
SELECT
    rolname,
    rolconfig
FROM pg_roles
WHERE rolname IN ('authenticated', 'anon', 'service_role', 'postgres', 'authenticator');

-- 3. Check if storage schema is accessible
SELECT has_schema_privilege('authenticated', 'storage', 'USAGE') as can_use_storage_schema;

-- 4. Check if authenticated can access storage.objects
SELECT has_table_privilege('authenticated', 'storage.objects', 'INSERT') as can_insert_objects;
