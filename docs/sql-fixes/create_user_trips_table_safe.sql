-- Fix Saved Trips Issue: Safely Create/Update user_trips Table
-- This script handles existing tables and policies gracefully

-- 1. Create user_trips table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'planning'
    CHECK (status IN ('draft', 'planning', 'active', 'completed')),
  trip_type TEXT DEFAULT 'road_trip',
  total_budget DECIMAL(10,2),
  spent_budget DECIMAL(10,2) DEFAULT 0,
  privacy_level TEXT DEFAULT 'private'
    CHECK (privacy_level IN ('private', 'public', 'shared')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_user_trips_user_id ON user_trips(user_id);
CREATE INDEX IF NOT EXISTS idx_user_trips_status ON user_trips(status);
CREATE INDEX IF NOT EXISTS idx_user_trips_created_at ON user_trips(created_at);

-- 3. Enable RLS
ALTER TABLE user_trips ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if they exist and recreate them
DO $$
BEGIN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view own trips" ON user_trips;
    DROP POLICY IF EXISTS "Users can insert own trips" ON user_trips;
    DROP POLICY IF EXISTS "Users can update own trips" ON user_trips;
    DROP POLICY IF EXISTS "Users can delete own trips" ON user_trips;

    -- Create new policies
    CREATE POLICY "Users can view own trips" ON user_trips
        FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert own trips" ON user_trips
        FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update own trips" ON user_trips
        FOR UPDATE USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can delete own trips" ON user_trips
        FOR DELETE USING (auth.uid() = user_id);

    RAISE NOTICE '✅ RLS policies created successfully';
END $$;

-- 5. Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- 6. Drop and recreate trigger to avoid conflicts
DROP TRIGGER IF EXISTS update_user_trips_updated_at ON user_trips;
CREATE TRIGGER update_user_trips_updated_at
    BEFORE UPDATE ON user_trips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Verify everything is working
DO $$
DECLARE
    table_exists BOOLEAN;
    policy_count INTEGER;
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'user_trips'
    ) INTO table_exists;

    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'user_trips';

    IF table_exists AND policy_count >= 4 THEN
        RAISE NOTICE '🎉 user_trips table is ready! Table exists: %, Policies: %', table_exists, policy_count;
    ELSE
        RAISE WARNING '⚠️ Setup incomplete. Table exists: %, Policies: %', table_exists, policy_count;
    END IF;
END $$;