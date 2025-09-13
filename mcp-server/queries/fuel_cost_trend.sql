-- Fuel cost trend analysis for transportation budgeting
WITH fuel_expenses AS (
  SELECT 
    date,
    amount,
    description,
    DATE_TRUNC('week', date) as week,
    DATE_TRUNC('month', date) as month
  FROM expenses 
  WHERE user_id = $1
    AND (
      category ILIKE '%fuel%' OR 
      category ILIKE '%gas%' OR 
      category ILIKE '%petrol%' OR
      description ILIKE '%fuel%' OR
      description ILIKE '%gas%' OR
      description ILIKE '%petrol%'
    )
    AND date >= COALESCE($2::date, CURRENT_DATE - INTERVAL '6 months')
    AND date <= COALESCE($3::date, CURRENT_DATE)
),
weekly_trends AS (
  SELECT 
    week,
    COUNT(*) as fillups,
    SUM(amount) as weekly_fuel_cost,
    AVG(amount) as avg_fillup_cost,
    MIN(amount) as min_fillup,
    MAX(amount) as max_fillup
  FROM fuel_expenses
  GROUP BY week
),
monthly_trends AS (
  SELECT 
    month,
    COUNT(*) as monthly_fillups,
    SUM(amount) as monthly_fuel_cost,
    AVG(amount) as avg_monthly_fillup
  FROM fuel_expenses
  GROUP BY month
)
SELECT 
  'weekly' as period_type,
  TO_CHAR(w.week, 'YYYY-MM-DD') as period,
  w.fillups as transactions,
  w.weekly_fuel_cost as total_cost,
  w.avg_fillup_cost as avg_cost,
  w.min_fillup,
  w.max_fillup,
  CASE 
    WHEN LAG(w.weekly_fuel_cost) OVER (ORDER BY w.week) IS NOT NULL
    THEN ((w.weekly_fuel_cost - LAG(w.weekly_fuel_cost) OVER (ORDER BY w.week)) / LAG(w.weekly_fuel_cost) OVER (ORDER BY w.week)) * 100
    ELSE NULL
  END as cost_change_percent
FROM weekly_trends w
UNION ALL
SELECT 
  'monthly' as period_type,
  TO_CHAR(m.month, 'YYYY-MM') as period,
  m.monthly_fillups as transactions,
  m.monthly_fuel_cost as total_cost,
  m.avg_monthly_fillup as avg_cost,
  NULL as min_fillup,
  NULL as max_fillup,
  CASE 
    WHEN LAG(m.monthly_fuel_cost) OVER (ORDER BY m.month) IS NOT NULL
    THEN ((m.monthly_fuel_cost - LAG(m.monthly_fuel_cost) OVER (ORDER BY m.month)) / LAG(m.monthly_fuel_cost) OVER (ORDER BY m.month)) * 100
    ELSE NULL
  END as cost_change_percent
FROM monthly_trends m
ORDER BY period_type, period DESC;