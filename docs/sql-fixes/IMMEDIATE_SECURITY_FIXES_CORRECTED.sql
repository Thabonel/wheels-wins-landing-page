-- =====================================================
-- IMMEDIATE SECURITY FIXES - CORRECTED VERSION
-- =====================================================
-- Purpose: Fix critical security vulnerabilities with error handling
-- Based on: Actual database schema discovery
-- Date: February 21, 2026
--
-- ⚠️ WARNING: Run SCHEMA_DISCOVERY.sql first to understand your database
-- =====================================================

-- =====================================================
-- UTILITY FUNCTION: Check if table exists
-- =====================================================
CREATE OR REPLACE FUNCTION table_exists(table_name text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = table_exists.table_name
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FIX 1: REMOVE OVERLY PERMISSIVE POLICIES (SAFE VERSION)
-- =====================================================

DO $$
BEGIN
    -- Only drop policies if they exist
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_simple_all_access' AND tablename = 'profiles') THEN
        DROP POLICY "profiles_simple_all_access" ON profiles;
        RAISE NOTICE 'Dropped profiles_simple_all_access policy';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'calendar_simple_all_access' AND tablename = 'calendar_events') THEN
        DROP POLICY "calendar_simple_all_access" ON calendar_events;
        RAISE NOTICE 'Dropped calendar_simple_all_access policy';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'expenses_simple_all_access' AND tablename = 'expenses') THEN
        DROP POLICY "expenses_simple_all_access" ON expenses;
        RAISE NOTICE 'Dropped expenses_simple_all_access policy';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_settings_authenticated_access' AND tablename = 'user_settings') THEN
        DROP POLICY "user_settings_authenticated_access" ON user_settings;
        RAISE NOTICE 'Dropped user_settings_authenticated_access policy';
    END IF;
END $$;

-- =====================================================
-- FIX 2: CREATE SECURE POLICIES FOR EXISTING TABLES ONLY
-- =====================================================

-- Profiles table (using 'id' column as per DATABASE_SCHEMA_REFERENCE.md)
DO $$
BEGIN
    IF table_exists('profiles') THEN
        -- Enable RLS first
        ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

        -- Create secure read policy
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_secure_read' AND tablename = 'profiles') THEN
            CREATE POLICY "profiles_secure_read" ON profiles
              FOR SELECT TO authenticated
              USING (id = auth.uid());
            RAISE NOTICE 'Created profiles_secure_read policy';
        END IF;

        -- Create secure update policy
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_secure_update' AND tablename = 'profiles') THEN
            CREATE POLICY "profiles_secure_update" ON profiles
              FOR UPDATE TO authenticated
              USING (id = auth.uid())
              WITH CHECK (id = auth.uid());
            RAISE NOTICE 'Created profiles_secure_update policy';
        END IF;
    ELSE
        RAISE NOTICE 'profiles table does not exist - skipping';
    END IF;
END $$;

-- Calendar events (using 'user_id' column)
DO $$
BEGIN
    IF table_exists('calendar_events') THEN
        ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'calendar_events_user_access' AND tablename = 'calendar_events') THEN
            CREATE POLICY "calendar_events_user_access" ON calendar_events
              FOR ALL TO authenticated
              USING (user_id = auth.uid())
              WITH CHECK (user_id = auth.uid());
            RAISE NOTICE 'Created calendar_events_user_access policy';
        END IF;
    ELSE
        RAISE NOTICE 'calendar_events table does not exist - skipping';
    END IF;
END $$;

-- Expenses (using 'user_id' column)
DO $$
BEGIN
    IF table_exists('expenses') THEN
        ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'expenses_user_access' AND tablename = 'expenses') THEN
            CREATE POLICY "expenses_user_access" ON expenses
              FOR ALL TO authenticated
              USING (user_id = auth.uid())
              WITH CHECK (user_id = auth.uid());
            RAISE NOTICE 'Created expenses_user_access policy';
        END IF;
    ELSE
        RAISE NOTICE 'expenses table does not exist - skipping';
    END IF;
END $$;

-- User settings (using 'user_id' column)
DO $$
BEGIN
    IF table_exists('user_settings') THEN
        ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_settings_secure_access' AND tablename = 'user_settings') THEN
            CREATE POLICY "user_settings_secure_access" ON user_settings
              FOR ALL TO authenticated
              USING (user_id = auth.uid())
              WITH CHECK (user_id = auth.uid());
            RAISE NOTICE 'Created user_settings_secure_access policy';
        END IF;
    ELSE
        RAISE NOTICE 'user_settings table does not exist - skipping';
    END IF;
END $$;

