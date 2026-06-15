-- ==============================================
-- Migration complete!
-- ==============================================

-- This migration fixes:
-- ✅ Invalid input syntax for type uuid: "default" 
-- ✅ Missing PAM RPC functions
-- ✅ Conversation table schema inconsistencies
-- ✅ Proper UUID generation for all PAM tables
-- ✅ Service role permissions for PAM backend operations

-- ============================================================
-- MIGRATION: 20250805180000-add-images-and-national-parks.sql
-- ============================================================

-- Add image columns to trip_templates table
ALTER TABLE public.trip_templates 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS image_source TEXT,
ADD COLUMN IF NOT EXISTS image_attribution TEXT;

-- Create national_parks table for storing park information
CREATE TABLE IF NOT EXISTS public.national_parks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    alternate_names TEXT[],
    country TEXT NOT NULL,
    state_province TEXT,
    region TEXT,
    description TEXT,
    area_sq_km DECIMAL(10,2),
    established_date DATE,
    visitor_count_annual INTEGER,
    
    -- Location data
    latitude DECIMAL(10,6),
    longitude DECIMAL(10,6),
    location_point GEOGRAPHY(POINT, 4326),
    boundaries JSONB, -- GeoJSON boundaries if available
    
    -- Images
    primary_image_url TEXT,
    thumbnail_url TEXT,
    image_gallery JSONB, -- Array of {url, caption, source, attribution}
    
    -- Features and activities
    main_features TEXT[],
    activities TEXT[],
    wildlife TEXT[],
    best_visiting_months TEXT[],
    climate_zone TEXT,
    
    -- Visitor information
    entrance_fee_info JSONB,
    operating_hours JSONB,
    contact_info JSONB,
    official_website TEXT,
    
    -- Camping and RV specific
    has_camping BOOLEAN DEFAULT false,
    rv_accessible BOOLEAN DEFAULT false,
    rv_length_limit_ft INTEGER,
    campground_count INTEGER,
    campground_info JSONB, -- Details about campgrounds
    
    -- Wikipedia data
    wikipedia_url TEXT,
    wikipedia_extract TEXT,
    wikipedia_page_id INTEGER,
    
    -- Metadata
    data_source TEXT, -- 'wikipedia', 'manual', 'api', etc.
    last_updated TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Search optimization
    search_vector tsvector,
    
    UNIQUE(name, country)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_national_parks_country ON public.national_parks(country);
CREATE INDEX IF NOT EXISTS idx_national_parks_state ON public.national_parks(state_province);
CREATE INDEX IF NOT EXISTS idx_national_parks_location ON public.national_parks USING GIST(location_point);
CREATE INDEX IF NOT EXISTS idx_national_parks_search ON public.national_parks USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_national_parks_rv_accessible ON public.national_parks(rv_accessible) WHERE rv_accessible = true;

-- Create function to update search vector
CREATE OR REPLACE FUNCTION update_national_parks_search() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(array_to_string(NEW.main_features, ' '), '')), 'C') ||
        setweight(to_tsvector('english', coalesce(array_to_string(NEW.activities, ' '), '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for search vector
CREATE TRIGGER update_national_parks_search_trigger
BEFORE INSERT OR UPDATE ON public.national_parks
FOR EACH ROW
EXECUTE FUNCTION update_national_parks_search();

-- Create points_of_interest table for other attractions
CREATE TABLE IF NOT EXISTS public.points_of_interest (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    poi_type TEXT NOT NULL CHECK (poi_type IN (
        'landmark', 'museum', 'beach', 'mountain', 'lake', 'waterfall',
        'historic_site', 'scenic_viewpoint', 'attraction', 'natural_wonder'
    )),
    country TEXT NOT NULL,
    state_province TEXT,
    city TEXT,
    description TEXT,
    
    -- Location
    latitude DECIMAL(10,6),
    longitude DECIMAL(10,6),
    location_point GEOGRAPHY(POINT, 4326),
    address TEXT,
    
    -- Images
    image_url TEXT,
    thumbnail_url TEXT,
    image_source TEXT,
    image_attribution TEXT,
    
    -- Details
    opening_hours JSONB,
    admission_fee TEXT,
    contact_info JSONB,
    website_url TEXT,
    
    -- RV specific
    rv_accessible BOOLEAN DEFAULT true,
    parking_available BOOLEAN DEFAULT true,
    parking_fee TEXT,
    
    -- Wikipedia data
    wikipedia_url TEXT,
    wikipedia_extract TEXT,
    
    -- Metadata
    tags TEXT[],
    rating DECIMAL(2,1),
    review_count INTEGER,
    data_source TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for points_of_interest
CREATE INDEX IF NOT EXISTS idx_poi_country ON public.points_of_interest(country);
CREATE INDEX IF NOT EXISTS idx_poi_type ON public.points_of_interest(poi_type);
CREATE INDEX IF NOT EXISTS idx_poi_location ON public.points_of_interest USING GIST(location_point);

-- Create RLS policies for national_parks
ALTER TABLE public.national_parks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "National parks are viewable by everyone" 
ON public.national_parks FOR SELECT 
TO public 
USING (true);

CREATE POLICY "Only admins can modify national parks" 
ON public.national_parks FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.user_role = 'admin'
    )
);

-- Create RLS policies for points_of_interest
ALTER TABLE public.points_of_interest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Points of interest are viewable by everyone" 
ON public.points_of_interest FOR SELECT 
TO public 
USING (true);

CREATE POLICY "Only admins can modify points of interest" 
ON public.points_of_interest FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.user_role = 'admin'
    )
);

