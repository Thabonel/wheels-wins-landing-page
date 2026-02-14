-- Fix frontend-to-database schema mismatches
-- Comprehensive audit found 14 mismatches across 5 tables
-- Applied: February 15, 2026

-- Fix #1: expenses table missing receipt_url
-- Frontend sends receipt_url when uploading receipt photos via ExpenseReceiptUpload
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS receipt_url text;

-- Fix #2: medical_consultations table missing entirely
-- Health AI service (healthAiService.ts) saves consultation history here
CREATE TABLE IF NOT EXISTS public.medical_consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question text NOT NULL,
  response text NOT NULL,
  tokens_used integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.medical_consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own consultations"
  ON public.medical_consultations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consultations"
  ON public.medical_consultations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Fix #3 & #4: transaction_categories missing user_id and budget_amount
-- pamSavingsService bank import creates user-specific categories with budgets
ALTER TABLE public.transaction_categories
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS budget_amount numeric;

-- Fix #5 & #6: pam_recommendations missing predicted_savings, savings_confidence, tracking_enabled
-- pamSavingsService creates recommendations with these fields
ALTER TABLE public.pam_recommendations
  ADD COLUMN IF NOT EXISTS predicted_savings numeric,
  ADD COLUMN IF NOT EXISTS savings_confidence numeric,
  ADD COLUMN IF NOT EXISTS tracking_enabled boolean DEFAULT false;

-- Fix #7-#9: anonymized_transactions missing columns
-- pamSavingsService bank statement import sends these fields
ALTER TABLE public.anonymized_transactions
  ADD COLUMN IF NOT EXISTS confidence_score numeric,
  ADD COLUMN IF NOT EXISTS redacted_fields text[],
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS category_id text,
  ADD COLUMN IF NOT EXISTS merchant_name text,
  ADD COLUMN IF NOT EXISTS hash_signature text,
  ADD COLUMN IF NOT EXISTS transaction_date date;
