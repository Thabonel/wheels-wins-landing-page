-- FINAL SAFE PERFORMANCE INDEXES
-- Date: January 31, 2026
-- Based on actual table structure, no immutable function issues

-- =============================================================================
-- CALENDAR PERFORMANCE (Critical for PAM)
-- =============================================================================

-- User's calendar events ordered by date (most important for PAM queries)
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_start_date
ON calendar_events(user_id, start_date DESC);

-- Calendar events date range queries
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_date
ON calendar_events(start_date);

-- User's recent calendar activity
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_created
ON calendar_events(user_id, created_at DESC);

-- =============================================================================
-- EXPENSE TRACKING PERFORMANCE
-- =============================================================================

-- User's expenses by date (frequent PAM financial queries)
CREATE INDEX IF NOT EXISTS idx_expenses_user_date
ON expenses(user_id, date DESC);

-- User's expenses by expense_date (alternative date column)
CREATE INDEX IF NOT EXISTS idx_expenses_user_expense_date
ON expenses(user_id, expense_date DESC);

-- Expense category analysis
CREATE INDEX IF NOT EXISTS idx_expenses_user_category
ON expenses(user_id, category);

-- Recent expense activity
CREATE INDEX IF NOT EXISTS idx_expenses_user_created
ON expenses(user_id, created_at DESC);

-- =============================================================================
-- PAM CONVERSATION PERFORMANCE
-- =============================================================================

-- Active PAM conversations (most important for PAM system)
CREATE INDEX IF NOT EXISTS idx_pam_conversations_user_active
ON pam_conversations(user_id, is_active, last_activity DESC);

-- PAM conversation history
CREATE INDEX IF NOT EXISTS idx_pam_conversations_user_created
ON pam_conversations(user_id, created_at DESC);

-- Session-based PAM queries
CREATE INDEX IF NOT EXISTS idx_pam_conversations_session_user
ON pam_conversations(session_id, user_id);

-- =============================================================================
-- USER PROFILE PERFORMANCE
-- =============================================================================

-- Profile lookup by ID (primary key already indexed, but ensure created_at)
CREATE INDEX IF NOT EXISTS idx_profiles_created_at
ON profiles(created_at DESC);

-- Active user profiles by last activity
CREATE INDEX IF NOT EXISTS idx_profiles_last_active
ON profiles(last_active DESC);

-- Email-based profile lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email
ON profiles(email);

-- =============================================================================
-- UPDATE STATISTICS FOR OPTIMAL QUERY PLANNING
-- =============================================================================

ANALYZE calendar_events;
ANALYZE expenses;
ANALYZE pam_conversations;
ANALYZE profiles;

-- =============================================================================
-- VERIFICATION - Check indexes were created successfully
-- =============================================================================

SELECT
    schemaname,
    tablename,
    indexname,
    '✅ PERFORMANCE INDEX CREATED' as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexname LIKE 'idx_calendar_%' OR
    indexname LIKE 'idx_expenses_%' OR
    indexname LIKE 'idx_pam_%' OR
    indexname LIKE 'idx_profiles_%'
  )
ORDER BY tablename, indexname;

-- Test calendar functionality for PAM
SELECT
    COUNT(*) as total_calendar_events,
    COUNT(*) FILTER (WHERE start_date >= CURRENT_DATE) as upcoming_events,
    '✅ CALENDAR READY FOR PAM' as status
FROM calendar_events
WHERE user_id = auth.uid();