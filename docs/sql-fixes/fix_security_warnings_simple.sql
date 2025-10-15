-- Simple & Safe Fix for Supabase Security Linter Warnings
-- These views are either unused or only used in tests

-- =============================================================================
-- Fix 1: Drop signup_health_check view
-- Problem: Exposes auth.users data + uses SECURITY DEFINER
-- Impact: Low - Not used in production code
-- =============================================================================

DROP VIEW IF EXISTS public.signup_health_check CASCADE;

-- =============================================================================
-- Fix 2: Drop budget_utilization view
-- Problem: Uses SECURITY DEFINER
-- Impact: Low - Only used in stress tests, not production
-- Note: Budget utilization is calculated in Python code, not from this view
-- =============================================================================

DROP VIEW IF EXISTS public.budget_utilization CASCADE;

-- =============================================================================
-- Verification
-- =============================================================================

-- Confirm views are dropped
SELECT
    schemaname,
    viewname
FROM pg_views
WHERE schemaname = 'public'
AND viewname IN ('signup_health_check', 'budget_utilization');

-- Should return 0 rows (views dropped successfully)

-- Check for any remaining SECURITY DEFINER views
SELECT
    n.nspname as schema,
    c.relname as view_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'v'
AND n.nspname = 'public'
AND pg_get_viewdef(c.oid, true) ILIKE '%SECURITY DEFINER%';

-- Should return 0 rows (no security issues remaining)
