-- Add PAM Influence Field to Expenses Table
-- Migration: 2025-08-10 03:45:00
-- 
-- This migration adds a simple JSONB field to track PAM's influence on expenses
-- This replaces the complex 4-table savings guarantee system with a single field approach
-- 
-- The pam_influence field structure:
-- {
--   "recommended_by_pam": boolean,      // Whether PAM recommended this expense/alternative
--   "original_amount": number,          // Original amount before PAM suggestion (if applicable)
--   "savings_amount": number,           // Amount saved due to PAM recommendation  
--   "recommendation_type": string,      // Type of recommendation (e.g., "fuel_optimization", "camping_alternative")
--   "confidence": number,               // Confidence in the savings attribution (0.0-1.0)
--   "recommendation_id": string         // Optional: ID linking to PAM recommendation system
-- }

-- =====================================================
-- 1. ADD PAM INFLUENCE FIELD TO EXPENSES TABLE
-- =====================================================

-- Add JSONB field for PAM savings influence tracking
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS pam_influence JSONB DEFAULT NULL;

-- =====================================================
-- 2. CREATE INDEX FOR PERFORMANCE
-- =====================================================

-- Index for finding PAM-influenced expenses efficiently
CREATE INDEX IF NOT EXISTS idx_expenses_pam_influence_recommended 
ON public.expenses USING GIN (pam_influence) 
WHERE pam_influence IS NOT NULL AND (pam_influence->>'recommended_by_pam')::boolean = true;

-- Index for PAM savings calculation queries
CREATE INDEX IF NOT EXISTS idx_expenses_pam_savings 
ON public.expenses ((pam_influence->>'savings_amount')) 
WHERE pam_influence IS NOT NULL AND (pam_influence->>'savings_amount')::numeric > 0;

-- =====================================================
-- 3. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to calculate monthly PAM savings for a user
CREATE OR REPLACE FUNCTION public.calculate_monthly_pam_savings(
    user_id_param UUID,
    year_param INTEGER DEFAULT EXTRACT(year FROM NOW()),
    month_param INTEGER DEFAULT EXTRACT(month FROM NOW())
)
RETURNS TABLE (
    total_savings NUMERIC,
    savings_count INTEGER,
    subscription_cost NUMERIC,
    guarantee_met BOOLEAN,
    percentage_achieved NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    monthly_savings NUMERIC := 0;
    savings_events INTEGER := 0;
    subscription_fee NUMERIC := 29.99; -- Monthly subscription cost
BEGIN
    -- Calculate total savings from PAM recommendations for the month
    SELECT 
        COALESCE(SUM((pam_influence->>'savings_amount')::numeric), 0),
        COUNT(*)
    INTO monthly_savings, savings_events
    FROM public.expenses
    WHERE user_id = user_id_param
      AND EXTRACT(year FROM created_at) = year_param
      AND EXTRACT(month FROM created_at) = month_param
      AND pam_influence IS NOT NULL
      AND (pam_influence->>'recommended_by_pam')::boolean = true
      AND (pam_influence->>'savings_amount')::numeric > 0;
    
    -- Return results
    RETURN QUERY SELECT 
        monthly_savings,
        savings_events,
        subscription_fee,
        monthly_savings >= subscription_fee as guarantee_met,
        CASE 
            WHEN subscription_fee > 0 THEN (monthly_savings / subscription_fee * 100)
            ELSE 0 
        END as percentage_achieved;
END;
$$;

-- Function to get PAM savings analytics for a user
CREATE OR REPLACE FUNCTION public.get_pam_savings_analytics(user_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    current_month_data RECORD;
    last_month_data RECORD;
    total_lifetime_savings NUMERIC;
BEGIN
    -- Get current month data
    SELECT * INTO current_month_data
    FROM public.calculate_monthly_pam_savings(
        user_id_param, 
        EXTRACT(year FROM NOW())::INTEGER,
        EXTRACT(month FROM NOW())::INTEGER
    );
    
    -- Get last month data for comparison
    SELECT * INTO last_month_data
    FROM public.calculate_monthly_pam_savings(
        user_id_param,
        EXTRACT(year FROM (NOW() - INTERVAL '1 month'))::INTEGER,
        EXTRACT(month FROM (NOW() - INTERVAL '1 month'))::INTEGER
    );
    
    -- Get total lifetime savings
    SELECT COALESCE(SUM((pam_influence->>'savings_amount')::numeric), 0)
    INTO total_lifetime_savings
    FROM public.expenses
    WHERE user_id = user_id_param
      AND pam_influence IS NOT NULL
      AND (pam_influence->>'recommended_by_pam')::boolean = true
      AND (pam_influence->>'savings_amount')::numeric > 0;
    
    -- Build result JSON
    result := jsonb_build_object(
        'current_month', jsonb_build_object(
            'total_savings', current_month_data.total_savings,
            'savings_count', current_month_data.savings_count,
            'subscription_cost', current_month_data.subscription_cost,
            'guarantee_met', current_month_data.guarantee_met,
            'percentage_achieved', current_month_data.percentage_achieved
        ),
        'last_month', jsonb_build_object(
            'total_savings', last_month_data.total_savings,
            'savings_count', last_month_data.savings_count
        ),
        'lifetime', jsonb_build_object(
            'total_savings', total_lifetime_savings
        ),
        'generated_at', to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    );
    
    RETURN result;
END;
$$;

-- =====================================================
-- 4. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION public.calculate_monthly_pam_savings(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pam_savings_analytics(UUID) TO authenticated;

-- =====================================================
-- 5. ADD EXAMPLE DATA FOR TESTING (Optional)
-- =====================================================

-- This section can be removed in production
-- Example of how PAM influence would be recorded:
-- 
-- UPDATE expenses SET pam_influence = jsonb_build_object(
--     'recommended_by_pam', true,
--     'original_amount', 150.00,
--     'savings_amount', 25.00,
--     'recommendation_type', 'fuel_optimization',
--     'confidence', 0.85
-- ) WHERE id = 'some-expense-id';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Log completion
SELECT 'PAM influence field added to expenses table successfully' as migration_status;

-- This migration adds a simple, elegant solution for PAM savings tracking:
--
-- Benefits:
-- 1. Single field addition instead of 4 new tables
-- 2. Leverages existing expense tracking infrastructure  
-- 3. Provides helper functions for savings calculation
-- 4. Maintains performance with targeted indexes
-- 5. Easy to query and maintain
--
-- Usage:
-- - When PAM suggests a money-saving alternative, record it in pam_influence
-- - Monthly savings calculated using calculate_monthly_pam_savings()
-- - Analytics available via get_pam_savings_analytics()
-- - Guarantee status determined by comparing monthly savings to subscription cost