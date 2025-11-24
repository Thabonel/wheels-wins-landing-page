ALTER TABLE monthly_savings_summary DROP COLUMN IF EXISTS month;
DELETE FROM monthly_savings_summary WHERE billing_period_start IS NULL;
