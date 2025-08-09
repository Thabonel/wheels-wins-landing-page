-- Add receipt_url column to expenses table for receipt photo storage
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN expenses.receipt_url IS 'URL to the uploaded receipt image in Supabase storage';

-- Create index for faster queries on expenses with receipts
CREATE INDEX IF NOT EXISTS idx_expenses_receipt_url 
ON expenses(user_id, receipt_url) 
WHERE receipt_url IS NOT NULL;