-- Create PAM Analytics Table
-- This table stores all PAM usage analytics including tool usage, response times, errors, feedback, and token usage

CREATE TABLE IF NOT EXISTS pam_analytics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'tool_usage',
    'response_time',
    'error_occurred',
    'user_feedback', 
    'token_usage',
    'conversation_start',
    'conversation_end',
    'cache_hit',
    'cache_miss',
    'context_optimization',
    'user_action'
  )),
  event_data jsonb NOT NULL DEFAULT '{}',
  timestamp timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_pam_analytics_user_id ON pam_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_pam_analytics_session_id ON pam_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_pam_analytics_event_type ON pam_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_pam_analytics_timestamp ON pam_analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_pam_analytics_user_timestamp ON pam_analytics(user_id, timestamp);

-- Create compound index for common queries
CREATE INDEX IF NOT EXISTS idx_pam_analytics_user_type_timestamp ON pam_analytics(user_id, event_type, timestamp);

-- Create GIN index for JSONB data queries
CREATE INDEX IF NOT EXISTS idx_pam_analytics_event_data_gin ON pam_analytics USING gin(event_data);
CREATE INDEX IF NOT EXISTS idx_pam_analytics_metadata_gin ON pam_analytics USING gin(metadata);

-- Enable Row Level Security
ALTER TABLE pam_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only access their own analytics data
CREATE POLICY "Users can view own analytics data" ON pam_analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics data" ON pam_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can access all data for system analytics
CREATE POLICY "Service role full access" ON pam_analytics
  FOR ALL USING (auth.role() = 'service_role');

-- Create function to clean up old analytics data (older than 90 days by default)
CREATE OR REPLACE FUNCTION cleanup_old_analytics(retention_days integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM pam_analytics 
  WHERE timestamp < now() - (retention_days || ' days')::interval;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the cleanup operation
  INSERT INTO pam_analytics (
    user_id,
    session_id,
    event_type,
    event_data,
    timestamp
  ) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid, -- System user ID
    'system-cleanup',
    'user_action',
    jsonb_build_object(
      'action', 'analytics_cleanup',
      'deleted_count', deleted_count,
      'retention_days', retention_days
    ),
    now()
  );
  
  RETURN deleted_count;
END;
$$;

