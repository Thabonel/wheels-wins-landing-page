-- =========================================================================
-- CREATE MISSING TABLES - FINAL CORRECTED VERSION
-- =========================================================================
-- Date: January 17, 2025
-- Purpose: Create missing tables with correct data types and RLS policies
-- Execute this in Supabase SQL Editor
--
-- KEY INSIGHT: profiles.id is BIGINT, but we reference auth via user_id (UUID)
-- =========================================================================

-- 1. USER_SETTINGS TABLE (CRITICAL - Used in userSettingsService.ts)
CREATE TABLE IF NOT EXISTS public.user_settings (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_preferences JSONB DEFAULT '{"email": true, "push": true, "sms": false}'::jsonb,
    privacy_preferences JSONB DEFAULT '{"profile_visibility": "public", "location_sharing": false}'::jsonb,
    display_preferences JSONB DEFAULT '{"theme": "light", "language": "en"}'::jsonb,
    pam_preferences JSONB DEFAULT '{"voice_enabled": true, "auto_suggestions": true}'::jsonb,
    budget_settings JSONB DEFAULT '{"weeklyBudget": 300, "monthlyBudget": 1200, "yearlyBudget": 14400}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 2. PAM_SAVINGS_EVENTS TABLE (CRITICAL - Used in pamSavingsService.ts)
CREATE TABLE IF NOT EXISTS public.pam_savings_events (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('goal_set', 'savings_achieved', 'milestone_reached', 'recommendation_followed')),
    amount NUMERIC CHECK (amount >= 0),
    description TEXT,
    category TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PAM_RECOMMENDATIONS TABLE (HIGH - Used in pamSavingsService.ts)
CREATE TABLE IF NOT EXISTS public.pam_recommendations (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('savings', 'budget', 'expense', 'trip', 'investment')),
    title TEXT NOT NULL,
    description TEXT,
    recommended_action TEXT,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    estimated_savings NUMERIC CHECK (estimated_savings >= 0),
    is_active BOOLEAN DEFAULT true,
    is_dismissed BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. MONTHLY_SAVINGS_SUMMARY TABLE (HIGH - Used in pamSavingsService.ts)
CREATE TABLE IF NOT EXISTS public.monthly_savings_summary (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month DATE NOT NULL,
    total_income NUMERIC DEFAULT 0 CHECK (total_income >= 0),
    total_expenses NUMERIC DEFAULT 0 CHECK (total_expenses >= 0),
    total_savings NUMERIC DEFAULT 0,
    savings_goal NUMERIC DEFAULT 0 CHECK (savings_goal >= 0),
    budget_adherence NUMERIC DEFAULT 0 CHECK (budget_adherence >= 0 AND budget_adherence <= 100),
    top_expense_category TEXT,
    savings_rate NUMERIC DEFAULT 0 CHECK (savings_rate >= 0 AND savings_rate <= 100),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, month)
);

-- 5. ANONYMIZED_TRANSACTIONS TABLE (MEDIUM - Used in pamSavingsService.ts)
CREATE TABLE IF NOT EXISTS public.anonymized_transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    category TEXT,
    transaction_type TEXT DEFAULT 'expense' CHECK (transaction_type IN ('income', 'expense', 'transfer')),
    date DATE NOT NULL,
    hash TEXT NOT NULL, -- For privacy/anonymization
    is_recurring BOOLEAN DEFAULT false,
    merchant_category TEXT,
    location TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, hash)
);

