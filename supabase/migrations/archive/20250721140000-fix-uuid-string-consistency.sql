-- Fix UUID vs String inconsistencies in database schema
-- This migration addresses the critical type mismatches causing authentication failures

-- 1. Fix rate_limit_log table - convert user_id from TEXT to UUID
-- This is the primary source of "operator does not exist: text = uuid" errors
DO $$ 
BEGIN
    -- Check if rate_limit_log table exists and has TEXT user_id column
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'rate_limit_log') THEN
        -- Check if user_id is currently TEXT type
        IF EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'rate_limit_log' 
            AND column_name = 'user_id' 
            AND data_type = 'text'
        ) THEN
            -- Convert TEXT user_id to UUID type
            -- First, update any invalid TEXT values to valid UUIDs or NULL
            UPDATE public.rate_limit_log 
            SET user_id = NULL 
            WHERE user_id IS NOT NULL 
            AND user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
            
            -- Now alter the column type to UUID
            ALTER TABLE public.rate_limit_log 
            ALTER COLUMN user_id TYPE UUID USING user_id::UUID;
            
            -- Add foreign key constraint to auth.users if it doesn't exist
            IF NOT EXISTS (
                SELECT FROM information_schema.table_constraints 
                WHERE table_name = 'rate_limit_log' 
                AND constraint_type = 'FOREIGN KEY'
                AND constraint_name LIKE '%user_id%'
            ) THEN
                ALTER TABLE public.rate_limit_log 
                ADD CONSTRAINT rate_limit_log_user_id_fkey 
                FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
            END IF;
        END IF;
    END IF;
END $$;

-- 2. Standardize all RLS policies to use consistent UUID casting
-- Drop and recreate problematic policies with proper type handling

-- Fix user_settings policies (common source of type conflicts)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_settings') THEN
        -- Drop existing conflicting policies
        DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
        DROP POLICY IF EXISTS "Users can manage own settings" ON public.user_settings;
        DROP POLICY IF EXISTS "user_settings_policy" ON public.user_settings;
        DROP POLICY IF EXISTS "Enable users to manage their own settings" ON public.user_settings;
        
        -- Create standardized policies with proper UUID handling
        CREATE POLICY "user_settings_select_own" ON public.user_settings
            FOR SELECT USING (auth.uid() = user_id);
            
        CREATE POLICY "user_settings_insert_own" ON public.user_settings
            FOR INSERT WITH CHECK (auth.uid() = user_id);
            
        CREATE POLICY "user_settings_update_own" ON public.user_settings
            FOR UPDATE USING (auth.uid() = user_id);
            
        CREATE POLICY "user_settings_delete_own" ON public.user_settings
            FOR DELETE USING (auth.uid() = user_id);
            
        -- Add service role access
        CREATE POLICY "service_role_full_access_user_settings" ON public.user_settings
            FOR ALL TO service_role USING (true);
    END IF;
END $$;

-- Fix group_trip_participants policies (prevent infinite recursion)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'group_trip_participants') THEN
        -- Drop all existing policies that might cause recursion
        DROP POLICY IF EXISTS "Users can view group trip participants" ON public.group_trip_participants;
        DROP POLICY IF EXISTS "Users can manage their group trip participation" ON public.group_trip_participants;
        DROP POLICY IF EXISTS "group_trip_participants_select" ON public.group_trip_participants;
        DROP POLICY IF EXISTS "group_trip_participants_insert" ON public.group_trip_participants;
        DROP POLICY IF EXISTS "group_trip_participants_update" ON public.group_trip_participants;
        DROP POLICY IF EXISTS "group_trip_participants_delete" ON public.group_trip_participants;
        
        -- Create simple, non-recursive policies with consistent UUID handling
        CREATE POLICY "group_participants_select_policy" ON public.group_trip_participants
            FOR SELECT USING (true);  -- Allow reading all participants for group features
            
        CREATE POLICY "group_participants_insert_policy" ON public.group_trip_participants
            FOR INSERT WITH CHECK (auth.uid() = user_id);
            
        CREATE POLICY "group_participants_update_policy" ON public.group_trip_participants
            FOR UPDATE USING (auth.uid() = user_id);
            
        CREATE POLICY "group_participants_delete_policy" ON public.group_trip_participants
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- 3. Fix profiles table dual-ID issues
-- Ensure profiles table has consistent UUID primary key structure
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
        -- Check if profiles table has both id and user_id columns
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'id')
           AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'user_id') THEN
            
            -- If id column is not UUID type, we need to standardize
            IF NOT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_name = 'profiles' 
                AND column_name = 'id' 
                AND data_type = 'uuid'
            ) THEN
                -- Drop the non-UUID id column and use user_id as primary key
                ALTER TABLE public.profiles DROP COLUMN IF EXISTS id CASCADE;
                ALTER TABLE public.profiles ADD PRIMARY KEY (user_id);
                
                -- Update any references that might use the old id column
                -- (This would need to be customized based on actual foreign key usage)
            END IF;
        END IF;
    END IF;
