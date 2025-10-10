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

CREATE INDEX idx_pam_savings_events_user_id ON public.pam_savings_events(user_id);
CREATE INDEX idx_pam_savings_events_saved_date ON public.pam_savings_events(saved_date DESC);
CREATE INDEX idx_pam_savings_events_category ON public.pam_savings_events(category);
CREATE INDEX idx_pam_savings_events_user_date ON public.pam_savings_events(user_id, saved_date DESC);

ALTER TABLE public.pam_savings_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY pam_savings_events_select_own ON public.pam_savings_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY pam_savings_events_insert_own ON public.pam_savings_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY pam_savings_events_update_own ON public.pam_savings_events
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY pam_savings_events_delete_own ON public.pam_savings_events
    FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_pam_savings_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pam_savings_events_updated_at
    BEFORE UPDATE ON public.pam_savings_events
    FOR EACH ROW
    EXECUTE FUNCTION update_pam_savings_events_updated_at();
