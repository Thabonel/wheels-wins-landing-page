-- Database Performance Optimization Phase 2
-- Date: January 31, 2026
-- Addresses: Duplicate indexes, Auth performance, Missing RLS policies
-- Status: PRODUCTION READY

BEGIN;

-- =============================================================================
-- 1. REMOVE DUPLICATE AND UNUSED INDEXES
-- =============================================================================

-- Remove duplicate and unnecessary indexes identified by Supabase linter
DROP INDEX IF EXISTS idx_fuel_logs_vehicle_id;
DROP INDEX IF EXISTS post_shares_post_id_index;
DROP INDEX IF EXISTS idx_manual_chunks_content_search;
DROP INDEX IF EXISTS idx_manual_chunks_manual_title;
DROP INDEX IF EXISTS idx_wis_search_queries_created_at;
DROP INDEX IF EXISTS idx_wis_chunks_updated_at;
DROP INDEX IF EXISTS idx_wis_procedures_created_at;
DROP INDEX IF EXISTS idx_wis_procedures_updated_at;
DROP INDEX IF EXISTS idx_wis_parts_created_at;
DROP INDEX IF EXISTS idx_wis_parts_updated_at;
DROP INDEX IF EXISTS idx_posts_visibility;
DROP INDEX IF EXISTS idx_posts_post_type;
DROP INDEX IF EXISTS idx_posts_created_at;
DROP INDEX IF EXISTS idx_wis_sessions_user_id;
DROP INDEX IF EXISTS idx_wis_sessions_server_id;
DROP INDEX IF EXISTS idx_wis_sessions_status;
DROP INDEX IF EXISTS idx_wis_sessions_created_at;
DROP INDEX IF EXISTS idx_wis_sessions_updated_at;
DROP INDEX IF EXISTS idx_wis_usage_logs_user_id;
DROP INDEX IF EXISTS idx_wis_usage_logs_session_id;
DROP INDEX IF EXISTS idx_gpx_tracks_bounds;
DROP INDEX IF EXISTS idx_gpx_track_points_track_id;
DROP INDEX IF EXISTS idx_gpx_track_points_index;
DROP INDEX IF EXISTS idx_gpx_track_points_location;
DROP INDEX IF EXISTS idx_gpx_tracks_trip_id;
DROP INDEX IF EXISTS idx_gpx_tracks_created_at;
DROP INDEX IF EXISTS idx_gpx_waypoints_trip_id;
DROP INDEX IF EXISTS idx_gpx_waypoints_track_id;
DROP INDEX IF EXISTS idx_gpx_waypoints_location;
DROP INDEX IF EXISTS idx_trip_emergency_alerts_severity_created;
DROP INDEX IF EXISTS posts_user_id_index;
DROP INDEX IF EXISTS idx_wis_usage_logs_created_at;
DROP INDEX IF EXISTS idx_wis_servers_status;
DROP INDEX IF EXISTS idx_wis_servers_created_at;
DROP INDEX IF EXISTS idx_community_posts_category_created;
DROP INDEX IF EXISTS idx_posts_user_id_created_at;
DROP INDEX IF EXISTS idx_posts_metadata;
DROP INDEX IF EXISTS idx_user_subscriptions_backup_status;

-- =============================================================================
-- 2. ADD HIGH-PERFORMANCE INDEXES FOR CRITICAL QUERIES
-- =============================================================================

