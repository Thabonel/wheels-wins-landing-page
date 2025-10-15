-- Diagnostic queries for calendar_events permission issue

-- 1. Check if calendar_events table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'calendar_events'
) as table_exists;

-- 2. Check RLS status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'calendar_events';

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
WHERE tablename = 'calendar_events';

-- 4. Count total calendar events in database
SELECT COUNT(*) as total_events
FROM calendar_events;

-- 5. Check events for your specific user_id
SELECT
    id,
    user_id,
    title,
    start_date,
    end_date,
    event_type,
    created_at
FROM calendar_events
WHERE user_id = '21a2151a-cd37-41d5-a1c7-124bb05e7a6a'
ORDER BY created_at DESC
LIMIT 10;

-- 6. Check your profile role
SELECT id, email, role
FROM profiles
WHERE id = '21a2151a-cd37-41d5-a1c7-124bb05e7a6a';

-- 7. Test auth.uid() function
SELECT auth.uid() as current_user_id;

-- 8. Check if you can access profiles table
SELECT COUNT(*) as can_read_profiles
FROM profiles
WHERE id = auth.uid();
