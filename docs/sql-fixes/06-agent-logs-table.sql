ALTER TABLE public.agent_logs ADD COLUMN IF NOT EXISTS intent TEXT;
ALTER TABLE public.agent_logs ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.agent_logs ADD COLUMN IF NOT EXISTS response TEXT;
ALTER TABLE public.agent_logs ADD COLUMN IF NOT EXISTS response_time INTEGER;
ALTER TABLE public.agent_logs ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE public.agent_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin users can view all agent logs" ON agent_logs;
DROP POLICY IF EXISTS "System can insert agent logs" ON agent_logs;

CREATE POLICY "Admin users can view all agent logs" ON agent_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (
      auth.users.email LIKE '%@wheelsandwins.%' OR
      auth.users.email IN ('barry.tong1@outlook.com', 'admin@wheelsandwins.com') OR
      (auth.users.raw_user_meta_data->>'is_admin')::boolean = true
    )
  )
);

CREATE POLICY "System can insert agent logs" ON agent_logs FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_agent_logs_user_created ON agent_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_logs_intent ON agent_logs(intent);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created_at ON agent_logs(created_at);