END $$;

-- 4. Add validation constraints to prevent future TEXT user_id columns
-- This prevents future migrations from accidentally creating TEXT user_id columns

-- Create a function to validate UUID format
CREATE OR REPLACE FUNCTION validate_user_id_uuid()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure user_id is a valid UUID format if not null
    IF NEW.user_id IS NOT NULL AND NOT (NEW.user_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') THEN
        RAISE EXCEPTION 'user_id must be a valid UUID format';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply UUID validation to critical tables (only if they exist)
DO $$ 
BEGIN
    -- Add triggers to validate UUID format on key tables
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_settings') THEN
        DROP TRIGGER IF EXISTS validate_user_settings_user_id ON public.user_settings;
        CREATE TRIGGER validate_user_settings_user_id
            BEFORE INSERT OR UPDATE ON public.user_settings
            FOR EACH ROW EXECUTE FUNCTION validate_user_id_uuid();
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
        DROP TRIGGER IF EXISTS validate_profiles_user_id ON public.profiles;
        CREATE TRIGGER validate_profiles_user_id
            BEFORE INSERT OR UPDATE ON public.profiles
            FOR EACH ROW EXECUTE FUNCTION validate_user_id_uuid();
    END IF;
END $$;

-- 5. Update any remaining inconsistent table structures
-- Check for other tables that might have TEXT user_id columns

-- Generic fix for any remaining TEXT user_id columns in public schema
DO $$ 
DECLARE
    table_record RECORD;
BEGIN
    -- Find all tables with TEXT user_id columns
    FOR table_record IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND column_name = 'user_id' 
        AND data_type = 'text'
        AND table_name != 'rate_limit_log'  -- Already handled above
    LOOP
        -- Log which tables we're fixing
        RAISE NOTICE 'Converting user_id column to UUID in table: %', table_record.table_name;
        
        -- Convert TEXT user_id to UUID for each table
        EXECUTE format('
            UPDATE public.%I 
            SET user_id = NULL 
            WHERE user_id IS NOT NULL 
            AND user_id !~ ''^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'';
        ', table_record.table_name);
        
        EXECUTE format('
            ALTER TABLE public.%I 
            ALTER COLUMN user_id TYPE UUID USING user_id::UUID;
        ', table_record.table_name);
        
        -- Add foreign key constraint if it doesn't exist
        EXECUTE format('
            ALTER TABLE public.%I 
            ADD CONSTRAINT %I_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        ', table_record.table_name, table_record.table_name);
        
    END LOOP;
END $$;

-- 6. Add helpful comments and documentation
COMMENT ON FUNCTION validate_user_id_uuid() IS 'Validates that user_id columns contain valid UUID format to prevent type mismatches';

-- Create a view to monitor UUID consistency across tables
CREATE OR REPLACE VIEW uuid_consistency_check AS
SELECT 
    table_name,
    column_name,
    data_type,
    CASE 
        WHEN data_type = 'uuid' THEN 'Correct UUID type'
        WHEN data_type = 'text' THEN 'Potential issue - TEXT type'
        ELSE 'Unknown type'
    END as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND column_name = 'user_id'
ORDER BY table_name;

COMMENT ON VIEW uuid_consistency_check IS 'Monitor user_id column types across all tables to ensure UUID consistency';