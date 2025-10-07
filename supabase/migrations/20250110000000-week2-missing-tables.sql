-- Week 2: Database Stability - Create Missing Tables
-- Migration created: January 10, 2025
-- Purpose: Create tables referenced in code but never created

-- ============================================
-- 1. BUDGETS TABLE
-- ============================================
-- Referenced by:
-- - supabase/functions/pam-spend-summary/index.ts
-- - supabase/functions/pam-expense-create/index.ts

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.budgets (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    monthly_limit DECIMAL(10,2) NOT NULL CHECK (monthly_limit >= 0),
    alert_threshold DECIMAL(5,2) DEFAULT 80.0 CHECK (alert_threshold >= 0 AND alert_threshold <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, category)
);

-- Add columns if they don't exist (for existing tables with different structure)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'budgets'
                   AND column_name = 'monthly_limit') THEN
        ALTER TABLE public.budgets ADD COLUMN monthly_limit DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (monthly_limit >= 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'budgets'
                   AND column_name = 'alert_threshold') THEN
        ALTER TABLE public.budgets ADD COLUMN alert_threshold DECIMAL(5,2) DEFAULT 80.0 CHECK (alert_threshold >= 0 AND alert_threshold <= 100);
    END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_category ON public.budgets(user_id, category);

-- Enable Row Level Security
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- RLS Policies (create only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'budgets' AND policyname = 'Users can view their own budgets'
    ) THEN
        CREATE POLICY "Users can view their own budgets" ON public.budgets
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'budgets' AND policyname = 'Users can insert their own budgets'
    ) THEN
        CREATE POLICY "Users can insert their own budgets" ON public.budgets
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'budgets' AND policyname = 'Users can update their own budgets'
    ) THEN
        CREATE POLICY "Users can update their own budgets" ON public.budgets
            FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'budgets' AND policyname = 'Users can delete their own budgets'
    ) THEN
        CREATE POLICY "Users can delete their own budgets" ON public.budgets
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Updated_at trigger
CREATE TRIGGER trigger_update_budgets_updated_at
    BEFORE UPDATE ON public.budgets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO authenticated;
-- Grant sequence usage only if it exists (BIGSERIAL creates it automatically)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'budgets_id_seq') THEN
        GRANT USAGE ON SEQUENCE public.budgets_id_seq TO authenticated;
    END IF;
END $$;

-- ============================================
-- 2. INCOME_ENTRIES TABLE
-- ============================================
-- For tracking user income (salary, gigs, refunds, etc.)

CREATE TABLE IF NOT EXISTS public.income_entries (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    source TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'other',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    recurring BOOLEAN DEFAULT FALSE,
    recurrence_period TEXT CHECK (recurrence_period IN ('weekly', 'biweekly', 'monthly', 'yearly')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_income_entries_user_id ON public.income_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_income_entries_date ON public.income_entries(date);
CREATE INDEX IF NOT EXISTS idx_income_entries_user_date ON public.income_entries(user_id, date DESC);

-- Enable Row Level Security
ALTER TABLE public.income_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies (create only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'income_entries' AND policyname = 'Users can view their own income'
    ) THEN
        CREATE POLICY "Users can view their own income" ON public.income_entries
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'income_entries' AND policyname = 'Users can insert their own income'
    ) THEN
        CREATE POLICY "Users can insert their own income" ON public.income_entries
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'income_entries' AND policyname = 'Users can update their own income'
    ) THEN
        CREATE POLICY "Users can update their own income" ON public.income_entries
            FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'income_entries' AND policyname = 'Users can delete their own income'
    ) THEN
        CREATE POLICY "Users can delete their own income" ON public.income_entries
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Updated_at trigger
CREATE TRIGGER trigger_update_income_entries_updated_at
    BEFORE UPDATE ON public.income_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.income_entries TO authenticated;
-- Grant sequence usage only if it exists (BIGSERIAL creates it automatically)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'income_entries_id_seq') THEN
        GRANT USAGE ON SEQUENCE public.income_entries_id_seq TO authenticated;
    END IF;
END $$;

-- ============================================
-- 3. USER_SUBSCRIPTIONS TABLE
-- ============================================
-- For tracking user subscription status (premium, trials, etc.)

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    plan_name TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired', 'trialing', 'past_due')),
    billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer ON public.user_subscriptions(stripe_customer_id);

-- Enable Row Level Security
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (create only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_subscriptions' AND policyname = 'Users can view their own subscription'
    ) THEN
        CREATE POLICY "Users can view their own subscription" ON public.user_subscriptions
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_subscriptions' AND policyname = 'Users can insert their own subscription'
    ) THEN
        CREATE POLICY "Users can insert their own subscription" ON public.user_subscriptions
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_subscriptions' AND policyname = 'Users can update their own subscription'
    ) THEN
        CREATE POLICY "Users can update their own subscription" ON public.user_subscriptions
            FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Updated_at trigger
CREATE TRIGGER trigger_update_user_subscriptions_updated_at
    BEFORE UPDATE ON public.user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.user_subscriptions TO authenticated;

-- ============================================
-- 4. HELPER VIEWS
-- ============================================

-- Budget utilization view (useful for quick queries)
CREATE OR REPLACE VIEW public.budget_utilization AS
SELECT
    b.id AS budget_id,
    b.user_id,
    b.category,
    b.monthly_limit,
    b.alert_threshold,
    COALESCE(SUM(e.amount), 0) AS spent,
    b.monthly_limit - COALESCE(SUM(e.amount), 0) AS remaining,
    CASE
        WHEN b.monthly_limit > 0 THEN (COALESCE(SUM(e.amount), 0) / b.monthly_limit * 100)
        ELSE 0
    END AS percentage_used,
    DATE_TRUNC('month', CURRENT_DATE) AS period_start,
    (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day') AS period_end
FROM public.budgets b
LEFT JOIN public.expenses e ON
    e.user_id = b.user_id
    AND e.category = b.category
    AND e.date >= DATE_TRUNC('month', CURRENT_DATE)
    AND e.date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
GROUP BY b.id, b.user_id, b.category, b.monthly_limit, b.alert_threshold;

-- Grant view access
GRANT SELECT ON public.budget_utilization TO authenticated;

-- ============================================
-- 5. SAMPLE DATA (OPTIONAL - FOR TESTING)
-- ============================================

-- Uncomment to insert sample budgets for testing
-- INSERT INTO public.budgets (user_id, category, monthly_limit, alert_threshold)
-- SELECT
--     auth.uid(),
--     category,
--     limit_amount,
--     80.0
-- FROM (VALUES
--     ('gas', 700.00),
--     ('food', 400.00),
--     ('campground', 300.00),
--     ('maintenance', 200.00),
--     ('entertainment', 150.00),
--     ('shopping', 100.00),
--     ('utilities', 100.00)
-- ) AS defaults(category, limit_amount)
-- WHERE auth.uid() IS NOT NULL
-- ON CONFLICT (user_id, category) DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these queries to verify tables were created successfully:

-- SELECT table_name, table_type
-- FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('budgets', 'income_entries', 'user_subscriptions')
-- ORDER BY table_name;

-- SELECT
--     schemaname,
--     tablename,
--     policyname,
--     permissive,
--     roles,
--     cmd
-- FROM pg_policies
-- WHERE tablename IN ('budgets', 'income_entries', 'user_subscriptions')
-- ORDER BY tablename, policyname;
