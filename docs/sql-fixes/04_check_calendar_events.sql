-- Check if calendar_events table exists and what columns it has
-- This will help us understand the column name mismatch

-- Check if table exists
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'calendar_events';

-- If it exists, show all columns
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'calendar_events'
ORDER BY ordinal_position;

-- Check indexes on calendar_events
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'calendar_events';