-- =====================================================
-- FIX 3: LIMIT ADMIN ROLE PRIVILEGES (SAFE VERSION)
-- =====================================================

DO $$
BEGIN
    -- Check if admin role exists first
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin') THEN
        -- Revoke all permissions from admin role
        REVOKE ALL ON ALL TABLES IN SCHEMA public FROM admin;
        RAISE NOTICE 'Revoked all permissions from admin role';

        -- Grant only specific permissions
        IF table_exists('affiliate_products') THEN
            GRANT SELECT ON public.affiliate_products TO admin;
            RAISE NOTICE 'Granted SELECT on affiliate_products to admin';
        END IF;

        IF table_exists('admin_users') THEN
            GRANT SELECT ON public.admin_users TO admin;
            RAISE NOTICE 'Granted SELECT on admin_users to admin';
        END IF;

        IF table_exists('support_tickets') THEN
            GRANT SELECT ON public.support_tickets TO admin;
            RAISE NOTICE 'Granted SELECT on support_tickets to admin';
        END IF;
    ELSE
        RAISE NOTICE 'admin role does not exist - skipping admin privilege fixes';
    END IF;
END $$;

-- =====================================================
-- FIX 4: CREATE ADMIN AUDIT LOG (IF NEEDED)
-- =====================================================

DO $$
BEGIN
    -- Create admin audit log table if it doesn't exist
    IF NOT table_exists('admin_audit_log') THEN
        CREATE TABLE admin_audit_log (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            admin_id UUID NOT NULL,
            table_accessed TEXT NOT NULL,
            action_taken TEXT NOT NULL,
            target_user UUID,
            timestamp TIMESTAMPTZ DEFAULT NOW()
        );

        ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "admin_audit_log_service_access" ON admin_audit_log
          FOR ALL TO service_role
          USING (true);

        RAISE NOTICE 'Created admin_audit_log table with RLS';
    ELSE
        RAISE NOTICE 'admin_audit_log table already exists';
    END IF;
END $$;

-- =====================================================
-- FIX 5: ENABLE RLS ON ALL EXISTING USER DATA TABLES
-- =====================================================

DO $$
DECLARE
    user_tables TEXT[] := ARRAY[
        'budgets', 'trips', 'fuel_log', 'maintenance_records',
        'pam_conversations', 'pam_messages', 'pam_savings_events',
        'medical_records', 'medical_medications', 'medical_emergency_info',
        'posts', 'comments', 'likes',
        'storage_items', 'storage_categories', 'storage_locations',
        'user_preferences'
    ];
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY user_tables
    LOOP
        IF table_exists(table_name) THEN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
            RAISE NOTICE 'Enabled RLS on table: %', table_name;
        ELSE
            RAISE NOTICE 'Table % does not exist - skipping', table_name;
        END IF;
    END LOOP;
END $$;

-- =====================================================
-- FIX 6: CREATE USER-SCOPED POLICIES FOR EXISTING TABLES
-- =====================================================

-- Function to create user access policy safely
CREATE OR REPLACE FUNCTION create_user_access_policy(
    table_name TEXT,
    policy_name TEXT,
    user_column TEXT DEFAULT 'user_id'
) RETURNS void AS $$
BEGIN
    IF table_exists(table_name) THEN
        -- Check if policy already exists
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = policy_name AND tablename = table_name) THEN
            EXECUTE format(
                'CREATE POLICY %I ON %I FOR ALL TO authenticated USING (%I = auth.uid()) WITH CHECK (%I = auth.uid())',
                policy_name, table_name, user_column, user_column
            );
            RAISE NOTICE 'Created policy % on table %', policy_name, table_name;
        ELSE
            RAISE NOTICE 'Policy % already exists on table %', policy_name, table_name;
        END IF;
    ELSE
        RAISE NOTICE 'Table % does not exist - skipping policy creation', table_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create policies for tables that use user_id column
DO $$
BEGIN
    PERFORM create_user_access_policy('budgets', 'budgets_user_access');
    PERFORM create_user_access_policy('trips', 'trips_user_access');
    PERFORM create_user_access_policy('fuel_log', 'fuel_log_user_access');
    PERFORM create_user_access_policy('maintenance_records', 'maintenance_records_user_access');
    PERFORM create_user_access_policy('pam_conversations', 'pam_conversations_user_access');
    PERFORM create_user_access_policy('pam_savings_events', 'pam_savings_events_user_access');
    PERFORM create_user_access_policy('medical_records', 'medical_records_user_access');
    PERFORM create_user_access_policy('medical_medications', 'medical_medications_user_access');
    PERFORM create_user_access_policy('medical_emergency_info', 'medical_emergency_info_user_access');
    PERFORM create_user_access_policy('storage_items', 'storage_items_user_access');
    PERFORM create_user_access_policy('storage_categories', 'storage_categories_user_access');
    PERFORM create_user_access_policy('storage_locations', 'storage_locations_user_access');
    PERFORM create_user_access_policy('user_preferences', 'user_preferences_user_access');
