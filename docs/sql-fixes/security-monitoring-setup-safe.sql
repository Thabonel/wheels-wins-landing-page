-- Security & Monitoring Setup for Wheels & Wins (SAFE VERSION)
-- This version has defensive checks and won't fail if tables don't exist
-- Date: January 10, 2025

-- ============================================================================
-- INSTALLATION INSTRUCTIONS
-- ============================================================================
-- Run each section separately in Supabase SQL Editor
-- Skip sections if tables don't exist yet
-- Come back and run skipped sections after tables are created

-- ============================================================================
-- 1. SIGNUP HEALTH MONITORING
-- ============================================================================
-- Dependencies: auth.users (Supabase built-in - always exists)

CREATE OR REPLACE VIEW signup_health_check AS
SELECT
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as signups_last_hour,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '6 hours') as signups_last_6h,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as signups_last_24h,
    MAX(created_at) as last_signup_time,
    EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) / 3600 as hours_since_last_signup,
    CASE
        WHEN MAX(created_at) IS NULL THEN '🚨 CRITICAL: NO SIGNUPS EVER'
        WHEN EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) / 3600 > 24 THEN '🚨 CRITICAL: No signups in 24+ hours'
        WHEN EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) / 3600 > 12 THEN '⚠️ WARNING: No signups in 12+ hours'
        WHEN EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) / 3600 > 6 THEN '⚡ NOTICE: No signups in 6+ hours'
        ELSE '✅ OK: Recent signup activity'
    END as health_status
FROM auth.users;

-- Test: SELECT * FROM signup_health_check;

-- ============================================================================
-- 2. SECURITY DEFINER VERIFICATION FUNCTION
-- ============================================================================
-- Dependencies: None (uses PostgreSQL system catalogs)

