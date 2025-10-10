-- PAM Database Fix - Missing Tables Migration (CORRECTED)
-- Fixed: Use profiles.user_id instead of profiles.id for RLS policies
-- profiles.id is bigint, profiles.user_id is uuid (matches auth.uid())

-- ==============================================================================
-- ENABLE REQUIRED EXTENSIONS
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ==============================================================================
-- TABLE 1: pam_admin_knowledge (MUST BE FIRST - has FK dependency)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.pam_admin_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(title) <= 200),
    content TEXT NOT NULL CHECK (char_length(content) <= 5000),
    knowledge_type TEXT NOT NULL CHECK (knowledge_type IN ('location_tip', 'travel_rule', 'seasonal_advice', 'general_knowledge', 'policy', 'warning')),
    category TEXT NOT NULL CHECK (category IN ('travel', 'budget', 'social', 'shop', 'general')),
    priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    location_context TEXT,
    date_context TEXT,
    tags TEXT[] DEFAULT '{}',
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pam_admin_knowledge_admin_user_id ON public.pam_admin_knowledge(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_pam_admin_knowledge_category ON public.pam_admin_knowledge(category);
CREATE INDEX IF NOT EXISTS idx_pam_admin_knowledge_knowledge_type ON public.pam_admin_knowledge(knowledge_type);
CREATE INDEX IF NOT EXISTS idx_pam_admin_knowledge_priority ON public.pam_admin_knowledge(priority DESC);
CREATE INDEX IF NOT EXISTS idx_pam_admin_knowledge_is_active ON public.pam_admin_knowledge(is_active);
CREATE INDEX IF NOT EXISTS idx_pam_admin_knowledge_location_context ON public.pam_admin_knowledge(location_context);
CREATE INDEX IF NOT EXISTS idx_pam_admin_knowledge_tags ON public.pam_admin_knowledge USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_pam_admin_knowledge_title_trgm ON public.pam_admin_knowledge USING GIN(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_pam_admin_knowledge_content_trgm ON public.pam_admin_knowledge USING GIN(content gin_trgm_ops);

ALTER TABLE public.pam_admin_knowledge ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pam_admin_knowledge_select_all ON public.pam_admin_knowledge;
CREATE POLICY pam_admin_knowledge_select_all ON public.pam_admin_knowledge
    FOR SELECT USING (TRUE);

-- CORRECTED: Use profiles.user_id (uuid) instead of profiles.id (bigint)
DROP POLICY IF EXISTS pam_admin_knowledge_insert_admin ON public.pam_admin_knowledge;
CREATE POLICY pam_admin_knowledge_insert_admin ON public.pam_admin_knowledge
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

DROP POLICY IF EXISTS pam_admin_knowledge_update_admin ON public.pam_admin_knowledge;
CREATE POLICY pam_admin_knowledge_update_admin ON public.pam_admin_knowledge
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

DROP POLICY IF EXISTS pam_admin_knowledge_delete_admin ON public.pam_admin_knowledge;
CREATE POLICY pam_admin_knowledge_delete_admin ON public.pam_admin_knowledge
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE OR REPLACE FUNCTION update_pam_admin_knowledge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_pam_admin_knowledge_updated_at ON public.pam_admin_knowledge;
CREATE TRIGGER trigger_update_pam_admin_knowledge_updated_at
    BEFORE UPDATE ON public.pam_admin_knowledge
    FOR EACH ROW
    EXECUTE FUNCTION update_pam_admin_knowledge_updated_at();

CREATE OR REPLACE FUNCTION increment_knowledge_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.pam_admin_knowledge
    SET usage_count = usage_count + 1
    WHERE id = NEW.knowledge_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- TABLE 2: pam_knowledge_usage_log (depends on pam_admin_knowledge)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.pam_knowledge_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_id UUID NOT NULL REFERENCES public.pam_admin_knowledge(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_context TEXT,
    used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pam_knowledge_usage_log_knowledge_id ON public.pam_knowledge_usage_log(knowledge_id);
CREATE INDEX IF NOT EXISTS idx_pam_knowledge_usage_log_user_id ON public.pam_knowledge_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_pam_knowledge_usage_log_used_at ON public.pam_knowledge_usage_log(used_at DESC);
CREATE INDEX IF NOT EXISTS idx_pam_knowledge_usage_log_knowledge_user ON public.pam_knowledge_usage_log(knowledge_id, user_id);

ALTER TABLE public.pam_knowledge_usage_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pam_knowledge_usage_log_select_own ON public.pam_knowledge_usage_log;
CREATE POLICY pam_knowledge_usage_log_select_own ON public.pam_knowledge_usage_log
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS pam_knowledge_usage_log_insert_own ON public.pam_knowledge_usage_log;
CREATE POLICY pam_knowledge_usage_log_insert_own ON public.pam_knowledge_usage_log
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- CORRECTED: Use profiles.user_id instead of profiles.id
DROP POLICY IF EXISTS pam_knowledge_usage_log_select_admin ON public.pam_knowledge_usage_log;
CREATE POLICY pam_knowledge_usage_log_select_admin ON public.pam_knowledge_usage_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

DROP TRIGGER IF EXISTS trigger_increment_knowledge_usage_count ON public.pam_knowledge_usage_log;
CREATE TRIGGER trigger_increment_knowledge_usage_count
    AFTER INSERT ON public.pam_knowledge_usage_log
    FOR EACH ROW
    EXECUTE FUNCTION increment_knowledge_usage_count();

-- ==============================================================================
-- TABLE 3: pam_savings_events (independent)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.pam_savings_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    savings_type TEXT NOT NULL CHECK (savings_type IN ('fuel_optimization', 'camping_alternative', 'route_optimization', 'price_comparison')),
    predicted_savings DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    actual_savings DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    baseline_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    optimized_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    savings_description TEXT,
    verification_method TEXT NOT NULL DEFAULT 'user_confirmation',
    category TEXT NOT NULL,
    saved_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pam_savings_events_user_id ON public.pam_savings_events(user_id);
CREATE INDEX IF NOT EXISTS idx_pam_savings_events_saved_date ON public.pam_savings_events(saved_date DESC);
CREATE INDEX IF NOT EXISTS idx_pam_savings_events_category ON public.pam_savings_events(category);
CREATE INDEX IF NOT EXISTS idx_pam_savings_events_user_date ON public.pam_savings_events(user_id, saved_date DESC);

ALTER TABLE public.pam_savings_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pam_savings_events_select_own ON public.pam_savings_events;
CREATE POLICY pam_savings_events_select_own ON public.pam_savings_events
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS pam_savings_events_insert_own ON public.pam_savings_events;
CREATE POLICY pam_savings_events_insert_own ON public.pam_savings_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS pam_savings_events_update_own ON public.pam_savings_events;
CREATE POLICY pam_savings_events_update_own ON public.pam_savings_events
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS pam_savings_events_delete_own ON public.pam_savings_events;
CREATE POLICY pam_savings_events_delete_own ON public.pam_savings_events
    FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_pam_savings_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_pam_savings_events_updated_at ON public.pam_savings_events;
CREATE TRIGGER trigger_update_pam_savings_events_updated_at
    BEFORE UPDATE ON public.pam_savings_events
    FOR EACH ROW
    EXECUTE FUNCTION update_pam_savings_events_updated_at();

-- ==============================================================================
-- NOTE: calendar_events table already exists - SKIPPING
-- ==============================================================================

-- The calendar_events table already exists in your database
-- To avoid conflicts, we're skipping its creation
-- If you need to modify it, create a separate migration

-- ==============================================================================
-- VERIFICATION QUERIES
-- ==============================================================================

-- Verify 3 new tables were created (calendar_events already exists)
SELECT 'pam_admin_knowledge' as table_name, COUNT(*) as row_count FROM public.pam_admin_knowledge
UNION ALL
SELECT 'pam_knowledge_usage_log', COUNT(*) FROM public.pam_knowledge_usage_log
UNION ALL
SELECT 'pam_savings_events', COUNT(*) FROM public.pam_savings_events;
