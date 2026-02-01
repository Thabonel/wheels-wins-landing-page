-- User Trips Table Schema Verification
-- Purpose: Verify user_trips table exists and has correct structure
-- Issue: user_trips table referenced in code but not in DATABASE_SCHEMA_REFERENCE.md
-- Usage: Run on database to confirm table structure before testing

-- Step 1: Check if user_trips table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_trips') THEN
        RAISE NOTICE 'SUCCESS: user_trips table exists';
    ELSE
        RAISE EXCEPTION 'CRITICAL: user_trips table does not exist. Testing cannot proceed.';
    END IF;
END $$;

-- Step 2: Display table structure
\d user_trips

-- Step 3: Verify expected columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_trips'
ORDER BY ordinal_position;

-- Step 4: Check for required columns (exit with error if missing)
DO $$
DECLARE
    missing_columns text := '';
    required_cols text[] := ARRAY[
        'id', 'user_id', 'title', 'description', 'status',
        'trip_type', 'total_budget', 'spent_budget', 'privacy_level',
        'metadata', 'created_at', 'updated_at'
    ];
    col text;
BEGIN
    FOREACH col IN ARRAY required_cols LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'user_trips'
              AND column_name = col
        ) THEN
            missing_columns := missing_columns || col || ', ';
        END IF;
    END LOOP;

    IF missing_columns != '' THEN
        RAISE EXCEPTION 'CRITICAL: Missing required columns: %', trim(trailing ', ' from missing_columns);
    ELSE
        RAISE NOTICE 'SUCCESS: All required columns present';
    END IF;
END $$;

-- Step 5: Verify metadata column is JSONB type
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_trips'
          AND column_name = 'metadata'
          AND data_type = 'jsonb'
    ) THEN
        RAISE NOTICE 'SUCCESS: metadata column is JSONB type';
    ELSE
        RAISE WARNING 'WARNING: metadata column is not JSONB type - JSON operations may fail';
    END IF;
END $$;

-- Step 6: Check RLS (Row Level Security) status
SELECT schemaname, tablename, rowsecurity, hasrls
FROM pg_tables pt
JOIN pg_class pc ON pc.relname = pt.tablename
WHERE schemaname = 'public' AND tablename = 'user_trips';

-- Step 7: List RLS policies for user_trips table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_trips'
ORDER BY policyname;

-- Step 8: Verify indexes exist (important for performance)
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'user_trips'
ORDER BY indexname;

-- Step 9: Test basic operations (if table exists and has correct structure)
DO $$
DECLARE
    test_user_id uuid;
    test_trip_id uuid;
BEGIN
    -- Create a test user ID (use existing one if available)
    test_user_id := '00000000-0000-0000-0000-000000000001';

    -- Test INSERT operation
    BEGIN
        INSERT INTO user_trips (
            user_id, title, description, status, trip_type, privacy_level, metadata
        ) VALUES (
            test_user_id,
            'Schema Test Trip',
            'Test trip for schema verification',
            'planning',
            'road_trip',
            'private',
            '{"created_by": "schema_test", "test": true}'::jsonb
        ) RETURNING id INTO test_trip_id;

        RAISE NOTICE 'SUCCESS: INSERT operation works, test trip ID: %', test_trip_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'WARNING: INSERT failed - %', SQLERRM;
        RETURN; -- Skip remaining tests if INSERT fails
    END;

    -- Test SELECT operation
    BEGIN
        IF EXISTS (SELECT 1 FROM user_trips WHERE id = test_trip_id) THEN
            RAISE NOTICE 'SUCCESS: SELECT operation works';
        ELSE
            RAISE WARNING 'WARNING: SELECT operation failed';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'WARNING: SELECT failed - %', SQLERRM;
    END;

    -- Test JSON operations
    BEGIN
        IF EXISTS (
            SELECT 1 FROM user_trips
            WHERE id = test_trip_id
              AND metadata->>'created_by' = 'schema_test'
        ) THEN
            RAISE NOTICE 'SUCCESS: JSON operations work';
        ELSE
            RAISE WARNING 'WARNING: JSON operations failed';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'WARNING: JSON operations failed - %', SQLERRM;
    END;

    -- Test UPDATE operation
    BEGIN
        UPDATE user_trips
        SET title = 'Updated Schema Test Trip',
            metadata = metadata || '{"updated": true}'::jsonb
        WHERE id = test_trip_id;

        IF FOUND THEN
            RAISE NOTICE 'SUCCESS: UPDATE operation works';
        ELSE
            RAISE WARNING 'WARNING: UPDATE operation failed';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'WARNING: UPDATE failed - %', SQLERRM;
    END;

    -- Clean up test data
    BEGIN
        DELETE FROM user_trips WHERE id = test_trip_id;
        RAISE NOTICE 'SUCCESS: DELETE operation works, test data cleaned up';
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'WARNING: DELETE failed - %', SQLERRM;
    END;
