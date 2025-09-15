-- Migration: Fix update_updated_at_column function security vulnerability
-- Date: 2025-08-08
-- Description: Fixes mutable search_path security vulnerability in update_updated_at_column function

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Recreate function with secure search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Recreate all triggers that use this function
-- Note: These triggers will be automatically recreated when the function is recreated with CASCADE

-- Profiles table
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trips table
CREATE TRIGGER update_trips_updated_at
    BEFORE UPDATE ON public.trips
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Expenses table
CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Income entries table
CREATE TRIGGER update_income_entries_updated_at
    BEFORE UPDATE ON public.income_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Posts table
CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON public.posts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- PAM conversations table
CREATE TRIGGER update_pam_conversations_updated_at
    BEFORE UPDATE ON public.pam_conversations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- User settings table
CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- PAM recommendations table (if exists)
CREATE TRIGGER update_pam_recommendations_updated_at
    BEFORE UPDATE ON public.pam_recommendations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- PAM savings events table (newly created)
CREATE TRIGGER update_pam_savings_events_updated_at
    BEFORE UPDATE ON public.pam_savings_events
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment documenting the security fix
COMMENT ON FUNCTION public.update_updated_at_column() IS 'Automatically updates the updated_at column to current timestamp. Secured with immutable search_path to prevent security vulnerabilities.';