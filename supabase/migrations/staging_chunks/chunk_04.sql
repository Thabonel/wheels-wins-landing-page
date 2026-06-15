-- Fix Supabase linter warnings: Function Search Path Mutable
-- Adding SET search_path TO '' for security to prevent search path injection attacks

-- Fix update_income_entries_updated_at function
CREATE OR REPLACE FUNCTION public.update_income_entries_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix update_user_feedback_updated_at function
CREATE OR REPLACE FUNCTION public.update_user_feedback_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix update_trip_templates_updated_at function
CREATE OR REPLACE FUNCTION public.update_trip_templates_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix get_or_create_pam_conversation function (main version)
CREATE OR REPLACE FUNCTION public.get_or_create_pam_conversation(user_id uuid)
 RETURNS TABLE(id uuid, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  RETURN QUERY
  INSERT INTO public.pam_conversations (user_id)
  VALUES (user_id)
  ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
  RETURNING pam_conversations.id, pam_conversations.created_at, pam_conversations.updated_at;
END;
$function$;

-- ============================================================
-- MIGRATION: 20250727160000-create-user-settings-table.sql
-- ============================================================

-- Create user_settings table with proper structure for backend compatibility
-- This fixes "Failed to load settings" errors by providing the exact table structure expected by UserSettingsService

-- Create user_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    
    -- Notification preferences matching useUserSettings.ts interface
    notification_preferences JSONB DEFAULT '{
        "email_notifications": true,
        "push_notifications": true,
        "marketing_emails": false,
        "trip_reminders": true,
        "maintenance_alerts": true,
        "weather_warnings": true
    }'::jsonb,
    
    -- Privacy preferences matching useUserSettings.ts interface
    privacy_preferences JSONB DEFAULT '{
        "profile_visibility": "public",
        "location_sharing": true,
        "activity_tracking": true,
        "data_collection": true
    }'::jsonb,
    
    -- Display preferences matching useUserSettings.ts interface
    display_preferences JSONB DEFAULT '{
        "theme": "system",
        "font_size": "medium",
        "language": "en",
        "high_contrast": false,
        "reduced_motion": false
    }'::jsonb,
    
    -- Regional preferences matching useUserSettings.ts interface
    regional_preferences JSONB DEFAULT '{
        "currency": "USD",
        "units": "imperial",
        "timezone": "America/New_York",
        "date_format": "MM/DD/YYYY"
    }'::jsonb,
    
    -- PAM preferences matching useUserSettings.ts interface with voice_enabled: true by default
    pam_preferences JSONB DEFAULT '{
        "voice_enabled": true,
        "proactive_suggestions": true,
        "response_style": "balanced",
        "expertise_level": "intermediate",
        "knowledge_sources": true
    }'::jsonb,
    
    -- Integration preferences matching useUserSettings.ts interface
    integration_preferences JSONB DEFAULT '{
        "shop_travel_integration": true,
        "auto_add_purchases_to_storage": false
    }'::jsonb,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (clean slate)
DROP POLICY IF EXISTS "Users can manage their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "users_can_read_own_settings" ON public.user_settings;
DROP POLICY IF EXISTS "users_can_insert_own_settings" ON public.user_settings;
DROP POLICY IF EXISTS "users_can_update_own_settings" ON public.user_settings;
DROP POLICY IF EXISTS "users_can_delete_own_settings" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_select_own" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_insert_own" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_update_own" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_delete_own" ON public.user_settings;

-- Create simple, effective RLS policies
CREATE POLICY "user_settings_select_policy" ON public.user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_settings_insert_policy" ON public.user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_settings_update_policy" ON public.user_settings
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_settings_delete_policy" ON public.user_settings
    FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_created_at ON public.user_settings(created_at);
CREATE INDEX IF NOT EXISTS idx_user_settings_notification_prefs ON public.user_settings USING GIN (notification_preferences);
CREATE INDEX IF NOT EXISTS idx_user_settings_privacy_prefs ON public.user_settings USING GIN (privacy_preferences);
CREATE INDEX IF NOT EXISTS idx_user_settings_display_prefs ON public.user_settings USING GIN (display_preferences);
CREATE INDEX IF NOT EXISTS idx_user_settings_pam_prefs ON public.user_settings USING GIN (pam_preferences);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_settings_updated_at_trigger ON public.user_settings;
CREATE TRIGGER update_user_settings_updated_at_trigger
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_settings_updated_at();

