-- Fix user_subscriptions table schema to match frontend expectations
-- The frontend expects different column names than what currently exists

-- First, let's add the missing columns
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS trial_ends_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS plan_type text DEFAULT 'free_trial',
ADD COLUMN IF NOT EXISTS video_course_access boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS subscription_ends_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS subscription_started_at timestamp with time zone DEFAULT now();

-- Update subscription_status based on existing status column
UPDATE user_subscriptions 
SET subscription_status = CASE 
  WHEN status = 'active' AND subscription_tier = 'free' THEN 'trial'
  WHEN status = 'active' THEN 'active'
  WHEN status = 'canceled' THEN 'cancelled'
  ELSE 'expired'
END
WHERE subscription_status IS NULL;

-- Update plan_type based on existing subscription_tier
UPDATE user_subscriptions 
SET plan_type = CASE 
  WHEN subscription_tier = 'free' THEN 'free_trial'
  WHEN subscription_tier = 'monthly' THEN 'monthly'
  WHEN subscription_tier = 'annual' THEN 'annual'
  WHEN subscription_tier = 'yearly' THEN 'annual'
  ELSE 'free_trial'
END
WHERE plan_type IS NULL;

-- Set trial_ends_at for free users (30 days from creation)
UPDATE user_subscriptions 
SET trial_ends_at = created_at + interval '30 days'
WHERE plan_type = 'free_trial' AND trial_ends_at IS NULL;

-- Set subscription_started_at if not set
UPDATE user_subscriptions 
SET subscription_started_at = created_at
WHERE subscription_started_at IS NULL;

-- Drop old columns if they're no longer needed (optional - commented out for safety)
-- ALTER TABLE user_subscriptions 
-- DROP COLUMN IF EXISTS subscription_tier,
-- DROP COLUMN IF EXISTS status;

-- Ensure RLS is enabled
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can delete own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can manage own subscription" ON user_subscriptions;

-- Create comprehensive RLS policies
CREATE POLICY "Users can view own subscription" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription" ON user_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription" ON user_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscription" ON user_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- Create a default subscription for any user who doesn't have one
INSERT INTO user_subscriptions (
  user_id,
  trial_ends_at,
  subscription_status,
  plan_type,
  video_course_access,
  subscription_started_at
)
SELECT 
  p.user_id,
  now() + interval '30 days',
  'trial',
  'free_trial',
  false,
  now()
FROM profiles p
LEFT JOIN user_subscriptions us ON us.user_id = p.user_id
WHERE us.id IS NULL;

-- Verify the structure
DO $$ 
DECLARE
  col_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'user_subscriptions'
    AND column_name IN ('trial_ends_at', 'subscription_status', 'plan_type');
  
  IF col_count < 3 THEN
    RAISE WARNING 'user_subscriptions missing expected columns';
  END IF;
END $$;