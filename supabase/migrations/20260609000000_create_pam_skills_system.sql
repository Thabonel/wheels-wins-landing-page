CREATE TABLE pam_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    trigger_phrases TEXT[] NOT NULL DEFAULT '{}',
    required_context TEXT[] DEFAULT '{}',
    allowed_actions TEXT[] DEFAULT '{}',
    output_format TEXT NOT NULL DEFAULT 'markdown',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pam_skills_category ON pam_skills(category);
CREATE INDEX idx_pam_skills_active ON pam_skills(is_active);

ALTER TABLE pam_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY pam_skills_select ON pam_skills
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY pam_skills_service_role ON pam_skills
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

INSERT INTO pam_skills (name, description, category, trigger_phrases, required_context, allowed_actions, output_format) VALUES
('Trip Planning', 'Plan a trip with route, stops, fuel stops, camping suggestions, and estimated costs', 'trip', 
 ARRAY['plan a trip', 'plan my trip', 'road trip', 'travel plan', 'where should I go', 'trip route', 'trip suggestion', 'route plan'],
 ARRAY['region', 'vehicle_type', 'travel_style'],
 ARRAY['query_trips', 'search_campgrounds', 'calculate_fuel_cost', 'suggest_stops'],
 'markdown'),

('Budget Review', 'Review your current budget, spending patterns, and suggest savings', 'finance',
 ARRAY['budget review', 'check my budget', 'spending review', 'am I on budget', 'budget summary', 'how is my spending', 'track my budget'],
 ARRAY['budget_goals', 'regular_expenses'],
 ARRAY['query_budgets', 'query_expenses', 'analyze_spending', 'suggest_savings'],
 'markdown'),

('Fuel Cost Estimate', 'Estimate fuel costs for a trip based on distance, vehicle type, and current fuel prices', 'fuel',
 ARRAY['fuel cost', 'gas estimate', 'petrol cost', 'how much fuel', 'diesel cost', 'fuel price', 'fuel estimate', 'gas price'],
 ARRAY['vehicle_type', 'fuel_preference'],
 ARRAY['query_fuel_log', 'calculate_fuel_cost', 'estimate_distance'],
 'markdown'),

('Vehicle Reminder', 'Check upcoming vehicle maintenance and registration reminders', 'vehicle',
 ARRAY['maintenance reminder', 'service due', 'rego due', 'vehicle check', 'car service', 'oil change', 'tire check', 'vehicle reminder'],
 ARRAY['vehicle_type'],
 ARRAY['query_maintenance', 'check_rego', 'suggest_service_interval'],
 'markdown'),

('Weekly Travel Summary', 'Generate a summary of your travel activity, expenses, and fuel usage for the past week', 'summary',
 ARRAY['weekly summary', 'week summary', 'travel summary', 'weekly report', 'what happened this week', 'weekly review'],
 ARRAY['region'],
 ARRAY['query_trips', 'query_expenses', 'query_fuel_log', 'summarize_week'],
 'markdown'),

('Money-Making Suggestions', 'Suggest ways to earn money while travelling based on your skills and interests', 'finance',
 ARRAY['make money', 'earn money', 'side hustle', 'extra income', 'how can I earn', 'money making', 'income ideas'],
 ARRAY['income_interests', 'region'],
 ARRAY['suggest_income_opportunities', 'search_local_jobs'],
 'markdown'),

('Safety Checklist', 'Provide safety tips and checklist for your current or upcoming trip', 'safety',
 ARRAY['safety check', 'safety checklist', 'am I safe', 'safety tips', 'travel safety', 'road safety', 'emergency prep'],
 ARRAY['region', 'trip_planning_preferences', 'accessibility_needs'],
 ARRAY['check_weather', 'suggest_safety_tips', 'query_emergency_info'],
 'markdown'),

('Shop/Resources Suggestion', 'Suggest nearby shops, camping supplies, or resources for your current location', 'resources',
 ARRAY['nearby shop', 'where to buy', 'camping supplies', 'resources nearby', 'shop nearby', 'find supplies', 'what stores'],
 ARRAY['region', 'preferred_camping_style'],
 ARRAY['search_nearby_shops', 'suggest_camping_gear', 'query_affiliate_products'],
 'markdown');

