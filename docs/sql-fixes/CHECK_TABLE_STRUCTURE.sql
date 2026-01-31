-- CHECK TABLE STRUCTURE - Diagnostic
-- Find out what columns actually exist before creating indexes

-- Check profiles table structure
SELECT
    'profiles' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Check expenses table structure
SELECT
    'expenses' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'expenses'
ORDER BY ordinal_position;

-- Check calendar_events table structure
SELECT
    'calendar_events' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'calendar_events'
ORDER BY ordinal_position;

-- Check pam_conversations table structure
SELECT
    'pam_conversations' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'pam_conversations'
ORDER BY ordinal_position;

-- Check what tables actually exist
SELECT
    table_name,
    'Table exists' as status
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN ('profiles', 'expenses', 'calendar_events', 'pam_conversations', 'budgets', 'trips', 'vehicles', 'social_posts')
ORDER BY table_name;