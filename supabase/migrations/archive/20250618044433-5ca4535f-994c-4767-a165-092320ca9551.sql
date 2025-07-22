
-- Fix the budget table structure and add missing financial tables
-- First, let's create the proper budget_categories table
CREATE TABLE IF NOT EXISTS public.budget_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    budgeted_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    spent_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    color TEXT DEFAULT '#8B5CF6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on budget_categories
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for budget_categories
CREATE POLICY "Users can manage their own budget categories" ON public.budget_categories
    FOR ALL USING (auth.uid() = user_id);

-- Update the expenses table to have proper user_id reference and RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and create new ones
DROP POLICY IF EXISTS "Users can manage their own expenses" ON public.expenses;
CREATE POLICY "Users can manage their own expenses" ON public.expenses
    FOR ALL USING (auth.uid() = user_id);

-- Create income_entries table for proper income tracking
CREATE TABLE IF NOT EXISTS public.income_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    type TEXT DEFAULT 'regular',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on income_entries
ALTER TABLE public.income_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for income_entries
CREATE POLICY "Users can manage their own income entries" ON public.income_entries
    FOR ALL USING (auth.uid() = user_id);

-- Create tips table for financial tips
CREATE TABLE IF NOT EXISTS public.financial_tips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    savings_amount NUMERIC(10,2),
    is_shared BOOLEAN DEFAULT FALSE,
    votes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on financial_tips
ALTER TABLE public.financial_tips ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for financial_tips
CREATE POLICY "Users can manage their own tips" ON public.financial_tips
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view shared tips" ON public.financial_tips
    FOR SELECT USING (is_shared = TRUE OR auth.uid() = user_id);

-- Create money_maker_ideas table
CREATE TABLE IF NOT EXISTS public.money_maker_ideas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    monthly_income NUMERIC(10,2) DEFAULT 0,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Paused', 'Archived')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on money_maker_ideas
ALTER TABLE public.money_maker_ideas ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for money_maker_ideas
CREATE POLICY "Users can manage their own money maker ideas" ON public.money_maker_ideas
    FOR ALL USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_money_maker()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_money_maker_ideas_updated_at
    BEFORE UPDATE ON public.money_maker_ideas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_money_maker();

-- Update the existing budgets table to work properly
ALTER TABLE public.budgets DROP COLUMN IF EXISTS spent;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS name TEXT DEFAULT 'Monthly Budget';

-- Create a view for budget summary calculations
CREATE OR REPLACE VIEW public.budget_summary AS
SELECT 
    b.user_id,
    b.id as budget_id,
    b.name,
    COALESCE(SUM(bc.budgeted_amount), 0) as total_budget,
    COALESCE(SUM(bc.spent_amount), 0) as total_spent,
    COALESCE(SUM(bc.budgeted_amount), 0) - COALESCE(SUM(bc.spent_amount), 0) as total_remaining
FROM public.budgets b
LEFT JOIN public.budget_categories bc ON b.user_id = bc.user_id
WHERE b.user_id = auth.uid()
GROUP BY b.user_id, b.id, b.name;
