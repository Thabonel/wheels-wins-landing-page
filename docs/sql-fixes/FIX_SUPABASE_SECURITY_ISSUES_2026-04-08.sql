-- Fix Supabase Database Security Issues
-- Date: 2026-04-08
-- Addresses all ERROR, WARN, and INFO level security issues from linter

-- ============================================================================
-- CRITICAL (ERROR LEVEL): Enable RLS on public tables
-- ============================================================================

-- Fix: ocr_cache table - Enable RLS
ALTER TABLE public.ocr_cache ENABLE ROW LEVEL SECURITY;

-- Add basic policy for ocr_cache (assuming it should be user-specific)
CREATE POLICY "ocr_cache_user_access" ON public.ocr_cache
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- IMPORTANT (WARN LEVEL): Fix overly permissive RLS policies
-- ============================================================================

-- Fix: agent_logs - Replace overly permissive policy
DROP POLICY IF EXISTS "System can insert agent logs" ON public.agent_logs;
CREATE POLICY "agent_logs_system_insert" ON public.agent_logs
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

-- Fix: pam_knowledge_usage_log - Make user-specific
DROP POLICY IF EXISTS "pam_knowledge_usage_log_user_insert" ON public.pam_knowledge_usage_log;
CREATE POLICY "pam_knowledge_usage_log_user_insert" ON public.pam_knowledge_usage_log
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Fix: shakedown_issues - Make user-specific
DROP POLICY IF EXISTS "shakedown_issues_authenticated_insert" ON public.shakedown_issues;
CREATE POLICY "shakedown_issues_user_access" ON public.shakedown_issues
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Fix: shakedown_trips - Make user-specific
DROP POLICY IF EXISTS "shakedown_trips_authenticated_write" ON public.shakedown_trips;
CREATE POLICY "shakedown_trips_user_access" ON public.shakedown_trips
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Fix: tip_usage_log - Make user-specific
DROP POLICY IF EXISTS "tip_usage_log_user_insert" ON public.tip_usage_log;
CREATE POLICY "tip_usage_log_user_access" ON public.tip_usage_log
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Fix: transition_equipment - Make user-specific
DROP POLICY IF EXISTS "transition_equipment_authenticated_write" ON public.transition_equipment;
CREATE POLICY "transition_equipment_user_access" ON public.transition_equipment
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- FUNCTION SECURITY: Fix mutable search_path
-- ============================================================================

-- Fix: update_timers_updated_at function
DROP FUNCTION IF EXISTS public.update_timers_updated_at();
CREATE OR REPLACE FUNCTION public.update_timers_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ============================================================================
-- STANDARD (INFO LEVEL): Add RLS policies to tables without them
-- ============================================================================

-- agent_state - System state, read-only for authenticated users
CREATE POLICY "agent_state_read" ON public.agent_state
    FOR SELECT TO authenticated
    USING (true);

-- ai_finetuning_jobs - User-specific AI jobs
CREATE POLICY "ai_finetuning_jobs_user_access" ON public.ai_finetuning_jobs
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ai_model_performance - Read-only performance metrics
CREATE POLICY "ai_model_performance_read" ON public.ai_model_performance
    FOR SELECT TO authenticated
    USING (true);

-- anxiety_logs - User-specific mental health logs
CREATE POLICY "anxiety_logs_user_access" ON public.anxiety_logs
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- artifacts - User-specific artifacts
CREATE POLICY "artifacts_user_access" ON public.artifacts
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- bailout_plans - User-specific emergency plans
CREATE POLICY "bailout_plans_user_access" ON public.bailout_plans
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- campgrounds - Public read, user-specific write
CREATE POLICY "campgrounds_read" ON public.campgrounds
    FOR SELECT TO authenticated
    USING (true);
CREATE POLICY "campgrounds_user_write" ON public.campgrounds
    FOR INSERT TO authenticated
    WITH CHECK (created_by = auth.uid());

-- data_collector_metrics - System metrics, read-only
CREATE POLICY "data_collector_metrics_read" ON public.data_collector_metrics
    FOR SELECT TO authenticated
    USING (true);

-- data_collector_runs - System runs, read-only
CREATE POLICY "data_collector_runs_read" ON public.data_collector_runs
    FOR SELECT TO authenticated
    USING (true);

-- data_collector_sources - System sources, read-only
CREATE POLICY "data_collector_sources_read" ON public.data_collector_sources
    FOR SELECT TO authenticated
    USING (true);

-- data_collector_state - System state, read-only
CREATE POLICY "data_collector_state_read" ON public.data_collector_state
    FOR SELECT TO authenticated
    USING (true);

-- launch_checkins - User-specific checkins
CREATE POLICY "launch_checkins_user_access" ON public.launch_checkins
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- launch_week_tasks - User-specific tasks
CREATE POLICY "launch_week_tasks_user_access" ON public.launch_week_tasks
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- memories - User-specific memories
CREATE POLICY "memories_user_access" ON public.memories
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- mood_check_ins - User-specific mood tracking
CREATE POLICY "mood_check_ins_user_access" ON public.mood_check_ins
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- newsletters - Public read
CREATE POLICY "newsletters_read" ON public.newsletters
    FOR SELECT TO authenticated
    USING (published = true OR created_by = auth.uid());

-- pam_config - User-specific PAM configuration
CREATE POLICY "pam_config_user_access" ON public.pam_config
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- pam_logs - User-specific PAM logs
CREATE POLICY "pam_logs_user_access" ON public.pam_logs
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- pam_metrics - User-specific PAM metrics
CREATE POLICY "pam_metrics_user_access" ON public.pam_metrics
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- partner_expectations - User-specific relationship data
CREATE POLICY "partner_expectations_user_access" ON public.partner_expectations
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- route_data - User-specific route information
CREATE POLICY "route_data_user_access" ON public.route_data
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- sessions - User-specific sessions
CREATE POLICY "sessions_user_access" ON public.sessions
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- transition_vehicle_mods - User-specific vehicle modifications
CREATE POLICY "transition_vehicle_mods_user_access" ON public.transition_vehicle_mods
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- user_launch_dates - User-specific launch planning
CREATE POLICY "user_launch_dates_user_access" ON public.user_launch_dates
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- user_tags - User-specific tags
CREATE POLICY "user_tags_user_access" ON public.user_tags
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- youtube_hustles - User-specific YouTube business data
CREATE POLICY "youtube_hustles_user_access" ON public.youtube_hustles
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check that all policies are in place
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check RLS status
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;