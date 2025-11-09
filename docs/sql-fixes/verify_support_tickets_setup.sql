-- Diagnostic query to check support_tickets table setup

-- 1. Check table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_name = 'support_tickets'
) AS table_exists;

-- 2. Check RLS is enabled
SELECT relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname = 'support_tickets';

-- 3. Check existing policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'support_tickets';

-- 4. Check user_id column type
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'support_tickets' AND column_name = 'user_id';
