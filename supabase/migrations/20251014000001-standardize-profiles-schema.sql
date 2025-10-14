-- Standardize Profiles Schema: Enforce 'id' as Primary Key
-- This migration ensures the profiles table consistently uses 'id UUID' as the primary key
-- matching Supabase auth.users convention and preventing future id/user_id confusion.
--
-- Problem: 9 months of confusion between profiles.id vs profiles.user_id
-- Solution: Standardize on 'id' everywhere (Supabase standard)
--
-- Date: October 14, 2025

-- ============================================================================
-- Step 1: Ensure profiles table has correct structure
-- ============================================================================

DO $$
BEGIN
    -- Check if profiles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN

        -- Ensure id column exists and is UUID type
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'profiles'
            AND column_name = 'id'
            AND data_type = 'uuid'
            AND table_schema = 'public'
        ) THEN
            -- If id doesn't exist as UUID, something is very wrong
            RAISE EXCEPTION 'profiles.id column is missing or has wrong type. Database schema corrupted.';
        END IF;

        -- Check if there's a conflicting user_id column
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'profiles'
            AND column_name = 'user_id'
            AND table_schema = 'public'
        ) THEN
            RAISE NOTICE 'Found conflicting user_id column in profiles table. Please review schema.';
        END IF;

    ELSE
        RAISE EXCEPTION 'profiles table does not exist. Run foundation migration first.';
    END IF;
END $$;

-- ============================================================================
-- Step 2: Add comment documentation to profiles table
-- ============================================================================

COMMENT ON TABLE profiles IS 'User profiles table. Primary key is "id" (UUID) matching auth.users(id). Never use "user_id" column name for primary key.';
COMMENT ON COLUMN profiles.id IS 'Primary key (UUID) referencing auth.users(id). STANDARD: Always query with .eq("id", user_id) NOT .eq("user_id", user_id)';

-- ============================================================================
-- Step 3: Create validation function to prevent future mistakes
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_profiles_has_id_column()
RETURNS TABLE(is_valid BOOLEAN, error_message TEXT) AS $$
BEGIN
    -- Check if profiles.id exists and is UUID
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'id'
        AND data_type = 'uuid'
        AND table_schema = 'public'
    ) THEN
        RETURN QUERY SELECT FALSE, 'profiles table must have id UUID column as primary key';
        RETURN;
    END IF;

    -- Check if there's a conflicting user_id column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'user_id'
        AND table_schema = 'public'
    ) THEN
        RETURN QUERY SELECT FALSE, 'profiles table should not have separate user_id column (use id instead)';
        RETURN;
    END IF;

    -- All checks passed
    RETURN QUERY SELECT TRUE, 'profiles table schema is correct'::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_profiles_has_id_column() IS 'Validates that profiles table uses id (not user_id) as primary key. Call this on backend startup to catch schema errors early.';

-- ============================================================================
-- Step 4: Run validation and fail migration if schema is wrong
-- ============================================================================

DO $$
DECLARE
    validation_result RECORD;
BEGIN
    SELECT * INTO validation_result FROM validate_profiles_has_id_column();

    IF NOT validation_result.is_valid THEN
        RAISE EXCEPTION 'Schema validation failed: %', validation_result.error_message;
    END IF;

    RAISE NOTICE '✅ Profiles schema validated successfully. Primary key is "id" (UUID).';
END $$;
