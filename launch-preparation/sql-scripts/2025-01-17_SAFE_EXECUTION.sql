-- =========================================================================
-- CREATE MISSING TABLES - COMPLETELY SAFE VERSION
-- =========================================================================
-- Date: January 17, 2025
-- Purpose: Create missing tables with absolutely safe execution order
-- Execute this in Supabase SQL Editor
--
-- SAFE APPROACH: Create tables first, then add indexes/policies separately
-- =========================================================================

-- =========================================================================
-- STEP 1: CREATE TABLES ONLY (NO INDEXES OR POLICIES YET)
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
    event_type TEXT NOT NULL,
    amount NUMERIC,
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
    rec_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    recommended_action TEXT,
    priority TEXT DEFAULT 'medium',
    estimated_savings NUMERIC,
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
    total_income NUMERIC DEFAULT 0,
    total_expenses NUMERIC DEFAULT 0,
    total_savings NUMERIC DEFAULT 0,
    savings_goal NUMERIC DEFAULT 0,
    budget_adherence NUMERIC DEFAULT 0,
    top_expense_category TEXT,
    savings_rate NUMERIC DEFAULT 0,
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
    transaction_type TEXT DEFAULT 'expense',
    date DATE NOT NULL,
    hash TEXT NOT NULL,
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
    parent_category_id BIGINT,
    is_system BOOLEAN DEFAULT false,
    is_income_category BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    description TEXT,
    keywords TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. USER_KNOWLEDGE_DOCUMENTS TABLE (LOW - Used in Supabase functions)
CREATE TABLE IF NOT EXISTS public.user_knowledge_documents (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    document_type TEXT DEFAULT 'general',
    file_url TEXT,
    file_size INTEGER,
    mime_type TEXT,
    status TEXT DEFAULT 'processed',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. USER_KNOWLEDGE_CHUNKS TABLE (LOW - Used in Supabase functions)
CREATE TABLE IF NOT EXISTS public.user_knowledge_chunks (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL,
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
-- STEP 2: ADD FOREIGN KEY CONSTRAINTS (SAFE)
-- =========================================================================

-- Add foreign key for transaction_categories parent reference
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transaction_categories') THEN
        ALTER TABLE public.transaction_categories
        DROP CONSTRAINT IF EXISTS transaction_categories_parent_category_id_fkey;

        ALTER TABLE public.transaction_categories
        ADD CONSTRAINT transaction_categories_parent_category_id_fkey
        FOREIGN KEY (parent_category_id) REFERENCES transaction_categories(id);
    END IF;
END $$;

-- Add foreign key for user_knowledge_chunks document reference
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_knowledge_chunks') THEN
        ALTER TABLE public.user_knowledge_chunks
        DROP CONSTRAINT IF EXISTS user_knowledge_chunks_document_id_fkey;

        ALTER TABLE public.user_knowledge_chunks
        ADD CONSTRAINT user_knowledge_chunks_document_id_fkey
        FOREIGN KEY (document_id) REFERENCES user_knowledge_documents(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =========================================================================
-- STEP 3: ENABLE ROW LEVEL SECURITY
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
-- STEP 4: CREATE RLS POLICIES
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

-- TRANSACTION_CATEGORIES POLICIES (PUBLIC READ)
DROP POLICY IF EXISTS "Anyone can read transaction categories" ON public.transaction_categories;
CREATE POLICY "Anyone can read transaction categories" ON public.transaction_categories
FOR SELECT USING (true);

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
-- STEP 5: CREATE INDEXES (SAFE - ONLY BASIC ONES)
-- =========================================================================

-- Basic user_id indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_pam_savings_events_user_id ON public.pam_savings_events(user_id);
CREATE INDEX IF NOT EXISTS idx_pam_recommendations_user_id ON public.pam_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_savings_user_id ON public.monthly_savings_summary(user_id);
CREATE INDEX IF NOT EXISTS idx_anon_transactions_user_id ON public.anonymized_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_docs_user_id ON public.user_knowledge_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_user_id ON public.user_knowledge_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_2fa_user_id ON public.user_two_factor_auth(user_id);

-- Date indexes for time-based queries
CREATE INDEX IF NOT EXISTS idx_pam_savings_events_created ON public.pam_savings_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_monthly_savings_month ON public.monthly_savings_summary(month DESC);
CREATE INDEX IF NOT EXISTS idx_anon_transactions_date ON public.anonymized_transactions(date DESC);

-- =========================================================================
-- STEP 6: CREATE UPDATE TRIGGERS
-- =========================================================================

-- Create or replace the update function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pam_savings_events_updated_at
BEFORE UPDATE ON public.pam_savings_events
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pam_recommendations_updated_at
BEFORE UPDATE ON public.pam_recommendations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monthly_savings_summary_updated_at
BEFORE UPDATE ON public.monthly_savings_summary
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transaction_categories_updated_at
BEFORE UPDATE ON public.transaction_categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_knowledge_documents_updated_at
BEFORE UPDATE ON public.user_knowledge_documents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_two_factor_auth_updated_at
BEFORE UPDATE ON public.user_two_factor_auth
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================================
-- STEP 7: GRANT PERMISSIONS
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

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =========================================================================
-- STEP 8: INSERT DEFAULT DATA
-- =========================================================================

-- Insert default transaction categories
INSERT INTO public.transaction_categories (name, display_name, color, icon, is_system, is_income_category, sort_order, keywords) VALUES
('transportation', 'Transportation', '#EF4444', 'car', true, false, 1, ARRAY['gas', 'fuel', 'uber', 'lyft', 'taxi']),
('accommodation', 'Accommodation', '#F59E0B', 'home', true, false, 2, ARRAY['hotel', 'motel', 'airbnb', 'camping']),
('food', 'Food & Dining', '#10B981', 'utensils', true, false, 3, ARRAY['restaurant', 'grocery', 'food', 'dining']),
('entertainment', 'Entertainment', '#8B5CF6', 'ticket', true, false, 4, ARRAY['movie', 'concert', 'show', 'game']),
('shopping', 'Shopping', '#EC4899', 'shopping-bag', true, false, 5, ARRAY['store', 'shop', 'retail', 'mall']),
('utilities', 'Utilities', '#6366F1', 'zap', true, false, 6, ARRAY['electric', 'water', 'gas', 'internet']),
('salary', 'Salary', '#059669', 'dollar-sign', true, true, 1, ARRAY['salary', 'paycheck', 'wage']),
('freelance', 'Freelance', '#0891B2', 'briefcase', true, true, 2, ARRAY['freelance', 'contract', 'consulting']),
('investment', 'Investment', '#DC2626', 'trending-up', true, true, 3, ARRAY['dividend', 'interest', 'stock'])
ON CONFLICT (name) DO NOTHING;

-- =========================================================================
-- VERIFICATION
-- =========================================================================

-- Show what was created
SELECT
    '✅ Created successfully' as status,
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as columns
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN (
    'user_settings', 'pam_savings_events', 'pam_recommendations',
    'monthly_savings_summary', 'anonymized_transactions', 'transaction_categories',
    'user_knowledge_documents', 'user_knowledge_chunks', 'user_two_factor_auth'
)
ORDER BY table_name;

-- =========================================================================
-- END OF SAFE SCRIPT
-- =========================================================================
--
-- ✅ This script uses the safest possible approach:
-- 1. Creates tables without any complex constraints first
-- 2. Adds foreign keys separately with existence checks
-- 3. Enables RLS and creates policies
-- 4. Creates only basic, safe indexes
-- 5. No problematic column references
--
-- All "table doesn't exist" errors should be resolved!
-- =========================================================================