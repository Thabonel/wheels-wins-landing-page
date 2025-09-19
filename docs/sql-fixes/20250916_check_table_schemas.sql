-- Check table schemas to identify correct column types
-- This will help us create proper RLS policies

-- Check user_id column types in all affected tables
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN (
    'medical_medications',
    'medical_emergency_info',
    'medical_records',
    'user_trips',
    'trip_template_ratings',
    'storage_categories',
    'storage_locations',
    'storage_items',
    'user_settings',
    'user_subscriptions',
    'profiles'
)
AND column_name LIKE '%user%'
ORDER BY table_name, column_name;

-- Also check if there are any foreign key relationships
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND tc.table_name IN (
    'medical_medications',
    'medical_emergency_info',
    'medical_records',
    'user_trips',
    'trip_template_ratings',
    'storage_categories',
    'storage_locations',
    'storage_items',
    'user_settings',
    'user_subscriptions'
);

-- Check auth.users table structure to understand the correct approach
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'auth'
AND table_name = 'users';

-- Check if profiles table exists and its structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles';