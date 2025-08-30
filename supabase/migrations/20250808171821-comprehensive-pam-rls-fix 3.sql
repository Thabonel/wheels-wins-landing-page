-- =====================================================
-- COMPREHENSIVE PAM DATABASE SETUP WITH RLS FIXES
-- Date: January 8, 2025
-- Purpose: Complete setup of all PAM tables with proper RLS policies
-- =====================================================

-- =====================================================
-- 1. DROP EXISTING TABLES (CLEAN SLATE)
-- =====================================================
-- Drop in reverse dependency order to avoid foreign key issues
DROP TABLE IF EXISTS public.pam_savings_guarantee_evaluations CASCADE;
DROP TABLE IF EXISTS public.pam_monthly_savings_summary CASCADE;
DROP TABLE IF EXISTS public.pam_savings_events CASCADE;
DROP TABLE IF EXISTS public.pam_recommendations CASCADE;
DROP TABLE IF EXISTS public.pam_analytics CASCADE;
DROP TABLE IF EXISTS public.pam_feedback CASCADE;
DROP TABLE IF EXISTS public.pam_conversation_memory CASCADE;
DROP TABLE IF EXISTS public.pam_user_context CASCADE;
DROP TABLE IF EXISTS public.pam_messages CASCADE;
DROP TABLE IF EXISTS public.pam_conversations CASCADE;

-- =====================================================
-- 2. CREATE CORE FUNCTION FOR UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. CREATE PAM CONVERSATIONS TABLE
-- =====================================================
CREATE TABLE public.pam_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT,
    title TEXT DEFAULT 'PAM Conversation',
    context_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.pam_conversations ENABLE ROW LEVEL SECURITY;

-- Non-recursive RLS policies
CREATE POLICY "users_manage_own_conversations" ON public.pam_conversations
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "service_role_conversations_access" ON public.pam_conversations
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- 4. CREATE PAM MESSAGES TABLE
-- =====================================================
CREATE TABLE public.pam_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.pam_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    intent TEXT,
    confidence DECIMAL(3,2),
    entities JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.pam_messages ENABLE ROW LEVEL SECURITY;

