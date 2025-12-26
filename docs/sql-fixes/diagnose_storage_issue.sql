-- Diagnostic queries for Supabase Storage issue
-- Error: relation "objects" does not exist

-- 1. Check if storage schema exists
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name = 'storage';

-- 2. Check if storage.objects table exists
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'storage'
  AND table_name = 'objects';

-- 3. Check if storage.buckets table exists
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'storage'
  AND table_name = 'buckets';

-- 4. List all tables in storage schema (if it exists)
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'storage'
ORDER BY table_name;

-- 5. Check installed extensions
SELECT extname, extversion
FROM pg_extension
WHERE extname LIKE '%storage%';

-- 6. Check if supabase_storage extension is available
SELECT name
FROM pg_available_extensions
WHERE name LIKE '%storage%';
