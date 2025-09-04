-- Comprehensive Permissions Fix
-- Ensures all user-related tables have proper RLS policies

-- =====================================================
-- USER_SETTINGS TABLE
-- =====================================================
-- Enable RLS if not already enabled
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can delete own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can manage own settings" ON user_settings;
DROP POLICY IF EXISTS "Enable read access for users" ON user_settings;
DROP POLICY IF EXISTS "Enable insert for users" ON user_settings;
DROP POLICY IF EXISTS "Enable update for users" ON user_settings;
DROP POLICY IF EXISTS "Enable delete for users" ON user_settings;

-- Create new comprehensive policies
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings" ON user_settings
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- USER_SUBSCRIPTIONS TABLE
-- =====================================================
-- Check if table exists and add RLS
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_subscriptions'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing policies
    EXECUTE 'DROP POLICY IF EXISTS "Users can view own subscription" ON user_subscriptions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can manage own subscription" ON user_subscriptions';
    
    -- Create new policies
    EXECUTE 'CREATE POLICY "Users can view own subscription" ON user_subscriptions
      FOR SELECT USING (auth.uid() = user_id)';
    
    EXECUTE 'CREATE POLICY "Users can insert own subscription" ON user_subscriptions
      FOR INSERT WITH CHECK (auth.uid() = user_id)';
    
    EXECUTE 'CREATE POLICY "Users can update own subscription" ON user_subscriptions
      FOR UPDATE USING (auth.uid() = user_id)';
    
    EXECUTE 'CREATE POLICY "Users can delete own subscription" ON user_subscriptions
      FOR DELETE USING (auth.uid() = user_id)';
  END IF;
END $$;

-- =====================================================
-- USER_LOCATIONS TABLE (for PAM location updates)
-- =====================================================
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_locations'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing policies
    EXECUTE 'DROP POLICY IF EXISTS "Users can manage own location" ON user_locations';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view own location" ON user_locations';
    
    -- Create new policies
    EXECUTE 'CREATE POLICY "Users can view own location" ON user_locations
      FOR SELECT USING (auth.uid() = user_id)';
    
    EXECUTE 'CREATE POLICY "Users can manage own location" ON user_locations
      FOR ALL USING (auth.uid() = user_id)';
    
    -- Add unique constraint for upserts if missing
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'user_locations_user_id_key'
    ) THEN
      EXECUTE 'ALTER TABLE user_locations ADD CONSTRAINT user_locations_user_id_key UNIQUE (user_id)';
    END IF;
  END IF;
END $$;

-- =====================================================
-- PROFILES TABLE
-- =====================================================
-- Ensure profiles table has proper RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies for profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- Verify all policies are in place
-- =====================================================
DO $$ 
DECLARE
  policy_count INTEGER;
BEGIN
  -- Count policies on user_settings
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'public' 
    AND tablename = 'user_settings';
  
  IF policy_count < 4 THEN
    RAISE WARNING 'user_settings has % policies, expected 4', policy_count;
  END IF;
  
  -- Count policies on profiles
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'public' 
    AND tablename = 'profiles';
  
  IF policy_count < 3 THEN
    RAISE WARNING 'profiles has % policies, expected at least 3', policy_count;
  END IF;
END $$;