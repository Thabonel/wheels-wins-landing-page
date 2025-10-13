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

CREATE INDEX idx_pam_admin_knowledge_admin_user_id ON public.pam_admin_knowledge(admin_user_id);
CREATE INDEX idx_pam_admin_knowledge_category ON public.pam_admin_knowledge(category);
CREATE INDEX idx_pam_admin_knowledge_knowledge_type ON public.pam_admin_knowledge(knowledge_type);
CREATE INDEX idx_pam_admin_knowledge_priority ON public.pam_admin_knowledge(priority DESC);
CREATE INDEX idx_pam_admin_knowledge_is_active ON public.pam_admin_knowledge(is_active);
CREATE INDEX idx_pam_admin_knowledge_location_context ON public.pam_admin_knowledge(location_context);
CREATE INDEX idx_pam_admin_knowledge_tags ON public.pam_admin_knowledge USING GIN(tags);
CREATE INDEX idx_pam_admin_knowledge_title_trgm ON public.pam_admin_knowledge USING GIN(title gin_trgm_ops);
CREATE INDEX idx_pam_admin_knowledge_content_trgm ON public.pam_admin_knowledge USING GIN(content gin_trgm_ops);

ALTER TABLE public.pam_admin_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY pam_admin_knowledge_select_all ON public.pam_admin_knowledge
    FOR SELECT USING (TRUE);

CREATE POLICY pam_admin_knowledge_insert_admin ON public.pam_admin_knowledge
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY pam_admin_knowledge_update_admin ON public.pam_admin_knowledge
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY pam_admin_knowledge_delete_admin ON public.pam_admin_knowledge
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
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
