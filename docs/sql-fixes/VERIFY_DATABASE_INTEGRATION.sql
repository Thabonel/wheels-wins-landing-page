-- Database Integration Verification Script
-- Verifies that all required tables and data exist for PAM proactive system

-- =============================================================================
-- TABLE EXISTENCE VERIFICATION
-- =============================================================================

-- Check core tables exist
SELECT 'profiles' as table_name, count(*) as record_count FROM profiles
UNION ALL
SELECT 'expenses' as table_name, count(*) as record_count FROM expenses
UNION ALL
SELECT 'budgets' as table_name, count(*) as record_count FROM budgets
UNION ALL
SELECT 'trips' as table_name, count(*) as record_count FROM trips
UNION ALL
SELECT 'fuel_log' as table_name, count(*) as record_count FROM fuel_log
UNION ALL
SELECT 'calendar_events' as table_name, count(*) as record_count FROM calendar_events
UNION ALL
SELECT 'maintenance_records' as table_name, count(*) as record_count FROM maintenance_records;

-- =============================================================================
-- SCHEMA VERIFICATION
-- =============================================================================

-- Verify profiles table schema (CRITICAL: uses 'id' not 'user_id')
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verify other tables use 'user_id' correctly
SELECT
    t.table_name,
    c.column_name,
    c.data_type,
    CASE
        WHEN t.table_name = 'profiles' AND c.column_name = 'id' THEN 'CORRECT'
        WHEN t.table_name != 'profiles' AND c.column_name = 'user_id' THEN 'CORRECT'
        WHEN t.table_name = 'profiles' AND c.column_name = 'user_id' THEN 'ERROR - should be id'
        WHEN t.table_name != 'profiles' AND c.column_name = 'id' AND c.column_name != 'user_id' THEN 'CHECK'
        ELSE 'OK'
    END as status
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
    AND t.table_name IN ('profiles', 'expenses', 'budgets', 'trips', 'fuel_log', 'calendar_events', 'maintenance_records')
    AND c.column_name IN ('id', 'user_id')
ORDER BY t.table_name, c.column_name;

-- =============================================================================
-- DATA QUALITY VERIFICATION
-- =============================================================================

-- Check for active users with complete data
WITH user_data_completeness AS (
    SELECT
        p.id,
        p.email,
        p.status,
        CASE WHEN p.vehicle_type IS NOT NULL THEN 1 ELSE 0 END as has_vehicle_info,
        CASE WHEN e.expense_count > 0 THEN 1 ELSE 0 END as has_expenses,
        CASE WHEN t.trip_count > 0 THEN 1 ELSE 0 END as has_trips,
        CASE WHEN f.fuel_count > 0 THEN 1 ELSE 0 END as has_fuel_logs,
        CASE WHEN c.event_count > 0 THEN 1 ELSE 0 END as has_calendar_events
    FROM profiles p
    LEFT JOIN (SELECT user_id, COUNT(*) as expense_count FROM expenses GROUP BY user_id) e ON p.id = e.user_id
    LEFT JOIN (SELECT user_id, COUNT(*) as trip_count FROM trips GROUP BY user_id) t ON p.id = t.user_id
    LEFT JOIN (SELECT user_id, COUNT(*) as fuel_count FROM fuel_log GROUP BY user_id) f ON p.id = f.user_id
    LEFT JOIN (SELECT user_id, COUNT(*) as event_count FROM calendar_events GROUP BY user_id) c ON p.id = c.user_id
    WHERE p.status = 'active'
)
SELECT
    COUNT(*) as total_active_users,
    SUM(has_vehicle_info) as users_with_vehicle_info,
    SUM(has_expenses) as users_with_expenses,
    SUM(has_trips) as users_with_trips,
    SUM(has_fuel_logs) as users_with_fuel_logs,
    SUM(has_calendar_events) as users_with_calendar_events,
    ROUND(AVG(has_vehicle_info + has_expenses + has_trips + has_fuel_logs + has_calendar_events) * 20, 1) as avg_data_completeness_percent
FROM user_data_completeness;

-- =============================================================================
-- PERFORMANCE INDEX VERIFICATION
-- =============================================================================

-- Check important indexes exist for performance
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'expenses', 'budgets', 'trips', 'fuel_log', 'calendar_events')
    AND (
        indexdef ILIKE '%user_id%' OR
        indexdef ILIKE '%id%' OR
        indexdef ILIKE '%date%' OR
        indexdef ILIKE '%created_at%'
    )
ORDER BY tablename, indexname;

-- =============================================================================
-- RECENT ACTIVITY VERIFICATION
-- =============================================================================

-- Check for recent activity (last 30 days) - needed for proactive monitoring
WITH recent_activity AS (
    SELECT 'expenses' as activity_type, COUNT(*) as count
    FROM expenses
    WHERE created_at >= NOW() - INTERVAL '30 days'

    UNION ALL

    SELECT 'trips' as activity_type, COUNT(*) as count
    FROM trips
    WHERE created_at >= NOW() - INTERVAL '30 days'

    UNION ALL

    SELECT 'calendar_events' as activity_type, COUNT(*) as count
    FROM calendar_events
    WHERE created_at >= NOW() - INTERVAL '30 days'

    UNION ALL

    SELECT 'fuel_logs' as activity_type, COUNT(*) as count
    FROM fuel_log
    WHERE created_at >= NOW() - INTERVAL '30 days'
)
SELECT * FROM recent_activity ORDER BY activity_type;