-- Non-recursive RLS policies using JOIN instead of EXISTS
CREATE POLICY "users_view_own_messages" ON public.pam_messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT id FROM public.pam_conversations 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "users_create_messages" ON public.pam_messages
    FOR INSERT WITH CHECK (
        conversation_id IN (
            SELECT id FROM public.pam_conversations 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "service_role_messages_access" ON public.pam_messages
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- 5. CREATE PAM USER CONTEXT TABLE
-- =====================================================
CREATE TABLE public.pam_user_context (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    context_type TEXT NOT NULL,
    context_key TEXT NOT NULL,
    context_value TEXT,
    confidence DECIMAL(3,2) DEFAULT 1.0,
    source TEXT DEFAULT 'conversation',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, context_type, context_key)
);

-- Enable RLS
ALTER TABLE public.pam_user_context ENABLE ROW LEVEL SECURITY;

-- Simple non-recursive policies
CREATE POLICY "users_manage_own_context" ON public.pam_user_context
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "service_role_context_access" ON public.pam_user_context
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- 6. CREATE PAM CONVERSATION MEMORY TABLE
-- =====================================================
CREATE TABLE public.pam_conversation_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    message_content TEXT NOT NULL,
    message_type TEXT DEFAULT 'user' CHECK (message_type IN ('user', 'assistant', 'system')),
    context_data JSONB DEFAULT '{}',
    sentiment_score DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- Enable RLS
ALTER TABLE public.pam_conversation_memory ENABLE ROW LEVEL SECURITY;

-- Simple policies
CREATE POLICY "users_manage_own_memory" ON public.pam_conversation_memory
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "service_role_memory_access" ON public.pam_conversation_memory
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- 7. CREATE PAM FEEDBACK TABLE
-- =====================================================
CREATE TABLE public.pam_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message_id TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback_type TEXT DEFAULT 'quality',
    feedback_text TEXT,
    thumbs_up BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.pam_feedback ENABLE ROW LEVEL SECURITY;

-- Simple policies
CREATE POLICY "users_manage_own_feedback" ON public.pam_feedback
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "service_role_feedback_access" ON public.pam_feedback
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- 8. CREATE PAM ANALYTICS TABLE
-- =====================================================
CREATE TABLE public.pam_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    processing_time_ms INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.pam_analytics ENABLE ROW LEVEL SECURITY;

-- Analytics are service-role only for privacy
CREATE POLICY "service_role_analytics_access" ON public.pam_analytics
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Users can view their own analytics (optional)
CREATE POLICY "users_view_own_analytics" ON public.pam_analytics
    FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- 9. CREATE PAM RECOMMENDATIONS TABLE
-- =====================================================
CREATE TABLE public.pam_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    location GEOGRAPHY(POINT, 4326),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.pam_recommendations ENABLE ROW LEVEL SECURITY;

-- Simple policies
CREATE POLICY "users_view_own_recommendations" ON public.pam_recommendations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_manage_own_recommendations" ON public.pam_recommendations
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "service_role_recommendations_access" ON public.pam_recommendations
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- 10. CREATE PAM SAVINGS EVENTS TABLE
-- =====================================================
CREATE TABLE public.pam_savings_events (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recommendation_id UUID REFERENCES public.pam_recommendations(id) ON DELETE SET NULL,
    savings_type TEXT NOT NULL CHECK (savings_type IN (
        'fuel_cost', 'accommodation_cost', 'food_cost', 'activity_cost',
        'maintenance_cost', 'route_optimization', 'timing_optimization',
        'bulk_purchase', 'discount_found', 'alternative_found', 'general'
    )),
    predicted_savings DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (predicted_savings >= 0),
    actual_savings DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (actual_savings >= 0),
    baseline_cost DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (baseline_cost >= 0),
    optimized_cost DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (optimized_cost >= 0),
    savings_description TEXT NOT NULL,
    verification_method TEXT NOT NULL DEFAULT 'user_reported' CHECK (verification_method IN (
        'user_reported', 'receipt_analysis', 'price_comparison', 
        'booking_confirmation', 'automated_detection', 'third_party_verification'
    )),
    confidence_score DECIMAL(3,2) DEFAULT 0.8 CHECK (confidence_score BETWEEN 0 AND 1),
    location GEOGRAPHY(POINT, 4326),
    category TEXT NOT NULL DEFAULT 'general',
    saved_date DATE NOT NULL DEFAULT CURRENT_DATE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.pam_savings_events ENABLE ROW LEVEL SECURITY;

-- Simple policies
CREATE POLICY "users_view_own_savings" ON public.pam_savings_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_manage_own_savings" ON public.pam_savings_events
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "service_role_savings_access" ON public.pam_savings_events
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- 11. CREATE PAM MONTHLY SAVINGS SUMMARY TABLE
-- =====================================================
CREATE TABLE public.pam_monthly_savings_summary (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    subscription_cost DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (subscription_cost >= 0),
    total_predicted_savings DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total_predicted_savings >= 0),
    total_actual_savings DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total_actual_savings >= 0),
    savings_events_count INTEGER NOT NULL DEFAULT 0 CHECK (savings_events_count >= 0),
    guarantee_met BOOLEAN NOT NULL DEFAULT FALSE,
    guarantee_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (guarantee_amount >= 0),
    evaluation_date DATE,
    processed_date TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, billing_period_start, billing_period_end)
);

-- Enable RLS
ALTER TABLE public.pam_monthly_savings_summary ENABLE ROW LEVEL SECURITY;

