-- Create the missing security functions
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