-- Add function to find nearby national parks
CREATE OR REPLACE FUNCTION find_nearby_national_parks(
    lat DECIMAL,
    lng DECIMAL,
    radius_km INTEGER DEFAULT 100
) RETURNS TABLE (
    id UUID,
    name TEXT,
    distance_km DECIMAL,
    country TEXT,
    state_province TEXT,
    rv_accessible BOOLEAN,
    primary_image_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        np.id,
        np.name,
        ST_Distance(
            np.location_point::geography,
            ST_MakePoint(lng, lat)::geography
        ) / 1000 AS distance_km,
        np.country,
        np.state_province,
        np.rv_accessible,
        np.primary_image_url
    FROM public.national_parks np
    WHERE ST_DWithin(
        np.location_point::geography,
        ST_MakePoint(lng, lat)::geography,
        radius_km * 1000
    )
    ORDER BY distance_km
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_national_parks_updated_at BEFORE UPDATE
ON public.national_parks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_poi_updated_at BEFORE UPDATE
ON public.points_of_interest FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comment on tables
COMMENT ON TABLE public.national_parks IS 'Stores information about national parks worldwide with RV-specific details';
COMMENT ON TABLE public.points_of_interest IS 'Stores various tourist attractions and landmarks';
COMMENT ON COLUMN public.national_parks.image_gallery IS 'JSON array of {url: string, caption: string, source: string, attribution: string}';
COMMENT ON COLUMN public.national_parks.campground_info IS 'JSON object with campground details including amenities, reservations, etc.';

-- ============================================================
-- MIGRATION: 20250805_fix_login_tables_rls.sql
-- ============================================================

-- Fix RLS policies for user_login_history and user_active_sessions tables

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own login history" ON user_login_history;
DROP POLICY IF EXISTS "System can insert login history" ON user_login_history;
DROP POLICY IF EXISTS "Users can view own active sessions" ON user_active_sessions;
DROP POLICY IF EXISTS "System can manage sessions" ON user_active_sessions;

-- Enable RLS on tables if not already enabled
ALTER TABLE user_login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_active_sessions ENABLE ROW LEVEL SECURITY;

-- user_login_history policies
CREATE POLICY "Users can view own login history" ON user_login_history
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert login history" ON user_login_history
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage login history" ON user_login_history
    FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- user_active_sessions policies
CREATE POLICY "Users can view own active sessions" ON user_active_sessions
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can manage own sessions" ON user_active_sessions
    FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all sessions" ON user_active_sessions
    FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================
-- MIGRATION: 20250807-222925-pam-savings-guarantee-tables.sql
-- ============================================================

-- PAM Savings Guarantee Implementation - Database Foundation
-- Creates tables for tracking PAM's money-saving recommendations and guarantee system
-- Migration: 2025-08-07 22:29:25

-- =====================================================
-- 1. CREATE PAM RECOMMENDATIONS TABLE
-- =====================================================

-- Table for PAM recommendations with savings prediction capabilities
CREATE TABLE IF NOT EXISTS public.pam_recommendations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'fuel_optimization', 'camping_alternative', 'route_optimization',
        'budget_reallocation', 'price_comparison', 'timing_optimization',
        'maintenance_prevention', 'group_booking_discount', 'general'
    )),
    recommendation_type TEXT NOT NULL CHECK (recommendation_type IN (
        'cost_saving', 'route_optimization', 'time_saving', 
        'safety_improvement', 'convenience', 'experience_enhancement'
    )),
    predicted_savings DECIMAL(10,2) DEFAULT 0 CHECK (predicted_savings >= 0),
    savings_confidence DECIMAL(3,2) DEFAULT 0.5 CHECK (savings_confidence BETWEEN 0 AND 1),
    baseline_cost_estimate DECIMAL(10,2) DEFAULT 0 CHECK (baseline_cost_estimate >= 0),
    optimized_cost_estimate DECIMAL(10,2) DEFAULT 0 CHECK (optimized_cost_estimate >= 0),
    actual_savings_recorded DECIMAL(10,2) DEFAULT 0 CHECK (actual_savings_recorded >= 0),
    priority_level TEXT NOT NULL DEFAULT 'medium' CHECK (priority_level IN ('low', 'medium', 'high', 'urgent')),
    time_sensitive BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ,
    user_viewed BOOLEAN DEFAULT FALSE,
    user_acted BOOLEAN DEFAULT FALSE,
    user_feedback_rating INTEGER CHECK (user_feedback_rating BETWEEN 1 AND 5),
    tracking_enabled BOOLEAN DEFAULT TRUE,
    location GEOGRAPHY(POINT, 4326), -- For location-based recommendations
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. CREATE PAM SAVINGS EVENTS TABLE
-- =====================================================

