GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.income_entries TO admin;
GRANT SELECT, INSERT, UPDATE ON public.user_subscriptions TO admin;
GRANT SELECT ON public.budget_utilization TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pam_recommendations TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pam_savings_events TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_savings_summary TO admin;
GRANT SELECT ON public.savings_guarantee_history TO admin;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'budgets_id_seq') THEN
        GRANT USAGE ON SEQUENCE public.budgets_id_seq TO admin;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'income_entries_id_seq') THEN
        GRANT USAGE ON SEQUENCE public.income_entries_id_seq TO admin;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'user_subscriptions_id_seq') THEN
        GRANT USAGE ON SEQUENCE public.user_subscriptions_id_seq TO admin;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'pam_savings_events_id_seq') THEN
        GRANT USAGE ON SEQUENCE public.pam_savings_events_id_seq TO admin;
    END IF;
END $$;
