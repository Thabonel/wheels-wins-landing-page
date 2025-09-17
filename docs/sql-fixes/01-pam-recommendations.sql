CREATE TABLE IF NOT EXISTS public.pam_recommendations (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    recommendation_type TEXT DEFAULT 'general',
    predicted_savings DECIMAL(10,2),
    savings_confidence DECIMAL(3,2) DEFAULT 0.70,
    priority_level TEXT DEFAULT 'medium',
    is_applied BOOLEAN DEFAULT false,
    applied_date TIMESTAMPTZ,
    tracking_enabled BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pam_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recommendations" ON pam_recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recommendations" ON pam_recommendations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recommendations" ON pam_recommendations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recommendations" ON pam_recommendations FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_pam_recommendations_user ON pam_recommendations(user_id);