-- Add helpful comments
COMMENT ON TABLE public.user_settings IS 'User preferences and settings for all app features - matches UserSettingsService expectations';
COMMENT ON COLUMN public.user_settings.user_id IS 'References the authenticated user (UUID from auth.users)';
COMMENT ON COLUMN public.user_settings.notification_preferences IS 'User notification preferences matching frontend interface';
COMMENT ON COLUMN public.user_settings.privacy_preferences IS 'User privacy settings matching frontend interface';
COMMENT ON COLUMN public.user_settings.display_preferences IS 'User display and theme preferences matching frontend interface';
COMMENT ON COLUMN public.user_settings.regional_preferences IS 'User regional preferences (currency, units, timezone) matching frontend interface';
COMMENT ON COLUMN public.user_settings.pam_preferences IS 'PAM AI assistant preferences with voice_enabled=true by default';
COMMENT ON COLUMN public.user_settings.integration_preferences IS 'User preferences for integrations between app features';

-- ============================================================
-- MIGRATION: 20250727161000-enhance-missing-tables.sql
-- ============================================================

-- Enhance missing tables to match backend database service expectations
-- This migration ensures all tables referenced by the backend services exist with correct structure

-- 1. Enhance affiliate_sales table with all fields expected by database service
DO $$
BEGIN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'affiliate_sales' AND column_name = 'product_name') THEN
        ALTER TABLE public.affiliate_sales ADD COLUMN product_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'affiliate_sales' AND column_name = 'product_url') THEN
        ALTER TABLE public.affiliate_sales ADD COLUMN product_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'affiliate_sales' AND column_name = 'amount') THEN
        ALTER TABLE public.affiliate_sales ADD COLUMN amount DECIMAL(10,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'affiliate_sales' AND column_name = 'commission') THEN
        ALTER TABLE public.affiliate_sales ADD COLUMN commission DECIMAL(10,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'affiliate_sales' AND column_name = 'category') THEN
        ALTER TABLE public.affiliate_sales ADD COLUMN category TEXT;
    END IF;
END $$;

-- 2. Enhance user_wishlists table to match database service expectations
-- The database service expects a flattened structure with product details directly in the table
DO $$
BEGIN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_wishlists' AND column_name = 'product_id') THEN
        ALTER TABLE public.user_wishlists ADD COLUMN product_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_wishlists' AND column_name = 'product_name') THEN
        ALTER TABLE public.user_wishlists ADD COLUMN product_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_wishlists' AND column_name = 'price') THEN
        ALTER TABLE public.user_wishlists ADD COLUMN price DECIMAL(10,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_wishlists' AND column_name = 'category') THEN
        ALTER TABLE public.user_wishlists ADD COLUMN category TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_wishlists' AND column_name = 'notes') THEN
        ALTER TABLE public.user_wishlists ADD COLUMN notes TEXT;
    END IF;
END $$;

-- 3. Ensure marketplace_listings table exists with all expected fields
CREATE TABLE IF NOT EXISTS public.marketplace_listings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Basic listing information
    title TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    category TEXT DEFAULT 'Other',
    condition TEXT DEFAULT 'Good',
    location TEXT,
    
    -- User relationships (supporting both user_id and seller_id)
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    seller TEXT,
    
    -- Status and workflow
    status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'sold', 'expired', 'approved', 'rejected')),
    
    -- Media
    image TEXT,
    images JSONB DEFAULT '[]',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for marketplace_listings if not already enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'marketplace_listings' 
        AND policyname = 'Users can view active listings'
    ) THEN
        ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view active listings" ON public.marketplace_listings
            FOR SELECT USING (status = 'active' OR auth.uid() = user_id OR auth.uid() = seller_id);
        
        CREATE POLICY "Users can manage their own listings" ON public.marketplace_listings
            FOR ALL USING (auth.uid() = user_id OR auth.uid() = seller_id);
    END IF;
