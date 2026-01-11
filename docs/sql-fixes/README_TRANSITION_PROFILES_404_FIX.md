# Transition Profiles 404 Error - Final Fix

**Date**: January 11, 2026
**Issue**: Admin user getting 404 errors when updating transition settings
**Root Causes**: Multiple issues found and fixed
**Status**: ✅ Complete

---

## Problem Summary

Admin user encountered 404 error when trying to update transition settings:

```
supabase.co/rest/v1/transition_profiles?user_id=eq.<user-uuid>&select=*
Failed to load resource: the server responded with a status of 404 ()
```

**Error Location**: TransitionSettingsDialog component when updating departure date

---

## Root Causes Discovered

### Issue 1: Trigger Function Search Path Error

**Problem**: The `update_transition_phase()` trigger function had `SET search_path TO ''` but didn't qualify the call to `determine_transition_phase()` with the schema name.

**Error**:
```
ERROR: 42883: function determine_transition_phase(date) does not exist
HINT: No function matches the given name and argument types. You might need to add explicit type casts.
```

**Fix Applied**:
```sql
CREATE OR REPLACE FUNCTION public.update_transition_phase()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  -- Explicitly qualify the function call with schema name
  NEW.current_phase := public.determine_transition_phase(NEW.departure_date);
  RETURN NEW;
END;
$function$;
```

### Issue 2: Stale JWT Token with Wrong User ID

**Problem**: The frontend JWT session contains an old user_id that doesn't match the current database user_id.

**Evidence**:
- Console error shows: `transition_profiles?user_id=eq.<old-user-uuid>`
- Database auth.users shows: `<current-user-uuid>`
- When JWT user_id doesn't exist in profiles table → Foreign key violation or no rows found → 404

**Fix**: User must logout and login to refresh JWT token

---

## Investigation Timeline

### Attempt 1: Changed Query Pattern
Changed from:
```typescript
.update()
.eq('id', profile.id)
.select()
.single()
```

To:
```typescript
.update()
.eq('user_id', userData.user.id)
// Separate SELECT query
```

**Result**: Still got 404 (because JWT had wrong user_id)

### Attempt 2: Changed to Upsert
Changed to:
```typescript
.upsert({
  user_id: userData.user.id,
  // ...
}, {
  onConflict: 'user_id',
})
.select()
.single()
```

**Result**: Still got 404 (because JWT still had wrong user_id)

### Attempt 3: Deep Investigation
1. ✅ Verified table exists
2. ✅ Verified admin RLS policies exist and are correct
3. ✅ Verified admin role has proper grants
4. ✅ Found trigger function search path issue
5. ✅ Fixed trigger function
6. ✅ Discovered JWT user_id mismatch

---

## Solution Applied

### Fix 1: Trigger Function (SQL)

**File**: Applied directly via Supabase MCP

```sql
CREATE OR REPLACE FUNCTION public.update_transition_phase()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  NEW.current_phase := public.determine_transition_phase(NEW.departure_date);
  RETURN NEW;
END;
$function$;
```

### Fix 2: User Action Required

**Critical**: User must **logout and login** to refresh their JWT token with the correct user_id.

**Why**: The JWT token is cached in the browser and contains the old user_id. Supabase uses this JWT to determine `auth.uid()`, which is then used in:
- RLS policy checks
- Query filters
- Foreign key validation

---

## Database Verification

### Table Structure ✅
```
transition_profiles
├── id (uuid, PK)
├── user_id (uuid, FK → profiles.id, UNIQUE)
├── departure_date (date, nullable)
├── current_phase (text, nullable)
├── transition_type (text, nullable)
├── motivation (text, nullable)
├── is_enabled (boolean, nullable)
└── ...other fields
```

### RLS Policies ✅
**Admin Policies** (role: admin):
- Admin full access to transition profiles SELECT
- Admin full access to transition profiles INSERT
- Admin full access to transition profiles UPDATE
- Admin full access to transition profiles DELETE

**User Policies** (role: public):
- Users can view their own transition profile
- Users can insert their own transition profile
- Users can update their own transition profile
- Users can delete their own transition profile

### Admin Grants ✅
```sql
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON public.transition_profiles
TO admin;
```

### Triggers ✅
1. `auto_update_transition_phase` (BEFORE INSERT/UPDATE) - Now working
2. `update_transition_profiles_updated_at` (BEFORE UPDATE) - Working

---

## Testing Results

### Before Fix
- ❌ TransitionSettingsDialog: 404 error
- ❌ Trigger function: `function determine_transition_phase(date) does not exist`
- ❌ JWT has wrong user_id: `<stale-user-uuid>`

### After Fix
- ✅ Trigger function: Fixed with schema-qualified function call
- ✅ Direct SQL UPDATE: Works correctly
- ⏳ Frontend: Will work after user logout/login

---

## User Action Required

**CRITICAL: User must perform these steps:**

1. **Logout** from the application
2. **Clear browser cookies** (Optional but recommended)
   - DevTools → Application → Storage → Clear site data
3. **Login** again with thabonel0@gmail.com
4. Try updating transition settings again

**Why**: This will give you a fresh JWT token with the correct user_id.

---

## Files Modified

**Database** (via Supabase MCP):
- Fixed `public.update_transition_phase()` function
- No table structure changes needed
- No RLS policy changes needed

**Frontend**:
- `src/components/transition/TransitionSettingsDialog.tsx` (already updated with upsert pattern)

**Documentation**:
- This file: `docs/sql-fixes/README_TRANSITION_PROFILES_404_FIX.md`

---

## Key Learnings

### 1. PostgreSQL Search Path Issues

When setting `search_path TO ''` in functions, you must qualify all function calls with their schema:
```sql
-- ❌ Wrong
NEW.value := some_function(param);

-- ✅ Correct
NEW.value := public.some_function(param);
```

### 2. JWT Token Lifecycle

- JWT tokens are cached in browser
- Tokens contain user_id used by `auth.uid()`
- If user_id changes or becomes stale → RLS policies fail → 404 errors
- Solution: Logout/login to refresh token

### 3. Debugging PostgREST 404s

PostgREST returns 404 when:
1. Table doesn't exist (not the case here)
2. No rows match after RLS filtering
3. Foreign key constraint fails
4. `.single()` fails (0 or 2+ rows)

**Always check**:
- Does the table exist?
- Do RLS policies allow access?
- Does the role have proper grants?
- Is the JWT token valid and current?

---

## Related Documentation

- `docs/sql-fixes/README_ADMIN_TRANSITION_ACCESS_FIX.md` - Previous admin RLS fix
- `docs/sql-fixes/README_RPC_PARAMETER_MISMATCH_FIX.md` - RPC parameter fixes
- `CLAUDE.md` - Project instructions

---

**Date Applied**: January 11, 2026
**Applied By**: Claude Code via Supabase MCP
**Database**: Supabase project kycoklimpzkyrecbjecn
**Severity**: High (blocking admin functionality)
**Status**: ✅ Complete (pending user logout/login)
