-- Check existing buckets and search path configuration

-- 1. List all existing storage buckets
SELECT id, name, public, created_at
FROM storage.buckets
ORDER BY created_at DESC;

-- 2. Check current search path
SHOW search_path;

-- 3. Check if storage schema is in search path for authenticated role
SELECT rolname, rolconfig
FROM pg_roles
WHERE rolname IN ('authenticated', 'anon', 'service_role', 'postgres');

-- 4. Try to select from storage.objects (should work with qualified name)
SELECT count(*) as total_objects
FROM storage.objects;

-- 5. Check storage bucket permissions
SELECT schemaname, tablename, tableowner
FROM pg_tables
WHERE schemaname = 'storage'
  AND tablename IN ('buckets', 'objects');

-- 6. Check if there are any RLS policies on storage.objects
SELECT schemaname, tablename, policyname, permissive, roles
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects';
