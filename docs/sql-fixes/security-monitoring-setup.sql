-- Security & Monitoring Setup for Wheels & Wins
-- Based on Master Security Guide from UnimogCommunityHub
-- Date: January 10, 2025

-- ============================================================================
-- 1. SIGNUP HEALTH MONITORING
-- ============================================================================

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

-- ============================================================================
-- 2. PAM HEALTH MONITORING
-- ============================================================================

CREATE OR REPLACE VIEW pam_health_check AS
SELECT
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as conversations_last_hour,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as conversations_last_24h,
    MAX(created_at) as last_conversation_time,
    EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) / 3600 as hours_since_last_conversation,
    CASE
        WHEN MAX(created_at) IS NULL THEN '⚠️ WARNING: No PAM conversations ever'
        WHEN EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) / 3600 > 48 THEN '⚠️ WARNING: No PAM activity in 48+ hours'
        WHEN EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) / 3600 > 24 THEN '⚡ NOTICE: No PAM activity in 24+ hours'
        ELSE '✅ OK: Recent PAM activity'
    END as health_status
FROM pam_conversations
WHERE user_id IS NOT NULL;

-- ============================================================================
-- 3. SECURITY DEFINER VERIFICATION FUNCTION
-- ============================================================================

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

-- ============================================================================
-- 4. RLS POLICY VERIFICATION
-- ============================================================================

CREATE OR REPLACE FUNCTION verify_rls_policies()
RETURNS TABLE(
    table_name text,
    rls_enabled text,
    policy_count bigint,
    status text
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.tablename::text,
        CASE
            WHEN t.rowsecurity THEN '✅ ENABLED'
            ELSE '❌ DISABLED'
        END as rls_enabled,
        COUNT(p.policyname) as policy_count,
        CASE
            WHEN NOT t.rowsecurity THEN '🚨 CRITICAL: RLS NOT ENABLED'
            WHEN COUNT(p.policyname) = 0 THEN '🚨 CRITICAL: NO POLICIES (lockout!)'
            WHEN COUNT(p.policyname) < 2 THEN '⚠️ WARNING: Only ' || COUNT(p.policyname) || ' policy'
            ELSE '✅ OK: ' || COUNT(p.policyname) || ' policies'
        END as status
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
    ORDER BY
        CASE
            WHEN NOT t.rowsecurity OR COUNT(p.policyname) = 0 THEN 1
            WHEN COUNT(p.policyname) < 2 THEN 2
            ELSE 3
        END,
        t.tablename;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. ADMIN NOTIFICATION SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id) UNIQUE,
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

CREATE POLICY "Only admins can manage notifications" ON admin_notification_preferences
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (preferences->>'role' = 'admin' OR email LIKE '%@wheelsandwins.com')
    )
  );

CREATE POLICY "Admins can view notification logs" ON admin_notification_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (preferences->>'role' = 'admin' OR email LIKE '%@wheelsandwins.com')
    )
  );

CREATE POLICY "System can insert notification logs" ON admin_notification_log
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 6. COMPREHENSIVE HEALTH CHECK FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION comprehensive_health_check()
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

    -- PAM Health
    RETURN QUERY
    SELECT
        'PAM Health'::text,
        'Last 24h Conversations'::text,
        CASE
            WHEN p.conversations_last_24h = 0 THEN '⚠️ WARNING'
            ELSE '✅ OK'
        END,
        p.conversations_last_24h || ' conversations, last: ' ||
        COALESCE(TO_CHAR(p.last_conversation_time, 'YYYY-MM-DD HH24:MI'), 'NEVER')
    FROM pam_health_check p;

    -- Security Functions
    RETURN QUERY
    SELECT
        'Security'::text,
        'SECURITY DEFINER Functions'::text,
        CASE
            WHEN COUNT(*) FILTER (WHERE status LIKE '%SECURE%') = COUNT(*) THEN '✅ OK'
            ELSE '🚨 CRITICAL'
        END,
        COUNT(*) FILTER (WHERE status LIKE '%SECURE%')::text || '/' || COUNT(*)::text || ' secure'
    FROM verify_security_definer_functions();

    -- RLS Policies
    RETURN QUERY
    SELECT
        'Security'::text,
        'RLS Policies'::text,
        CASE
            WHEN COUNT(*) FILTER (WHERE status LIKE '🚨%') > 0 THEN '🚨 CRITICAL'
            WHEN COUNT(*) FILTER (WHERE status LIKE '⚠️%') > 0 THEN '⚠️ WARNING'
            ELSE '✅ OK'
        END,
        COUNT(*) FILTER (WHERE status LIKE '✅%')::text || '/' || COUNT(*)::text || ' tables OK'
    FROM verify_rls_policies();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. EMERGENCY ROLLBACK PROCEDURES (COMMENTS ONLY - NO EXECUTION)
-- ============================================================================

-- EMERGENCY: IF SIGNUPS BREAK, RUN THESE COMMANDS TO DIAGNOSE:
-- SELECT * FROM signup_health_check;
-- SELECT * FROM verify_security_definer_functions();
-- SELECT * FROM verify_rls_policies();
-- SELECT * FROM comprehensive_health_check();

-- EMERGENCY: IF PAM BREAKS, RUN THESE COMMANDS:
-- SELECT * FROM pam_health_check;
-- SELECT * FROM pam_conversations ORDER BY created_at DESC LIMIT 10;
-- SELECT * FROM pam_messages WHERE created_at > NOW() - INTERVAL '1 hour' ORDER BY created_at DESC;

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON signup_health_check TO authenticated;
GRANT SELECT ON pam_health_check TO authenticated;
GRANT EXECUTE ON FUNCTION verify_security_definer_functions() TO authenticated;
GRANT EXECUTE ON FUNCTION verify_rls_policies() TO authenticated;
GRANT EXECUTE ON FUNCTION comprehensive_health_check() TO authenticated;
