-- Fix Profiles Table: Convert id from bigint to UUID
-- ONLY run this if diagnosis shows profiles.id is bigint

-- ==============================================================================
-- STEP 1: Check current state (informational only)
-- ==============================================================================

-- This will show you if profiles.id is bigint or uuid
DO $$
DECLARE
    id_type TEXT;
BEGIN
    SELECT data_type INTO id_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'id';

    RAISE NOTICE 'Current profiles.id type: %', id_type;

    IF id_type = 'bigint' THEN
        RAISE NOTICE 'ACTION REQUIRED: profiles.id is bigint, needs conversion to UUID';
    ELSIF id_type = 'uuid' THEN
        RAISE NOTICE 'OK: profiles.id is already UUID, no conversion needed';
    ELSE
        RAISE NOTICE 'WARNING: Unexpected type: %', id_type;
    END IF;
END $$;

-- ==============================================================================
-- STEP 2: Drop constraints that depend on profiles.id
-- ==============================================================================

-- Drop any foreign keys referencing profiles.id
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT
            tc.constraint_name,
            tc.table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'profiles'
        AND ccu.column_name = 'id'
    LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I CASCADE',
            r.table_name, r.constraint_name);
        RAISE NOTICE 'Dropped FK constraint: %.%', r.table_name, r.constraint_name;
    END LOOP;
END $$;

-- ==============================================================================
-- STEP 3: Backup existing profiles data
-- ==============================================================================

-- Create backup table (will be dropped at end if successful)
DROP TABLE IF EXISTS profiles_backup_20250111;
CREATE TABLE profiles_backup_20250111 AS SELECT * FROM public.profiles;

RAISE NOTICE 'Created backup: profiles_backup_20250111';

-- ==============================================================================
-- STEP 4: Recreate profiles table with correct UUID type
-- ==============================================================================

-- Drop and recreate profiles table with UUID id
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Admin can see all profiles
DROP POLICY IF EXISTS profiles_select_admin ON public.profiles;
CREATE POLICY profiles_select_admin ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
    );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_profiles_updated_at();

RAISE NOTICE 'Recreated profiles table with UUID id type';

-- ==============================================================================
-- STEP 5: Restore data from backup (matching auth.users.id)
-- ==============================================================================

-- Insert data back, matching with auth.users
INSERT INTO public.profiles (id, email, full_name, avatar_url, role, preferences, created_at, updated_at)
SELECT
    u.id,  -- Use UUID from auth.users
    b.email,
    b.full_name,
    b.avatar_url,
    COALESCE(b.role, 'user'),
    COALESCE(b.preferences, '{}'),
    b.created_at,
    b.updated_at
FROM profiles_backup_20250111 b
JOIN auth.users u ON u.email = b.email  -- Match by email
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    role = EXCLUDED.role,
    preferences = EXCLUDED.preferences;

RAISE NOTICE 'Restored profile data from backup';

-- ==============================================================================
-- STEP 6: Verify and cleanup
-- ==============================================================================

-- Verify data count matches
DO $$
DECLARE
    backup_count INTEGER;
    new_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO backup_count FROM profiles_backup_20250111;
    SELECT COUNT(*) INTO new_count FROM public.profiles;

    RAISE NOTICE 'Backup had % rows, new table has % rows', backup_count, new_count;

    IF new_count = backup_count THEN
        RAISE NOTICE 'SUCCESS: All rows restored';
        -- Drop backup table
        DROP TABLE IF EXISTS profiles_backup_20250111;
        RAISE NOTICE 'Dropped backup table';
    ELSE
        RAISE WARNING 'MISMATCH: Row counts differ. Backup table kept for safety.';
        RAISE WARNING 'Manual review required. DO NOT drop profiles_backup_20250111 yet!';
    END IF;
END $$;

-- Final verification
SELECT
    'profiles.id type: ' || data_type as verification
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles'
AND column_name = 'id';
