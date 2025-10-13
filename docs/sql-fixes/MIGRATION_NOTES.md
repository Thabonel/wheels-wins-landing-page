# Week 2 Migration Notes

## Issues Encountered & Fixed

### Issue 1: Sequence Grant Errors
**Error**: `ERROR: 42P01: relation "public.budgets_id_seq" does not exist`

**Root Cause**:
- `BIGSERIAL` automatically creates sequences (e.g., `tablename_id_seq`)
- Granting permissions on non-existent sequences causes errors
- Sequences may not exist if tables were created differently or already exist

**Fix**:
```sql
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_sequences
               WHERE schemaname = 'public'
               AND sequencename = 'budgets_id_seq') THEN
        GRANT USAGE ON SEQUENCE public.budgets_id_seq TO authenticated;
    END IF;
END $$;
```

### Issue 2: Existing Table with Different Structure
**Error**: `ERROR: 42703: column b.monthly_limit does not exist`

**Root Cause**:
- `budgets` table may already exist in database with different columns
- `CREATE TABLE IF NOT EXISTS` skips creation if table exists (doesn't add columns)
- Views referencing missing columns fail

**Fix**:
```sql
-- After CREATE TABLE IF NOT EXISTS, add missing columns conditionally
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'budgets'
                   AND column_name = 'monthly_limit') THEN
        ALTER TABLE public.budgets
        ADD COLUMN monthly_limit DECIMAL(10,2) NOT NULL DEFAULT 0
        CHECK (monthly_limit >= 0);
    END IF;
END $$;
```

## Migration Strategy

### For New Installations
1. Run migration as-is
2. All tables created fresh with correct structure
3. No issues expected

### For Existing Databases
1. Migration checks if tables exist
2. Adds missing columns to existing tables
3. Creates missing tables
4. Grants permissions safely
5. Creates/updates views

## Verification Steps

After running migration:

```sql
-- 1. Verify all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('budgets', 'income_entries', 'user_subscriptions');

-- 2. Verify all columns exist in budgets
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'budgets'
ORDER BY ordinal_position;

-- Expected columns:
-- id, user_id, category, monthly_limit, alert_threshold, created_at, updated_at

-- 3. Verify RLS policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('budgets', 'income_entries', 'user_subscriptions')
ORDER BY tablename, policyname;

-- 4. Verify view works
SELECT * FROM budget_utilization LIMIT 1;

-- 5. Verify sequences
SELECT schemaname, sequencename
FROM pg_sequences
WHERE schemaname = 'public'
AND sequencename IN ('budgets_id_seq', 'income_entries_id_seq');
```

## Rollback Plan

If migration fails:

```sql
-- Drop view
DROP VIEW IF EXISTS public.budget_utilization;

-- Remove RLS policies
DROP POLICY IF EXISTS "Users can view their own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can insert their own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can update their own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can delete their own budgets" ON public.budgets;

-- Drop tables (only if newly created - check first!)
-- DROP TABLE IF EXISTS public.budgets CASCADE;
-- DROP TABLE IF EXISTS public.income_entries CASCADE;
-- DROP TABLE IF EXISTS public.user_subscriptions CASCADE;
```

## Files Updated

1. **`supabase/migrations/20250110000000-week2-missing-tables.sql`**
   - Fixed sequence grants (conditional)
   - Added column addition for existing tables

2. **`docs/sql-fixes/week2-critical-fixes.sql`**
   - Same fixes applied

## Deployment Checklist

- [ ] Backup database before running migration
- [ ] Run migration in staging first
- [ ] Verify all verification queries pass
- [ ] Test application functionality
- [ ] Monitor for errors in logs
- [ ] If successful, deploy to production

## Support

If issues occur:
1. Check error message carefully
2. Verify table structure: `\d+ budgets`
3. Check if columns exist: `\d budgets`
4. Review RLS policies: `\dp budgets`
5. Consult this document for common issues
