-- Single query to check all community tables existence
-- Run this in Supabase SQL Editor

SELECT
    EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'community_tips'
    ) as community_tips_exists,

    EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'tip_usage_log'
    ) as tip_usage_log_exists,

    EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'user_contribution_stats'
    ) as user_contribution_stats_exists;

-- Expected result if all tables exist:
-- community_tips_exists: true
-- tip_usage_log_exists: true
-- user_contribution_stats_exists: true
