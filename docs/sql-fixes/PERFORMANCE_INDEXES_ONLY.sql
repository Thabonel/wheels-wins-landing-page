-- PERFORMANCE INDEXES ONLY - Quick Fix
-- Date: January 31, 2026
-- Adds performance indexes without referencing non-existent columns

-- =============================================================================
-- PERFORMANCE INDEXES (Fixed for actual table structure)
-- =============================================================================

-- User profile performance (without active column)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id_created
ON profiles(user_id, created_at DESC);

-- Expense tracking performance
CREATE INDEX IF NOT EXISTS idx_expenses_user_date_desc
ON expenses(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_recent
ON expenses(user_id, date DESC)
WHERE date >= CURRENT_DATE - INTERVAL '30 days';

-- Budget performance
CREATE INDEX IF NOT EXISTS idx_budgets_user_period
ON budgets(user_id, period_start, period_end);

-- PAM conversation performance
CREATE INDEX IF NOT EXISTS idx_pam_conversations_user_created
ON pam_conversations(user_id, created_at DESC);

-- Calendar performance (this is the most important for PAM)
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_upcoming
ON calendar_events(user_id, start_date)
WHERE start_date >= NOW();

CREATE INDEX IF NOT EXISTS idx_calendar_events_date_range
ON calendar_events(start_date, end_date);

-- Vehicle performance
CREATE INDEX IF NOT EXISTS idx_vehicles_user_created
ON vehicles(user_id, created_at DESC);

-- Social features performance
CREATE INDEX IF NOT EXISTS idx_social_posts_user_created
ON social_posts(user_id, created_at DESC);

-- Trip planning performance
CREATE INDEX IF NOT EXISTS idx_trips_user_start_date
ON trips(user_id, start_date DESC);

-- Update statistics for query planning
ANALYZE profiles;
ANALYZE expenses;
ANALYZE budgets;
ANALYZE calendar_events;
ANALYZE pam_conversations;

-- Verification
SELECT
    indexname,
    tablename,
    '✅ PERFORMANCE INDEX CREATED' as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%_user_%'
ORDER BY tablename, indexname;