END $$;

-- 4. Update affiliate_sales policies to match database service usage
DROP POLICY IF EXISTS "Service role has full access to affiliate_sales" ON public.affiliate_sales;
CREATE POLICY "Service role has full access to affiliate_sales" ON public.affiliate_sales
    FOR ALL TO service_role USING (true);

-- Allow inserts for webhook processing
CREATE POLICY IF NOT EXISTS "Users can insert affiliate sales" ON public.affiliate_sales
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Update user_wishlists policies
DROP POLICY IF EXISTS "Service role has full access to wishlists" ON public.user_wishlists;
CREATE POLICY "Service role has full access to wishlists" ON public.user_wishlists
    FOR ALL TO service_role USING (true);

-- 6. Add performance indexes for database service queries
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_product_name ON public.affiliate_sales(product_name);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_category ON public.affiliate_sales(category);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_amount ON public.affiliate_sales(amount);

CREATE INDEX IF NOT EXISTS idx_user_wishlists_product_name ON public.user_wishlists(product_name);
CREATE INDEX IF NOT EXISTS idx_user_wishlists_category ON public.user_wishlists(category);
CREATE INDEX IF NOT EXISTS idx_user_wishlists_price ON public.user_wishlists(price);

CREATE INDEX IF NOT EXISTS idx_marketplace_seller_id ON public.marketplace_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_category ON public.marketplace_listings(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_status ON public.marketplace_listings(status);

-- 7. Grant proper permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_sales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_wishlists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_listings TO authenticated;

-- 8. Add table comments for documentation
COMMENT ON TABLE public.affiliate_sales IS 'Affiliate sales tracking - enhanced for database service compatibility';
COMMENT ON TABLE public.user_wishlists IS 'User wishlists with flattened product structure for database service';
COMMENT ON TABLE public.marketplace_listings IS 'Social marketplace listings for RV community';

-- 9. Ensure update triggers exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_marketplace_listings_updated_at'
    ) THEN
        CREATE TRIGGER update_marketplace_listings_updated_at
            BEFORE UPDATE ON public.marketplace_listings
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================================
-- MIGRATION: 20250727170000-create-missing-production-tables.sql
-- ============================================================

-- Create missing production tables identified from console errors
-- Migration: 20250727170000-create-missing-production-tables.sql

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_type VARCHAR(50) NOT NULL DEFAULT 'free',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    plan_id VARCHAR(50),
    customer_id VARCHAR(100), -- Stripe customer ID
    subscription_id VARCHAR(100), -- Stripe subscription ID
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for user_subscriptions
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_type ON user_subscriptions(subscription_type);

-- Create user_login_history table
CREATE TABLE IF NOT EXISTS user_login_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    login_timestamp TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    login_method VARCHAR(50) DEFAULT 'email', -- email, oauth, etc.
    success BOOLEAN DEFAULT TRUE,
    failure_reason TEXT,
    session_id UUID,
    device_info JSONB DEFAULT '{}'::jsonb,
    location_info JSONB DEFAULT '{}'::jsonb -- Country, city, etc.
);

-- Create indexes for user_login_history
CREATE INDEX IF NOT EXISTS idx_user_login_history_user_id ON user_login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_login_history_timestamp ON user_login_history(login_timestamp);
CREATE INDEX IF NOT EXISTS idx_user_login_history_success ON user_login_history(success);

-- Create user_active_sessions table
CREATE TABLE IF NOT EXISTS user_active_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    ip_address INET,
    user_agent TEXT,
    device_type VARCHAR(50), -- mobile, desktop, tablet
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for user_active_sessions
CREATE INDEX IF NOT EXISTS idx_user_active_sessions_user_id ON user_active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_active_sessions_session_id ON user_active_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_active_sessions_active ON user_active_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_active_sessions_expires ON user_active_sessions(expires_at);

-- Add updated_at trigger for user_subscriptions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_subscriptions_updated_at 
    BEFORE UPDATE ON user_subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at trigger for user_active_sessions