-- =============================================================================
-- SAMPLE QUERIES FOR PROACTIVE SYSTEM
-- =============================================================================

-- Test monthly spending calculation (sample query)
SELECT
    e.user_id,
    COUNT(*) as expense_count,
    SUM(e.amount) as total_spent,
    DATE_TRUNC('month', e.date) as expense_month
FROM expenses e
WHERE e.date >= DATE_TRUNC('month', CURRENT_DATE)
    AND e.date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
GROUP BY e.user_id, DATE_TRUNC('month', e.date)
ORDER BY total_spent DESC
LIMIT 10;

-- Test fuel level estimation (sample query)
SELECT
    f.user_id,
    f.date,
    f.gallons,
    f.odometer,
    f.mpg,
    ROW_NUMBER() OVER (PARTITION BY f.user_id ORDER BY f.date DESC) as recency_rank
FROM fuel_log f
WHERE f.date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY f.user_id, f.date DESC
LIMIT 20;

-- Test upcoming travel events
SELECT
    c.user_id,
    c.title,
    c.start_date,
    c.location_name,
    EXTRACT(EPOCH FROM (c.start_date - NOW())) / 86400 as days_until_event
FROM calendar_events c
WHERE c.start_date >= NOW()
    AND c.start_date <= NOW() + INTERVAL '30 days'
    AND (
        LOWER(c.title) LIKE '%trip%' OR
        LOWER(c.title) LIKE '%travel%' OR
        LOWER(c.description) LIKE '%trip%' OR
        LOWER(c.description) LIKE '%travel%' OR
        c.location_name IS NOT NULL
    )
ORDER BY c.start_date
LIMIT 10;

-- =============================================================================
-- DATA CONSISTENCY CHECKS
-- =============================================================================

-- Check for orphaned records (expenses without valid users)
SELECT COUNT(*) as orphaned_expenses
FROM expenses e
LEFT JOIN profiles p ON e.user_id = p.id
WHERE p.id IS NULL;

-- Check for invalid foreign key references
SELECT
    'trips' as table_name,
    COUNT(*) as orphaned_records
FROM trips t
LEFT JOIN profiles p ON t.user_id = p.id
WHERE p.id IS NULL

UNION ALL

SELECT
    'fuel_log' as table_name,
    COUNT(*) as orphaned_records
FROM fuel_log f
LEFT JOIN profiles p ON f.user_id = p.id
WHERE p.id IS NULL

UNION ALL

SELECT
    'calendar_events' as table_name,
    COUNT(*) as orphaned_records
FROM calendar_events c
LEFT JOIN profiles p ON c.user_id = p.id
WHERE p.id IS NULL;

-- =============================================================================
-- PERFORMANCE TEST QUERIES
-- =============================================================================

-- Test query performance for batch user retrieval
EXPLAIN ANALYZE
SELECT id, email, full_name, status, vehicle_type, fuel_type
FROM profiles
WHERE status = 'active'
AND id IN (
    SELECT DISTINCT user_id
    FROM expenses
    WHERE created_at >= NOW() - INTERVAL '30 days'
)
LIMIT 50;

-- Test query performance for spending analysis
EXPLAIN ANALYZE
SELECT
    user_id,
    SUM(amount) as total_amount,
    COUNT(*) as expense_count
FROM expenses
WHERE date >= DATE_TRUNC('month', CURRENT_DATE)
    AND date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
    AND user_id = (SELECT id FROM profiles WHERE status = 'active' LIMIT 1)
GROUP BY user_id;

-- =============================================================================
-- VERIFICATION SUMMARY
-- =============================================================================

-- Final verification summary
WITH verification_summary AS (
    SELECT
        (SELECT COUNT(*) FROM profiles WHERE status = 'active') as active_users,
        (SELECT COUNT(*) FROM expenses WHERE created_at >= NOW() - INTERVAL '7 days') as recent_expenses,
        (SELECT COUNT(*) FROM trips WHERE created_at >= NOW() - INTERVAL '7 days') as recent_trips,
        (SELECT COUNT(*) FROM calendar_events WHERE start_date >= NOW() AND start_date <= NOW() + INTERVAL '30 days') as upcoming_events,
        (SELECT COUNT(*) FROM fuel_log WHERE created_at >= NOW() - INTERVAL '7 days') as recent_fuel_logs
)
SELECT
    'DATABASE INTEGRATION VERIFICATION COMPLETE' as status,
    active_users,
    recent_expenses,
    recent_trips,
    upcoming_events,
    recent_fuel_logs,
    CASE
        WHEN active_users > 0 AND (recent_expenses > 0 OR recent_trips > 0 OR upcoming_events > 0 OR recent_fuel_logs > 0)
        THEN 'READY FOR PROACTIVE SYSTEM'
        ELSE 'NEEDS MORE DATA FOR OPTIMAL OPERATION'
    END as readiness_status
FROM verification_summary;