-- Create expenses table for Wins page functionality
-- This table was referenced in code but never created

-- Create the expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    category TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    receipt_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON public.expenses(user_id, date);

-- Enable Row Level Security
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own expenses" ON public.expenses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expenses" ON public.expenses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses" ON public.expenses
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses" ON public.expenses
    FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_expenses_updated_at();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT USAGE ON SEQUENCE public.expenses_id_seq TO authenticated;

-- Insert some sample data for testing (optional)
-- INSERT INTO public.expenses (user_id, amount, category, date, description)
-- VALUES 
--     (auth.uid(), 50.00, 'fuel', CURRENT_DATE, 'Gas station fill-up'),
--     (auth.uid(), 25.99, 'food', CURRENT_DATE - INTERVAL '1 day', 'Grocery shopping'),
--     (auth.uid(), 15.00, 'camping', CURRENT_DATE - INTERVAL '2 days', 'Campground fee')
-- WHERE auth.uid() IS NOT NULL;