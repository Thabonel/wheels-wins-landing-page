-- Targeted RLS Fix - Addresses UUID vs BIGINT Error
-- Based on the provided schema showing user_id as UUID
-- Date: 2025-09-16

-- The error "operator does not exist: uuid = bigint" suggests that one table
-- has a user_id column that's actually BIGINT instead of UUID.
-- Let's fix this systematically.

-- =============================================================================
-- 1. FIRST, CHECK WHICH TABLES ACTUALLY EXIST AND THEIR user_id TYPES
-- =============================================================================

-- This query will show us the actual data types for user_id columns
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT table_name, column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND column_name IN ('user_id', 'id')
        AND table_name IN (
            'medical_medications', 'medical_emergency_info', 'medical_records',
            'user_trips', 'trip_template_ratings', 'storage_categories',
            'storage_locations', 'storage_items', 'user_settings', 'user_subscriptions'
        )
        ORDER BY table_name, column_name
    LOOP
        RAISE NOTICE 'Table: %, Column: %, Type: %', rec.table_name, rec.column_name, rec.data_type;
    END LOOP;
END $$;

-- =============================================================================
-- 2. SAFE POLICY CREATION FOR KNOWN GOOD TABLES
-- =============================================================================

-- Start with user_settings since we know its structure
DO $$
BEGIN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
    DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
    DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
    DROP POLICY IF EXISTS "Users can delete own settings" ON public.user_settings;

    -- Create new policies
    CREATE POLICY "Users can view own settings" ON public.user_settings
        FOR SELECT TO authenticated
        USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert own settings" ON public.user_settings
        FOR INSERT TO authenticated
        WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update own settings" ON public.user_settings
        FOR UPDATE TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can delete own settings" ON public.user_settings
        FOR DELETE TO authenticated
        USING (auth.uid() = user_id);

    RAISE NOTICE 'Successfully created policies for user_settings';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating policies for user_settings: %', SQLERRM;
END $$;

-- =============================================================================
-- 3. CREATE POLICIES FOR OTHER CORE TABLES ONE BY ONE
-- =============================================================================

-- user_subscriptions
DO $$
BEGIN
    -- Check if table exists first
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_subscriptions' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Users can view own subscription" ON public.user_subscriptions;
        DROP POLICY IF EXISTS "Users can insert own subscription" ON public.user_subscriptions;
        DROP POLICY IF EXISTS "Users can update own subscription" ON public.user_subscriptions;
        DROP POLICY IF EXISTS "Users can delete own subscription" ON public.user_subscriptions;

        CREATE POLICY "Users can view own subscription" ON public.user_subscriptions
            FOR SELECT TO authenticated
            USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert own subscription" ON public.user_subscriptions
            FOR INSERT TO authenticated
            WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can update own subscription" ON public.user_subscriptions
            FOR UPDATE TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can delete own subscription" ON public.user_subscriptions
            FOR DELETE TO authenticated
            USING (auth.uid() = user_id);

        RAISE NOTICE 'Successfully created policies for user_subscriptions';
    ELSE
        RAISE NOTICE 'Table user_subscriptions does not exist';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating policies for user_subscriptions: %', SQLERRM;
END $$;

-- user_trips
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_trips' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Users can view own trips" ON public.user_trips;
        DROP POLICY IF EXISTS "Users can insert own trips" ON public.user_trips;
        DROP POLICY IF EXISTS "Users can update own trips" ON public.user_trips;
        DROP POLICY IF EXISTS "Users can delete own trips" ON public.user_trips;

        CREATE POLICY "Users can view own trips" ON public.user_trips
            FOR SELECT TO authenticated
            USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert own trips" ON public.user_trips
            FOR INSERT TO authenticated
            WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can update own trips" ON public.user_trips
            FOR UPDATE TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can delete own trips" ON public.user_trips
            FOR DELETE TO authenticated
            USING (auth.uid() = user_id);

        RAISE NOTICE 'Successfully created policies for user_trips';
    ELSE
        RAISE NOTICE 'Table user_trips does not exist';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating policies for user_trips: %', SQLERRM;
END $$;

