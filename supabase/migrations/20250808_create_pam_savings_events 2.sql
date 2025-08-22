-- Migration: Create pam_savings_events table
-- Date: 2025-08-08
-- Description: Creates PAM AI savings events tracking table with proper indexes and RLS

-- Create the pam_savings_events table
CREATE TABLE IF NOT EXISTS public.pam_savings_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recommendation_id UUID,
    savings_type TEXT NOT NULL,
    predicted_savings DECIMAL(10,2),
    actual_savings DECIMAL(10,2) NOT NULL,
    baseline_cost DECIMAL(10,2) NOT NULL,
    optimized_cost DECIMAL(10,2) NOT NULL,
    savings_description TEXT NOT NULL,
    verification_method TEXT NOT NULL,
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    location POINT,
    category TEXT NOT NULL,
    metadata JSONB,
    saved_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_pam_savings_events_user_id 
    ON public.pam_savings_events(user_id);

CREATE INDEX IF NOT EXISTS idx_pam_savings_events_saved_date 
    ON public.pam_savings_events(saved_date);

CREATE INDEX IF NOT EXISTS idx_pam_savings_events_category 
    ON public.pam_savings_events(category);

CREATE INDEX IF NOT EXISTS idx_pam_savings_events_savings_type 
    ON public.pam_savings_events(savings_type);

CREATE INDEX IF NOT EXISTS idx_pam_savings_events_created_at 
    ON public.pam_savings_events(created_at);

-- Create composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_pam_savings_events_user_date 
    ON public.pam_savings_events(user_id, saved_date DESC);

-- Enable Row Level Security
ALTER TABLE public.pam_savings_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for secure access
-- Users can view their own savings events
CREATE POLICY "Users can view own pam_savings_events" 
    ON public.pam_savings_events 
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Users can insert their own savings events
CREATE POLICY "Users can insert own pam_savings_events" 
    ON public.pam_savings_events 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own savings events
CREATE POLICY "Users can update own pam_savings_events" 
    ON public.pam_savings_events 
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own savings events
CREATE POLICY "Users can delete own pam_savings_events" 
    ON public.pam_savings_events 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Add table and column comments for documentation
COMMENT ON TABLE public.pam_savings_events IS 'Stores PAM AI assistant savings events and recommendations for users';

COMMENT ON COLUMN public.pam_savings_events.id IS 'Unique identifier for the savings event';
COMMENT ON COLUMN public.pam_savings_events.user_id IS 'References the user who achieved the savings';
COMMENT ON COLUMN public.pam_savings_events.recommendation_id IS 'Optional link to the original PAM recommendation';
COMMENT ON COLUMN public.pam_savings_events.savings_type IS 'Type of savings (fuel, lodging, food, activities, etc.)';
COMMENT ON COLUMN public.pam_savings_events.predicted_savings IS 'PAM predicted savings amount';
COMMENT ON COLUMN public.pam_savings_events.actual_savings IS 'Actual verified savings amount';
COMMENT ON COLUMN public.pam_savings_events.baseline_cost IS 'Original cost before optimization';
COMMENT ON COLUMN public.pam_savings_events.optimized_cost IS 'Final cost after PAM recommendations';
COMMENT ON COLUMN public.pam_savings_events.savings_description IS 'Description of how the savings were achieved';
COMMENT ON COLUMN public.pam_savings_events.verification_method IS 'How savings were verified (manual, receipt_scan, automated, etc.)';
COMMENT ON COLUMN public.pam_savings_events.confidence_score IS 'PAM confidence score between 0 and 1 for the savings prediction';
COMMENT ON COLUMN public.pam_savings_events.location IS 'Geographic coordinates where savings occurred (latitude, longitude)';
COMMENT ON COLUMN public.pam_savings_events.category IS 'Savings category for grouping and analysis';
COMMENT ON COLUMN public.pam_savings_events.metadata IS 'Additional flexible data storage for savings event details';
COMMENT ON COLUMN public.pam_savings_events.saved_date IS 'Date when the savings occurred';
COMMENT ON COLUMN public.pam_savings_events.created_at IS 'Timestamp when the record was created';