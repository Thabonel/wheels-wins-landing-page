-- Create health_check table for PAM backend health monitoring
CREATE TABLE IF NOT EXISTS public.health_check (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_name TEXT NOT NULL DEFAULT 'pam_backend',
    status TEXT NOT NULL DEFAULT 'healthy',
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_health_check_checked_at ON public.health_check(checked_at DESC);

-- Insert initial health check record
INSERT INTO public.health_check (service_name, status, details)
VALUES ('pam_backend', 'healthy', '{"message": "Initial health check"}');

-- Add RLS policies
ALTER TABLE public.health_check ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage health checks
CREATE POLICY "Service role can manage health checks" ON public.health_check
    FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- Allow authenticated users to read health checks
CREATE POLICY "Authenticated users can read health checks" ON public.health_check
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Add comment
COMMENT ON TABLE public.health_check IS 'Health check records for PAM backend services';