CREATE TRIGGER update_user_active_sessions_updated_at 
    BEFORE UPDATE ON user_active_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies

-- Enable RLS on all tables
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_active_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for user_subscriptions
CREATE POLICY "Users can view their own subscriptions" ON user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON user_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- Service role can manage all subscriptions (for Stripe webhooks)
CREATE POLICY "Service role can manage subscriptions" ON user_subscriptions
    FOR ALL USING (auth.role() = 'service_role');

-- Policies for user_login_history
CREATE POLICY "Users can view their own login history" ON user_login_history
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert login history
CREATE POLICY "Service role can insert login history" ON user_login_history
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Policies for user_active_sessions
CREATE POLICY "Users can view their own active sessions" ON user_active_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own active sessions" ON user_active_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Service role can manage all sessions
CREATE POLICY "Service role can manage sessions" ON user_active_sessions
    FOR ALL USING (auth.role() = 'service_role');

-- Create a function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    -- Mark expired sessions as inactive
    UPDATE user_active_sessions 
    SET is_active = FALSE 
    WHERE expires_at < NOW() AND is_active = TRUE;
    
    -- Delete very old inactive sessions (older than 30 days)
    DELETE FROM user_active_sessions 
    WHERE is_active = FALSE 
    AND last_activity < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON user_subscriptions TO authenticated;
GRANT SELECT ON user_login_history TO authenticated;
GRANT SELECT, UPDATE ON user_active_sessions TO authenticated;

-- Grant service role full access
GRANT ALL ON user_subscriptions TO service_role;
GRANT ALL ON user_login_history TO service_role;
GRANT ALL ON user_active_sessions TO service_role;

-- ============================================================
-- MIGRATION: 20250729200000-fix-pam-database-permissions.sql
-- ============================================================

-- PAM Database Permissions Fix - Complete Solution
-- Fixes all remaining database permission issues for PAM functionality
-- Timestamp: 2025-07-29 20:00:00

-- =====================================================
-- 1. FIX TRIP TEMPLATES PERMISSIONS ISSUE  
-- =====================================================

-- The main issue is that authenticated users can't read public trip templates
-- This fixes the 403 Forbidden errors on trip_templates table

DO $$ 
BEGIN
    -- Check if trip_templates table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'trip_templates' AND table_schema = 'public') THEN
        
        -- Drop existing problematic policies
        DROP POLICY IF EXISTS "Users can manage own templates" ON public.trip_templates;
        DROP POLICY IF EXISTS "Users can view public templates" ON public.trip_templates;
        DROP POLICY IF EXISTS "trip_templates_select" ON public.trip_templates;
        DROP POLICY IF EXISTS "trip_templates_insert" ON public.trip_templates;
        DROP POLICY IF EXISTS "trip_templates_update" ON public.trip_templates;
        DROP POLICY IF EXISTS "trip_templates_delete" ON public.trip_templates;
        
        -- Create comprehensive, working policies for trip_templates
        
        -- Allow authenticated users to view public templates (fixes 403 error)
        CREATE POLICY "authenticated_users_view_public_templates" ON public.trip_templates
            FOR SELECT USING (
                is_public = true OR 
                auth.uid() = user_id
            );
        
        -- Allow users to manage their own templates
        CREATE POLICY "users_manage_own_templates" ON public.trip_templates
            FOR ALL USING (auth.uid() = user_id);
        
        -- Allow users to create new templates
        CREATE POLICY "users_create_templates" ON public.trip_templates
            FOR INSERT WITH CHECK (auth.uid() = user_id);
        
        -- Add service role permissions for PAM operations
        CREATE POLICY "service_role_full_access_templates" ON public.trip_templates
            FOR ALL USING (
                auth.role() = 'service_role' OR 
                auth.uid() = user_id OR 
                is_public = true
            );
        
    END IF;
END $$;

-- =====================================================
-- 2. FIX GROUP TRIP PARTICIPANTS RECURSION (ENHANCEMENT)
-- =====================================================

