-- Diagnostic Query to Find UUID vs BIGINT Issues
-- This will help identify exactly which table is causing the error

-- Step 1: Check all user_id column types across all tables
SELECT
    t.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    CASE
        WHEN c.data_type = 'uuid' THEN '✅ Correct for auth.uid()'
        WHEN c.data_type = 'bigint' THEN '⚠️  Needs special handling'
        ELSE '❓ Unexpected type'
    END as compatibility_status
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
AND c.table_schema = 'public'
AND c.column_name IN ('user_id', 'id')
AND t.table_name IN (
    'medical_medications', 'medical_emergency_info', 'medical_records',
    'user_trips', 'trip_template_ratings', 'storage_categories',
    'storage_locations', 'storage_items', 'user_settings', 'user_subscriptions'
)
ORDER BY
    CASE
        WHEN c.data_type = 'uuid' THEN 1
        WHEN c.data_type = 'bigint' THEN 2
        ELSE 3
    END,
    t.table_name;

-- Step 2: Show which tables actually exist
SELECT
    table_name,
    CASE
        WHEN table_name IN (
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
        ) THEN '✅ Exists'
        ELSE '❌ Missing'
    END as status
FROM (
    VALUES
        ('medical_medications'),
        ('medical_emergency_info'),
        ('medical_records'),
        ('user_trips'),
        ('trip_template_ratings'),
        ('storage_categories'),
        ('storage_locations'),
        ('storage_items'),
        ('user_settings'),
        ('user_subscriptions')
) AS expected_tables(table_name)
ORDER BY status DESC, table_name;

-- Step 3: Check for any existing policies that might be problematic
SELECT
    schemaname,
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'medical_medications', 'medical_emergency_info', 'medical_records',
    'user_trips', 'trip_template_ratings', 'storage_categories',
    'storage_locations', 'storage_items', 'user_settings', 'user_subscriptions'
)
ORDER BY tablename, policyname;

-- Step 4: Test auth.uid() function
SELECT
    auth.uid() as current_user_id,
    pg_typeof(auth.uid()) as auth_uid_type;

-- Step 5: If we want to test a simple policy creation on a known table
-- Uncomment this to test policy creation on user_settings:

/*
DO $$
BEGIN
    -- Test creating a simple policy
    DROP POLICY IF EXISTS "test_policy" ON public.user_settings;
    CREATE POLICY "test_policy" ON public.user_settings
        FOR SELECT TO authenticated
        USING (auth.uid() = user_id);

    RAISE NOTICE 'Test policy created successfully';

    -- Clean up
    DROP POLICY "test_policy" ON public.user_settings;
    RAISE NOTICE 'Test policy dropped successfully';

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Test policy failed: %', SQLERRM;
END $$;
*/