-- Table for tracking individual savings events where PAM helps users save money
CREATE TABLE IF NOT EXISTS public.pam_savings_events (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recommendation_id UUID REFERENCES public.pam_recommendations(id) ON DELETE SET NULL,
    savings_type TEXT NOT NULL CHECK (savings_type IN (
        'fuel_optimization', 'camping_alternative', 'route_optimization',
        'budget_reallocation', 'price_comparison', 'timing_optimization',
        'maintenance_prevention', 'group_booking_discount'
    )),
    predicted_savings DECIMAL(10,2) NOT NULL DEFAULT 0,
    actual_savings DECIMAL(10,2) NOT NULL DEFAULT 0,
    baseline_cost DECIMAL(10,2) NOT NULL CHECK (baseline_cost >= 0),
    optimized_cost DECIMAL(10,2) NOT NULL CHECK (optimized_cost >= 0),
    savings_description TEXT NOT NULL,
    verification_method TEXT NOT NULL CHECK (verification_method IN (
        'expense_comparison', 'receipt_analysis', 'user_confirmation', 
        'automatic_detection', 'price_api_verification'
    )),
    confidence_score DECIMAL(3,2) DEFAULT 0.8 CHECK (confidence_score BETWEEN 0 AND 1),
    location GEOGRAPHY(POINT, 4326),
    category TEXT NOT NULL, -- expense category where savings occurred
    saved_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT positive_baseline CHECK (baseline_cost >= 0),
    CONSTRAINT positive_optimized CHECK (optimized_cost >= 0),
    CONSTRAINT savings_calculation CHECK (actual_savings = baseline_cost - optimized_cost)
);

-- =====================================================
-- 3. CREATE MONTHLY SAVINGS SUMMARY TABLE
-- =====================================================

-- Table for aggregating monthly savings for guarantee evaluation
CREATE TABLE IF NOT EXISTS public.monthly_savings_summary (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    subscription_cost DECIMAL(10,2) NOT NULL CHECK (subscription_cost >= 0),
    total_predicted_savings DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_actual_savings DECIMAL(10,2) NOT NULL DEFAULT 0,
    savings_events_count INTEGER NOT NULL DEFAULT 0,
    guarantee_met BOOLEAN NOT NULL DEFAULT FALSE,
    guarantee_amount DECIMAL(10,2) DEFAULT 0 CHECK (guarantee_amount >= 0),
    evaluation_date TIMESTAMPTZ,
    processed_date TIMESTAMPTZ,
    stripe_refund_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, billing_period_start),
    CONSTRAINT valid_billing_period CHECK (billing_period_end > billing_period_start)
);

