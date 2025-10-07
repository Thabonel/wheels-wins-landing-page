-- Security Monitoring Setup V3 - Type-Safe Version
-- This version explicitly avoids bigint/uuid type comparison issues
-- Date: January 10, 2025

-- ============================================================================
-- 1. SIGNUP HEALTH MONITORING
-- ============================================================================

DROP VIEW IF EXISTS signup_health_check CASCADE;

CREATE VIEW signup_health_check AS
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

-- ============================================================================
-- 2. SECURITY DEFINER VERIFICATION FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS verify_security_definer_functions() CASCADE;

CREATE FUNCTION verify_security_definer_functions()
RETURNS TABLE(
    function_name text,
    has_security_definer text,
    has_search_path text,
    status text
)
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
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

-- ============================================================================
-- 3. RLS POLICY VERIFICATION (TYPE-SAFE VERSION)
-- ============================================================================

DROP FUNCTION IF EXISTS verify_rls_policies() CASCADE;

CREATE FUNCTION verify_rls_policies()
RETURNS TABLE(
    table_name text,
    rls_enabled text,
    policy_count bigint,
    status text
)
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        tables.tablename::text as table_name,
        CASE
            WHEN tables.rowsecurity THEN '✅ ENABLED'
            ELSE '❌ DISABLED'
        END as rls_enabled,
        COALESCE(policy_stats.policy_count, 0::bigint) as policy_count,
        CASE
            WHEN NOT tables.rowsecurity THEN '🚨 CRITICAL: RLS NOT ENABLED'
            WHEN COALESCE(policy_stats.policy_count, 0) = 0 THEN '🚨 CRITICAL: NO POLICIES (lockout!)'
            WHEN COALESCE(policy_stats.policy_count, 0) < 2 THEN '⚠️ WARNING: Only ' || COALESCE(policy_stats.policy_count, 0)::text || ' policy'
            ELSE '✅ OK: ' || COALESCE(policy_stats.policy_count, 0)::text || ' policies'
        END as status
    FROM pg_tables tables
    LEFT JOIN (
        SELECT
            schemaname,
            tablename,
            COUNT(*)::bigint as policy_count
        FROM pg_policies
        WHERE schemaname = 'public'
        GROUP BY schemaname, tablename
    ) policy_stats ON tables.tablename = policy_stats.tablename
                  AND tables.schemaname = policy_stats.schemaname
    WHERE tables.schemaname = 'public'
      AND tables.tablename IN (
          'profiles',
          'user_settings',
          'pam_conversations',
          'pam_messages',
          'expenses',
          'budgets',
          'trips'
      )
    ORDER BY
        CASE
            WHEN NOT tables.rowsecurity OR COALESCE(policy_stats.policy_count, 0) = 0 THEN 1
            WHEN COALESCE(policy_stats.policy_count, 0) < 2 THEN 2
            ELSE 3
        END,
        tables.tablename;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. BASIC HEALTH CHECK
-- ============================================================================

DROP FUNCTION IF EXISTS basic_health_check() CASCADE;

CREATE FUNCTION basic_health_check()
RETURNS TABLE(
    check_category text,
    check_name text,
    status text,
    details text
)
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_signups_24h bigint;
    v_last_signup timestamptz;
    v_total_functions bigint;
    v_secure_functions bigint;
    v_total_tables bigint;
    v_critical_tables bigint;
    v_warning_tables bigint;
    v_ok_tables bigint;
BEGIN
    -- Get signup stats
    SELECT
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours'),
        MAX(created_at)
    INTO v_signups_24h, v_last_signup
    FROM auth.users;

    -- Return signup health
    RETURN QUERY
    SELECT
        'Signup Health'::text,
        'Last 24h Signups'::text,
        CASE
            WHEN v_signups_24h = 0 THEN '🚨 CRITICAL'
            WHEN v_signups_24h < 5 THEN '⚠️ WARNING'
            ELSE '✅ OK'
        END,
        v_signups_24h::text || ' signups, last: ' ||
        COALESCE(TO_CHAR(v_last_signup, 'YYYY-MM-DD HH24:MI'), 'NEVER');

    -- Get security function stats
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE status LIKE '%SECURE%')
    INTO v_total_functions, v_secure_functions
    FROM verify_security_definer_functions();

    -- Return security function health
    RETURN QUERY
    SELECT
        'Security'::text,
        'SECURITY DEFINER Functions'::text,
        CASE
            WHEN v_secure_functions = v_total_functions THEN '✅ OK'
            ELSE '🚨 CRITICAL'
        END,
        v_secure_functions::text || '/' || v_total_functions::text || ' secure';

    -- Get RLS policy stats
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE status LIKE '🚨%'),
        COUNT(*) FILTER (WHERE status LIKE '⚠️%'),
        COUNT(*) FILTER (WHERE status LIKE '✅%')
    INTO v_total_tables, v_critical_tables, v_warning_tables, v_ok_tables
    FROM verify_rls_policies();

    -- Return RLS policy health
    RETURN QUERY
    SELECT
        'Security'::text,
        'RLS Policies'::text,
        CASE
            WHEN v_critical_tables > 0 THEN '🚨 CRITICAL'
            WHEN v_warning_tables > 0 THEN '⚠️ WARNING'
            ELSE '✅ OK'
        END,
        v_ok_tables::text || '/' || v_total_tables::text || ' tables OK';

    RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. ADMIN NOTIFICATION SYSTEM
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
