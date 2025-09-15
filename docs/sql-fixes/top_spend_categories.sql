-- Top spending categories for a user within a date range
SELECT 
  category,
  COUNT(*) as transaction_count,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount,
  MIN(amount) as min_amount,
  MAX(amount) as max_amount
FROM expenses 
WHERE user_id = $1 
  AND date >= COALESCE($2::date, CURRENT_DATE - INTERVAL '30 days')
  AND date <= COALESCE($3::date, CURRENT_DATE)
GROUP BY category 
ORDER BY total_amount DESC 
LIMIT COALESCE($4::integer, 10);