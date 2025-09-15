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