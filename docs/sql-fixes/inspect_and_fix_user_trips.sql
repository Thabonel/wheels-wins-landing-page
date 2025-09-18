-- Inspect and Fix user_trips Table
-- Run this to see what exists and what needs to be added

-- 1. Check if user_trips table exists and show its structure
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'user_trips'
    ) INTO table_exists;

    IF table_exists THEN
        RAISE NOTICE '✅ user_trips table exists';
    ELSE
        RAISE NOTICE '❌ user_trips table does NOT exist';
    END IF;
END $$;

-- 2. Show current table structure if it exists
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_trips' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Show current RLS policies
SELECT
    policyname,
    cmd,
    permissive,
    roles,
    qual
FROM pg_policies
WHERE tablename = 'user_trips'
ORDER BY policyname;

-- 4. Check if RLS is enabled
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'user_trips' AND schemaname = 'public';

-- 5. Count any existing data
SELECT
    'user_trips' as table_name,
    COUNT(*) as row_count
FROM user_trips
WHERE EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_name = 'user_trips' AND table_schema = 'public'
);

-- 6. Test a basic query to see if permissions work
SELECT
    'Testing basic query...' as status,
    COUNT(*) as accessible_rows
FROM user_trips
WHERE user_id = auth.uid()
LIMIT 1;