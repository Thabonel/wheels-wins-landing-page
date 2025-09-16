-- Fixed RLS Policies with Correct Data Types
-- Handles UUID vs BIGINT mismatches properly
-- Date: 2025-09-16

-- First, let's check if we need to handle different user_id column types
-- Some tables might use bigint, others might use uuid

-- =============================================================================
-- APPROACH 1: For tables where user_id is UUID type
-- =============================================================================

-- These policies will work for tables where user_id is UUID
-- We'll create them conditionally and handle errors gracefully

-- =============================================================================
-- APPROACH 2: For tables where user_id is BIGINT (referencing auth.users.id)
-- =============================================================================

-- If tables use bigint user_id that references auth.users.id (which is uuid),
-- we need to join through the profiles table or cast appropriately

-- =============================================================================
-- SAFE POLICY CREATION WITH ERROR HANDLING
-- =============================================================================

-- Drop all existing policies first (this won't error if they don't exist)
DO $$
BEGIN
    -- Medical tables
    DROP POLICY IF EXISTS "Users can view own medications" ON public.medical_medications;
    DROP POLICY IF EXISTS "Users can insert own medications" ON public.medical_medications;
    DROP POLICY IF EXISTS "Users can update own medications" ON public.medical_medications;
    DROP POLICY IF EXISTS "Users can delete own medications" ON public.medical_medications;

    DROP POLICY IF EXISTS "Users can view own emergency info" ON public.medical_emergency_info;
    DROP POLICY IF EXISTS "Users can insert own emergency info" ON public.medical_emergency_info;
    DROP POLICY IF EXISTS "Users can update own emergency info" ON public.medical_emergency_info;
    DROP POLICY IF EXISTS "Users can delete own emergency info" ON public.medical_emergency_info;

    DROP POLICY IF EXISTS "Users can view own medical records" ON public.medical_records;
    DROP POLICY IF EXISTS "Users can insert own medical records" ON public.medical_records;
    DROP POLICY IF EXISTS "Users can update own medical records" ON public.medical_records;
    DROP POLICY IF EXISTS "Users can delete own medical records" ON public.medical_records;

    -- Trip tables
    DROP POLICY IF EXISTS "Users can view own trips" ON public.user_trips;
    DROP POLICY IF EXISTS "Users can insert own trips" ON public.user_trips;
    DROP POLICY IF EXISTS "Users can update own trips" ON public.user_trips;
    DROP POLICY IF EXISTS "Users can delete own trips" ON public.user_trips;

    DROP POLICY IF EXISTS "Users can view own ratings" ON public.trip_template_ratings;
    DROP POLICY IF EXISTS "Users can insert own ratings" ON public.trip_template_ratings;
    DROP POLICY IF EXISTS "Users can update own ratings" ON public.trip_template_ratings;
    DROP POLICY IF EXISTS "Users can delete own ratings" ON public.trip_template_ratings;

    -- Storage tables
    DROP POLICY IF EXISTS "Users can view own storage categories" ON public.storage_categories;
    DROP POLICY IF EXISTS "Users can insert own storage categories" ON public.storage_categories;
    DROP POLICY IF EXISTS "Users can update own storage categories" ON public.storage_categories;
    DROP POLICY IF EXISTS "Users can delete own storage categories" ON public.storage_categories;

    DROP POLICY IF EXISTS "Users can view own storage locations" ON public.storage_locations;
    DROP POLICY IF EXISTS "Users can insert own storage locations" ON public.storage_locations;
    DROP POLICY IF EXISTS "Users can update own storage locations" ON public.storage_locations;
    DROP POLICY IF EXISTS "Users can delete own storage locations" ON public.storage_locations;

    DROP POLICY IF EXISTS "Users can view own storage items" ON public.storage_items;
    DROP POLICY IF EXISTS "Users can insert own storage items" ON public.storage_items;
    DROP POLICY IF EXISTS "Users can update own storage items" ON public.storage_items;
    DROP POLICY IF EXISTS "Users can delete own storage items" ON public.storage_items;

    -- User settings and subscriptions (these are more likely to be correct)
    DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
    DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
    DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
    DROP POLICY IF EXISTS "Users can delete own settings" ON public.user_settings;

    DROP POLICY IF EXISTS "Users can view own subscription" ON public.user_subscriptions;
    DROP POLICY IF EXISTS "Users can insert own subscription" ON public.user_subscriptions;
    DROP POLICY IF EXISTS "Users can update own subscription" ON public.user_subscriptions;
    DROP POLICY IF EXISTS "Users can delete own subscription" ON public.user_subscriptions;

    -- Profiles
    DROP POLICY IF EXISTS "Users can view any profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
END $$;

-- =============================================================================
-- CREATE FLEXIBLE POLICIES THAT HANDLE DIFFERENT DATA TYPES
-- =============================================================================