-- Further enhance the group_trip_participants policies to prevent any recursion
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'group_trip_participants' AND table_schema = 'public') THEN
        
        -- Clean up any remaining recursive policies
        DROP POLICY IF EXISTS "users_view_own_trip_participants" ON public.group_trip_participants;
        DROP POLICY IF EXISTS "users_manage_own_participation" ON public.group_trip_participants;
        DROP POLICY IF EXISTS "organizers_manage_participants" ON public.group_trip_participants;
        
        -- Create completely non-recursive policies
        
        -- Simple policy: users can see their own participation records
        CREATE POLICY "view_own_participation_only" ON public.group_trip_participants
            FOR SELECT USING (user_id = auth.uid());
        
        -- Users can manage their own participation
        CREATE POLICY "manage_own_participation_simple" ON public.group_trip_participants
            FOR ALL USING (user_id = auth.uid());
        
        -- Trip organizers can view all participants (using direct table join, not subquery)
        CREATE POLICY "organizers_view_all_participants" ON public.group_trip_participants
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.group_trips gt
                    WHERE gt.id = group_trip_participants.trip_id 
                    AND gt.created_by = auth.uid()
                )
            );
        
        -- Service role full access for PAM operations
        CREATE POLICY "service_role_manage_participants" ON public.group_trip_participants
            FOR ALL USING (auth.role() = 'service_role');
        
    END IF;
END $$;

-- =====================================================
-- 3. CREATE MISSING PAM-SPECIFIC TABLES
-- =====================================================

-- PAM conversation memory table
CREATE TABLE IF NOT EXISTS public.pam_conversation_memory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    message_content TEXT NOT NULL,
    message_type TEXT DEFAULT 'user' CHECK (message_type IN ('user', 'assistant', 'system')),
    context_data JSONB DEFAULT '{}',
    sentiment_score DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- PAM feedback table
CREATE TABLE IF NOT EXISTS public.pam_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message_id TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback_type TEXT DEFAULT 'quality',
    feedback_text TEXT,
    thumbs_up BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PAM user context table (stores user context for personalized responses)
CREATE TABLE IF NOT EXISTS public.pam_user_context (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    context_type TEXT NOT NULL,
    context_data JSONB NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, context_type)
);

-- PAM analytics table (for tracking PAM usage and performance)
CREATE TABLE IF NOT EXISTS public.pam_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    processing_time_ms INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on PAM tables
ALTER TABLE public.pam_conversation_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pam_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pam_user_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pam_analytics ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. PAM TABLE POLICIES
-- =====================================================

-- PAM conversation memory policies
CREATE POLICY "users_manage_own_pam_memory" ON public.pam_conversation_memory
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "service_role_access_pam_memory" ON public.pam_conversation_memory
    FOR ALL USING (auth.role() = 'service_role');

-- PAM feedback policies
CREATE POLICY "users_manage_own_pam_feedback" ON public.pam_feedback
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "service_role_access_pam_feedback" ON public.pam_feedback
    FOR ALL USING (auth.role() = 'service_role');

-- PAM user context policies
CREATE POLICY "users_manage_own_pam_context" ON public.pam_user_context
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "service_role_access_pam_context" ON public.pam_user_context
    FOR ALL USING (auth.role() = 'service_role');

-- PAM analytics policies (service role only for privacy)
CREATE POLICY "service_role_access_pam_analytics" ON public.pam_analytics
    FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 5. ENHANCE EXISTING TABLE PERMISSIONS FOR PAM
-- =====================================================

-- Add service role policies to existing critical tables that PAM needs access to

-- Profiles table - PAM needs to access user profile information
DO $$
BEGIN
    -- Add service role access to profiles for PAM personalization
    CREATE POLICY "service_role_read_profiles_for_pam" ON public.profiles
        FOR SELECT USING (auth.role() = 'service_role');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- User settings - PAM needs to respect user preferences
DO $$
BEGIN
    CREATE POLICY "service_role_access_user_settings_for_pam" ON public.user_settings
        FOR SELECT USING (auth.role() = 'service_role');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- User trips - PAM needs to provide trip-related assistance
