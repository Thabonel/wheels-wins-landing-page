
-- Create table for two-factor authentication
CREATE TABLE public.user_two_factor_auth (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  secret_key TEXT NOT NULL,
  backup_codes TEXT[], -- Array of backup codes
  enabled BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for login history
CREATE TABLE public.user_login_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address INET,
  user_agent TEXT,
  device_info JSONB,
  location_info JSONB, -- city, country, etc.
  login_method TEXT DEFAULT 'password',
  login_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
  success BOOLEAN DEFAULT true
);

-- Create table for active sessions
CREATE TABLE public.user_active_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  device_info JSONB,
  ip_address INET,
  user_agent TEXT,
  location_info JSONB,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_current BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on all tables
ALTER TABLE public.user_two_factor_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_active_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_two_factor_auth
CREATE POLICY "Users can view their own 2FA settings" 
  ON public.user_two_factor_auth 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own 2FA settings" 
  ON public.user_two_factor_auth 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own 2FA settings" 
  ON public.user_two_factor_auth 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own 2FA settings" 
  ON public.user_two_factor_auth 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create RLS policies for user_login_history
CREATE POLICY "Users can view their own login history" 
  ON public.user_login_history 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create RLS policies for user_active_sessions
CREATE POLICY "Users can view their own active sessions" 
  ON public.user_active_sessions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own active sessions" 
  ON public.user_active_sessions 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own active sessions" 
  ON public.user_active_sessions 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for session activity updates
CREATE TRIGGER update_session_activity_trigger
    BEFORE UPDATE ON public.user_active_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_session_activity();

-- Create function to clean up expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM public.user_active_sessions
    WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;
