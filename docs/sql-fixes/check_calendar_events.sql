-- Check if there are any calendar events in the system
-- Run this in Supabase SQL Editor to see what appointments exist

-- =============================================================================
-- 1. Count total calendar events
-- =============================================================================
SELECT
    COUNT(*) as total_events,
    COUNT(DISTINCT user_id) as unique_users
FROM calendar_events;

-- =============================================================================
-- 2. Show recent calendar events (last 10)
-- =============================================================================
SELECT
    id,
    user_id,
    title,
    description,
    start_date,
    end_date,
    all_day,
    event_type,
    location_name,
    created_at
FROM calendar_events
ORDER BY created_at DESC
LIMIT 10;

-- =============================================================================
-- 3. Count events by type
-- =============================================================================
SELECT
    event_type,
    COUNT(*) as count
FROM calendar_events
GROUP BY event_type
ORDER BY count DESC;

-- =============================================================================
-- 4. Show events created today
-- =============================================================================
SELECT
    id,
    user_id,
    title,
    start_date,
    created_at
FROM calendar_events
WHERE created_at > CURRENT_DATE
ORDER BY created_at DESC;

-- =============================================================================
-- 5. Check for any events with specific keywords (testing PAM)
-- =============================================================================
SELECT
    id,
    title,
    description,
    start_date,
    created_at
FROM calendar_events
WHERE
    title ILIKE '%dentist%'
    OR title ILIKE '%appointment%'
    OR title ILIKE '%dinner%'
    OR title ILIKE '%test%'
ORDER BY created_at DESC
LIMIT 20;
