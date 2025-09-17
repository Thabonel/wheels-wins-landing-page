ALTER TABLE public.monthly_savings_summary ADD COLUMN IF NOT EXISTS billing_period_start DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE public.monthly_savings_summary ADD COLUMN IF NOT EXISTS billing_period_end DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE public.monthly_savings_summary ADD COLUMN IF NOT EXISTS subscription_cost DECIMAL(10,2) NOT NULL DEFAULT 14.00;
ALTER TABLE public.monthly_savings_summary ADD COLUMN IF NOT EXISTS total_predicted_savings DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.monthly_savings_summary ADD COLUMN IF NOT EXISTS total_actual_savings DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.monthly_savings_summary ADD COLUMN IF NOT EXISTS savings_events_count INTEGER DEFAULT 0;
ALTER TABLE public.monthly_savings_summary ADD COLUMN IF NOT EXISTS guarantee_met BOOLEAN DEFAULT false;
ALTER TABLE public.monthly_savings_summary ADD COLUMN IF NOT EXISTS guarantee_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.monthly_savings_summary ADD COLUMN IF NOT EXISTS evaluation_date TIMESTAMPTZ;
ALTER TABLE public.monthly_savings_summary ADD COLUMN IF NOT EXISTS processed_date TIMESTAMPTZ;
ALTER TABLE public.monthly_savings_summary ADD COLUMN IF NOT EXISTS refund_status TEXT DEFAULT 'pending';
ALTER TABLE public.monthly_savings_summary ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2);
ALTER TABLE public.monthly_savings_summary ADD COLUMN IF NOT EXISTS refund_transaction_id TEXT;

CREATE INDEX IF NOT EXISTS idx_monthly_summary_user_period ON monthly_savings_summary(user_id, billing_period_start);