-- Create function to get analytics summary for a user
CREATE OR REPLACE FUNCTION get_user_analytics_summary(
  target_user_id uuid,
  time_range interval DEFAULT '24 hours'::interval
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Only allow users to get their own summary or service role
  IF auth.uid() != target_user_id AND auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: Can only access own analytics data';
  END IF;
  
  WITH analytics_data AS (
    SELECT 
      event_type,
      event_data,
      timestamp,
      session_id
    FROM pam_analytics 
    WHERE user_id = target_user_id 
      AND timestamp >= now() - time_range
  ),
  event_counts AS (
    SELECT 
      event_type,
      COUNT(*) as count
    FROM analytics_data
    GROUP BY event_type
  ),
  session_stats AS (
    SELECT 
      COUNT(DISTINCT session_id) as total_sessions,
      COUNT(*) as total_events
    FROM analytics_data
  ),
  tool_usage AS (
    SELECT 
      event_data->>'tool_name' as tool_name,
      COUNT(*) as usage_count,
      AVG((event_data->>'average_response_time')::numeric) as avg_response_time
    FROM analytics_data
    WHERE event_type = 'tool_usage'
      AND event_data->>'tool_name' IS NOT NULL
    GROUP BY event_data->>'tool_name'
    ORDER BY usage_count DESC
    LIMIT 10
  ),
  performance_stats AS (
    SELECT 
      AVG((event_data->>'response_time_ms')::numeric) as avg_response_time,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (event_data->>'response_time_ms')::numeric) as p95_response_time
    FROM analytics_data
    WHERE event_type = 'response_time'
      AND event_data->>'response_time_ms' IS NOT NULL
  ),
  satisfaction_stats AS (
    SELECT 
      AVG((event_data->>'response_quality')::numeric) as avg_rating,
      COUNT(*) FILTER (WHERE event_data->>'feedback_type' = 'thumbs_up') as thumbs_up,
      COUNT(*) FILTER (WHERE event_data->>'feedback_type' = 'thumbs_down') as thumbs_down
    FROM analytics_data
    WHERE event_type = 'user_feedback'
  ),
  cost_stats AS (
    SELECT 
      SUM((event_data->>'total_tokens')::numeric) as total_tokens,
      SUM((event_data->>'estimated_cost')::numeric) as total_cost
    FROM analytics_data
    WHERE event_type = 'token_usage'
  )
  SELECT jsonb_build_object(
    'time_range', time_range,
    'generated_at', now(),
    'event_counts', (SELECT jsonb_agg(jsonb_build_object('event_type', event_type, 'count', count)) FROM event_counts),
    'session_stats', (SELECT to_jsonb(session_stats) FROM session_stats),
    'top_tools', (SELECT jsonb_agg(to_jsonb(tool_usage)) FROM tool_usage),
    'performance', (SELECT to_jsonb(performance_stats) FROM performance_stats),
    'satisfaction', (SELECT to_jsonb(satisfaction_stats) FROM satisfaction_stats),
    'costs', (SELECT to_jsonb(cost_stats) FROM cost_stats)
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Create scheduled cleanup job (runs daily at 2 AM)
-- Note: This requires the pg_cron extension to be enabled
-- SELECT cron.schedule('cleanup-old-analytics', '0 2 * * *', 'SELECT cleanup_old_analytics(90);');

-- Create view for common analytics queries
CREATE OR REPLACE VIEW pam_analytics_summary AS
SELECT 
  user_id,
  session_id,
  event_type,
  DATE_TRUNC('hour', timestamp) as hour_bucket,
  COUNT(*) as event_count,
  AVG(CASE 
    WHEN event_data->>'response_time_ms' IS NOT NULL 
    THEN (event_data->>'response_time_ms')::numeric 
    ELSE NULL 
  END) as avg_response_time,
  COUNT(*) FILTER (WHERE event_data->>'cache_hit' = 'true') as cache_hits,
  COUNT(*) FILTER (WHERE event_data->>'cache_hit' = 'false') as cache_misses
FROM pam_analytics
WHERE timestamp >= now() - interval '7 days'
GROUP BY user_id, session_id, event_type, hour_bucket;

-- Grant permissions
GRANT SELECT ON pam_analytics_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_analytics_summary(uuid, interval) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_analytics(integer) TO service_role;

-- Create trigger to update timestamp on updates
CREATE OR REPLACE FUNCTION update_pam_analytics_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.created_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_pam_analytics_timestamp_trigger
  BEFORE UPDATE ON pam_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_pam_analytics_timestamp();

-- Add comments for documentation
COMMENT ON TABLE pam_analytics IS 'Stores all PAM usage analytics including tool usage, performance metrics, errors, and user feedback';
COMMENT ON COLUMN pam_analytics.user_id IS 'Reference to the user who generated this analytics event';
COMMENT ON COLUMN pam_analytics.session_id IS 'Unique identifier for the user session';
COMMENT ON COLUMN pam_analytics.event_type IS 'Type of analytics event being tracked';
COMMENT ON COLUMN pam_analytics.event_data IS 'JSON data specific to the event type';
COMMENT ON COLUMN pam_analytics.metadata IS 'Additional metadata like user agent, device type, etc.';
COMMENT ON FUNCTION cleanup_old_analytics(integer) IS 'Removes analytics data older than specified number of days';
COMMENT ON FUNCTION get_user_analytics_summary(uuid, interval) IS 'Returns aggregated analytics summary for a user within a time range';
COMMENT ON VIEW pam_analytics_summary IS 'Aggregated view of analytics data grouped by hour for dashboard queries';