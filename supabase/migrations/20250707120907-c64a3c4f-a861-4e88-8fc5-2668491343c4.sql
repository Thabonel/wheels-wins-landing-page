-- Enhanced Security Tables
CREATE TABLE public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  event_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) DEFAULT 'medium',
  ip_address INET,
  user_agent TEXT,
  location JSONB,
  metadata JSONB DEFAULT '{}',
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.failed_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address INET NOT NULL,
  attempt_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_agent TEXT,
  reason TEXT
);

CREATE TABLE public.rate_limit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  endpoint TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ip_address INET
);

CREATE TABLE public.mfa_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT false,
  backup_codes TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own security events" ON public.security_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own MFA settings" ON public.mfa_settings
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own audit logs" ON public.audit_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all security data" ON public.security_events
  FOR ALL USING (is_admin_user(auth.uid()));

CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
  FOR ALL USING (is_admin_user(auth.uid()));

-- Security Functions
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_severity TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO public.security_events (user_id, event_type, severity, metadata)
  VALUES (p_user_id, p_event_type, p_severity, p_metadata)
  RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_failed_login_attempts(
  p_email TEXT,
  p_ip_address INET
)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.failed_login_attempts
  WHERE email = p_email 
    AND ip_address = p_ip_address
    AND attempt_time > NOW() - INTERVAL '15 minutes';
$$;

-- Indexes for performance
CREATE INDEX idx_security_events_user_id ON public.security_events(user_id);
CREATE INDEX idx_security_events_created_at ON public.security_events(created_at);
CREATE INDEX idx_failed_login_email_ip ON public.failed_login_attempts(email, ip_address);
CREATE INDEX idx_rate_limit_user_timestamp ON public.rate_limit_log(user_id, timestamp);
CREATE INDEX idx_audit_logs_user_timestamp ON public.audit_logs(user_id, timestamp);