-- Simple policies
CREATE POLICY "users_view_own_summaries" ON public.pam_monthly_savings_summary
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_manage_own_summaries" ON public.pam_monthly_savings_summary
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "service_role_summaries_access" ON public.pam_monthly_savings_summary
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- 12. CREATE PAM SAVINGS GUARANTEE EVALUATIONS TABLE
-- =====================================================
CREATE TABLE public.pam_savings_guarantee_evaluations (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    monthly_summary_id BIGINT REFERENCES public.pam_monthly_savings_summary(id) ON DELETE CASCADE,
    evaluation_period_start DATE NOT NULL,
    evaluation_period_end DATE NOT NULL,
    total_subscription_cost DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total_subscription_cost >= 0),
    total_savings_achieved DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total_savings_achieved >= 0),
    savings_shortfall DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (savings_shortfall >= 0),
    guarantee_status TEXT NOT NULL CHECK (guarantee_status IN (
        'pending', 'met', 'not_met', 'processing', 'completed', 'disputed'
    )),
    refund_amount DECIMAL(10,2) DEFAULT 0 CHECK (refund_amount >= 0),
    refund_processed BOOLEAN DEFAULT FALSE,
    refund_date TIMESTAMPTZ,
    evaluation_notes TEXT,
    processed_by TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.pam_savings_guarantee_evaluations ENABLE ROW LEVEL SECURITY;

