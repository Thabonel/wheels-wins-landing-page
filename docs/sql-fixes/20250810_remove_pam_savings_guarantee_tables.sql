-- Remove PAM Savings Guarantee Tables - Cleanup Migration
-- Migration: 2025-08-10 03:30:00
-- 
-- This migration removes the over-engineered PAM savings guarantee system
-- that conflicts with existing PAM architecture and duplicates WinsNode functionality
-- 
-- The removed system included:
-- - 4 complex database tables
-- - Complex RLS policies 
-- - Multiple triggers and functions
--
-- This will be replaced with a simplified approach that leverages existing systems.

-- =====================================================
-- 1. DROP TABLES IN DEPENDENCY ORDER
-- =====================================================

-- Drop guarantee evaluations table first (has foreign key to summary)
DROP TABLE IF EXISTS public.pam_savings_guarantee_evaluations CASCADE;

-- Drop monthly summary table (has foreign key to events and users)
DROP TABLE IF EXISTS public.pam_monthly_savings_summary CASCADE;

-- Drop savings events table (has foreign key to recommendations)
DROP TABLE IF EXISTS public.pam_savings_events CASCADE;

-- Drop recommendations table last
DROP TABLE IF EXISTS public.pam_recommendations CASCADE;

-- =====================================================
-- 2. DROP INDEXES (if they still exist)
-- =====================================================

-- Drop indexes for pam_recommendations (if they exist)
DROP INDEX IF EXISTS idx_pam_recommendations_user_id;
DROP INDEX IF EXISTS idx_pam_recommendations_category;
DROP INDEX IF EXISTS idx_pam_recommendations_created_at;
DROP INDEX IF EXISTS idx_pam_recommendations_expires_at;

-- Drop indexes for pam_savings_events
DROP INDEX IF EXISTS idx_pam_savings_events_user_id;
DROP INDEX IF EXISTS idx_pam_savings_events_recommendation_id;
DROP INDEX IF EXISTS idx_pam_savings_events_saved_date;
DROP INDEX IF EXISTS idx_pam_savings_events_category;

-- Drop indexes for pam_monthly_savings_summary
DROP INDEX IF EXISTS idx_pam_monthly_summary_user_id;
DROP INDEX IF EXISTS idx_pam_monthly_summary_period;

-- Drop indexes for pam_savings_guarantee_evaluations
DROP INDEX IF EXISTS idx_pam_guarantee_evaluations_user_id;
DROP INDEX IF EXISTS idx_pam_guarantee_evaluations_period;
DROP INDEX IF EXISTS idx_pam_guarantee_evaluations_status;

-- =====================================================
-- 3. DROP TRIGGERS AND FUNCTIONS
-- =====================================================

-- Drop triggers for updated_at columns
DROP TRIGGER IF EXISTS update_pam_recommendations_updated_at ON public.pam_recommendations;
DROP TRIGGER IF EXISTS update_pam_savings_events_updated_at ON public.pam_savings_events;
DROP TRIGGER IF EXISTS update_pam_monthly_savings_summary_updated_at ON public.pam_monthly_savings_summary;
DROP TRIGGER IF EXISTS update_pam_savings_guarantee_evaluations_updated_at ON public.pam_savings_guarantee_evaluations;

-- Note: We keep the update_updated_at_column() function as it may be used by other tables

-- =====================================================
-- 4. REVOKE PERMISSIONS (cleanup)
-- =====================================================

-- Revoke permissions (these will automatically be cleaned up with table drops, but explicit for clarity)
REVOKE ALL ON public.pam_recommendations FROM authenticated;
REVOKE ALL ON public.pam_savings_events FROM authenticated;
REVOKE ALL ON public.pam_monthly_savings_summary FROM authenticated;
REVOKE ALL ON public.pam_savings_guarantee_evaluations FROM authenticated;

-- Revoke sequence permissions 
REVOKE ALL ON SEQUENCE public.pam_savings_events_id_seq FROM authenticated;
REVOKE ALL ON SEQUENCE public.pam_monthly_savings_summary_id_seq FROM authenticated;
REVOKE ALL ON SEQUENCE public.pam_savings_guarantee_evaluations_id_seq FROM authenticated;

-- =====================================================
-- 5. DROP SEQUENCES (if they still exist)
-- =====================================================

-- Drop sequences used by the tables
DROP SEQUENCE IF EXISTS public.pam_savings_events_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.pam_monthly_savings_summary_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.pam_savings_guarantee_evaluations_id_seq CASCADE;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Log the cleanup completion
SELECT 'PAM Savings Guarantee tables removed successfully' as cleanup_status;

-- This migration removes the over-engineered savings guarantee system.
-- The functionality will be reimplemented using a simplified approach that:
-- 1. Adds a simple JSONB field to existing expenses table
-- 2. Leverages existing PAM tool registry and WinsNode integration
-- 3. Works with existing PAM MCP architecture
-- 
-- Benefits:
-- - Reduces codebase complexity by ~80%
-- - Aligns with existing architecture patterns
-- - Maintains savings tracking functionality
-- - Easier to maintain and extend