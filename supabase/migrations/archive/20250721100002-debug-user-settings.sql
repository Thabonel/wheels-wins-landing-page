-- Debug script to check user_settings table status

-- Check if user_settings table exists
SELECT 
    table_name,
    table_schema
FROM information_schema.tables 
WHERE table_name = 'user_settings' 
    AND table_schema = 'public';

-- Check the columns if table exists
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_settings' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check RLS policies
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
WHERE tablename = 'user_settings' 
    AND schemaname = 'public';

-- Check if any records exist
SELECT COUNT(*) as total_settings FROM public.user_settings;

-- Check current user
SELECT auth.uid() as current_user_id;