-- User authentication and profile performance (addresses auth RLS performance)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_user_id_active ON profiles(user_id) WHERE active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_updated_at_desc ON profiles(updated_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_settings_user_id_active ON user_settings(user_id);

-- Expense tracking performance (most frequent queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_user_date_desc ON expenses(user_id, date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_category_user ON expenses(category, user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_recent ON expenses(user_id, date DESC) WHERE date >= CURRENT_DATE - INTERVAL '30 days';

-- Budget performance (critical for PAM financial analysis)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_budgets_user_period ON budgets(user_id, period_start, period_end);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_budgets ON budgets(user_id, category) WHERE is_active = true AND period_end >= CURRENT_DATE;

-- PAM conversation performance (WebSocket real-time queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pam_conversations_user_active ON pam_conversations(user_id, created_at DESC) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pam_messages_conversation_time ON pam_messages(conversation_id, timestamp DESC);

-- Trip planning performance (frequent PAM queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trips_user_status_start ON trips(user_id, status, start_date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trip_templates_public_rating ON trip_templates(average_rating DESC NULLS LAST) WHERE is_public = true;

-- Social features performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_social_posts_public_recent ON social_posts(created_at DESC) WHERE is_public = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_social_comments_post_time ON social_comments(post_id, created_at DESC);

-- Vehicle and maintenance (PAM proactive monitoring)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_user_active ON vehicles(user_id) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fuel_logs_vehicle_date_desc ON fuel_logs(vehicle_id, fill_date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicle_maintenance_vehicle_next ON vehicle_maintenance(vehicle_id, next_maintenance_date) WHERE next_maintenance_date >= CURRENT_DATE;

-- =============================================================================
-- 3. ADD MISSING RLS POLICIES FOR SECURITY
-- =============================================================================

-- Content moderation table (admin-only access)
ALTER TABLE IF EXISTS public.content_moderation ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_moderation' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Admin users can manage content moderation" ON public.content_moderation;

        CREATE POLICY "Admin users can manage content moderation"
        ON public.content_moderation FOR ALL
        USING (
            EXISTS (
                SELECT 1 FROM auth.users
                WHERE auth.users.id = auth.uid()
                AND (
                    auth.users.email LIKE '%@wheelsandwins.%' OR
                    auth.users.email IN ('barry.tong1@outlook.com', 'admin@wheelsandwins.com', 'thabonel0@gmail.com') OR
                    (auth.users.raw_user_meta_data->>'is_admin')::boolean = true
                )
            )
        );
    END IF;
END $$;

-- Support tickets table (user can see own + admin can see all)
ALTER TABLE IF EXISTS public.support_tickets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'support_tickets' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Users can manage own support tickets" ON public.support_tickets;
        DROP POLICY IF EXISTS "Admins can manage all support tickets" ON public.support_tickets;

        CREATE POLICY "Users can manage own support tickets"
        ON public.support_tickets FOR ALL
        USING (user_id = auth.uid());

        CREATE POLICY "Admins can manage all support tickets"
        ON public.support_tickets FOR ALL
        USING (
            EXISTS (
                SELECT 1 FROM auth.users
                WHERE auth.users.id = auth.uid()
                AND (
                    auth.users.email LIKE '%@wheelsandwins.%' OR
                    auth.users.email IN ('barry.tong1@outlook.com', 'admin@wheelsandwins.com', 'thabonel0@gmail.com') OR
                    (auth.users.raw_user_meta_data->>'is_admin')::boolean = true
                )
            )
        );
    END IF;
END $$;

-- User activity logs (admin-only access for analytics)
ALTER TABLE IF EXISTS public.user_activity_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_activity_logs' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Admin users can view activity logs" ON public.user_activity_logs;

        CREATE POLICY "Admin users can view activity logs"
        ON public.user_activity_logs FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM auth.users
                WHERE auth.users.id = auth.uid()
                AND (
                    auth.users.email LIKE '%@wheelsandwins.%' OR
                    auth.users.email IN ('barry.tong1@outlook.com', 'admin@wheelsandwins.com', 'thabonel0@gmail.com') OR
                    (auth.users.raw_user_meta_data->>'is_admin')::boolean = true
                )
            )
        );
    END IF;
END $$;

-- =============================================================================
-- 4. OPTIMIZE AUTH PERFORMANCE WITH SPECIFIC INDEXES
-- =============================================================================

-- Critical auth.users lookup performance (addresses auth RLS performance issues)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auth_users_email_domain ON auth.users(email) WHERE email LIKE '%@wheelsandwins.%';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auth_users_admin_emails ON auth.users(id) WHERE email IN ('barry.tong1@outlook.com', 'admin@wheelsandwins.com', 'thabonel0@gmail.com');
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auth_users_is_admin ON auth.users(id) WHERE (raw_user_meta_data->>'is_admin')::boolean = true;

-- Profile lookup optimization (most common auth operation)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_auth_lookup ON profiles(user_id, active) WHERE active = true;

-- =============================================================================
-- 5. UPDATE TABLE STATISTICS FOR OPTIMAL QUERY PLANNING
-- =============================================================================

-- Update statistics for all critical tables
ANALYZE profiles;
ANALYZE user_settings;
ANALYZE expenses;
ANALYZE budgets;
ANALYZE pam_conversations;
ANALYZE pam_messages;
ANALYZE trips;
ANALYZE vehicles;
ANALYZE fuel_logs;
ANALYZE social_posts;
ANALYZE social_comments;
ANALYZE trip_templates;

COMMIT;

-- =============================================================================
-- 6. VERIFICATION QUERIES
-- =============================================================================

-- Check that duplicate indexes were removed successfully
SELECT
    schemaname,
    tablename,
    indexname,
    '🗑️ REMOVED' as status
FROM pg_indexes
WHERE schemaname = 'public'
    AND indexname IN (
        'idx_fuel_logs_vehicle_id', 'post_shares_post_id_index', 'posts_user_id_index',
        'idx_posts_created_at', 'idx_posts_visibility'
    );

-- Check that performance indexes were created successfully
SELECT
    schemaname,
    tablename,
    indexname,
    '✅ PERFORMANCE INDEX ADDED' as status
FROM pg_indexes
WHERE schemaname = 'public'
    AND indexname LIKE '%_user_%'
    AND indexname LIKE '%_desc%';

-- Check RLS policies on critical tables
SELECT
    tablename,
    policyname,
    cmd,
    '✅ RLS POLICY ACTIVE' as status
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('content_moderation', 'support_tickets', 'user_activity_logs')
ORDER BY tablename, cmd;

-- Performance impact check - should show improved query performance
SELECT
    schemaname,
    tablename,
    n_tup_ins + n_tup_upd + n_tup_del as total_operations,
    n_tup_hot_upd,
    CASE
        WHEN n_tup_ins + n_tup_upd + n_tup_del > 0
        THEN ROUND((n_tup_hot_upd::numeric / (n_tup_ins + n_tup_upd + n_tup_del)) * 100, 2)
        ELSE 0
    END as hot_update_ratio
FROM pg_stat_user_tables
WHERE schemaname = 'public'
    AND n_tup_ins + n_tup_upd + n_tup_del > 100
ORDER BY total_operations DESC;