ALTER TABLE public.income_entries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'income_entries' AND policyname = 'Users can view their own income entries'
    ) THEN
        CREATE POLICY "Users can view their own income entries"
        ON public.income_entries FOR SELECT
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'income_entries' AND policyname = 'Users can insert their own income entries'
    ) THEN
        CREATE POLICY "Users can insert their own income entries"
        ON public.income_entries FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'income_entries' AND policyname = 'Users can update their own income entries'
    ) THEN
        CREATE POLICY "Users can update their own income entries"
        ON public.income_entries FOR UPDATE
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'income_entries' AND policyname = 'Users can delete their own income entries'
    ) THEN
        CREATE POLICY "Users can delete their own income entries"
        ON public.income_entries FOR DELETE
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_subscriptions' AND policyname = 'Users can update their own subscription'
    ) THEN
        CREATE POLICY "Users can update their own subscription"
        ON public.user_subscriptions FOR UPDATE
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_subscriptions' AND policyname = 'Users can delete their own subscription'
    ) THEN
        CREATE POLICY "Users can delete their own subscription"
        ON public.user_subscriptions FOR DELETE
        USING (auth.uid() = user_id);
    END IF;
END $$;

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

CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_pam_conversations_user_id ON public.pam_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_pam_messages_conversation_id ON public.pam_messages(conversation_id);

ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS budgets_monthly_limit_check;
ALTER TABLE public.budgets ADD CONSTRAINT budgets_monthly_limit_check
    CHECK (monthly_limit > 0);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'income_entries_amount_positive'
        AND conrelid = 'public.income_entries'::regclass
    ) THEN
        ALTER TABLE public.income_entries
        ADD CONSTRAINT income_entries_amount_positive CHECK (amount > 0);
    END IF;
END $$;

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
