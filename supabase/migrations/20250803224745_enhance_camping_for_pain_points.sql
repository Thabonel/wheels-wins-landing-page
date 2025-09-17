-- Migration: Enhance camping features with pain points and budget preferences
-- Created: 2025-08-04
-- Description: Create user_camping_pain_points and camping_budget_preferences tables

-- Create user_camping_pain_points table
CREATE TABLE IF NOT EXISTS public.user_camping_pain_points (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pain_point_type TEXT NOT NULL,
    severity_level INTEGER CHECK (severity_level >= 1 AND severity_level <= 5),
    description TEXT,
    location_specific BOOLEAN DEFAULT false,
    frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'monthly', 'occasionally', 'rarely')),
    impact_on_experience INTEGER CHECK (impact_on_experience >= 1 AND impact_on_experience <= 5),
    preferred_solutions JSONB,
    tags JSONB,
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create camping_budget_preferences table
CREATE TABLE IF NOT EXISTS public.camping_budget_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    daily_budget_min DECIMAL(10,2),
    daily_budget_max DECIMAL(10,2),
    weekly_budget_min DECIMAL(10,2),
    weekly_budget_max DECIMAL(10,2),
    monthly_budget_min DECIMAL(10,2),
    monthly_budget_max DECIMAL(10,2),
    preferred_site_types JSONB, -- ['free', 'paid', 'national_parks', 'state_parks', 'private']
    amenity_priorities JSONB,   -- ranked list of important amenities
    splurge_categories JSONB,   -- areas willing to spend more on
    cost_saving_strategies JSONB, -- preferred money-saving approaches
    budget_flexibility TEXT CHECK (budget_flexibility IN ('strict', 'moderate', 'flexible')),
    emergency_fund_amount DECIMAL(10,2),
    track_expenses BOOLEAN DEFAULT true,
    alert_threshold DECIMAL(3,2) DEFAULT 0.80, -- alert when 80% of budget used
    currency TEXT DEFAULT 'AUD',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id) -- One budget preference per user
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_camping_pain_points_user_id ON public.user_camping_pain_points(user_id);
CREATE INDEX IF NOT EXISTS idx_user_camping_pain_points_type ON public.user_camping_pain_points(pain_point_type);
CREATE INDEX IF NOT EXISTS idx_user_camping_pain_points_severity ON public.user_camping_pain_points(severity_level);
CREATE INDEX IF NOT EXISTS idx_camping_budget_preferences_user_id ON public.camping_budget_preferences(user_id);

-- Enable RLS on both tables
ALTER TABLE public.user_camping_pain_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camping_budget_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_camping_pain_points
CREATE POLICY "Users can view their own camping pain points" ON public.user_camping_pain_points
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own camping pain points" ON public.user_camping_pain_points
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own camping pain points" ON public.user_camping_pain_points
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own camping pain points" ON public.user_camping_pain_points
    FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for camping_budget_preferences
CREATE POLICY "Users can view their own camping budget preferences" ON public.camping_budget_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own camping budget preferences" ON public.camping_budget_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own camping budget preferences" ON public.camping_budget_preferences
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own camping budget preferences" ON public.camping_budget_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to automatically update the updated_at column
CREATE TRIGGER update_user_camping_pain_points_updated_at
    BEFORE UPDATE ON public.user_camping_pain_points
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_camping_budget_preferences_updated_at
    BEFORE UPDATE ON public.camping_budget_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON public.user_camping_pain_points TO authenticated;
GRANT ALL ON public.camping_budget_preferences TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Add helpful comments
COMMENT ON TABLE public.user_camping_pain_points IS 'Stores user-specific camping pain points and issues they encounter';
COMMENT ON TABLE public.camping_budget_preferences IS 'Stores user camping budget preferences and financial constraints';

COMMENT ON COLUMN public.user_camping_pain_points.pain_point_type IS 'Type of pain point (e.g., booking, facilities, cost, accessibility)';
COMMENT ON COLUMN public.user_camping_pain_points.severity_level IS 'How severe the pain point is on a scale of 1-5';
COMMENT ON COLUMN public.user_camping_pain_points.frequency IS 'How often this pain point occurs';
COMMENT ON COLUMN public.user_camping_pain_points.impact_on_experience IS 'How much this impacts overall camping experience (1-5)';

COMMENT ON COLUMN public.camping_budget_preferences.preferred_site_types IS 'JSON array of preferred camping site types';
COMMENT ON COLUMN public.camping_budget_preferences.amenity_priorities IS 'JSON array of amenities ranked by importance';
COMMENT ON COLUMN public.camping_budget_preferences.splurge_categories IS 'JSON array of categories willing to spend extra on';
COMMENT ON COLUMN public.camping_budget_preferences.cost_saving_strategies IS 'JSON array of preferred money-saving approaches';