-- =====================================================
-- 4. CREATE SAVINGS GUARANTEE HISTORY TABLE
-- =====================================================

-- Table for audit trail of guarantee processing
CREATE TABLE IF NOT EXISTS public.savings_guarantee_history (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    monthly_summary_id BIGINT REFERENCES public.monthly_savings_summary(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN (
        'guarantee_evaluation', 'refund_processed', 'credit_applied',
        'manual_adjustment', 'dispute_resolution'
    )),
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    stripe_transaction_id TEXT,
    admin_notes TEXT,
    processed_by UUID, -- Admin user who processed manual actions
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. CREATE PERFORMANCE INDEXES
-- =====================================================

-- Indexes for pam_recommendations
CREATE INDEX IF NOT EXISTS idx_pam_recommendations_user_id ON public.pam_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_pam_recommendations_category ON public.pam_recommendations(category);
CREATE INDEX IF NOT EXISTS idx_pam_recommendations_priority ON public.pam_recommendations(priority_level);
CREATE INDEX IF NOT EXISTS idx_pam_recommendations_created_at ON public.pam_recommendations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pam_recommendations_expires_at ON public.pam_recommendations(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pam_recommendations_user_acted ON public.pam_recommendations(user_acted) WHERE user_acted = TRUE;
CREATE INDEX IF NOT EXISTS idx_pam_recommendations_savings ON public.pam_recommendations(predicted_savings DESC) WHERE predicted_savings > 0;

-- Indexes for pam_savings_events
CREATE INDEX IF NOT EXISTS idx_pam_savings_events_user_id ON public.pam_savings_events(user_id);
CREATE INDEX IF NOT EXISTS idx_pam_savings_events_user_date ON public.pam_savings_events(user_id, saved_date);
CREATE INDEX IF NOT EXISTS idx_pam_savings_events_type ON public.pam_savings_events(savings_type, saved_date);
CREATE INDEX IF NOT EXISTS idx_pam_savings_events_recommendation ON public.pam_savings_events(recommendation_id) WHERE recommendation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pam_savings_events_category ON public.pam_savings_events(category, saved_date);
CREATE INDEX IF NOT EXISTS idx_pam_savings_events_created_at ON public.pam_savings_events(created_at DESC);

-- Indexes for monthly_savings_summary
CREATE INDEX IF NOT EXISTS idx_monthly_savings_user_period ON public.monthly_savings_summary(user_id, billing_period_start, billing_period_end);
CREATE INDEX IF NOT EXISTS idx_monthly_savings_guarantee ON public.monthly_savings_summary(guarantee_met, billing_period_start);
CREATE INDEX IF NOT EXISTS idx_monthly_savings_evaluation ON public.monthly_savings_summary(evaluation_date) WHERE evaluation_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_monthly_savings_processed ON public.monthly_savings_summary(processed_date) WHERE processed_date IS NOT NULL;

-- Indexes for savings_guarantee_history
CREATE INDEX IF NOT EXISTS idx_savings_guarantee_user_id ON public.savings_guarantee_history(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_guarantee_status ON public.savings_guarantee_history(status, created_at);
CREATE INDEX IF NOT EXISTS idx_savings_guarantee_action ON public.savings_guarantee_history(action_type, created_at);
CREATE INDEX IF NOT EXISTS idx_savings_guarantee_monthly_summary ON public.savings_guarantee_history(monthly_summary_id);

-- =====================================================
-- 6. ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.pam_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pam_savings_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_savings_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_guarantee_history ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. CREATE RLS POLICIES
-- =====================================================

-- Policies for pam_recommendations
CREATE POLICY "Users access own recommendations" ON public.pam_recommendations
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access recommendations" ON public.pam_recommendations
    FOR ALL USING (auth.role() = 'service_role');

-- Policies for pam_savings_events
CREATE POLICY "Users access own savings events" ON public.pam_savings_events
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access savings events" ON public.pam_savings_events
    FOR ALL USING (auth.role() = 'service_role');

-- Policies for monthly_savings_summary
CREATE POLICY "Users access own monthly summaries" ON public.monthly_savings_summary
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access monthly summaries" ON public.monthly_savings_summary
    FOR ALL USING (auth.role() = 'service_role');

-- Policies for savings_guarantee_history
CREATE POLICY "Users view own guarantee history" ON public.savings_guarantee_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role full access guarantee history" ON public.savings_guarantee_history
    FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 8. CREATE UTILITY FUNCTIONS
-- =====================================================

-- Function to calculate user's baseline spending pattern
CREATE OR REPLACE FUNCTION calculate_baseline_spending(
    p_user_id UUID,
    p_category TEXT,
    p_location GEOGRAPHY DEFAULT NULL,
    p_lookback_days INTEGER DEFAULT 90
)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    baseline_amount DECIMAL(10,2) DEFAULT 0;
BEGIN
    SELECT AVG(amount) INTO baseline_amount
    FROM public.expenses
    WHERE user_id = p_user_id
        AND category = p_category
        AND created_at >= NOW() - INTERVAL '1 day' * p_lookback_days
        AND (p_location IS NULL OR ST_DWithin(location, p_location, 50000)); -- 50km radius
    
    RETURN COALESCE(baseline_amount, 0);
END;
$$;

-- Function to aggregate monthly savings
CREATE OR REPLACE FUNCTION update_monthly_savings_summary(p_user_id UUID, p_billing_date DATE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    period_start DATE;
    period_end DATE;
    subscription_amount DECIMAL(10,2);
    total_actual DECIMAL(10,2) DEFAULT 0;
    total_predicted DECIMAL(10,2) DEFAULT 0;
    events_count INTEGER DEFAULT 0;
    guarantee_met BOOLEAN DEFAULT FALSE;
BEGIN
    -- Calculate billing period
    period_start := p_billing_date;
    period_end := p_billing_date + INTERVAL '1 month';
    
    -- Get user's subscription cost (default to $29.99 monthly)
    SELECT 
        CASE 
            WHEN us.plan_type = 'monthly' THEN 29.99
            WHEN us.plan_type = 'annual' THEN 299.99/12
            ELSE 29.99
        END INTO subscription_amount
    FROM public.user_subscriptions us
    WHERE us.user_id = p_user_id AND us.subscription_status = 'active'
    LIMIT 1;
    
    -- Default subscription amount if no record found
    subscription_amount := COALESCE(subscription_amount, 29.99);
    
    -- Aggregate savings for the period
    SELECT 
        COALESCE(SUM(actual_savings), 0),
        COALESCE(SUM(predicted_savings), 0),
        COUNT(*)
    INTO total_actual, total_predicted, events_count
    FROM public.pam_savings_events
    WHERE user_id = p_user_id
        AND saved_date >= period_start
        AND saved_date < period_end;
    
    -- Determine if guarantee is met
    guarantee_met := total_actual >= subscription_amount;
    
    -- Insert or update monthly summary
    INSERT INTO public.monthly_savings_summary (
        user_id, billing_period_start, billing_period_end, subscription_cost,
        total_actual_savings, total_predicted_savings, savings_events_count,
        guarantee_met, guarantee_amount, evaluation_date
    ) VALUES (
        p_user_id, period_start, period_end, subscription_amount,
        total_actual, total_predicted, events_count,
        guarantee_met, 
        CASE WHEN NOT guarantee_met THEN subscription_amount ELSE 0 END,
        NOW()
    )
    ON CONFLICT (user_id, billing_period_start)
    DO UPDATE SET
        total_actual_savings = EXCLUDED.total_actual_savings,
        total_predicted_savings = EXCLUDED.total_predicted_savings,
        savings_events_count = EXCLUDED.savings_events_count,
        guarantee_met = EXCLUDED.guarantee_met,
        guarantee_amount = EXCLUDED.guarantee_amount,
        evaluation_date = EXCLUDED.evaluation_date,
        updated_at = NOW();
END;
$$;

-- Function to get savings guarantee status
CREATE OR REPLACE FUNCTION get_savings_guarantee_status(p_user_id UUID, p_billing_date DATE)
RETURNS TABLE(
    guarantee_met BOOLEAN,
    total_savings DECIMAL(10,2),
    subscription_cost DECIMAL(10,2),
    savings_shortfall DECIMAL(10,2),
    savings_events_count INTEGER,
    billing_period_start DATE,
    billing_period_end DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update monthly summary first
    PERFORM update_monthly_savings_summary(p_user_id, p_billing_date);
    
    -- Return guarantee status
    RETURN QUERY
    SELECT 
        mss.guarantee_met,
        mss.total_actual_savings,
        mss.subscription_cost,
        CASE 
            WHEN mss.guarantee_met THEN 0::DECIMAL(10,2)
            ELSE mss.subscription_cost - mss.total_actual_savings
        END as savings_shortfall,
        mss.savings_events_count,
        mss.billing_period_start,
        mss.billing_period_end
    FROM public.monthly_savings_summary mss
    WHERE mss.user_id = p_user_id 
        AND mss.billing_period_start = p_billing_date;
END;
$$;

-- =====================================================
-- 9. CREATE TRIGGERS
-- =====================================================

-- Updated_at triggers for all tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pam_recommendations_updated_at
    BEFORE UPDATE ON public.pam_recommendations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pam_savings_events_updated_at
    BEFORE UPDATE ON public.pam_savings_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monthly_savings_summary_updated_at
    BEFORE UPDATE ON public.monthly_savings_summary
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 10. GRANT PERMISSIONS
-- =====================================================

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pam_recommendations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pam_savings_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.monthly_savings_summary TO authenticated;
GRANT SELECT ON public.savings_guarantee_history TO authenticated;

-- Grant sequence permissions
GRANT USAGE ON SEQUENCE public.pam_savings_events_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.monthly_savings_summary_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.savings_guarantee_history_id_seq TO authenticated;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION calculate_baseline_spending(UUID, TEXT, GEOGRAPHY, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_monthly_savings_summary(UUID, DATE) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_savings_guarantee_status(UUID, DATE) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO service_role;

-- =====================================================
-- 11. MIGRATION COMPLETION LOG
-- =====================================================

-- Log the completion of this migration
DO $$
BEGIN
    RAISE NOTICE '=== PAM Savings Guarantee Migration Completed Successfully ===';
    RAISE NOTICE 'Created Tables:';
    RAISE NOTICE '  ✅ pam_recommendations - PAM recommendations with savings prediction';
    RAISE NOTICE '  ✅ pam_savings_events - Track individual savings instances';
    RAISE NOTICE '  ✅ monthly_savings_summary - Aggregate monthly totals for guarantee evaluation';
    RAISE NOTICE '  ✅ savings_guarantee_history - Audit trail for guarantee processing';
    RAISE NOTICE '';
    RAISE NOTICE 'Added Features:';
    RAISE NOTICE '  ✅ Performance indexes for all tables';
    RAISE NOTICE '  ✅ RLS policies for data security';
    RAISE NOTICE '  ✅ Utility functions for baseline calculations and guarantee evaluation';
    RAISE NOTICE '  ✅ Triggers for automatic timestamp updates';
    RAISE NOTICE '  ✅ Comprehensive data validation constraints';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 PAM Savings Guarantee Database Foundation is COMPLETE!';
    RAISE NOTICE 'Ready for backend API integration and frontend implementation.';
END $$;

-- ============================================================
-- MIGRATION: 20250807120000-create-expenses-table.sql
-- ============================================================

-- Create expenses table for Wins page functionality
-- This table was referenced in code but never created

-- Create the expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    category TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    receipt_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON public.expenses(user_id, date);

-- Enable Row Level Security
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own expenses" ON public.expenses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expenses" ON public.expenses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses" ON public.expenses
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses" ON public.expenses
    FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_expenses_updated_at();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT USAGE ON SEQUENCE public.expenses_id_seq TO authenticated;

-- Insert some sample data for testing (optional)
-- INSERT INTO public.expenses (user_id, amount, category, date, description)
-- VALUES 
--     (auth.uid(), 50.00, 'fuel', CURRENT_DATE, 'Gas station fill-up'),
--     (auth.uid(), 25.99, 'food', CURRENT_DATE - INTERVAL '1 day', 'Grocery shopping'),
--     (auth.uid(), 15.00, 'camping', CURRENT_DATE - INTERVAL '2 days', 'Campground fee')
-- WHERE auth.uid() IS NOT NULL;

-- ============================================================
-- MIGRATION: 20251009000000-create-missing-pam-tables.sql
-- ============================================================

-- Missing PAM Tools Database Tables
-- Created: October 9, 2025
-- Purpose: Add tables required by PAM tools that were missing from schema

-- ============================================
-- SHOP TABLES (4 tables)
-- ============================================

CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    category TEXT NOT NULL,
    stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_active ON public.products(is_active);

CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

CREATE INDEX idx_cart_items_user ON public.cart_items(user_id);
CREATE INDEX idx_cart_items_product ON public.cart_items(product_id);

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    shipping_address JSONB NOT NULL,
    payment_method TEXT,
    tracking_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_user ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_at_purchase DECIMAL(10,2) NOT NULL CHECK (price_at_purchase >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_order_items_product ON public.order_items(product_id);

-- ============================================
-- TRIP TABLES (2 tables)
-- ============================================

CREATE TABLE IF NOT EXISTS public.campgrounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    location GEOGRAPHY(POINT, 4326),
    price_per_night DECIMAL(10,2) CHECK (price_per_night >= 0),
    amenities TEXT[] DEFAULT '{}',
    description TEXT,
    rating DECIMAL(3,2) CHECK (rating >= 0 AND rating <= 5),
    total_reviews INTEGER DEFAULT 0,
    phone TEXT,
    website TEXT,
    is_rv_friendly BOOLEAN DEFAULT true,
    max_rv_length INTEGER,
    hookup_types TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campgrounds_location ON public.campgrounds USING GIST(location);
CREATE INDEX idx_campgrounds_price ON public.campgrounds(price_per_night);
CREATE INDEX idx_campgrounds_rating ON public.campgrounds(rating);

CREATE TABLE IF NOT EXISTS public.favorite_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    location_name TEXT NOT NULL,
    location_address TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    notes TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_favorite_locations_user ON public.favorite_locations(user_id);
CREATE INDEX idx_favorite_locations_category ON public.favorite_locations(category);

-- ============================================
-- SOCIAL TABLES (3 tables)
-- ============================================

CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_post ON public.comments(post_id);
CREATE INDEX idx_comments_user ON public.comments(user_id);
CREATE INDEX idx_comments_parent ON public.comments(parent_comment_id);

CREATE TABLE IF NOT EXISTS public.post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

CREATE INDEX idx_post_likes_post ON public.post_likes(post_id);
CREATE INDEX idx_post_likes_user ON public.post_likes(user_id);

CREATE TABLE IF NOT EXISTS public.shared_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    location_name TEXT,
    description TEXT,
    share_duration_hours INTEGER DEFAULT 24,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE INDEX idx_shared_locations_user ON public.shared_locations(user_id);
CREATE INDEX idx_shared_locations_location ON public.shared_locations USING GIST(location);
CREATE INDEX idx_shared_locations_active ON public.shared_locations(is_active);

-- ============================================
-- PROFILE TABLES (1 table)
-- ============================================

CREATE TABLE IF NOT EXISTS public.privacy_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_visibility TEXT DEFAULT 'public' CHECK (profile_visibility IN ('public', 'friends', 'private')),
    location_sharing BOOLEAN DEFAULT false,
    trip_sharing BOOLEAN DEFAULT true,
    expense_sharing BOOLEAN DEFAULT false,
    show_in_search BOOLEAN DEFAULT true,
    allow_messages BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX idx_privacy_settings_user ON public.privacy_settings(user_id);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campgrounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY products_select ON public.products FOR SELECT USING (is_active = true);

CREATE POLICY cart_items_all ON public.cart_items FOR ALL USING (auth.uid() = user_id);

CREATE POLICY orders_all ON public.orders FOR ALL USING (auth.uid() = user_id);

CREATE POLICY order_items_select ON public.order_items FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.orders
        WHERE orders.id = order_items.order_id
        AND orders.user_id = auth.uid()
    )
);

CREATE POLICY campgrounds_select ON public.campgrounds FOR SELECT USING (true);

CREATE POLICY favorite_locations_all ON public.favorite_locations FOR ALL USING (auth.uid() = user_id);

CREATE POLICY comments_select ON public.comments FOR SELECT USING (true);
CREATE POLICY comments_insert ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY comments_update ON public.comments FOR UPDATE USING (auth.uid() = user_id);