CREATE OR REPLACE FUNCTION verify_security_definer_functions()
RETURNS TABLE(
    function_name text,
    has_security_definer text,
    has_search_path text,
    status text
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        proname::text as function_name,
        CASE
            WHEN prosecdef THEN '✅ YES'
            ELSE '❌ NO'
        END as has_security_definer,
        CASE
            WHEN proconfig IS NOT NULL AND
                 array_to_string(proconfig, ',') LIKE '%search_path%'
            THEN '✅ YES'
            ELSE '❌ NO'
        END as has_search_path,
        CASE
            WHEN prosecdef AND
                 proconfig IS NOT NULL AND
                 array_to_string(proconfig, ',') LIKE '%search_path%'
            THEN '✅ SECURE'
            WHEN NOT prosecdef THEN '⚠️ MISSING SECURITY DEFINER'
            WHEN proconfig IS NULL OR
                 array_to_string(proconfig, ',') NOT LIKE '%search_path%'
            THEN '⚠️ MISSING search_path'
            ELSE '❌ INSECURE'
        END as status
    FROM pg_proc
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND proname IN (
          'update_updated_at_column',
          'handle_new_user',
          'notify_new_signup',
          'queue_admin_notification'
      );
END;
$$ LANGUAGE plpgsql;

-- Test: SELECT * FROM verify_security_definer_functions();

-- ============================================================================
-- 3. RLS POLICY VERIFICATION
-- ============================================================================
-- Dependencies: None (uses PostgreSQL system catalogs)
-- Note: Only checks tables that exist

CREATE OR REPLACE FUNCTION verify_rls_policies()
RETURNS TABLE(
    table_name text,
    rls_enabled text,
    policy_count bigint,
    status text
) AS $$
BEGIN
    RETURN QUERY
    WITH policy_counts AS (
        SELECT
            t.tablename,
            t.rowsecurity,
            COUNT(p.policyname) as num_policies
        FROM pg_tables t
        LEFT JOIN pg_policies p ON t.tablename = p.tablename
        WHERE t.schemaname = 'public'
          AND t.tablename IN (
              'profiles',
              'user_settings',
              'pam_conversations',
              'pam_messages',
              'expenses',
              'budgets',
              'trips'
          )
        GROUP BY t.tablename, t.rowsecurity
    )
    SELECT
        pc.tablename::text,
        CASE
            WHEN pc.rowsecurity THEN '✅ ENABLED'
            ELSE '❌ DISABLED'
        END as rls_enabled,
        pc.num_policies as policy_count,
        CASE
            WHEN NOT pc.rowsecurity THEN '🚨 CRITICAL: RLS NOT ENABLED'
            WHEN pc.num_policies = 0 THEN '🚨 CRITICAL: NO POLICIES (lockout!)'
            WHEN pc.num_policies < 2 THEN '⚠️ WARNING: Only ' || pc.num_policies || ' policy'
            ELSE '✅ OK: ' || pc.num_policies || ' policies'
        END as status
    FROM policy_counts pc
    ORDER BY
        CASE
            WHEN NOT pc.rowsecurity OR pc.num_policies = 0 THEN 1
            WHEN pc.num_policies < 2 THEN 2
            ELSE 3
        END,
        pc.tablename;
END;
$$ LANGUAGE plpgsql;

-- Test: SELECT * FROM verify_rls_policies();

-- ============================================================================
-- 4. BASIC HEALTH CHECK (NO PAM DEPENDENCY)
-- ============================================================================
-- Use this if pam_conversations table doesn't exist yet

CREATE OR REPLACE FUNCTION basic_health_check()
RETURNS TABLE(
    check_category text,
    check_name text,
    status text,
    details text
) AS $$
BEGIN
    -- Signup Health
    RETURN QUERY
    SELECT
        'Signup Health'::text,
        'Last 24h Signups'::text,
        CASE
            WHEN s.signups_last_24h = 0 THEN '🚨 CRITICAL'
            WHEN s.signups_last_24h < 5 THEN '⚠️ WARNING'
            ELSE '✅ OK'
        END,
        s.signups_last_24h || ' signups, last: ' ||
        COALESCE(TO_CHAR(s.last_signup_time, 'YYYY-MM-DD HH24:MI'), 'NEVER')
    FROM signup_health_check s;

    -- Security Functions
    RETURN QUERY
    WITH security_function_stats AS (
        SELECT
            COUNT(*) as total_functions,
            COUNT(*) FILTER (WHERE status LIKE '%SECURE%') as secure_functions
        FROM verify_security_definer_functions()
    )
    SELECT
        'Security'::text,
        'SECURITY DEFINER Functions'::text,
        CASE
            WHEN sfs.secure_functions = sfs.total_functions THEN '✅ OK'
            ELSE '🚨 CRITICAL'
        END,
        sfs.secure_functions::text || '/' || sfs.total_functions::text || ' secure'
    FROM security_function_stats sfs;

    -- RLS Policies
    RETURN QUERY
    WITH rls_policy_stats AS (
        SELECT
            COUNT(*) as total_tables,
            COUNT(*) FILTER (WHERE status LIKE '🚨%') as critical_tables,
            COUNT(*) FILTER (WHERE status LIKE '⚠️%') as warning_tables,
            COUNT(*) FILTER (WHERE status LIKE '✅%') as ok_tables
        FROM verify_rls_policies()
    )
    SELECT
        'Security'::text,
        'RLS Policies'::text,
        CASE
            WHEN rps.critical_tables > 0 THEN '🚨 CRITICAL'
            WHEN rps.warning_tables > 0 THEN '⚠️ WARNING'
            ELSE '✅ OK'
        END,
        rps.ok_tables::text || '/' || rps.total_tables::text || ' tables OK'
    FROM rls_policy_stats rps;
END;
$$ LANGUAGE plpgsql;

-- Test: SELECT * FROM basic_health_check();

-- ============================================================================
-- 5. ADMIN NOTIFICATION SYSTEM (OPTIONAL)
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  notify_signup_issues BOOLEAN DEFAULT true,
  notify_pam_errors BOOLEAN DEFAULT true,
  notify_security_events BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_id UUID,
  message TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notification_log ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Only admins can manage notifications" ON admin_notification_preferences;
CREATE POLICY "Only admins can manage notifications" ON admin_notification_preferences
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (preferences->>'role' = 'admin' OR email LIKE '%@wheelsandwins.com')
    )
  );

DROP POLICY IF EXISTS "Admins can view notification logs" ON admin_notification_log;
CREATE POLICY "Admins can view notification logs" ON admin_notification_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (preferences->>'role' = 'admin' OR email LIKE '%@wheelsandwins.com')
    )
  );

DROP POLICY IF EXISTS "System can insert notification logs" ON admin_notification_log;
CREATE POLICY "System can insert notification logs" ON admin_notification_log
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON signup_health_check TO authenticated;
GRANT EXECUTE ON FUNCTION verify_security_definer_functions() TO authenticated;
GRANT EXECUTE ON FUNCTION verify_rls_policies() TO authenticated;
GRANT EXECUTE ON FUNCTION basic_health_check() TO authenticated;

-- ============================================================================
-- INSTALLATION COMPLETE
-- ============================================================================

-- Test everything:
-- SELECT * FROM signup_health_check;
-- SELECT * FROM verify_security_definer_functions();
-- SELECT * FROM verify_rls_policies();
-- SELECT * FROM basic_health_check();

-- If all tests pass, you're ready to use the monitoring system!
