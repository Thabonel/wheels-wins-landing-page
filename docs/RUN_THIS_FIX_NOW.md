# Fix 403 Error - Run This Now

## The Problem
- Table structure: ✅ Correct (`user_id` column exists)
- RLS policies: ✅ Correct (`user_id = auth.uid()`)
- **Table-level GRANTs: ❌ MISSING** ← This is the problem!

## The Fix (2 minutes)

### Step 1: Open Supabase SQL Editor
1. Go to: https://supabase.com/dashboard
2. Select project: **kycoklimpzkyrecbjecn**
3. Click "SQL Editor" in left sidebar
4. Click "New Query"

### Step 2: Copy & Run SQL
Open this file and copy EVERYTHING:
```
docs/sql-fixes/FINAL_FIX_transition_403.sql
```

Paste into SQL Editor and click "Run" (or Cmd/Ctrl + Enter)

### Step 3: Verify It Worked
You should see **TWO result sets**:

**Result 1: Verification Query**
Should show 16 rows (8 tables × 2 roles):
```
table_name              | grantee       | privileges
------------------------+---------------+----------------------------
transition_community    | anon          | DELETE, INSERT, REFERENCES...
transition_community    | authenticated | DELETE, INSERT, REFERENCES...
transition_equipment    | anon          | DELETE, INSERT, REFERENCES...
transition_equipment    | authenticated | DELETE, INSERT, REFERENCES...
... (12 more rows)
```

**Result 2: Test Query**
Should show:
```
test_count
----------
0
```

**If you see both of these, the fix worked! ✅**

### Step 4: Test in Browser
1. Log out of the app
2. Clear browser cache (Cmd/Ctrl + Shift + R)
3. Log back in
4. Go to You page
5. Click "Start Planning My Transition"

**Expected:** Button should work without "Failed to check profile status" error

---

## If It Still Doesn't Work

Run this in browser console after logging in:
```javascript
localStorage.clear()
await supabase.auth.signOut()
```

Then close browser completely, reopen, and log in again.

This forces a fresh JWT token with the new permissions.

---

**That's it! This should fix the 403 error.**
