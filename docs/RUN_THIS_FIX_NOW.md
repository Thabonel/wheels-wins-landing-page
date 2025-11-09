# Complete Fix for 403 Error - TWO PARTS

## The Problem (TWO Root Causes Found)

After deep research comparing working vs failing code:

### Root Cause #1: RLS Policy Type Casting ⚠️
- **Working tables** (expenses, profiles): Use explicit type casting `auth.uid()::text = user_id::text`
- **Failing table** (transition_profiles): Uses implicit casting `user_id = auth.uid()`
- Implicit UUID-to-text casting fails in Supabase REST API context

### Root Cause #2: JWT Token Caching 🔑
- GRANT statements apply to NEW tokens only, not existing ones
- Tokens issued before GRANT statements don't include new permissions
- Browser and Supabase REST API cache tokens for 60 minutes

## The Complete Fix (5 minutes)

### Part 1: Fix RLS Policies (SQL)

**Step 1: Open Supabase SQL Editor**
1. Go to: https://supabase.com/dashboard
2. Select project: **kycoklimpzkyrecbjecn**
3. Click "SQL Editor" in left sidebar
4. Click "New Query"

**Step 2: Run RLS Type Casting Fix**
Open and copy EVERYTHING from:
```
docs/sql-fixes/fix_transition_rls_type_casting.sql
```

Paste into SQL Editor and click "Run"

**Expected Output:**
```
policyname                                          | cmd    | qual
----------------------------------------------------+--------+----------------------------------
Users can view their own transition profile        | SELECT | (auth.uid()::text = user_id::text)
Users can create their own transition profile      | INSERT | (auth.uid()::text = user_id::text)
Users can update their own transition profile      | UPDATE | (auth.uid()::text = user_id::text)
Users can delete their own transition profile      | DELETE | (auth.uid()::text = user_id::text)
```

**✅ If you see `::text` in the qual column, the fix worked!**

**Step 3: Run Table-Level GRANT Fix**
Open and copy EVERYTHING from:
```
docs/sql-fixes/FINAL_FIX_transition_403.sql
```

Paste into SQL Editor and click "Run"

**Expected Output:**
Should show 16 rows (8 tables × 2 roles) with ALL privileges granted.

---

### Part 2: Frontend Auto-Retry (Already Done ✅)

The following code changes have been implemented:

1. **Created permission handler utility** (`src/utils/supabasePermissionHandler.ts`)
   - Automatically detects permission errors (code 42501)
   - Refreshes JWT token automatically
   - Retries query up to 2 times

2. **Updated TransitionNavigatorCard component**
   - All queries now wrapped with automatic retry logic
   - Token refreshes automatically on permission errors

3. **Updated useTransitionModule hook**
   - Proactively checks token expiry
   - Refreshes token if expiring within 5 minutes
   - Wraps queries with retry logic

---

## Testing the Complete Fix

### Step 1: Deploy Frontend Changes
```bash
git add .
git commit -m "fix: complete 403 error fix with RLS casting and auto-retry"
git push origin staging
```

Wait for Netlify deployment to complete (2-3 minutes).

### Step 2: Test in Browser
1. **Log out completely** from the app
2. **Clear all site data:**
   - Open DevTools (F12)
   - Application tab → Storage → Clear site data
3. **Close browser completely** (force-quit)
4. **Reopen browser** and go to staging URL
5. **Log back in** (this gets fresh JWT with new permissions)
6. **Go to You page**
7. **Click "Start Planning My Transition"**

**Expected Result:**
- ✅ Button works without errors
- ✅ Navigates to Transition page
- ✅ No "Failed to check profile status" error

---

## Troubleshooting

### If You Still See 403 Errors:

**1. Verify RLS policies were updated:**
```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'transition_profiles';
```
Look for `::text` in the qual column.

**2. Verify GRANT statements applied:**
```sql
SELECT table_name, grantee, string_agg(privilege_type, ', ') as privileges
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name = 'transition_profiles'
AND grantee IN ('authenticated', 'anon')
GROUP BY table_name, grantee;
```
Should return 2 rows (authenticated + anon with ALL privileges).

**3. Force new JWT token:**
Run in browser console:
```javascript
// Clear everything
localStorage.clear();
sessionStorage.clear();
indexedDB.deleteDatabase('supabase-auth-token');

// Sign out
await supabase.auth.signOut();

// Reload page
window.location.reload();
```

Then log in again and test.

---

## What Changed in the Code

### Files Created:
1. `src/utils/supabasePermissionHandler.ts` - Automatic retry logic
2. `docs/sql-fixes/fix_transition_rls_type_casting.sql` - RLS policy fix

### Files Modified:
1. `src/components/you/TransitionNavigatorCard.tsx` - Added auto-retry to all queries
2. `src/hooks/useTransitionModule.ts` - Added proactive token refresh + auto-retry

### How Auto-Retry Works:
```typescript
// Before (failed on permission error):
const { data, error } = await supabase
  .from('transition_profiles')
  .select('*')
  .eq('user_id', user.id);

// After (auto-retries with token refresh):
const { data, error } = await handlePermissionError(
  async () => supabase
    .from('transition_profiles')
    .select('*')
    .eq('user_id', user.id)
);
```

When permission error detected:
1. Handler catches error code 42501
2. Waits 500ms
3. Calls `supabase.auth.refreshSession()`
4. Retries query with fresh token
5. Returns result or re-throws error after 2 attempts

---

## Why This Fix Works

### The Type Casting Issue:
```sql
-- BEFORE (implicit casting - fails in REST API):
USING (user_id = auth.uid())

-- AFTER (explicit casting - works everywhere):
USING (auth.uid()::text = user_id::text)
```

Supabase REST API requires explicit type casting when comparing UUIDs in RLS policies. Working tables (expenses, profiles) already use explicit casting, which is why they work.

### The Token Caching Issue:
- PostgreSQL applies GRANT statements immediately
- But JWT tokens are immutable once issued
- Tokens issued BEFORE grants don't include new permissions
- Solution: Force token refresh + automatic retry

### The Complete Solution:
1. **RLS Fix**: Makes policies work like other tables (explicit casting)
2. **GRANT Fix**: Ensures table-level permissions exist
3. **Auto-Retry**: Handles token caching transparently

---

**This is the complete fix. Both SQL parts + frontend changes are required.**