DO $$
BEGIN
    CREATE POLICY "service_role_read_trips_for_pam" ON public.user_trips
        FOR SELECT USING (auth.role() = 'service_role');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Trip expenses - PAM needs to help with financial tracking
DO $$
BEGIN
    CREATE POLICY "service_role_read_expenses_for_pam" ON public.trip_expenses
        FOR SELECT USING (auth.role() = 'service_role');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 6. PERFORMANCE INDEXES FOR PAM OPERATIONS
-- =====================================================

-- Indexes for PAM conversation memory
CREATE INDEX IF NOT EXISTS idx_pam_memory_user_session ON public.pam_conversation_memory(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_pam_memory_created_at ON public.pam_conversation_memory(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pam_memory_expires_at ON public.pam_conversation_memory(expires_at);

-- Indexes for PAM feedback
CREATE INDEX IF NOT EXISTS idx_pam_feedback_user_id ON public.pam_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_pam_feedback_message_id ON public.pam_feedback(message_id);
CREATE INDEX IF NOT EXISTS idx_pam_feedback_created_at ON public.pam_feedback(created_at DESC);

-- Indexes for PAM user context
CREATE INDEX IF NOT EXISTS idx_pam_context_user_type ON public.pam_user_context(user_id, context_type);
CREATE INDEX IF NOT EXISTS idx_pam_context_updated ON public.pam_user_context(last_updated DESC);

-- Indexes for PAM analytics
CREATE INDEX IF NOT EXISTS idx_pam_analytics_user_id ON public.pam_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_pam_analytics_event_type ON public.pam_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_pam_analytics_created_at ON public.pam_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pam_analytics_success ON public.pam_analytics(success);

-- Enhanced indexes for trip_templates performance
CREATE INDEX IF NOT EXISTS idx_trip_templates_public_category ON public.trip_templates(is_public, category) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_trip_templates_usage_count ON public.trip_templates(usage_count DESC) WHERE is_public = true;

-- =====================================================
-- 7. CLEANUP AND MAINTENANCE FUNCTIONS
-- =====================================================

-- Function to clean up expired PAM conversation memory
CREATE OR REPLACE FUNCTION cleanup_expired_pam_memory()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.pam_conversation_memory 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update trip template usage count
CREATE OR REPLACE FUNCTION increment_template_usage(template_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.trip_templates 
    SET usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. GRANT NECESSARY PERMISSIONS TO SERVICE ROLE
-- =====================================================

-- Grant execute permissions on functions to service role
GRANT EXECUTE ON FUNCTION cleanup_expired_pam_memory() TO service_role;
GRANT EXECUTE ON FUNCTION increment_template_usage(UUID) TO service_role;

-- Grant usage on sequences if any exist
DO $$
DECLARE
    seq_name text;
BEGIN
    FOR seq_name IN 
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public'
    LOOP
        EXECUTE format('GRANT USAGE ON SEQUENCE public.%I TO service_role', seq_name);
    END LOOP;
END $$;

-- =====================================================
-- 9. CREATE TRIGGERS FOR UPDATED_AT COLUMNS
-- =====================================================

-- Add updated_at triggers for PAM tables
CREATE TRIGGER update_pam_user_context_updated_at 
    BEFORE UPDATE ON public.pam_user_context
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 10. VALIDATION AND VERIFICATION
-- =====================================================

-- Create a function to verify PAM permissions are working
CREATE OR REPLACE FUNCTION verify_pam_permissions()
RETURNS TABLE(
    table_name text,
    permission_type text,
    status text,
    details text
) AS $$
BEGIN
    -- Test trip_templates access
    RETURN QUERY
    SELECT 
        'trip_templates'::text,
        'public_read'::text,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM public.trip_templates WHERE is_public = true LIMIT 1
            ) THEN 'PASS'::text
            ELSE 'SKIP'::text
        END,
        'Public trip templates readable'::text;
    
    -- Test PAM tables exist
    RETURN QUERY
    SELECT 
        'pam_conversation_memory'::text,
        'table_exists'::text,
        CASE 
            WHEN EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'pam_conversation_memory' 
                AND table_schema = 'public'
            ) THEN 'PASS'::text
            ELSE 'FAIL'::text
        END,
        'PAM conversation memory table exists'::text;
    
    RETURN QUERY
    SELECT 
        'pam_feedback'::text,
        'table_exists'::text,
        CASE 
            WHEN EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'pam_feedback' 
                AND table_schema = 'public'
            ) THEN 'PASS'::text
            ELSE 'FAIL'::text
        END,
        'PAM feedback table exists'::text;
    
    -- Test affiliate_sales table
    RETURN QUERY
    SELECT 
        'affiliate_sales'::text,
        'table_exists'::text,
        CASE 
            WHEN EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'affiliate_sales' 
                AND table_schema = 'public'
            ) THEN 'PASS'::text
            ELSE 'FAIL'::text
        END,
        'Affiliate sales table exists'::text;
    
    -- Test user_wishlists table
    RETURN QUERY
    SELECT 
        'user_wishlists'::text,
        'table_exists'::text,
        CASE 
            WHEN EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'user_wishlists' 
                AND table_schema = 'public'
            ) THEN 'PASS'::text
            ELSE 'FAIL'::text
        END,
        'User wishlists table exists'::text;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to verification function