COMMENT ON TABLE pam_skills IS 'Controlled skill definitions for PAM. Skills are reusable workflows, not executable code.';
COMMENT ON COLUMN pam_skills.trigger_phrases IS 'Phrases that indicate a user wants this skill';
COMMENT ON COLUMN pam_skills.required_context IS 'Context fields needed before this skill can be used effectively';
COMMENT ON COLUMN pam_skills.allowed_actions IS 'Approved actions this skill can perform - strictly limited';


CREATE TABLE pam_skill_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES pam_skills(id) ON DELETE CASCADE,
    input_summary TEXT,
    output_summary TEXT,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pam_skill_usage_user ON pam_skill_usage_logs(user_id);
CREATE INDEX idx_pam_skill_usage_skill ON pam_skill_usage_logs(skill_id);
CREATE INDEX idx_pam_skill_usage_created ON pam_skill_usage_logs(created_at DESC);

ALTER TABLE pam_skill_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY pam_skill_usage_select ON pam_skill_usage_logs
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY pam_skill_usage_insert ON pam_skill_usage_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY pam_skill_usage_service_role ON pam_skill_usage_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE pam_skill_usage_logs IS 'Tracks which PAM skills users invoke for analytics and improvement';
COMMENT ON COLUMN pam_skill_usage_logs.input_summary IS 'Brief summary of what the user asked for';
COMMENT ON COLUMN pam_skill_usage_logs.output_summary IS 'Brief summary of what PAM responded with';


CREATE TABLE pam_automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    schedule_type TEXT NOT NULL,
    schedule_value TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    skill_id UUID REFERENCES pam_skills(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active',
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT pam_automations_status_check CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    CONSTRAINT pam_automations_schedule_check CHECK (schedule_type IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'one_time'))
);

CREATE INDEX idx_pam_automations_user ON pam_automations(user_id);
CREATE INDEX idx_pam_automations_status ON pam_automations(status);
CREATE INDEX idx_pam_automations_next_run ON pam_automations(next_run_at);
CREATE INDEX idx_pam_automations_skill ON pam_automations(skill_id);

ALTER TABLE pam_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY pam_automations_select ON pam_automations
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY pam_automations_insert ON pam_automations
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY pam_automations_update ON pam_automations
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY pam_automations_delete ON pam_automations
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY pam_automations_service_role ON pam_automations
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE pam_automations IS 'Scheduled PAM automations. Backend-ready but currently UI-only - cron execution not yet implemented.';
COMMENT ON COLUMN pam_automations.schedule_type IS 'Frequency: daily, weekly, biweekly, monthly, quarterly, yearly, one_time';
COMMENT ON COLUMN pam_automations.schedule_value IS 'Value depends on schedule_type: day-of-week for weekly, day-of-month for monthly, etc.';


CREATE TABLE pam_memory_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    preference_key TEXT NOT NULL,
    preference_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    confidence DECIMAL(3,2) NOT NULL DEFAULT 0.50,
    source TEXT NOT NULL DEFAULT 'system',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT pam_memory_preferences_category_check CHECK (category IN (
        'region', 'vehicle_type', 'travel_style', 'fuel_preference', 
        'budget_goals', 'regular_expenses', 'preferred_camping_style',
        'accessibility_needs', 'trip_planning_preferences', 'income_interests',
        'communication_preferences', 'conversation_summary', 'task_reminder',
        'skill_usage_history'
    )),
    CONSTRAINT pam_memory_preferences_source_check CHECK (source IN ('explicit', 'inferred', 'system', 'user')),
    UNIQUE(user_id, category, preference_key)
);

CREATE INDEX idx_pam_memory_pref_user ON pam_memory_preferences(user_id);
CREATE INDEX idx_pam_memory_pref_category ON pam_memory_preferences(category);

ALTER TABLE pam_memory_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY pam_memory_preferences_select ON pam_memory_preferences
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY pam_memory_preferences_insert ON pam_memory_preferences
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY pam_memory_preferences_update ON pam_memory_preferences
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY pam_memory_preferences_delete ON pam_memory_preferences
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY pam_memory_preferences_service_role ON pam_memory_preferences
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE pam_memory_preferences IS 'Structured long-term preferences for PAM memory. Distinguishes profile, preference, conversation, task, and skill usage memory types.';
COMMENT ON COLUMN pam_memory_preferences.confidence IS '0.00 to 1.00 - how confident PAM is that this preference is correct';
COMMENT ON COLUMN pam_memory_preferences.source IS 'explicit (user stated), inferred (learned), system (default), user (set in settings)';
