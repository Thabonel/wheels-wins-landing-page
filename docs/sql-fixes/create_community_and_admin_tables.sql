CREATE TABLE IF NOT EXISTS community_tips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('camping', 'gas_savings', 'route_planning', 'maintenance', 'cooking', 'safety', 'tech', 'gear', 'weather', 'other')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'flagged')),
    location_name TEXT,
    location_lat DECIMAL(10,8),
    location_lng DECIMAL(11,8),
    tags TEXT[],
    use_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_community_tips_user_id ON community_tips(user_id);
CREATE INDEX IF NOT EXISTS idx_community_tips_category ON community_tips(category);
CREATE INDEX IF NOT EXISTS idx_community_tips_status ON community_tips(status);
CREATE INDEX IF NOT EXISTS idx_community_tips_created_at ON community_tips(created_at DESC);

ALTER TABLE community_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view active tips" ON community_tips
    FOR SELECT USING (status = 'active');

CREATE POLICY "Users can create own tips" ON community_tips
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tips" ON community_tips
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tips" ON community_tips
    FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS pam_admin_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES auth.users(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    knowledge_type TEXT NOT NULL CHECK (knowledge_type IN ('location_tip', 'travel_rule', 'seasonal_advice', 'general_knowledge', 'policy', 'warning')),
    category TEXT NOT NULL CHECK (category IN ('travel', 'budget', 'social', 'shop', 'general')),
    location_context TEXT,
    date_context TEXT,
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    tags TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pam_admin_knowledge_category ON pam_admin_knowledge(category);
CREATE INDEX IF NOT EXISTS idx_pam_admin_knowledge_knowledge_type ON pam_admin_knowledge(knowledge_type);
CREATE INDEX IF NOT EXISTS idx_pam_admin_knowledge_priority ON pam_admin_knowledge(priority DESC);
CREATE INDEX IF NOT EXISTS idx_pam_admin_knowledge_is_active ON pam_admin_knowledge(is_active);
CREATE INDEX IF NOT EXISTS idx_pam_admin_knowledge_tags ON pam_admin_knowledge USING GIN(tags);

ALTER TABLE pam_admin_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all knowledge" ON pam_admin_knowledge
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Active knowledge is viewable by all" ON pam_admin_knowledge
    FOR SELECT USING (is_active = TRUE);

CREATE TABLE IF NOT EXISTS pam_knowledge_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_id UUID NOT NULL REFERENCES pam_admin_knowledge(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_context TEXT,
    used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pam_knowledge_usage_log_knowledge_id ON pam_knowledge_usage_log(knowledge_id);
CREATE INDEX IF NOT EXISTS idx_pam_knowledge_usage_log_user_id ON pam_knowledge_usage_log(user_id);

ALTER TABLE pam_knowledge_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage logs" ON pam_knowledge_usage_log
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create usage logs" ON pam_knowledge_usage_log
    FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS tip_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tip_id UUID NOT NULL REFERENCES community_tips(id) ON DELETE CASCADE,
    contributor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    beneficiary_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_id UUID,
    pam_response TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tip_usage_log_tip_id ON tip_usage_log(tip_id);
CREATE INDEX IF NOT EXISTS idx_tip_usage_log_contributor_id ON tip_usage_log(contributor_id);
CREATE INDEX IF NOT EXISTS idx_tip_usage_log_beneficiary_id ON tip_usage_log(beneficiary_id);

ALTER TABLE tip_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tip usage" ON tip_usage_log
    FOR SELECT USING (auth.uid() = contributor_id OR auth.uid() = beneficiary_id);

CREATE POLICY "System can create tip usage logs" ON tip_usage_log
    FOR INSERT WITH CHECK (true);
