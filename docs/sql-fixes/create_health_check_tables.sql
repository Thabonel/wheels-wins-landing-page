CREATE TABLE IF NOT EXISTS health_check_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'critical')),
  failed_tests TEXT[] NOT NULL,
  error_details TEXT[],
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_check_alerts_timestamp ON health_check_alerts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_health_check_alerts_status ON health_check_alerts(status);

CREATE TABLE IF NOT EXISTS health_check_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pass', 'fail')),
  duration_ms INTEGER NOT NULL,
  error TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_check_history_test ON health_check_history(test_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_health_check_history_status ON health_check_history(status, timestamp DESC);

ALTER TABLE health_check_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_check_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY health_check_alerts_admin ON health_check_alerts
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY health_check_history_admin ON health_check_history
  FOR ALL
  USING (auth.role() = 'service_role');
