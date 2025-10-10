CREATE TABLE IF NOT EXISTS public.pam_knowledge_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_id UUID NOT NULL REFERENCES public.pam_admin_knowledge(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_context TEXT,
    used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pam_knowledge_usage_log_knowledge_id ON public.pam_knowledge_usage_log(knowledge_id);
CREATE INDEX idx_pam_knowledge_usage_log_user_id ON public.pam_knowledge_usage_log(user_id);
CREATE INDEX idx_pam_knowledge_usage_log_used_at ON public.pam_knowledge_usage_log(used_at DESC);
CREATE INDEX idx_pam_knowledge_usage_log_knowledge_user ON public.pam_knowledge_usage_log(knowledge_id, user_id);

ALTER TABLE public.pam_knowledge_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY pam_knowledge_usage_log_select_own ON public.pam_knowledge_usage_log
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY pam_knowledge_usage_log_insert_own ON public.pam_knowledge_usage_log
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY pam_knowledge_usage_log_select_admin ON public.pam_knowledge_usage_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE TRIGGER trigger_increment_knowledge_usage_count
    AFTER INSERT ON public.pam_knowledge_usage_log
    FOR EACH ROW
    EXECUTE FUNCTION increment_knowledge_usage_count();