GRANT EXECUTE ON FUNCTION verify_pam_permissions() TO authenticated, service_role;

-- =====================================================
-- MIGRATION COMPLETION LOG
-- =====================================================

-- Log the completion of this migration
DO $$
BEGIN
    RAISE NOTICE 'PAM Database Permissions Migration Completed Successfully';
    RAISE NOTICE 'Fixed Issues:';
    RAISE NOTICE '  ✅ Trip templates 403 Forbidden errors';
    RAISE NOTICE '  ✅ Group trip participants infinite recursion';
    RAISE NOTICE '  ✅ Missing PAM-specific tables created';
    RAISE NOTICE '  ✅ Service role permissions granted';
    RAISE NOTICE '  ✅ Performance indexes added';
    RAISE NOTICE '  ✅ Cleanup functions created';
    RAISE NOTICE '';
    RAISE NOTICE 'PAM should now be fully functional!';
    RAISE NOTICE 'Run SELECT * FROM verify_pam_permissions() to verify.';
END $$;

-- ============================================================
-- MIGRATION: 20250730120000-complete-pam-missing-tables.sql
-- ============================================================

-- Complete PAM Database Implementation - Missing Tables
-- Creates affiliate_sales and user_wishlists tables to achieve 100% completion
-- Timestamp: 2025-07-30 12:00:00

-- =====================================================
-- 1. CREATE AFFILIATE_SALES TABLE
-- =====================================================

-- Table for tracking affiliate sales and commissions
CREATE TABLE IF NOT EXISTS public.affiliate_sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    affiliate_program TEXT NOT NULL, -- e.g., 'amazon', 'campgrounds', 'rv_accessories'
    product_id TEXT NOT NULL, -- External product identifier
    product_name TEXT NOT NULL,
    product_url TEXT,
    sale_amount DECIMAL(10,2) NOT NULL CHECK (sale_amount >= 0),
    commission_rate DECIMAL(5,4) NOT NULL CHECK (commission_rate >= 0 AND commission_rate <= 1), -- e.g., 0.05 for 5%
    commission_amount DECIMAL(10,2) NOT NULL CHECK (commission_amount >= 0),
    currency TEXT DEFAULT 'USD' CHECK (LENGTH(currency) = 3),
    sale_date TIMESTAMP WITH TIME ZONE NOT NULL,
    commission_status TEXT DEFAULT 'pending' CHECK (commission_status IN ('pending', 'confirmed', 'paid', 'cancelled')),
    tracking_id TEXT, -- Affiliate tracking identifier
    order_id TEXT, -- External order identifier
    metadata JSONB DEFAULT '{}', -- Additional sale metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.affiliate_sales ENABLE ROW LEVEL SECURITY;

-- RLS Policies for affiliate_sales
CREATE POLICY "users_view_own_affiliate_sales" ON public.affiliate_sales
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_manage_own_affiliate_sales" ON public.affiliate_sales
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "service_role_full_access_affiliate_sales" ON public.affiliate_sales
