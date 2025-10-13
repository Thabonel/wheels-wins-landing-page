-- Week 2 Safe Migration - Checks Everything First
-- Run this in Supabase SQL Editor
-- Safe for both fresh and existing databases

-- ============================================
-- PART 1: TABLES (with column additions for existing tables)
-- ============================================

-- Budgets table
CREATE TABLE IF NOT EXISTS public.budgets (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, category)
);

-- Add missing columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budgets' AND column_name = 'monthly_limit') THEN
        ALTER TABLE public.budgets ADD COLUMN monthly_limit DECIMAL(10,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budgets' AND column_name = 'alert_threshold') THEN
        ALTER TABLE public.budgets ADD COLUMN alert_threshold DECIMAL(5,2) DEFAULT 80.0;
    END IF;
END $$;

-- Income entries table
CREATE TABLE IF NOT EXISTS public.income_entries (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    source TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'other',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    recurring BOOLEAN DEFAULT FALSE,
    recurrence_period TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User subscriptions table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    plan_name TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active',
    billing_cycle TEXT DEFAULT 'monthly',
    price_paid DECIMAL(10,2),
    currency TEXT DEFAULT 'USD',
    trial_ends_at TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMPTZ,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PART 2: INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_category ON public.budgets(user_id, category);
CREATE INDEX IF NOT EXISTS idx_income_entries_user_id ON public.income_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_income_entries_date ON public.income_entries(date);
CREATE INDEX IF NOT EXISTS idx_income_entries_user_date ON public.income_entries(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer ON public.user_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_pam_conversations_user_id ON public.pam_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_pam_messages_conversation_id ON public.pam_messages(conversation_id);

-- ============================================
-- PART 3: RLS
-- ============================================

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 4: POLICIES (only create if don't exist)
-- ============================================

-- Budgets policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'budgets' AND policyname = 'Users can view their own budgets') THEN
        CREATE POLICY "Users can view their own budgets" ON public.budgets FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'budgets' AND policyname = 'Users can insert their own budgets') THEN
        CREATE POLICY "Users can insert their own budgets" ON public.budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'budgets' AND policyname = 'Users can update their own budgets') THEN
        CREATE POLICY "Users can update their own budgets" ON public.budgets FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'budgets' AND policyname = 'Users can delete their own budgets') THEN
        CREATE POLICY "Users can delete their own budgets" ON public.budgets FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Income entries policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'income_entries' AND policyname = 'Users can view their own income') THEN
        CREATE POLICY "Users can view their own income" ON public.income_entries FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'income_entries' AND policyname = 'Users can insert their own income') THEN
        CREATE POLICY "Users can insert their own income" ON public.income_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'income_entries' AND policyname = 'Users can update their own income') THEN
        CREATE POLICY "Users can update their own income" ON public.income_entries FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'income_entries' AND policyname = 'Users can delete their own income') THEN
        CREATE POLICY "Users can delete their own income" ON public.income_entries FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- User subscriptions policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_subscriptions' AND policyname = 'Users can view their own subscription') THEN
        CREATE POLICY "Users can view their own subscription" ON public.user_subscriptions FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_subscriptions' AND policyname = 'Users can insert their own subscription') THEN
        CREATE POLICY "Users can insert their own subscription" ON public.user_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_subscriptions' AND policyname = 'Users can update their own subscription') THEN
        CREATE POLICY "Users can update their own subscription" ON public.user_subscriptions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================
-- PART 5: TRIGGERS (only create if don't exist)
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trigger_update_budgets_updated_at' AND event_object_table = 'budgets') THEN
        CREATE TRIGGER trigger_update_budgets_updated_at
            BEFORE UPDATE ON public.budgets
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trigger_update_income_entries_updated_at' AND event_object_table = 'income_entries') THEN
        CREATE TRIGGER trigger_update_income_entries_updated_at
            BEFORE UPDATE ON public.income_entries
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trigger_update_user_subscriptions_updated_at' AND event_object_table = 'user_subscriptions') THEN
        CREATE TRIGGER trigger_update_user_subscriptions_updated_at
            BEFORE UPDATE ON public.user_subscriptions
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================
-- PART 6: VIEW
-- ============================================

DROP VIEW IF EXISTS public.budget_utilization;

CREATE VIEW public.budget_utilization AS
SELECT
    b.id,
    b.user_id,
    b.category,
    b.monthly_limit,
    COALESCE(SUM(e.amount), 0) as spent,
    b.monthly_limit - COALESCE(SUM(e.amount), 0) as remaining,
    CASE
        WHEN b.monthly_limit > 0
        THEN (COALESCE(SUM(e.amount), 0) / b.monthly_limit * 100)
        ELSE 0
    END as percentage_used
FROM public.budgets b
LEFT JOIN public.expenses e ON
    b.user_id = e.user_id
    AND b.category = e.category
    AND DATE_TRUNC('month', e.date) = DATE_TRUNC('month', CURRENT_DATE)
WHERE b.user_id = auth.uid()
GROUP BY b.id, b.user_id, b.category, b.monthly_limit;

GRANT SELECT ON public.budget_utilization TO authenticated;

-- ============================================
-- PART 7: PERMISSIONS
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.income_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_subscriptions TO authenticated;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'budgets_id_seq') THEN
        GRANT USAGE ON SEQUENCE public.budgets_id_seq TO authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'income_entries_id_seq') THEN
        GRANT USAGE ON SEQUENCE public.income_entries_id_seq TO authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'expenses_id_seq') THEN
        GRANT USAGE ON SEQUENCE public.expenses_id_seq TO authenticated;
    END IF;
END $$;

-- ============================================
-- PART 8: CONSTRAINTS
-- ============================================

DO $$
BEGIN
    -- Drop and recreate budgets monthly_limit constraint
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'budgets_monthly_limit_check') THEN
        ALTER TABLE public.budgets DROP CONSTRAINT budgets_monthly_limit_check;
    END IF;
    ALTER TABLE public.budgets ADD CONSTRAINT budgets_monthly_limit_check CHECK (monthly_limit >= 0);

    -- Add income entries amount constraint if doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'income_entries_amount_positive' AND conrelid = 'public.income_entries'::regclass) THEN
        ALTER TABLE public.income_entries ADD CONSTRAINT income_entries_amount_positive CHECK (amount >= 0);
    END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify tables exist
SELECT 'Tables created' AS status, COUNT(*) AS count
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('budgets', 'income_entries', 'user_subscriptions');

-- Verify policies exist
SELECT 'Policies created' AS status, COUNT(*) AS count
FROM pg_policies
WHERE tablename IN ('budgets', 'income_entries', 'user_subscriptions');

-- Verify view exists
SELECT 'View created' AS status, COUNT(*) AS count
FROM information_schema.views
WHERE table_schema = 'public' AND table_name = 'budget_utilization';
