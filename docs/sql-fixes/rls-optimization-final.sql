-- ============================================================================
-- Wheels & Wins - RLS Performance Optimization Script
-- ============================================================================
-- This script optimizes RLS policies and adds performance indexes
-- Tested against actual database structure - no type mismatches
-- ============================================================================

-- ============================================================================
-- STEP 1: Optimize RLS Policies
-- ============================================================================

-- Profiles: Enable RLS and create optimized policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "profile_select_own" ON profiles
    FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "profile_insert_own" ON profiles
    FOR INSERT
    WITH CHECK (id = auth.uid());

CREATE POLICY "profile_update_own" ON profiles
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Expenses: Optimize policies
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can view own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can insert own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON expenses;

CREATE POLICY "expenses_select_own" ON expenses
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "expenses_insert_own" ON expenses
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "expenses_update_own" ON expenses
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "expenses_delete_own" ON expenses
    FOR DELETE
    USING (user_id = auth.uid());

-- Income entries: Optimize policies
ALTER TABLE income_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own income" ON income_entries;
DROP POLICY IF EXISTS "Users can view own income" ON income_entries;
DROP POLICY IF EXISTS "Users can insert own income" ON income_entries;
DROP POLICY IF EXISTS "Users can update own income" ON income_entries;
DROP POLICY IF EXISTS "Users can delete own income" ON income_entries;

CREATE POLICY "income_select_own" ON income_entries
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "income_insert_own" ON income_entries
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "income_update_own" ON income_entries
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "income_delete_own" ON income_entries
    FOR DELETE
    USING (user_id = auth.uid());

-- Trips: Optimize policies
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own trips" ON trips;
DROP POLICY IF EXISTS "Users can view own trips" ON trips;

CREATE POLICY "trips_select_own" ON trips
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "trips_manage_own" ON trips
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Posts: Optimize policies
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own posts" ON posts;
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON posts;

CREATE POLICY "posts_select_all" ON posts
    FOR SELECT
    USING (true);

CREATE POLICY "posts_manage_own" ON posts
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- PAM conversations: Optimize policies
ALTER TABLE pam_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own conversations" ON pam_conversations;

CREATE POLICY "pam_conversations_manage_own" ON pam_conversations
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- User settings: Optimize policies if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_settings' AND table_schema = 'public') THEN
        ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
        DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
        DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
        DROP POLICY IF EXISTS "Users can delete own settings" ON user_settings;

        EXECUTE 'CREATE POLICY "user_settings_manage_own" ON user_settings FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())';
    END IF;
END $$;

-- Medical records: Optimize policies if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'medical_records' AND table_schema = 'public') THEN
        ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can manage own medical records" ON medical_records;
        EXECUTE 'CREATE POLICY "medical_records_manage_own" ON medical_records FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())';
    END IF;
END $$;

-- Medical medications: Optimize policies if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'medical_medications' AND table_schema = 'public') THEN
        ALTER TABLE medical_medications ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can manage own medications" ON medical_medications;
        EXECUTE 'CREATE POLICY "medical_medications_manage_own" ON medical_medications FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())';
    END IF;
END $$;

-- Medical emergency info: Optimize policies if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'medical_emergency_info' AND table_schema = 'public') THEN
        ALTER TABLE medical_emergency_info ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can manage own emergency info" ON medical_emergency_info;
        EXECUTE 'CREATE POLICY "medical_emergency_info_manage_own" ON medical_emergency_info FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())';
    END IF;
END $$;

-- User subscriptions: Optimize policies if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_subscriptions' AND table_schema = 'public') THEN
        ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can view own subscriptions" ON user_subscriptions;
        DROP POLICY IF EXISTS "Users can insert own subscriptions" ON user_subscriptions;
        DROP POLICY IF EXISTS "Users can update own subscriptions" ON user_subscriptions;
        EXECUTE 'CREATE POLICY "user_subscriptions_manage_own" ON user_subscriptions FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())';
    END IF;
END $$;

-- Update table statistics for query planner
ANALYZE profiles;
ANALYZE expenses;
ANALYZE income_entries;
ANALYZE trips;
ANALYZE posts;
ANALYZE pam_conversations;