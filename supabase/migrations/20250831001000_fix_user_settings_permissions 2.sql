-- Fix User Settings Permissions
-- Adds RLS policies to allow users to manage their own settings

-- Enable RLS on user_settings if not already enabled
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can delete own settings" ON user_settings;

-- Create comprehensive RLS policies for user_settings
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON user_settings
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings" ON user_settings
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Also check if user_profiles_extended exists and add policies if needed
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles_extended'
  ) THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE user_profiles_extended ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing policies
    EXECUTE 'DROP POLICY IF EXISTS "Users can view own extended profile" ON user_profiles_extended';
    EXECUTE 'DROP POLICY IF EXISTS "Users can manage own extended profile" ON user_profiles_extended';
    
    -- Create new policies
    EXECUTE 'CREATE POLICY "Users can view own extended profile" ON user_profiles_extended
      FOR SELECT USING (auth.uid() = user_id)';
    
    EXECUTE 'CREATE POLICY "Users can manage own extended profile" ON user_profiles_extended
      FOR ALL USING (auth.uid() = user_id)';
  END IF;
END $$;