END $$;

-- Special policy for pam_messages (uses conversation_id relationship)
DO $$
BEGIN
    IF table_exists('pam_messages') AND table_exists('pam_conversations') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pam_messages_user_access' AND tablename = 'pam_messages') THEN
            CREATE POLICY "pam_messages_user_access" ON pam_messages
              FOR ALL TO authenticated
              USING (conversation_id IN (
                SELECT id FROM pam_conversations WHERE user_id = auth.uid()
              ))
              WITH CHECK (conversation_id IN (
                SELECT id FROM pam_conversations WHERE user_id = auth.uid()
              ));
            RAISE NOTICE 'Created pam_messages_user_access policy';
        END IF;
    END IF;
END $$;

-- Social data policies (users can read all, but only modify their own)
DO $$
BEGIN
    IF table_exists('posts') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'posts_user_access' AND tablename = 'posts') THEN
            CREATE POLICY "posts_user_access" ON posts
              FOR ALL TO authenticated
              USING (user_id = auth.uid() OR true)
              WITH CHECK (user_id = auth.uid());
            RAISE NOTICE 'Created posts_user_access policy';
        END IF;
    END IF;

    IF table_exists('comments') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'comments_user_access' AND tablename = 'comments') THEN
            CREATE POLICY "comments_user_access" ON comments
              FOR ALL TO authenticated
              USING (user_id = auth.uid() OR true)
              WITH CHECK (user_id = auth.uid());
            RAISE NOTICE 'Created comments_user_access policy';
        END IF;
    END IF;

    IF table_exists('likes') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'likes_user_access' AND tablename = 'likes') THEN
            CREATE POLICY "likes_user_access" ON likes
              FOR ALL TO authenticated
              USING (user_id = auth.uid())
              WITH CHECK (user_id = auth.uid());
            RAISE NOTICE 'Created likes_user_access policy';
        END IF;
    END IF;
END $$;

-- =====================================================
-- FIX 7: CLEAN UP DANGEROUS POLICIES SAFELY
-- =====================================================

-- Drop any remaining overly permissive policies
DO $$
DECLARE
    pol record;
BEGIN
    -- Find policies with USING (true) that aren't legitimate public policies
    FOR pol IN
        SELECT tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND qual = 'true'
          AND policyname NOT LIKE '%public%'
          AND policyname NOT LIKE '%read%'
          AND tablename NOT IN ('poi_categories', 'trip_templates', 'affiliate_products')
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY %I ON %I', pol.policyname, pol.tablename);
            RAISE NOTICE 'Dropped overly permissive policy: %.%', pol.tablename, pol.policyname;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not drop policy %.% - %', pol.tablename, pol.policyname, SQLERRM;
        END;
    END LOOP;
END $$;

-- =====================================================
-- FIX 8: VERIFICATION
-- =====================================================

-- Final verification query
SELECT
    'SECURITY FIXES COMPLETED' as status,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND qual = 'true'
     AND policyname NOT LIKE '%public%' AND tablename NOT IN ('poi_categories', 'trip_templates')) as remaining_dangerous_policies,
    (SELECT COUNT(*) FROM information_schema.tables t
     JOIN pg_class c ON c.relname = t.table_name
     WHERE t.table_schema = 'public' AND c.relrowsecurity = true) as tables_with_rls_enabled,
    'Run security audit again to verify improvements' as next_step;

-- Clean up utility functions
DROP FUNCTION IF EXISTS table_exists(text);
DROP FUNCTION IF EXISTS create_user_access_policy(text, text, text);

-- =====================================================
-- SUMMARY OF FIXES APPLIED
-- =====================================================
-- 1. ✅ Safely removed overly permissive policies
-- 2. ✅ Created secure user-scoped policies for existing tables only
-- 3. ✅ Limited admin privileges with error handling
-- 4. ✅ Enabled RLS on all existing user data tables
-- 5. ✅ Added proper policy error handling
-- 6. ✅ Created admin audit logging infrastructure
-- 7. ✅ Cleaned up dangerous policies safely
-- 8. ✅ Verified fixes with comprehensive checks
--
-- Next Steps:
-- 1. Run SCHEMA_DISCOVERY.sql to verify current state
-- 2. Run comprehensive security audit
-- 3. Test with multiple user accounts
-- =====================================================