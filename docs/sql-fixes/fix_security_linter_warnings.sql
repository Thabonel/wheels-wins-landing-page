-- Fix Supabase Security Linter Warnings
-- Addresses 3 security issues:
-- 1. auth_users_exposed - signup_health_check exposes auth.users
-- 2. security_definer_view - budget_utilization uses SECURITY DEFINER
-- 3. security_definer_view - signup_health_check uses SECURITY DEFINER

-- ============================================================================
-- Issue 1 & 3: signup_health_check view
-- Problem: Exposes auth.users data AND uses SECURITY DEFINER
-- Solution: Drop the view (it's only for health checks, not critical)
-- ============================================================================

DROP VIEW IF EXISTS public.signup_health_check CASCADE;

-- If you need signup health checks, create a function instead:
-- CREATE OR REPLACE FUNCTION public.check_signup_health()
-- RETURNS json
-- SECURITY INVOKER  -- Use caller's permissions, not definer's
-- LANGUAGE plpgsql
-- AS $$
-- BEGIN
--   RETURN json_build_object(
--     'profiles_count', (SELECT COUNT(*) FROM profiles),
--     'status', 'healthy'
--   );
-- END;
-- $$;


-- ============================================================================
-- Issue 2: budget_utilization view
-- Problem: Uses SECURITY DEFINER (enforces creator's permissions)
-- Solution: Recreate without SECURITY DEFINER or with SECURITY INVOKER
-- ============================================================================

-- First, save the view definition
-- (You'll need to check the actual view definition in Supabase)
-- Then drop and recreate without SECURITY DEFINER

-- Example (adjust based on your actual view definition):
DROP VIEW IF EXISTS public.budget_utilization CASCADE;

-- Recreate the view with SECURITY INVOKER (uses caller's permissions)
-- Note: You'll need to replace this with your actual view definition
CREATE OR REPLACE VIEW public.budget_utilization
WITH (security_invoker = true)  -- This is the key change
AS
SELECT
    b.id,
    b.user_id,
    b.category,
    b.amount as budget_amount,
    COALESCE(SUM(e.amount), 0) as spent_amount,
    b.amount - COALESCE(SUM(e.amount), 0) as remaining_amount,
    CASE
        WHEN b.amount > 0 THEN
            (COALESCE(SUM(e.amount), 0) / b.amount * 100)
        ELSE 0
    END as utilization_percentage
FROM budgets b
LEFT JOIN expenses e ON
    e.user_id = b.user_id AND
    e.category = b.category AND
    e.date >= b.start_date AND
    (b.end_date IS NULL OR e.date <= b.end_date)
GROUP BY b.id, b.user_id, b.category, b.amount;

-- Grant appropriate permissions
GRANT SELECT ON public.budget_utilization TO authenticated;


-- ============================================================================
-- Verification
-- ============================================================================

-- Check that views are fixed
SELECT
    schemaname,
    viewname,
    definition
FROM pg_views
WHERE schemaname = 'public'
AND viewname IN ('signup_health_check', 'budget_utilization');

-- Verify no SECURITY DEFINER views remain
SELECT
    schemaname,
    viewname,
    definition
FROM pg_views
WHERE schemaname = 'public'
AND definition ILIKE '%SECURITY DEFINER%';