-- Simple policies
CREATE POLICY "users_view_own_evaluations" ON public.pam_savings_guarantee_evaluations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "service_role_evaluations_access" ON public.pam_savings_guarantee_evaluations
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- 13. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Indexes for pam_conversations
CREATE INDEX idx_pam_conversations_user_id ON public.pam_conversations(user_id);
CREATE INDEX idx_pam_conversations_session_id ON public.pam_conversations(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_pam_conversations_updated_at ON public.pam_conversations(updated_at DESC);

-- Indexes for pam_messages
CREATE INDEX idx_pam_messages_conversation_id ON public.pam_messages(conversation_id);
CREATE INDEX idx_pam_messages_role ON public.pam_messages(role);
CREATE INDEX idx_pam_messages_created_at ON public.pam_messages(created_at DESC);
CREATE INDEX idx_pam_messages_conv_created ON public.pam_messages(conversation_id, created_at DESC);

-- Indexes for pam_user_context
CREATE INDEX idx_pam_context_user_type ON public.pam_user_context(user_id, context_type);
CREATE INDEX idx_pam_context_updated ON public.pam_user_context(last_updated DESC);

-- Indexes for pam_conversation_memory
CREATE INDEX idx_pam_memory_user_session ON public.pam_conversation_memory(user_id, session_id);
CREATE INDEX idx_pam_memory_created_at ON public.pam_conversation_memory(created_at DESC);
CREATE INDEX idx_pam_memory_expires_at ON public.pam_conversation_memory(expires_at);

-- Indexes for pam_feedback
CREATE INDEX idx_pam_feedback_user_id ON public.pam_feedback(user_id);
CREATE INDEX idx_pam_feedback_message_id ON public.pam_feedback(message_id);
CREATE INDEX idx_pam_feedback_created_at ON public.pam_feedback(created_at DESC);

-- Indexes for pam_analytics
CREATE INDEX idx_pam_analytics_user_id ON public.pam_analytics(user_id);
CREATE INDEX idx_pam_analytics_event_type ON public.pam_analytics(event_type);
CREATE INDEX idx_pam_analytics_created_at ON public.pam_analytics(created_at DESC);
CREATE INDEX idx_pam_analytics_success ON public.pam_analytics(success);

-- Indexes for pam_recommendations
CREATE INDEX idx_pam_recommendations_user_id ON public.pam_recommendations(user_id);
CREATE INDEX idx_pam_recommendations_category ON public.pam_recommendations(category);
CREATE INDEX idx_pam_recommendations_created_at ON public.pam_recommendations(created_at);
CREATE INDEX idx_pam_recommendations_expires_at ON public.pam_recommendations(expires_at) WHERE expires_at IS NOT NULL;

-- Indexes for pam_savings_events
CREATE INDEX idx_pam_savings_events_user_id ON public.pam_savings_events(user_id);
CREATE INDEX idx_pam_savings_events_recommendation_id ON public.pam_savings_events(recommendation_id);
CREATE INDEX idx_pam_savings_events_saved_date ON public.pam_savings_events(saved_date);
CREATE INDEX idx_pam_savings_events_category ON public.pam_savings_events(category);

-- Indexes for pam_monthly_savings_summary
CREATE INDEX idx_pam_monthly_summary_user_id ON public.pam_monthly_savings_summary(user_id);
CREATE INDEX idx_pam_monthly_summary_period ON public.pam_monthly_savings_summary(billing_period_start, billing_period_end);

-- Indexes for pam_savings_guarantee_evaluations
CREATE INDEX idx_pam_guarantee_evaluations_user_id ON public.pam_savings_guarantee_evaluations(user_id);
CREATE INDEX idx_pam_guarantee_evaluations_period ON public.pam_savings_guarantee_evaluations(evaluation_period_start, evaluation_period_end);
CREATE INDEX idx_pam_guarantee_evaluations_status ON public.pam_savings_guarantee_evaluations(guarantee_status);

-- =====================================================
-- 14. CREATE UTILITY FUNCTIONS
-- =====================================================

-- Function to get or create PAM conversation
CREATE OR REPLACE FUNCTION public.get_or_create_pam_conversation(
    p_user_id UUID,
    p_session_id TEXT DEFAULT NULL,
    p_context JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    conversation_id UUID;
BEGIN
    -- Try to get existing conversation for user
    SELECT id INTO conversation_id
    FROM public.pam_conversations
    WHERE user_id = p_user_id;
    
    -- If no conversation exists, create one
    IF conversation_id IS NULL THEN
        INSERT INTO public.pam_conversations (
            user_id,
            session_id,
            context_data,
            title
        ) VALUES (
            p_user_id,
            p_session_id,
            p_context,
            'PAM Conversation'
        )
        RETURNING id INTO conversation_id;
    ELSE
        -- Update existing conversation with latest session info
        UPDATE public.pam_conversations
        SET 
            session_id = COALESCE(p_session_id, session_id),
            context_data = COALESCE(p_context, context_data),
            updated_at = NOW()
        WHERE id = conversation_id;
    END IF;
    
    RETURN conversation_id;
END;
$$;

-- Function to store PAM messages
CREATE OR REPLACE FUNCTION public.store_pam_message(
    p_conversation_id UUID,
    p_role TEXT,
    p_content TEXT,
    p_intent TEXT DEFAULT NULL,
    p_confidence DECIMAL DEFAULT NULL,
    p_entities JSONB DEFAULT '{}'::jsonb,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    message_id UUID;
BEGIN
    -- Insert the message
    INSERT INTO public.pam_messages (
        conversation_id,
        role,
        content,
        intent,
        confidence,
        entities,
        metadata
    ) VALUES (
        p_conversation_id,
        p_role,
        p_content,
        p_intent,
        p_confidence,
        p_entities,
        p_metadata
    )
    RETURNING id INTO message_id;
    
    -- Update conversation timestamp
    UPDATE public.pam_conversations
    SET updated_at = NOW()
    WHERE id = p_conversation_id;
    
    RETURN message_id;
END;
$$;

-- Function to clean up expired PAM conversation memory
CREATE OR REPLACE FUNCTION public.cleanup_expired_pam_memory()
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

-- Function to get conversation history
CREATE OR REPLACE FUNCTION public.get_conversation_history(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
    role TEXT,
    content TEXT,
    intent TEXT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pm.role,
        pm.content,
        pm.intent,
        pm.created_at
    FROM public.pam_messages pm
    JOIN public.pam_conversations pc ON pc.id = pm.conversation_id
    WHERE pc.user_id = p_user_id
    ORDER BY pm.created_at DESC
    LIMIT p_limit;
END;
$$;

-- Function to get user preferences
CREATE OR REPLACE FUNCTION public.get_user_preferences(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    preferences JSONB := '{}'::jsonb;
BEGIN
    -- Get preferences from pam_user_context table
    SELECT COALESCE(
        jsonb_object_agg(context_type, context_value),
        '{}'::jsonb
    ) INTO preferences
    FROM public.pam_user_context
    WHERE user_id = p_user_id;
    
    -- If no preferences found, return default structure
    IF preferences = '{}'::jsonb THEN
        preferences := '{
            "travel_style": "balanced",
            "vehicle_info": {},
            "notifications": {},
            "privacy": {},
            "display": {},
            "integrations": {},
            "travel_preferences": {}
        }'::jsonb;
    END IF;
    
    RETURN preferences;
EXCEPTION
    WHEN OTHERS THEN
        -- Return default preferences on any error
        RETURN '{
            "travel_style": "balanced",
            "vehicle_info": {},
            "notifications": {},
            "privacy": {},
            "display": {},
            "integrations": {},
            "travel_preferences": {}
        }'::jsonb;
END;
$$;

-- Function to store user context
CREATE OR REPLACE FUNCTION public.store_user_context(
    p_user_id UUID,
    p_context_type TEXT,
    p_key TEXT,
    p_value TEXT,
    p_confidence DECIMAL DEFAULT 1.0,
    p_source TEXT DEFAULT 'conversation'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
    -- Insert or update the context
    INSERT INTO public.pam_user_context (
        user_id,
        context_type,
        context_key,
        context_value,
        confidence,
        source
    ) VALUES (
        p_user_id,
        p_context_type,
        p_key,
        p_value,
        p_confidence,
        p_source
    )
    ON CONFLICT (user_id, context_type, context_key)
    DO UPDATE SET
        context_value = EXCLUDED.context_value,
        confidence = EXCLUDED.confidence,
        source = EXCLUDED.source,
        last_updated = NOW();
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- =====================================================
-- 15. CREATE TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Triggers for updated_at columns
CREATE TRIGGER update_pam_conversations_updated_at
    BEFORE UPDATE ON public.pam_conversations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pam_recommendations_updated_at 
    BEFORE UPDATE ON public.pam_recommendations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pam_savings_events_updated_at 
    BEFORE UPDATE ON public.pam_savings_events
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pam_monthly_savings_summary_updated_at 
    BEFORE UPDATE ON public.pam_monthly_savings_summary
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pam_savings_guarantee_evaluations_updated_at 
    BEFORE UPDATE ON public.pam_savings_guarantee_evaluations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 16. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.get_or_create_pam_conversation(UUID, TEXT, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.store_pam_message(UUID, TEXT, TEXT, TEXT, DECIMAL, JSONB, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_conversation_history(UUID, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_preferences(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.store_user_context(UUID, TEXT, TEXT, TEXT, DECIMAL, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_pam_memory() TO service_role;

-- Grant usage on sequences
GRANT USAGE ON SEQUENCE public.pam_savings_events_id_seq TO authenticated, service_role;
GRANT USAGE ON SEQUENCE public.pam_monthly_savings_summary_id_seq TO authenticated, service_role;
GRANT USAGE ON SEQUENCE public.pam_savings_guarantee_evaluations_id_seq TO authenticated, service_role;

-- =====================================================
-- 17. VERIFICATION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'PAM DATABASE SETUP COMPLETE';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Created Tables:';
    RAISE NOTICE '  ✅ pam_conversations';
    RAISE NOTICE '  ✅ pam_messages';
    RAISE NOTICE '  ✅ pam_user_context';
    RAISE NOTICE '  ✅ pam_conversation_memory';
    RAISE NOTICE '  ✅ pam_feedback';
    RAISE NOTICE '  ✅ pam_analytics';
    RAISE NOTICE '  ✅ pam_recommendations';
    RAISE NOTICE '  ✅ pam_savings_events';
    RAISE NOTICE '  ✅ pam_monthly_savings_summary';
    RAISE NOTICE '  ✅ pam_savings_guarantee_evaluations';
    RAISE NOTICE '';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  ✅ Non-recursive RLS policies';
    RAISE NOTICE '  ✅ Service role access for backend';
    RAISE NOTICE '  ✅ Performance indexes';
    RAISE NOTICE '  ✅ Utility functions';
    RAISE NOTICE '  ✅ Automatic updated_at triggers';
    RAISE NOTICE '';
    RAISE NOTICE 'Next: Run verify_pam_tables.sql to confirm setup';
    RAISE NOTICE '==============================================';
END $$;