# Database Fix Guide - Profiles Table Issue

**Date:** January 11, 2025
**Issue:** "operator does not exist: bigint = uuid" error
**Cause:** Accidentally executed illustrative migration adding auth_user_id column

---

## What Happened

An illustrative migration script (meant as an example only) was accidentally executed in Supabase SQL Editor. This script added an `auth_user_id UUID` column to the `profiles` table, which caused type mismatch errors throughout the database.

### The Problematic Migration (DO NOT RUN AGAIN)
```sql
-- This was run by mistake
ALTER TABLE public.profiles ADD COLUMN auth_user_id uuid UNIQUE;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_auth_user_fk
  FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX idx_profiles_auth_user_id ON public.profiles(auth_user_id);
```

### Error Symptoms
- `ERROR: 42883: operator does not exist: bigint = uuid`
- Database queries comparing different id types failing
- PAM tools unable to access user data

---

## How to Fix

### Step 1: Execute Rollback Script

**File:** `docs/sql-fixes/rollback_auth_user_id_column.sql`

**Instructions:**
1. Open your Supabase project: https://supabase.com/dashboard/project/kycoklimpzkyrecbjecn
2. Navigate to: SQL Editor
3. Copy contents of `rollback_auth_user_id_column.sql`
4. Paste into SQL Editor
5. Click "Run"
6. Verify success message (no errors)

**What it does:**
- Drops the foreign key constraint `profiles_auth_user_fk`
- Drops the index `idx_profiles_auth_user_id`
- Removes the `auth_user_id` column from profiles table

### Step 2: Verify Profiles Table Schema

After rollback, your profiles table should have:
```sql
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**To verify:**
```sql
-- Run this query to check columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
AND table_schema = 'public'
ORDER BY ordinal_position;
```

**Expected output:**
| column_name | data_type |
|-------------|-----------|
| id | uuid |
| email | text |
| full_name | text |
| avatar_url | text |
| created_at | timestamp with time zone |
| updated_at | timestamp with time zone |

**If you see `auth_user_id` in the list, the rollback didn't work - try again.**

### Step 3: Execute PAM Table Migrations

Only after rollback is successful and verified:

1. Execute: `docs/sql-fixes/00_fix_missing_pam_tables.sql`
   - Creates 4 missing tables for PAM tools
   - Enables pg_trgm and btree_gin extensions

2. If extension error occurs, use: `docs/sql-fixes/00_fix_missing_pam_tables_no_trgm.sql`
   - Same tables, but without trigram indexes

### Step 4: Test PAM Tools

After migrations complete, test these 5 previously broken tools:
1. `track_savings` - Save money tracking
2. `export_budget_report` - Budget PDF export
3. `add_knowledge` - Add admin knowledge
4. `search_knowledge` - Search knowledge base
5. `create_calendar_event` - Calendar integration

---

## Prevention

**To avoid this in the future:**

1. **Never execute "Illustrative" or "Example" SQL scripts**
   - These are documentation only
   - They often contain destructive operations

2. **Always read SQL comments before executing**
   - Look for warnings like "DO NOT EXECUTE"
   - Check if script is for a specific purpose

3. **Use transactions for testing**
   ```sql
   BEGIN;
   -- Your SQL here
   ROLLBACK; -- If testing
   -- or COMMIT; -- If you're sure
   ```

4. **Backup before major changes**
   - Supabase has automatic backups
   - But you can also export specific tables first

---

## Files Reference

All SQL files are in: `docs/sql-fixes/`

### Rollback
- `rollback_auth_user_id_column.sql` - Fix profiles table

### PAM Migrations
- `00_fix_missing_pam_tables.sql` - With pg_trgm extension
- `00_fix_missing_pam_tables_no_trgm.sql` - Fallback without extension

### Other Migrations
- `20250721000000-fix-database-issues.sql` - Original profiles table creation
- `20250807120000-create-expenses-table.sql` - Expenses table (uses bigserial)

---

## Execution Order (Critical)

```
1. ✅ Execute: rollback_auth_user_id_column.sql
   ↓
2. ✅ Verify: profiles table schema (should have id UUID, no auth_user_id)
   ↓
3. ✅ Execute: 00_fix_missing_pam_tables.sql (or _no_trgm version)
   ↓
4. ✅ Test: 5 PAM tools
   ↓
5. ✅ Deploy: Restart backend services if needed
```

---

## Troubleshooting

### If rollback fails:
```sql
-- Force drop (if constraint errors)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_auth_user_fk CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS auth_user_id CASCADE;
```

### If you still see bigint vs UUID errors:
1. Check for other tables comparing bigint with UUID
2. Look for queries joining expenses.id (bigint) with profiles.id (uuid)
3. Review RLS policies on affected tables

### If PAM tools still fail after migrations:
1. Check Supabase logs for specific errors
2. Verify all 4 tables were created successfully
3. Check RLS policies are enabled
4. Restart backend services

---

## Contact

**Issues?** Check:
- `docs/TRANSLATION_SYSTEM_SUMMARY.md` - Overall status
- Backend logs on Render.com
- Supabase dashboard logs

**Success?** You should see:
- No bigint vs UUID errors
- 5 PAM tools operational
- Clean profiles table schema

---

**Next Steps After Fix:**
1. Test all PAM tools thoroughly
2. Run AI translation system (separate issue)
3. Deploy to staging for testing
4. Monitor error logs for 24 hours

---

*Last Updated: January 11, 2025*