-- trip_template_ratings
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trip_template_ratings' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Users can view own ratings" ON public.trip_template_ratings;
        DROP POLICY IF EXISTS "Users can insert own ratings" ON public.trip_template_ratings;
        DROP POLICY IF EXISTS "Users can update own ratings" ON public.trip_template_ratings;
        DROP POLICY IF EXISTS "Users can delete own ratings" ON public.trip_template_ratings;

        CREATE POLICY "Users can view own ratings" ON public.trip_template_ratings
            FOR SELECT TO authenticated
            USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert own ratings" ON public.trip_template_ratings
            FOR INSERT TO authenticated
            WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can update own ratings" ON public.trip_template_ratings
            FOR UPDATE TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can delete own ratings" ON public.trip_template_ratings
            FOR DELETE TO authenticated
            USING (auth.uid() = user_id);

        RAISE NOTICE 'Successfully created policies for trip_template_ratings';
    ELSE
        RAISE NOTICE 'Table trip_template_ratings does not exist';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating policies for trip_template_ratings: %', SQLERRM;
END $$;

-- =============================================================================
-- 4. HANDLE TABLES THAT MIGHT HAVE DIFFERENT COLUMN STRUCTURES
-- =============================================================================

-- For medical tables, let's check if they exist and what their structure is
DO $$
DECLARE
    table_list TEXT[] := ARRAY['medical_medications', 'medical_emergency_info', 'medical_records'];
    table_name TEXT;
    user_col_type TEXT;
BEGIN
    FOREACH table_name IN ARRAY table_list LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name AND table_schema = 'public') THEN
            -- Check the data type of user_id column
            SELECT data_type INTO user_col_type
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = table_name
            AND column_name = 'user_id';

            IF user_col_type IS NOT NULL THEN
                RAISE NOTICE 'Table % exists with user_id type: %', table_name, user_col_type;

                -- Create policies based on the column type
                IF user_col_type = 'uuid' THEN
                    EXECUTE format('DROP POLICY IF EXISTS "Users can view own %s" ON public.%I', table_name, table_name);
                    EXECUTE format('CREATE POLICY "Users can view own %s" ON public.%I FOR SELECT TO authenticated USING (auth.uid() = user_id)', table_name, table_name);
                    RAISE NOTICE 'Created UUID-based policy for %', table_name;
                ELSIF user_col_type = 'bigint' THEN
                    -- This table has bigint user_id - we need a different approach
                    RAISE NOTICE 'Table % has BIGINT user_id - needs special handling', table_name;
                    -- We could create a policy that joins with auth.users or profiles table
                END IF;
            ELSE
                RAISE NOTICE 'Table % exists but has no user_id column', table_name;
            END IF;
        ELSE
            RAISE NOTICE 'Table % does not exist', table_name;
        END IF;
    END LOOP;
END $$;

-- =============================================================================
-- 5. HANDLE STORAGE TABLES
-- =============================================================================

DO $$
DECLARE
    table_list TEXT[] := ARRAY['storage_categories', 'storage_locations', 'storage_items'];
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY table_list LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name AND table_schema = 'public') THEN
            BEGIN
                EXECUTE format('DROP POLICY IF EXISTS "Users can view own %s" ON public.%I', table_name, table_name);
                EXECUTE format('CREATE POLICY "Users can view own %s" ON public.%I FOR SELECT TO authenticated USING (auth.uid() = user_id)', table_name, table_name);
                RAISE NOTICE 'Successfully created policy for %', table_name;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Error creating policy for %: %', table_name, SQLERRM;
            END;
        ELSE
            RAISE NOTICE 'Table % does not exist', table_name;
        END IF;
    END LOOP;
END $$;

-- =============================================================================
-- 6. ENABLE RLS ON EXISTING TABLES
-- =============================================================================

DO $$
DECLARE
    table_list TEXT[] := ARRAY[
        'user_settings', 'user_subscriptions', 'user_trips', 'trip_template_ratings',
        'medical_medications', 'medical_emergency_info', 'medical_records',
        'storage_categories', 'storage_locations', 'storage_items'
    ];
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY table_list LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name AND table_schema = 'public') THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
            EXECUTE format('GRANT ALL ON public.%I TO authenticated', table_name);
            RAISE NOTICE 'Enabled RLS and granted permissions for %', table_name;
        END IF;
    END LOOP;
END $$;

-- =============================================================================
-- 7. VERIFICATION - SHOW WHAT WE ACCOMPLISHED
-- =============================================================================

-- Show all policies we created
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd,
    LEFT(qual, 50) as policy_condition
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'user_settings', 'user_subscriptions', 'user_trips', 'trip_template_ratings',
    'medical_medications', 'medical_emergency_info', 'medical_records',
    'storage_categories', 'storage_locations', 'storage_items'
)
ORDER BY tablename, policyname;

-- Show tables with RLS enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'user_settings', 'user_subscriptions', 'user_trips', 'trip_template_ratings',
    'medical_medications', 'medical_emergency_info', 'medical_records',
    'storage_categories', 'storage_locations', 'storage_items'
)
ORDER BY tablename;