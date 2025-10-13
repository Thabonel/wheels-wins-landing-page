# IMPORTANT: SQL Migration Workflow

## ❌ What Went Wrong

We encountered multiple SQL errors because we wrote migration scripts **without checking the existing database structure first**.

Errors encountered:
1. Sequence doesn't exist
2. Column doesn't exist
3. Constraint syntax error
4. Policy already exists
5. Trigger already exists
6. Deadlock from large operations

All of these could have been avoided by **inspecting the database first**.

## ✅ Correct Workflow

### Step 1: ALWAYS Inspect Database First

Before writing ANY SQL migration, run this inspection script in Supabase SQL Editor:

**File**: `docs/sql-fixes/check-existing-schema.sql`

```sql
-- This script checks:
-- 1. Which tables exist
-- 2. Table structures (columns, types, defaults)
-- 3. Existing RLS policies
-- 4. Existing triggers
-- 5. Existing constraints
-- 6. Existing indexes
-- 7. Existing sequences
-- 8. Existing views
```

### Step 2: Document Current State

Create a document showing what EXISTS vs what's NEEDED:

```markdown
## Current State (from inspection)

### budgets table
- ✅ EXISTS
- Columns: id, user_id, category, name, spent, created_at, updated_at
- ❌ MISSING: monthly_limit, alert_threshold
- Triggers: trigger_update_budgets_updated_at ✅ EXISTS
- Policies: 4 policies ✅ EXIST
- RLS: ✅ ENABLED

### income_entries table
- ❌ DOES NOT EXIST
- Needs: full creation

## Required Changes

### budgets table
- ADD COLUMN monthly_limit (only if not exists)
- ADD COLUMN alert_threshold (only if not exists)
- ✅ Skip trigger creation (already exists)
- ✅ Skip policy creation (already exist)
```

### Step 3: Write Surgical Migration

Write migration that ONLY changes what's needed:

```sql
-- Example: Add missing columns to existing budgets table
DO $$
BEGIN
    -- Check what we found in Step 1
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'budgets'
                   AND column_name = 'monthly_limit') THEN
        ALTER TABLE public.budgets ADD COLUMN monthly_limit DECIMAL(10,2);
    END IF;
END $$;
```

### Step 4: Test in Staging

Run the migration in staging and verify:
- No errors
- All expected changes applied
- Application still works

### Step 5: Document and Deploy

Only after successful staging test, deploy to production.

## Tools Available

### 1. Supabase Dashboard
- **Database → Table Editor**: Visual inspection
- **Database → SQL Editor**: Run inspection queries
- **Database → Roles**: Check permissions

### 2. MCP Supabase Server
- Direct SQL access
- Can query schema programmatically
- Useful for automated checks

### 3. psql (if available)
```bash
psql $DATABASE_URL
\dt      # List tables
\d+ budgets  # Describe table with details
\dp budgets  # Show RLS policies
```

## Common Mistakes to Avoid

### ❌ Don't Assume
```sql
-- BAD: Assumes table doesn't exist
CREATE TABLE budgets (...);

-- BAD: Assumes policy doesn't exist
CREATE POLICY "Users can view" ON budgets;

-- BAD: Assumes trigger doesn't exist
CREATE TRIGGER trigger_update_budgets;
```

### ✅ Always Check
```sql
-- GOOD: Check first
CREATE TABLE IF NOT EXISTS budgets (...);

-- GOOD: Check in DO block
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE ...) THEN
        CREATE POLICY ...;
    END IF;
END $$;
```

## Lessons Learned from Week 2

1. **Inspection First**: Always run schema inspection before writing SQL
2. **Document Current State**: Know what exists before deciding what to create
3. **Idempotent Scripts**: All migrations should be runnable multiple times
4. **Small Steps**: Break large migrations into smaller, sequential steps
5. **Test Everything**: Run in staging, verify each step
6. **Avoid Deadlocks**: Don't modify multiple tables in one large transaction

## Future Migrations Checklist

- [ ] Run `check-existing-schema.sql` in Supabase SQL Editor
- [ ] Document current state vs desired state
- [ ] Write idempotent migration (checks before creating)
- [ ] Use conditional blocks for policies, triggers, constraints
- [ ] Break into sequential steps if large
- [ ] Test in staging
- [ ] Verify no errors
- [ ] Test application functionality
- [ ] Document and deploy to production

## The Right Way™

```
1. INSPECT → 2. DOCUMENT → 3. WRITE → 4. TEST → 5. DEPLOY
     ↓            ↓            ↓         ↓          ↓
  Schema       What to      Surgical   Staging   Production
   Query       Change       Changes    Verify     Deploy
```

---

**Remember**: 10 minutes of inspection saves hours of debugging!
