-- Create agent_logs table for PAM analytics tracking
CREATE TABLE IF NOT EXISTS public.agent_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id UUID,
  intent TEXT NOT NULL,
  message TEXT,
  response TEXT,
  confidence_level NUMERIC(3,2) CHECK (confidence_level >= 0 AND confidence_level <= 1),
  response_time INTEGER, -- milliseconds
  tokens_used INTEGER,
  tools_used TEXT[], -- array of tool names used
  error_type TEXT,
  error_message TEXT,
  status TEXT CHECK (status IN ('success', 'error', 'timeout')),
  mode TEXT CHECK (mode IN ('voice', 'text')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for better query performance
CREATE INDEX idx_agent_logs_user_id ON public.agent_logs(user_id);
CREATE INDEX idx_agent_logs_created_at ON public.agent_logs(created_at DESC);
CREATE INDEX idx_agent_logs_intent ON public.agent_logs(intent);
CREATE INDEX idx_agent_logs_status ON public.agent_logs(status);
CREATE INDEX idx_agent_logs_session_id ON public.agent_logs(session_id);
CREATE INDEX idx_agent_logs_user_created ON public.agent_logs(user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can only see their own logs
CREATE POLICY "Users can view own agent logs" ON public.agent_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert logs
CREATE POLICY "Service role can insert agent logs" ON public.agent_logs
  FOR INSERT WITH CHECK (true);

-- Service role can read all logs (for admin analytics)
CREATE POLICY "Service role can read all agent logs" ON public.agent_logs
  FOR SELECT USING (auth.jwt() ->> 'role' = 'service_role');

-- Add comment to table
COMMENT ON TABLE public.agent_logs IS 'Stores interaction logs for PAM AI assistant analytics';

-- Add comments to columns
COMMENT ON COLUMN public.agent_logs.intent IS 'The detected intent of the user message';
COMMENT ON COLUMN public.agent_logs.confidence_level IS 'Confidence score of intent detection (0-1)';
COMMENT ON COLUMN public.agent_logs.response_time IS 'Time taken to generate response in milliseconds';
COMMENT ON COLUMN public.agent_logs.tools_used IS 'Array of tools/features used in generating the response';
COMMENT ON COLUMN public.agent_logs.mode IS 'Whether interaction was via voice or text';
COMMENT ON COLUMN public.agent_logs.metadata IS 'Additional metadata for the interaction';