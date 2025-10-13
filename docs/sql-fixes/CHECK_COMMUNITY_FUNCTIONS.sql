-- Verify all community database functions exist
-- Run this in Supabase SQL Editor

SELECT
    EXISTS (
        SELECT FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'search_community_tips'
    ) as search_community_tips_exists,

    EXISTS (
        SELECT FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'get_user_contribution_stats'
    ) as get_user_contribution_stats_exists,

    EXISTS (
        SELECT FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'get_community_stats'
    ) as get_community_stats_exists;

-- Expected result if all functions exist:
-- search_community_tips_exists: true
-- get_user_contribution_stats_exists: true
-- get_community_stats_exists: true
