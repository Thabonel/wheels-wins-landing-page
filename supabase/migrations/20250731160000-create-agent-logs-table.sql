-- Create agent_logs table for PAM chat analytics
-- This table stores all PAM AI interactions for analytics and monitoring

-- First, check if the table already exists and drop it if it does
DROP TABLE IF EXISTS public.agent_logs CASCADE;

-- Create the agent_logs table
CREATE TABLE public.agent_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id text NOT NULL,
    message text NOT NULL,
    response text NOT NULL,
    intent text,
    confidence_score real,
    response_time_ms integer,
    input_type text DEFAULT 'text' CHECK (input_type IN ('text', 'voice')),
    tools_used jsonb DEFAULT '[]'::jsonb,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on the agent_logs table
ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own agent logs"
    ON public.agent_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admin users can view all agent logs"
    ON public.agent_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.user_id = auth.uid()
            AND role = 'admin'
            AND status = 'active'
        )
    );

CREATE POLICY "System can insert agent logs"
    ON public.agent_logs FOR INSERT
    WITH CHECK (true); -- Allow backend to insert logs

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agent_logs_user_id ON public.agent_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created_at ON public.agent_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_session_id ON public.agent_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_intent ON public.agent_logs(intent);
CREATE INDEX IF NOT EXISTS idx_agent_logs_input_type ON public.agent_logs(input_type);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.agent_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Insert some sample data for testing (optional - can be removed in production)
INSERT INTO public.agent_logs (
    user_id,
    session_id,
    message,
    response,
    intent,
    confidence_score,
    response_time_ms,
    input_type,
    tools_used,
    metadata
) VALUES 
(
    (SELECT id FROM auth.users LIMIT 1), -- Use first available user, or null if none
    'sample-session-1',
    'What are some good campgrounds near Yellowstone?',
    'Here are some excellent campgrounds near Yellowstone National Park: 1. Madison Campground - Located within the park, great for wildlife viewing. 2. Canyon Campground - Close to the Grand Canyon of Yellowstone. 3. Fishing Bridge RV Park - Full hookups available.',
    'travel_planning',
    0.95,
    1250,
    'text',
    '["google_places", "park_info"]'::jsonb,
    '{"region": "yellowstone", "category": "campgrounds"}'::jsonb
),
(
    (SELECT id FROM auth.users LIMIT 1),
    'sample-session-2', 
    'How much should I budget for gas for a 2000 mile road trip?',
    'For a 2000-mile road trip, you should budget approximately $200-400 for gas, depending on your vehicle''s fuel efficiency and current gas prices. Here''s a breakdown: If your RV gets 8 MPG and gas is $3.50/gallon, you''d need about 250 gallons costing $875.',
    'financial_planning',
    0.88,
    980,
    'text', 
    '["fuel_calculator"]'::jsonb,
    '{"distance": 2000, "fuel_efficiency": "estimated"}'::jsonb
),
(
    (SELECT id FROM auth.users LIMIT 1),
    'sample-session-3',
    'What''s the weather like in Colorado this week?',
    'I''d be happy to help you check the weather in Colorado. However, I need a specific city or region in Colorado to provide accurate weather information. Could you tell me which area you''re interested in?',
    'weather_inquiry',
    0.92,
    750,
    'voice',
    '[]'::jsonb,
    '{"state": "colorado", "time_range": "week"}'::jsonb
);

-- Grant necessary permissions
GRANT ALL ON public.agent_logs TO authenticated;
GRANT ALL ON public.agent_logs TO service_role;

-- Create a function to safely insert agent logs (can be called from backend)
CREATE OR REPLACE FUNCTION public.insert_agent_log(
    p_user_id uuid,
    p_session_id text,
    p_message text,
    p_response text,
    p_intent text DEFAULT NULL,
    p_confidence_score real DEFAULT NULL,
    p_response_time_ms integer DEFAULT NULL,
    p_input_type text DEFAULT 'text',
    p_tools_used jsonb DEFAULT '[]'::jsonb,
    p_error_message text DEFAULT NULL,
    p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    log_id uuid;
BEGIN
    INSERT INTO public.agent_logs (
        user_id,
        session_id,
        message,
        response,
        intent,
        confidence_score,
        response_time_ms,
        input_type,
        tools_used,
        error_message,
        metadata
    ) VALUES (
        p_user_id,
        p_session_id,
        p_message,
        p_response,
        p_intent,
        p_confidence_score,
        p_response_time_ms,
        p_input_type,
        p_tools_used,
        p_error_message,
        p_metadata
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.insert_agent_log TO service_role;
GRANT EXECUTE ON FUNCTION public.insert_agent_log TO authenticated;

-- Add comment explaining the table
COMMENT ON TABLE public.agent_logs IS 'Stores all PAM AI assistant interactions for analytics, monitoring, and improvement purposes';