-- 28-Day Free Trial System Migration
-- Creates tables and policies for trial management with habit-building nudges

-- Create trial status enum
CREATE TYPE trial_status AS ENUM ('active', 'expired', 'converted');

-- Create trials table for managing user trials
CREATE TABLE IF NOT EXISTS public.trials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ GENERATED ALWAYS AS (started_at + INTERVAL '28 days') STORED,
  status trial_status DEFAULT 'active',
  conversion_at TIMESTAMPTZ,
  origin TEXT CHECK (origin IN ('wheels', 'unimog')),
  referral_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create trial events table for tracking user actions
CREATE TABLE IF NOT EXISTS public.trial_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trial_id UUID NOT NULL REFERENCES public.trials(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'nudge_shown', 'email_sent', 'cta_click', 'upgrade_attempt', 
    'limit_hit', 'import_done', 'route_saved', 'budget_set', 
    'fuel_linked', 'reminders_enabled', 'milestone_completed'
  )),
  day_number INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX idx_trial_events_user_id (user_id),
  INDEX idx_trial_events_trial_id (trial_id),
  INDEX idx_trial_events_event_type (event_type),
  INDEX idx_trial_events_created_at (created_at DESC)
);

-- Add trial_status to profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'trial_status'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN trial_status TEXT DEFAULT 'none' 
    CHECK (trial_status IN ('none', 'active', 'expired', 'converted'));
  END IF;
END $$;

-- Create trial limits tracking table
CREATE TABLE IF NOT EXISTS public.trial_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  limit_type TEXT NOT NULL CHECK (limit_type IN (
    'devices', 'storage', 'routes', 'doc_views'
  )),
  current_usage INTEGER DEFAULT 0,
  max_allowed INTEGER NOT NULL,
  last_reset_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, limit_type)
);

-- Create trial milestones tracking
CREATE TABLE IF NOT EXISTS public.trial_milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trial_id UUID NOT NULL REFERENCES public.trials(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL CHECK (milestone_type IN (
    'import_expenses', 'save_route', 'set_budget', 'link_fuel', 'enable_reminders'
  )),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, milestone_type)
);

-- Enable Row Level Security
ALTER TABLE public.trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trials table
CREATE POLICY "Users can view own trial" ON public.trials
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own trial" ON public.trials
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trial" ON public.trials
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for trial_events table
CREATE POLICY "Users can view own events" ON public.trial_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own events" ON public.trial_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for trial_limits table
CREATE POLICY "Users can view own limits" ON public.trial_limits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own limits" ON public.trial_limits
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for trial_milestones table
CREATE POLICY "Users can view own milestones" ON public.trial_milestones
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own milestones" ON public.trial_milestones
  FOR ALL USING (auth.uid() = user_id);

-- Function to create trial on user signup
CREATE OR REPLACE FUNCTION create_trial_for_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create trial if user doesn't have a subscription
  IF NOT EXISTS (
    SELECT 1 FROM public.subscriptions 
    WHERE user_id = NEW.id AND status = 'active'
  ) THEN
    -- Create trial
    INSERT INTO public.trials (user_id, origin)
    VALUES (NEW.id, 'wheels');
    
    -- Update profile
    UPDATE public.profiles 
    SET trial_status = 'active'
    WHERE id = NEW.id;
    
    -- Initialize limits
    INSERT INTO public.trial_limits (user_id, limit_type, max_allowed)
    VALUES 
      (NEW.id, 'devices', 2),
      (NEW.id, 'storage', 5368709120), -- 5GB in bytes
      (NEW.id, 'routes', 10),
      (NEW.id, 'doc_views', 500);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create trial on user creation
CREATE TRIGGER create_trial_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_trial_for_user();

-- Function to check and update trial expiry
CREATE OR REPLACE FUNCTION check_trial_expiry()
RETURNS void AS $$
BEGIN
  -- Update expired trials
  UPDATE public.trials
  SET status = 'expired'
  WHERE status = 'active' 
    AND expires_at < NOW();
  
  -- Update profiles
  UPDATE public.profiles p
  SET trial_status = 'expired'
  FROM public.trials t
  WHERE p.id = t.user_id
    AND t.status = 'expired'
    AND p.trial_status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to convert trial to paid
