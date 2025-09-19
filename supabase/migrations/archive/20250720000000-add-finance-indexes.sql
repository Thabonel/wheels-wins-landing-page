-- Add indexes to optimize financial queries
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category ON public.budgets(category);
CREATE INDEX IF NOT EXISTS idx_income_entries_user_id ON public.income_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_income_entries_date ON public.income_entries(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
