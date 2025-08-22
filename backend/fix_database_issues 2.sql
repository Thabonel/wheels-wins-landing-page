-- Fix duplicate RLS policies and backend errors
-- This SQL should be run manually in Supabase SQL editor

-- Drop duplicate policies for user_settings
DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;

-- Keep the properly named policies
-- (The "their own" versions will remain)

-- Create missing tables that backend is looking for
CREATE TABLE IF NOT EXISTS affiliate_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    sale_amount DECIMAL(10,2) NOT NULL,
    commission_rate DECIMAL(5,4) NOT NULL,
    vendor_name TEXT,
    product_name TEXT,
    sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    payout_status TEXT DEFAULT 'pending',
    payout_date TIMESTAMP WITH TIME ZONE,
    affiliate_network TEXT DEFAULT 'digistore24',
    tracking_id TEXT,
    customer_info JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for affiliate_sales
ALTER TABLE affiliate_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own affiliate sales"
ON affiliate_sales FOR SELECT
USING (auth.uid() = user_id);

-- Ensure user_wishlists table exists
CREATE TABLE IF NOT EXISTS user_wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    price DECIMAL(10,2),
    notes TEXT,
    priority INTEGER DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- RLS for user_wishlists
ALTER TABLE user_wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own wishlists"
ON user_wishlists FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix expenses table column name issue (ensure 'date' column exists)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS date DATE;

-- If expense_date column exists, copy data to date column and remove expense_date
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'expense_date') THEN
        UPDATE expenses SET date = expense_date::DATE WHERE date IS NULL AND expense_date IS NOT NULL;
        ALTER TABLE expenses DROP COLUMN IF EXISTS expense_date;
    END IF;
END
$$;

-- Ensure date column is properly indexed
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date);

-- Create any missing RLS policies for expenses
CREATE POLICY IF NOT EXISTS "Users can manage their own expenses"
ON expenses FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure calendar_events table has proper structure
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    location TEXT,
    event_type TEXT DEFAULT 'personal',
    reminder_minutes INTEGER DEFAULT 15,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for calendar_events
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can manage their own calendar events"
ON calendar_events FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_date ON calendar_events(user_id, start_date);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_user_date ON affiliate_sales(user_id, sale_date);
CREATE INDEX IF NOT EXISTS idx_user_wishlists_user ON user_wishlists(user_id);

-- Ensure default budget_settings structure
UPDATE user_settings 
SET budget_settings = COALESCE(budget_settings, '{"weeklyBudget": 300, "monthlyBudget": 1200, "yearlyBudget": 14400}'::jsonb)
WHERE budget_settings IS NULL OR budget_settings = '{}'::jsonb;