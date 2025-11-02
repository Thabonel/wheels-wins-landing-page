# How to Fix the "Failed to Save" Error

## The Problem
Your JWT token shows you're logged in with role **"admin"**, but the database RLS policies only allow **"authenticated"** and **"anon"** roles to access the transition_profiles table.

This is why you're getting the 403 Forbidden error when trying to save your onboarding data.

## The Solution (3 Simple Steps)

### Step 1: Run the SQL Fix
1. Go to your Supabase SQL Editor:
   **https://supabase.com/dashboard/project/kycoklimpzkyrecbjecn/sql**

2. Copy ALL the SQL from the file:
   **`docs/sql-fixes/FIX_ADMIN_ROLE_NOW.sql`**

3. Paste it into the SQL Editor

4. Click **"Run"** (or press Cmd+Enter / Ctrl+Enter)

5. You should see output showing that **3 roles** (admin, anon, authenticated) now have privileges

### Step 2: Clear Your Login Session
1. **Log out** of the Wheels & Wins application

2. **Clear your browser cache**:
   - **Mac**: Press **Cmd + Shift + R**
   - **Windows/Linux**: Press **Ctrl + Shift + R**

3. **Log back in** with your credentials

   *(This gives you a fresh JWT token with the new admin permissions)*

### Step 3: Test the Fix
1. Go to the **Life Transition Navigator** page

2. Click through the onboarding:
   - Step 1: Select your departure date and transition type
   - Click **"Next"** (this should save successfully now)
   - Step 2: Fill in motivation or concerns
   - Click **"Complete Setup"** (this should work now!)

3. You should see: **"Your transition plan is ready!"** ✅

## What We Fixed

**Before:**
```
RLS Policies: ✅ authenticated, ✅ anon, ❌ admin (MISSING!)
Your JWT Role: "admin" ← This was being blocked!
```

**After:**
```
RLS Policies: ✅ authenticated, ✅ anon, ✅ admin (ADDED!)
Your JWT Role: "admin" ← Now allowed!
```

## If It Still Doesn't Work

1. Check the browser console for errors (F12 → Console tab)
2. Verify you logged out AND cleared cache (very important!)
3. Check that the SQL ran successfully (no error messages in Supabase)
4. Try a different browser (to ensure cache is truly cleared)

## Need Help?

If you're still getting errors after following these steps:
1. Copy the error message from the browser console
2. Copy the verification query output from Step 1 (the table showing admin/anon/authenticated)
3. Share both of these and I'll help troubleshoot further
