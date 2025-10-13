-- Check existing tables
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('budgets', 'income_entries', 'user_subscriptions', 'expenses')
ORDER BY table_name;

-- Check budgets table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'budgets'
ORDER BY ordinal_position;

-- Check income_entries table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'income_entries'
ORDER BY ordinal_position;

-- Check user_subscriptions table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_subscriptions'
ORDER BY ordinal_position;

-- Check existing RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('budgets', 'income_entries', 'user_subscriptions')
ORDER BY tablename, policyname;

-- Check existing triggers
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table IN ('budgets', 'income_entries', 'user_subscriptions')
ORDER BY event_object_table, trigger_name;

-- Check existing constraints
SELECT tc.constraint_name, tc.table_name, tc.constraint_type, cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
AND tc.table_name IN ('budgets', 'income_entries', 'user_subscriptions')
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- Check existing indexes
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('budgets', 'income_entries', 'user_subscriptions')
ORDER BY tablename, indexname;

-- Check existing sequences
SELECT sequencename, last_value
FROM pg_sequences
WHERE schemaname = 'public'
AND sequencename LIKE '%budgets%' OR sequencename LIKE '%income%' OR sequencename LIKE '%subscription%';

-- Check if budget_utilization view exists
SELECT table_name, view_definition
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name = 'budget_utilization';