END $$;

-- Step 10: Generate final schema verification report
DO $$
DECLARE
    table_exists boolean := false;
    column_count integer := 0;
    has_metadata_jsonb boolean := false;
    has_rls boolean := false;
    policy_count integer := 0;
BEGIN
    -- Check table existence
    SELECT EXISTS(
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'user_trips'
    ) INTO table_exists;

    -- Count columns
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_trips';

    -- Check metadata column type
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_trips'
          AND column_name = 'metadata'
          AND data_type = 'jsonb'
    ) INTO has_metadata_jsonb;

    -- Check RLS status
    SELECT pc.relrowsecurity INTO has_rls
    FROM pg_class pc
    WHERE pc.relname = 'user_trips';

    -- Count RLS policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_trips';

    -- Generate report
    RAISE NOTICE '';
    RAISE NOTICE '=== USER_TRIPS TABLE SCHEMA VERIFICATION REPORT ===';
    RAISE NOTICE 'Timestamp: %', NOW();
    RAISE NOTICE '';
    RAISE NOTICE 'Table Exists: %', CASE WHEN table_exists THEN 'YES ✓' ELSE 'NO ✗' END;
    RAISE NOTICE 'Column Count: %', column_count;
    RAISE NOTICE 'Metadata JSONB: %', CASE WHEN has_metadata_jsonb THEN 'YES ✓' ELSE 'NO ✗' END;
    RAISE NOTICE 'RLS Enabled: %', CASE WHEN has_rls THEN 'YES ✓' ELSE 'NO ✗' END;
    RAISE NOTICE 'RLS Policies: % configured', policy_count;
    RAISE NOTICE '';

    IF table_exists AND column_count >= 12 AND has_metadata_jsonb THEN
        RAISE NOTICE 'OVERALL STATUS: ✓ READY FOR PAM TRIP TESTING';
        RAISE NOTICE 'The user_trips table is properly configured for testing.';
    ELSE
        RAISE NOTICE 'OVERALL STATUS: ✗ NOT READY FOR TESTING';
        RAISE NOTICE 'Issues must be resolved before PAM trip testing can proceed.';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. If ready: Execute test-data-setup.sql with your user ID';
    RAISE NOTICE '2. If issues found: Fix schema problems and re-run verification';
    RAISE NOTICE '3. Update DATABASE_SCHEMA_REFERENCE.md with user_trips table definition';
    RAISE NOTICE '';
END $$;

-- Step 11: Provide CREATE TABLE statement if table doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_trips') THEN
        RAISE NOTICE '';
        RAISE NOTICE 'CREATE TABLE STATEMENT (if table needs to be created):';
        RAISE NOTICE '';
        RAISE NOTICE 'CREATE TABLE user_trips (';
        RAISE NOTICE '    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),';
        RAISE NOTICE '    user_id UUID NOT NULL,';
        RAISE NOTICE '    title TEXT NOT NULL,';
        RAISE NOTICE '    description TEXT,';
        RAISE NOTICE '    status TEXT DEFAULT ''planning'',';
        RAISE NOTICE '    trip_type TEXT DEFAULT ''road_trip'',';
        RAISE NOTICE '    total_budget DECIMAL(10,2),';
        RAISE NOTICE '    spent_budget DECIMAL(10,2) DEFAULT 0.00,';
        RAISE NOTICE '    privacy_level TEXT DEFAULT ''private'',';
        RAISE NOTICE '    metadata JSONB DEFAULT ''{}''::jsonb,';
        RAISE NOTICE '    start_date DATE,';
        RAISE NOTICE '    end_date DATE,';
        RAISE NOTICE '    created_at TIMESTAMPTZ DEFAULT NOW(),';
        RAISE NOTICE '    updated_at TIMESTAMPTZ DEFAULT NOW(),';
        RAISE NOTICE '    FOREIGN KEY (user_id) REFERENCES auth.users(id)';
        RAISE NOTICE ');';
        RAISE NOTICE '';
        RAISE NOTICE '-- Enable RLS';
        RAISE NOTICE 'ALTER TABLE user_trips ENABLE ROW LEVEL SECURITY;';
        RAISE NOTICE '';
        RAISE NOTICE '-- RLS Policy for user access';
        RAISE NOTICE 'CREATE POLICY "Users can access their own trips" ON user_trips';
        RAISE NOTICE '    FOR ALL USING (auth.uid() = user_id);';
        RAISE NOTICE '';
        RAISE NOTICE '-- Indexes for performance';
        RAISE NOTICE 'CREATE INDEX idx_user_trips_user_id ON user_trips(user_id);';
        RAISE NOTICE 'CREATE INDEX idx_user_trips_status ON user_trips(status);';
        RAISE NOTICE 'CREATE INDEX idx_user_trips_created_by ON user_trips USING GIN ((metadata->>''created_by''));';
        RAISE NOTICE '';
    END IF;
END $$;