CREATE OR REPLACE FUNCTION convert_trial_to_paid(p_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Update trial
  UPDATE public.trials
  SET 
    status = 'converted',
    conversion_at = NOW()
  WHERE user_id = p_user_id
    AND status = 'active';
  
  -- Update profile
  UPDATE public.profiles
  SET trial_status = 'converted'
  WHERE id = p_user_id;
  
  -- Log conversion event
  INSERT INTO public.trial_events (user_id, trial_id, event_type, metadata)
  SELECT 
    p_user_id,
    id,
    'upgrade_attempt',
    jsonb_build_object('success', true, 'timestamp', NOW())
  FROM public.trials
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log trial event
CREATE OR REPLACE FUNCTION log_trial_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS void AS $$
DECLARE
  v_trial_id UUID;
  v_day_number INTEGER;
BEGIN
  -- Get trial ID and calculate day number
  SELECT 
    t.id,
    EXTRACT(DAY FROM NOW() - t.started_at)::INTEGER + 1
  INTO v_trial_id, v_day_number
  FROM public.trials t
  WHERE t.user_id = p_user_id;
  
  IF v_trial_id IS NOT NULL THEN
    INSERT INTO public.trial_events (
      user_id, trial_id, event_type, day_number, metadata
    ) VALUES (
      p_user_id, v_trial_id, p_event_type, v_day_number, p_metadata
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check trial limits
CREATE OR REPLACE FUNCTION check_trial_limit(
  p_user_id UUID,
  p_limit_type TEXT
)
RETURNS TABLE(
  is_within_limit BOOLEAN,
  current_usage INTEGER,
  max_allowed INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.current_usage < l.max_allowed,
    l.current_usage,
    l.max_allowed
  FROM public.trial_limits l
  WHERE l.user_id = p_user_id
    AND l.limit_type = p_limit_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment trial limit usage
CREATE OR REPLACE FUNCTION increment_trial_limit(
  p_user_id UUID,
  p_limit_type TEXT,
  p_amount INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  v_within_limit BOOLEAN;
BEGIN
  UPDATE public.trial_limits
  SET 
    current_usage = current_usage + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND limit_type = p_limit_type
    AND current_usage + p_amount <= max_allowed
  RETURNING (current_usage <= max_allowed) INTO v_within_limit;
  
  -- Log limit hit if exceeded
  IF NOT v_within_limit OR v_within_limit IS NULL THEN
    PERFORM log_trial_event(
      p_user_id, 
      'limit_hit',
      jsonb_build_object('limit_type', p_limit_type)
    );
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete milestone
CREATE OR REPLACE FUNCTION complete_trial_milestone(
  p_user_id UUID,
  p_milestone_type TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS void AS $$
DECLARE
  v_trial_id UUID;
BEGIN
  -- Get trial ID
  SELECT id INTO v_trial_id
  FROM public.trials
  WHERE user_id = p_user_id
    AND status = 'active';
  
  IF v_trial_id IS NOT NULL THEN
    -- Insert or update milestone
    INSERT INTO public.trial_milestones (
      user_id, trial_id, milestone_type, completed_at, metadata
    ) VALUES (
      p_user_id, v_trial_id, p_milestone_type, NOW(), p_metadata
    )
    ON CONFLICT (user_id, milestone_type) 
    DO UPDATE SET 
      completed_at = NOW(),
      metadata = p_metadata;
    
    -- Log milestone event
    PERFORM log_trial_event(
      p_user_id,
      'milestone_completed',
      jsonb_build_object('milestone', p_milestone_type)
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trials_user_id ON public.trials(user_id);
CREATE INDEX IF NOT EXISTS idx_trials_status ON public.trials(status);
CREATE INDEX IF NOT EXISTS idx_trials_expires_at ON public.trials(expires_at);
CREATE INDEX IF NOT EXISTS idx_trial_milestones_user_trial ON public.trial_milestones(user_id, trial_id);

-- Comments for documentation
COMMENT ON TABLE public.trials IS '28-day free trial management with habit-building nudges';
COMMENT ON TABLE public.trial_events IS 'Event tracking for trial user behavior and engagement';
COMMENT ON TABLE public.trial_limits IS 'Usage limits enforcement during trial period';
COMMENT ON TABLE public.trial_milestones IS 'Progress tracking for trial habit-building milestones';
COMMENT ON FUNCTION create_trial_for_user() IS 'Automatically creates trial for new users without subscription';
COMMENT ON FUNCTION check_trial_expiry() IS 'Checks and updates expired trials - run hourly';
COMMENT ON FUNCTION convert_trial_to_paid(UUID) IS 'Converts active trial to paid subscription';
COMMENT ON FUNCTION log_trial_event(UUID, TEXT, JSONB) IS 'Logs trial events for analytics and nudges';
COMMENT ON FUNCTION check_trial_limit(UUID, TEXT) IS 'Checks if user is within trial limits';
COMMENT ON FUNCTION increment_trial_limit(UUID, TEXT, INTEGER) IS 'Increments usage and enforces limits';
COMMENT ON FUNCTION complete_trial_milestone(UUID, TEXT, JSONB) IS 'Marks milestone as completed';