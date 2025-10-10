# PAM Database Fix - Execution Guide

**Issue:** "operator does not exist: bigint = uuid" error when trying to create PAM tables

**Root Cause:** The RLS policies in PAM tables compare `profiles.id` with `auth.uid()`, but if profiles.id is the wrong type (bigint instead of UUID), this comparison fails.

---

## 🚨 OPTION 1: Quick Fix (Use Type-Safe SQL) - RECOMMENDED

This is the **fastest and safest** solution. Use the type-safe version of the PAM tables SQL that handles any data type issues.

### Steps:

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard/project/kycoklimpzkyrecbjecn
   - Navigate to: SQL Editor

2. **Execute Type-Safe PAM Tables SQL**
   - Copy: `docs/sql-fixes/00_fix_missing_pam_tables_safe.sql`
   - Paste into SQL Editor
   - Click "Run"

3. **If you get extension error:**
   - Create version without pg_trgm:
   ```sql
   -- Remove these two lines from the top:
   CREATE EXTENSION IF NOT EXISTS "pg_trgm";
   CREATE EXTENSION IF NOT EXISTS "btree_gin";

   -- Also remove these two index lines (around line 40):
   CREATE INDEX IF NOT EXISTS idx_pam_admin_knowledge_title_trgm...
   CREATE INDEX IF NOT EXISTS idx_pam_admin_knowledge_content_trgm...
   ```
   - Or use: `docs/sql-fixes/00_fix_missing_pam_tables_no_trgm.sql` and add `::TEXT` casts

4. **Verify Success**
   - Should see: "4 tables created successfully" message
   - Check output shows all tables with 0 rows

5. **Test PAM Tools**
   - track_savings
   - export_budget_report
   - add_knowledge
   - search_knowledge
   - create_calendar_event

**Why this works:** The `::TEXT` casts in RLS policies (e.g., `profiles.id::TEXT = auth.uid()::TEXT`) allow comparison regardless of whether profiles.id is bigint or UUID.

---

## 🔧 OPTION 2: Diagnose and Fix Profiles Table (Thorough)

If you want to **permanently fix** the profiles table structure issue, follow this multi-step process.

### Step 1: Diagnose Current State

```sql
-- Run this diagnostic query first
-- File: docs/sql-fixes/01_diagnose_profiles_table.sql
```

This will show you:
- Current profiles.id data type (should be UUID, might be bigint)
- Whether auth_user_id column exists (from accidental migration)
- All column types in profiles table

### Step 2A: If auth_user_id column exists (from accidental migration)

```sql
-- Execute rollback script
-- File: docs/sql-fixes/rollback_auth_user_id_column.sql
```

### Step 2B: If profiles.id is bigint (wrong type)

```sql
-- Execute profiles fix script
-- File: docs/sql-fixes/02_fix_profiles_id_type.sql
```

**⚠️ WARNING:** This script:
- Creates backup of profiles table
- Drops and recreates profiles with UUID id
- Restores data by matching email with auth.users
- **Make sure you understand it before running**

### Step 3: Execute PAM Tables SQL

After profiles table is fixed:
```sql
-- Now you can use the standard version
-- File: docs/sql-fixes/00_fix_missing_pam_tables.sql
```

---

## 📊 Comparison of Options

| Aspect | Option 1: Type-Safe SQL | Option 2: Fix Profiles Table |
|--------|------------------------|------------------------------|
| Time | 2 minutes | 10-15 minutes |
| Risk | Very Low | Medium (table recreation) |
| Complexity | Simple | Complex |
| Fixes Root Cause | No (workaround) | Yes (permanent fix) |
| Recommended For | Quick fix, production | Development, thorough cleanup |

---

## 🎯 Recommended Approach

### For Production (Right Now):
1. Use **Option 1** (type-safe SQL) to get PAM tools working immediately
2. Schedule **Option 2** (fix profiles table) for maintenance window

### For Development/Staging:
1. Use **Option 2** to properly fix the database structure
2. Then deploy the fix to production during low-traffic period

---

## 📁 Files Reference

### Quick Fix (Option 1):
- `00_fix_missing_pam_tables_safe.sql` - Type-safe version with `::TEXT` casts
- `00_fix_missing_pam_tables_no_trgm.sql` - Fallback without extensions (add `::TEXT` manually)

### Thorough Fix (Option 2):
- `01_diagnose_profiles_table.sql` - Check current state
- `rollback_auth_user_id_column.sql` - Remove accidental column
- `02_fix_profiles_id_type.sql` - Convert profiles.id to UUID
- `00_fix_missing_pam_tables.sql` - Standard PAM tables (use after fix)

### Documentation:
- `EXECUTION_GUIDE.md` - This file
- `DATABASE_FIX_GUIDE.md` - Detailed troubleshooting
- `ACTION_PLAN_JAN_11_2025.md` - Overall action plan

---

## ✅ Success Verification

After executing either option:

1. **Check tables exist:**
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN (
       'pam_admin_knowledge',
       'pam_knowledge_usage_log',
       'pam_savings_events',
       'calendar_events'
   );
   ```
   Expected: 4 rows

2. **Check RLS is enabled:**
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public'
   AND tablename IN (
       'pam_admin_knowledge',
       'pam_knowledge_usage_log',
       'pam_savings_events',
       'calendar_events'
   );
   ```
   Expected: All show `rowsecurity = true`

3. **Test PAM tools** in your application

---

## 🆘 Troubleshooting

### Error: "extension pg_trgm does not exist"
**Solution:** Use `00_fix_missing_pam_tables_no_trgm.sql` instead, or remove extension lines from safe version

### Error: Still getting "bigint = uuid"
**Solution:**
1. Make sure you're using the `_safe.sql` version with `::TEXT` casts
2. Check if error is from different policies (not PAM tables)
3. Run diagnostic: `01_diagnose_profiles_table.sql`

### Error: Profiles data lost after fix
**Solution:**
- Restore from backup: `SELECT * FROM profiles_backup_20250111`
- Script keeps backup until verification succeeds

---

## 🎬 Quick Start (TL;DR)

**Just want it working now?**

1. Open Supabase SQL Editor
2. Copy: `docs/sql-fixes/00_fix_missing_pam_tables_safe.sql`
3. Paste and Run
4. Done!

If extension error: Remove the two `CREATE EXTENSION` lines and the two `_trgm` index lines, then re-run.

---

**Last Updated:** January 11, 2025
**Next Step:** After PAM tables work, run AI translation system (separate task)
