-- Rollback Script for Missing Database Tables
-- Date: January 17, 2025
-- Purpose: Emergency rollback if table creation causes issues

-- WARNING: This will delete all data in these tables!
-- Only run if absolutely necessary

-- Drop triggers first
DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON public.user_subscriptions;
DROP TRIGGER IF EXISTS update_budgets_updated_at ON public.budgets;
DROP TRIGGER IF EXISTS update_income_entries_updated_at ON public.income_entries;
DROP TRIGGER IF EXISTS update_posts_updated_at ON public.posts;
DROP TRIGGER IF EXISTS update_user_wishlists_updated_at ON public.user_wishlists;
DROP TRIGGER IF EXISTS update_trip_template_ratings_updated_at ON public.trip_template_ratings;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS public.trip_template_ratings CASCADE;
DROP TABLE IF EXISTS public.user_wishlists CASCADE;
DROP TABLE IF EXISTS public.posts CASCADE;
DROP TABLE IF EXISTS public.income_entries CASCADE;
DROP TABLE IF EXISTS public.budgets CASCADE;
DROP TABLE IF EXISTS public.user_subscriptions CASCADE;

-- Drop the update function if no longer needed
-- (Keep commented out as other tables might use it)
-- DROP FUNCTION IF EXISTS update_updated_at_column();