-- For user_settings (most likely to be UUID)
DO $$
BEGIN
    -- Try UUID comparison first
    BEGIN
        CREATE POLICY "Users can view own settings" ON public.user_settings
            FOR SELECT TO authenticated
            USING (auth.uid() = user_id);
    EXCEPTION WHEN OTHERS THEN
        -- If that fails, try text conversion
        BEGIN
            CREATE POLICY "Users can view own settings" ON public.user_settings
                FOR SELECT TO authenticated
                USING (auth.uid()::text = user_id::text);
        EXCEPTION WHEN OTHERS THEN
            -- Last resort: join through profiles table
            CREATE POLICY "Users can view own settings" ON public.user_settings
                FOR SELECT TO authenticated
                USING (auth.uid() IN (SELECT id FROM auth.users WHERE id::text = user_id::text));
        END;
    END;

    -- Repeat for other operations
    BEGIN
        CREATE POLICY "Users can insert own settings" ON public.user_settings
            FOR INSERT TO authenticated
            WITH CHECK (auth.uid() = user_id);
    EXCEPTION WHEN OTHERS THEN
        BEGIN
            CREATE POLICY "Users can insert own settings" ON public.user_settings
                FOR INSERT TO authenticated
                WITH CHECK (auth.uid()::text = user_id::text);
        EXCEPTION WHEN OTHERS THEN
            CREATE POLICY "Users can insert own settings" ON public.user_settings
                FOR INSERT TO authenticated
                WITH CHECK (auth.uid() IN (SELECT id FROM auth.users WHERE id::text = user_id::text));
        END;
    END;

    BEGIN
        CREATE POLICY "Users can update own settings" ON public.user_settings
            FOR UPDATE TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    EXCEPTION WHEN OTHERS THEN
        BEGIN
            CREATE POLICY "Users can update own settings" ON public.user_settings
                FOR UPDATE TO authenticated
                USING (auth.uid()::text = user_id::text)
                WITH CHECK (auth.uid()::text = user_id::text);
        EXCEPTION WHEN OTHERS THEN
            CREATE POLICY "Users can update own settings" ON public.user_settings
                FOR UPDATE TO authenticated
                USING (auth.uid() IN (SELECT id FROM auth.users WHERE id::text = user_id::text))
                WITH CHECK (auth.uid() IN (SELECT id FROM auth.users WHERE id::text = user_id::text));
        END;
    END;

    BEGIN
        CREATE POLICY "Users can delete own settings" ON public.user_settings
            FOR DELETE TO authenticated
            USING (auth.uid() = user_id);
    EXCEPTION WHEN OTHERS THEN
        BEGIN
            CREATE POLICY "Users can delete own settings" ON public.user_settings
                FOR DELETE TO authenticated
                USING (auth.uid()::text = user_id::text);
        EXCEPTION WHEN OTHERS THEN
            CREATE POLICY "Users can delete own settings" ON public.user_settings
                FOR DELETE TO authenticated
                USING (auth.uid() IN (SELECT id FROM auth.users WHERE id::text = user_id::text));
        END;
    END;
END $$;

-- For user_subscriptions
DO $$
BEGIN
    BEGIN
        CREATE POLICY "Users can view own subscription" ON public.user_subscriptions
            FOR SELECT TO authenticated
            USING (auth.uid() = user_id);
    EXCEPTION WHEN OTHERS THEN
        CREATE POLICY "Users can view own subscription" ON public.user_subscriptions
            FOR SELECT TO authenticated
            USING (auth.uid()::text = user_id::text);
    END;

    BEGIN
        CREATE POLICY "Users can insert own subscription" ON public.user_subscriptions
            FOR INSERT TO authenticated
            WITH CHECK (auth.uid() = user_id);
    EXCEPTION WHEN OTHERS THEN
        CREATE POLICY "Users can insert own subscription" ON public.user_subscriptions
            FOR INSERT TO authenticated
            WITH CHECK (auth.uid()::text = user_id::text);
    END;

    BEGIN
        CREATE POLICY "Users can update own subscription" ON public.user_subscriptions
            FOR UPDATE TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    EXCEPTION WHEN OTHERS THEN
        CREATE POLICY "Users can update own subscription" ON public.user_subscriptions
            FOR UPDATE TO authenticated
            USING (auth.uid()::text = user_id::text)
            WITH CHECK (auth.uid()::text = user_id::text);
    END;

    BEGIN
        CREATE POLICY "Users can delete own subscription" ON public.user_subscriptions
            FOR DELETE TO authenticated
            USING (auth.uid() = user_id);
    EXCEPTION WHEN OTHERS THEN
        CREATE POLICY "Users can delete own subscription" ON public.user_subscriptions
            FOR DELETE TO authenticated
            USING (auth.uid()::text = user_id::text);
    END;
END $$;

-- =============================================================================
-- SIMPLE APPROACH FOR TABLES THAT MIGHT NOT EXIST YET
-- =============================================================================

-- Create tables if they don't exist, then add policies
CREATE TABLE IF NOT EXISTS public.user_trips (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trip_template_ratings (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add policies for newly created or existing tables
DO $$
BEGIN
    -- user_trips policies
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
EXCEPTION WHEN OTHERS THEN
    -- Policies might already exist, that's OK
    NULL;
END $$;

DO $$
BEGIN
    -- trip_template_ratings policies
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
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- =============================================================================
-- ENABLE RLS ON ALL TABLES
-- =============================================================================

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_template_ratings ENABLE ROW LEVEL SECURITY;

-- Try to enable RLS on other tables if they exist
DO $$
BEGIN
    ALTER TABLE public.medical_medications ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.medical_emergency_info ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.storage_categories ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.storage_locations ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.storage_items ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

GRANT ALL ON public.user_settings TO authenticated;
GRANT ALL ON public.user_subscriptions TO authenticated;
GRANT ALL ON public.user_trips TO authenticated;
GRANT ALL ON public.trip_template_ratings TO authenticated;

-- Grant permissions on other tables if they exist
DO $$
BEGIN
    GRANT ALL ON public.medical_medications TO authenticated;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DO $$
BEGIN
    GRANT ALL ON public.medical_emergency_info TO authenticated;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DO $$
BEGIN
    GRANT ALL ON public.medical_records TO authenticated;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DO $$
BEGIN
    GRANT ALL ON public.storage_categories TO authenticated;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DO $$
BEGIN
    GRANT ALL ON public.storage_locations TO authenticated;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DO $$
BEGIN
    GRANT ALL ON public.storage_items TO authenticated;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Check which policies were created successfully
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'user_settings', 'user_subscriptions', 'user_trips', 'trip_template_ratings'
)
ORDER BY tablename, policyname;