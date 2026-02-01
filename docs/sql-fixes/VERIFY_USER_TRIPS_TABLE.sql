-- Verification Script: Check if user_trips table exists and has correct schema
-- Run this in Supabase SQL Editor to verify the PAM trip editing backend support

-- 1. Check if user_trips table exists
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE tablename = 'user_trips' AND schemaname = 'public';

-- 2. Check table structure and columns
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_trips'
ORDER BY ordinal_position;

-- 3. Check constraints
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public' AND tc.table_name = 'user_trips';

-- 4. Check indexes
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'user_trips' AND schemaname = 'public';

-- 5. Check RLS status
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'user_trips' AND schemaname = 'public';

-- 6. Check RLS policies
SELECT
    pol.policyname,
    pol.roles,
    pol.cmd,
    pol.qual,
    pol.with_check
FROM pg_policies pol
WHERE pol.tablename = 'user_trips' AND pol.schemaname = 'public';

-- 7. Test if table is accessible (this should work with service role)
SELECT COUNT(*) as total_trips FROM user_trips;

-- 8. Check if there are any existing PAM trips
SELECT
    id,
    title,
    created_at,
    metadata->'created_by' as created_by,
    status
FROM user_trips
WHERE metadata->>'created_by' = 'pam_ai'
ORDER BY created_at DESC
LIMIT 5;