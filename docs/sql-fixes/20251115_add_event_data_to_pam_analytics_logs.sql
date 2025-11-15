-- Fix pam_analytics_logs schema to match backend expectations
-- Safe to run multiple times; uses IF NOT EXISTS guards.

-- 1) Ensure pam_analytics_logs table exists
CREATE TABLE IF NOT EXISTS public.pam_analytics_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  -- Older deployments may already have some of these columns
  intent text,
  response_time_ms integer,
  timestamp timestamptz DEFAULT NOW()
);

-- 2) Add missing columns used by backend/app/services/analytics/analytics.py
ALTER TABLE public.pam_analytics_logs
  ADD COLUMN IF NOT EXISTS event_type text,
  ADD COLUMN IF NOT EXISTS event_data jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS session_id text,
  ADD COLUMN IF NOT EXISTS success boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT NOW();

-- 3) Helpful index for common queries
CREATE INDEX IF NOT EXISTS idx_pam_analytics_user_type
  ON public.pam_analytics_logs(user_id, event_type);

-- 4) Row Level Security (RLS) policies (idempotent)
ALTER TABLE public.pam_analytics_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pam_analytics_logs'
      AND policyname = 'Users can access own PAM analytics'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Users can access own PAM analytics" ON public.pam_analytics_logs
      FOR ALL USING (auth.uid() = user_id)
    $$;
  END IF;
END $$;

