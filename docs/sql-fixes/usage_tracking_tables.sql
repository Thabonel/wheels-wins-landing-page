CREATE TABLE IF NOT EXISTS usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,
  cost_estimate DECIMAL(10,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_events_user_date ON usage_events(user_id, DATE(timestamp));
CREATE INDEX IF NOT EXISTS idx_usage_events_type ON usage_events(event_type);
CREATE INDEX IF NOT EXISTS idx_usage_events_timestamp ON usage_events(timestamp DESC);

CREATE TABLE IF NOT EXISTS daily_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  total_voice_minutes INT DEFAULT 0,
  total_tool_calls INT DEFAULT 0,
  unique_users INT DEFAULT 0,
  total_sessions INT DEFAULT 0,
  estimated_cost DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date)
);

CREATE INDEX IF NOT EXISTS idx_daily_usage_date ON daily_usage_stats(date DESC);

CREATE TABLE IF NOT EXISTS user_activity (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_seen DATE NOT NULL,
  last_seen DATE NOT NULL,
  total_sessions INT DEFAULT 0,
  total_voice_minutes INT DEFAULT 0,
  total_tool_calls INT DEFAULT 0,
  lifetime_cost_estimate DECIMAL(10,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_activity_last_seen ON user_activity(last_seen DESC);

ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY usage_events_admin_all ON usage_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY usage_events_user_own ON usage_events
  FOR SELECT
  USING (user_id = auth.uid());

ALTER TABLE daily_usage_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY daily_usage_stats_admin_only ON daily_usage_stats
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_activity_admin_all ON user_activity
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY user_activity_user_own ON user_activity
  FOR SELECT
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION update_daily_usage_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO daily_usage_stats (date, total_voice_minutes, total_tool_calls, unique_users, total_sessions, estimated_cost)
  VALUES (
    CURRENT_DATE,
    CASE WHEN NEW.event_type = 'voice_minute' THEN 1 ELSE 0 END,
    CASE WHEN NEW.event_type = 'tool_call' THEN 1 ELSE 0 END,
    1,
    CASE WHEN NEW.event_type = 'session_start' THEN 1 ELSE 0 END,
    COALESCE(NEW.cost_estimate, 0)
  )
  ON CONFLICT (date)
  DO UPDATE SET
    total_voice_minutes = daily_usage_stats.total_voice_minutes + CASE WHEN NEW.event_type = 'voice_minute' THEN 1 ELSE 0 END,
    total_tool_calls = daily_usage_stats.total_tool_calls + CASE WHEN NEW.event_type = 'tool_call' THEN 1 ELSE 0 END,
    total_sessions = daily_usage_stats.total_sessions + CASE WHEN NEW.event_type = 'session_start' THEN 1 ELSE 0 END,
    estimated_cost = daily_usage_stats.estimated_cost + COALESCE(NEW.cost_estimate, 0);

  INSERT INTO user_activity (user_id, first_seen, last_seen, total_sessions, total_voice_minutes, total_tool_calls, lifetime_cost_estimate)
  VALUES (
    NEW.user_id,
    CURRENT_DATE,
    CURRENT_DATE,
    CASE WHEN NEW.event_type = 'session_start' THEN 1 ELSE 0 END,
    CASE WHEN NEW.event_type = 'voice_minute' THEN 1 ELSE 0 END,
    CASE WHEN NEW.event_type = 'tool_call' THEN 1 ELSE 0 END,
    COALESCE(NEW.cost_estimate, 0)
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    last_seen = CURRENT_DATE,
    total_sessions = user_activity.total_sessions + CASE WHEN NEW.event_type = 'session_start' THEN 1 ELSE 0 END,
    total_voice_minutes = user_activity.total_voice_minutes + CASE WHEN NEW.event_type = 'voice_minute' THEN 1 ELSE 0 END,
    total_tool_calls = user_activity.total_tool_calls + CASE WHEN NEW.event_type = 'tool_call' THEN 1 ELSE 0 END,
    lifetime_cost_estimate = user_activity.lifetime_cost_estimate + COALESCE(NEW.cost_estimate, 0),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_daily_usage_stats
  AFTER INSERT ON usage_events
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_usage_stats();