-- 6. TRANSACTION_CATEGORIES TABLE (MEDIUM - Used in pamSavingsService.ts)
CREATE TABLE IF NOT EXISTS public.transaction_categories (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    color TEXT DEFAULT '#6366f1',
    icon TEXT DEFAULT 'folder',
    parent_category_id BIGINT REFERENCES transaction_categories(id),
    is_system BOOLEAN DEFAULT false,
    is_income_category BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    description TEXT,
    keywords TEXT[], -- For auto-categorization
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. USER_KNOWLEDGE_DOCUMENTS TABLE (LOW - Used in Supabase functions)
CREATE TABLE IF NOT EXISTS public.user_knowledge_documents (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    document_type TEXT DEFAULT 'general' CHECK (document_type IN ('general', 'trip', 'financial', 'maintenance')),
    file_url TEXT,
    file_size INTEGER,
    mime_type TEXT,
    status TEXT DEFAULT 'processed' CHECK (status IN ('processing', 'processed', 'failed')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. USER_KNOWLEDGE_CHUNKS TABLE (LOW - Used in Supabase functions)
CREATE TABLE IF NOT EXISTS public.user_knowledge_chunks (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL REFERENCES user_knowledge_documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    token_count INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. USER_TWO_FACTOR_AUTH TABLE (LOW - Used in Supabase functions)
CREATE TABLE IF NOT EXISTS public.user_two_factor_auth (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    secret TEXT NOT NULL,
    backup_codes TEXT[],
    is_enabled BOOLEAN DEFAULT false,
    last_used TIMESTAMPTZ,
    recovery_codes_used INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- =========================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =========================================================================

-- User settings indexes
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- PAM savings events indexes
CREATE INDEX IF NOT EXISTS idx_pam_savings_events_user_id ON public.pam_savings_events(user_id);
CREATE INDEX IF NOT EXISTS idx_pam_savings_events_type ON public.pam_savings_events(event_type);
CREATE INDEX IF NOT EXISTS idx_pam_savings_events_date ON public.pam_savings_events(created_at DESC);

-- PAM recommendations indexes
CREATE INDEX IF NOT EXISTS idx_pam_recommendations_user_id ON public.pam_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_pam_recommendations_active ON public.pam_recommendations(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_pam_recommendations_type ON public.pam_recommendations(type);

-- Monthly savings summary indexes
CREATE INDEX IF NOT EXISTS idx_monthly_savings_user_month ON public.monthly_savings_summary(user_id, month DESC);

-- Anonymized transactions indexes
CREATE INDEX IF NOT EXISTS idx_anon_transactions_user_id ON public.anonymized_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_anon_transactions_date ON public.anonymized_transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_anon_transactions_category ON public.anonymized_transactions(category);

-- Transaction categories indexes
CREATE INDEX IF NOT EXISTS idx_transaction_categories_parent ON public.transaction_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_transaction_categories_system ON public.transaction_categories(is_system);

-- Knowledge documents indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_docs_user_id ON public.user_knowledge_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_docs_type ON public.user_knowledge_documents(document_type);

-- Knowledge chunks indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_doc_id ON public.user_knowledge_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_user_id ON public.user_knowledge_chunks(user_id);

-- Two factor auth indexes
CREATE INDEX IF NOT EXISTS idx_2fa_user_id ON public.user_two_factor_auth(user_id);

-- =========================================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- =========================================================================

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pam_savings_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pam_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_savings_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anonymized_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_two_factor_auth ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- CREATE RLS POLICIES (MATCHING EXISTING PATTERN)
-- =========================================================================

-- USER_SETTINGS POLICIES
DROP POLICY IF EXISTS "Users can manage own settings" ON public.user_settings;
CREATE POLICY "Users can manage own settings" ON public.user_settings
FOR ALL USING (auth.uid() = user_id);

-- PAM_SAVINGS_EVENTS POLICIES
DROP POLICY IF EXISTS "Users can manage own savings events" ON public.pam_savings_events;
CREATE POLICY "Users can manage own savings events" ON public.pam_savings_events
FOR ALL USING (auth.uid() = user_id);

-- PAM_RECOMMENDATIONS POLICIES
DROP POLICY IF EXISTS "Users can manage own recommendations" ON public.pam_recommendations;
CREATE POLICY "Users can manage own recommendations" ON public.pam_recommendations
FOR ALL USING (auth.uid() = user_id);

-- MONTHLY_SAVINGS_SUMMARY POLICIES
DROP POLICY IF EXISTS "Users can manage own savings summary" ON public.monthly_savings_summary;
CREATE POLICY "Users can manage own savings summary" ON public.monthly_savings_summary
FOR ALL USING (auth.uid() = user_id);

-- ANONYMIZED_TRANSACTIONS POLICIES
DROP POLICY IF EXISTS "Users can manage own transactions" ON public.anonymized_transactions;
CREATE POLICY "Users can manage own transactions" ON public.anonymized_transactions
FOR ALL USING (auth.uid() = user_id);

-- TRANSACTION_CATEGORIES POLICIES (PUBLIC READ, AUTHENTICATED WRITE)
DROP POLICY IF EXISTS "Anyone can read transaction categories" ON public.transaction_categories;
CREATE POLICY "Anyone can read transaction categories" ON public.transaction_categories
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage categories" ON public.transaction_categories;
CREATE POLICY "Authenticated users can manage categories" ON public.transaction_categories
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update non-system categories" ON public.transaction_categories;
CREATE POLICY "Users can update non-system categories" ON public.transaction_categories
FOR UPDATE USING (is_system = false OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users can delete non-system categories" ON public.transaction_categories;
CREATE POLICY "Users can delete non-system categories" ON public.transaction_categories
FOR DELETE USING (is_system = false OR auth.role() = 'service_role');

-- USER_KNOWLEDGE_DOCUMENTS POLICIES
DROP POLICY IF EXISTS "Users can manage own knowledge documents" ON public.user_knowledge_documents;
CREATE POLICY "Users can manage own knowledge documents" ON public.user_knowledge_documents
FOR ALL USING (auth.uid() = user_id);

-- USER_KNOWLEDGE_CHUNKS POLICIES
DROP POLICY IF EXISTS "Users can manage own knowledge chunks" ON public.user_knowledge_chunks;
CREATE POLICY "Users can manage own knowledge chunks" ON public.user_knowledge_chunks
FOR ALL USING (auth.uid() = user_id);

-- USER_TWO_FACTOR_AUTH POLICIES
DROP POLICY IF EXISTS "Users can manage own 2FA settings" ON public.user_two_factor_auth;
CREATE POLICY "Users can manage own 2FA settings" ON public.user_two_factor_auth
FOR ALL USING (auth.uid() = user_id);

-- =========================================================================
-- CREATE UPDATE TRIGGERS
-- =========================================================================

-- Create or replace the update function (if it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic updated_at timestamps
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pam_savings_events_updated_at ON public.pam_savings_events;
CREATE TRIGGER update_pam_savings_events_updated_at
BEFORE UPDATE ON public.pam_savings_events
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pam_recommendations_updated_at ON public.pam_recommendations;
CREATE TRIGGER update_pam_recommendations_updated_at
BEFORE UPDATE ON public.pam_recommendations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_monthly_savings_summary_updated_at ON public.monthly_savings_summary;
CREATE TRIGGER update_monthly_savings_summary_updated_at
BEFORE UPDATE ON public.monthly_savings_summary
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transaction_categories_updated_at ON public.transaction_categories;
CREATE TRIGGER update_transaction_categories_updated_at
BEFORE UPDATE ON public.transaction_categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_knowledge_documents_updated_at ON public.user_knowledge_documents;
CREATE TRIGGER update_user_knowledge_documents_updated_at
BEFORE UPDATE ON public.user_knowledge_documents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_two_factor_auth_updated_at ON public.user_two_factor_auth;
CREATE TRIGGER update_user_two_factor_auth_updated_at
BEFORE UPDATE ON public.user_two_factor_auth
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================================
-- GRANT PERMISSIONS
-- =========================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pam_savings_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pam_recommendations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_savings_summary TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.anonymized_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transaction_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_knowledge_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_knowledge_chunks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_two_factor_auth TO authenticated;

-- Grant USAGE on sequences for BIGSERIAL columns
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =========================================================================
-- INSERT DEFAULT DATA
-- =========================================================================

-- Insert default transaction categories
INSERT INTO public.transaction_categories (name, display_name, color, icon, is_system, is_income_category, sort_order, keywords) VALUES
('transportation', 'Transportation', '#EF4444', 'car', true, false, 1, ARRAY['gas', 'fuel', 'uber', 'lyft', 'taxi', 'parking', 'toll']),
('accommodation', 'Accommodation', '#F59E0B', 'home', true, false, 2, ARRAY['hotel', 'motel', 'airbnb', 'camping', 'rv', 'resort']),
('food', 'Food & Dining', '#10B981', 'utensils', true, false, 3, ARRAY['restaurant', 'grocery', 'food', 'dining', 'cafe', 'bar']),
('entertainment', 'Entertainment', '#8B5CF6', 'ticket', true, false, 4, ARRAY['movie', 'concert', 'show', 'game', 'park', 'museum']),
('shopping', 'Shopping', '#EC4899', 'shopping-bag', true, false, 5, ARRAY['store', 'shop', 'retail', 'mall', 'amazon', 'purchase']),
('utilities', 'Utilities', '#6366F1', 'zap', true, false, 6, ARRAY['electric', 'water', 'gas', 'internet', 'phone', 'cable']),
('salary', 'Salary', '#059669', 'dollar-sign', true, true, 1, ARRAY['salary', 'paycheck', 'wage', 'income']),
('freelance', 'Freelance', '#0891B2', 'briefcase', true, true, 2, ARRAY['freelance', 'contract', 'consulting', 'gig']),
('investment', 'Investment', '#DC2626', 'trending-up', true, true, 3, ARRAY['dividend', 'interest', 'stock', 'bond', 'investment'])
ON CONFLICT (name) DO NOTHING;

-- =========================================================================
-- VERIFICATION
-- =========================================================================

-- Show created tables
SELECT
    'Table created successfully:' as status,
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN (
    'user_settings', 'pam_savings_events', 'pam_recommendations',
    'monthly_savings_summary', 'anonymized_transactions', 'transaction_categories',
    'user_knowledge_documents', 'user_knowledge_chunks', 'user_two_factor_auth'
)
ORDER BY table_name;

-- Show RLS status
SELECT
    'RLS enabled:' as status,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'user_settings', 'pam_savings_events', 'pam_recommendations',
    'monthly_savings_summary', 'anonymized_transactions', 'transaction_categories',
    'user_knowledge_documents', 'user_knowledge_chunks', 'user_two_factor_auth'
)
ORDER BY tablename;

-- =========================================================================
-- END OF SCRIPT
-- =========================================================================
--
-- ✅ This script creates all missing tables with:
-- • Correct data types (BIGSERIAL for IDs, UUID for user_id)
-- • Proper foreign key references to auth.users(id)
-- • Matching RLS policies using auth.uid() = user_id pattern
-- • Performance indexes and update triggers
-- • Default transaction categories
--
-- Your application should now work without "table doesn't exist" errors!
-- =========================================================================