-- Monthly burn rate analysis for budget planning
WITH monthly_expenses AS (
  SELECT 
    DATE_TRUNC('month', date) as month,
    SUM(amount) as monthly_total,
    COUNT(*) as transaction_count,
    AVG(amount) as avg_transaction
  FROM expenses 
  WHERE user_id = $1
    AND date >= COALESCE($2::date, CURRENT_DATE - INTERVAL '12 months')
    AND date <= COALESCE($3::date, CURRENT_DATE)
  GROUP BY DATE_TRUNC('month', date)
),
monthly_income AS (
  SELECT 
    DATE_TRUNC('month', date) as month,
    SUM(amount) as monthly_income
  FROM income 
  WHERE user_id = $1
    AND date >= COALESCE($2::date, CURRENT_DATE - INTERVAL '12 months')
    AND date <= COALESCE($3::date, CURRENT_DATE)
  GROUP BY DATE_TRUNC('month', date)
)
SELECT 
  e.month,
  e.monthly_total as expenses,
  COALESCE(i.monthly_income, 0) as income,
  COALESCE(i.monthly_income, 0) - e.monthly_total as net_savings,
  e.transaction_count,
  e.avg_transaction,
  CASE 
    WHEN LAG(e.monthly_total) OVER (ORDER BY e.month) IS NOT NULL 
    THEN ((e.monthly_total - LAG(e.monthly_total) OVER (ORDER BY e.month)) / LAG(e.monthly_total) OVER (ORDER BY e.month)) * 100
    ELSE NULL
  END as expense_growth_rate_percent
FROM monthly_expenses e
LEFT JOIN monthly_income i ON e.month = i.month
ORDER BY e.month DESC;