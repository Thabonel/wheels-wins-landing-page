-- Verification script: Check if community tips tables exist
-- Run this in Supabase SQL Editor to verify migration status

-- Check if community_tips table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'community_tips'
) as community_tips_exists;

-- Check if tip_usage_log table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'tip_usage_log'
) as tip_usage_log_exists;

-- Check if user_contribution_stats table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'user_contribution_stats'
) as user_contribution_stats_exists;

-- If all three return 'true', migration is applied
-- If any return 'false', you need to run: docs/sql-fixes/apply_community_tables.sql
