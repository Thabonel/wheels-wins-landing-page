# RPC 404 Error Fix - Parameter Name Mismatch

**Date**: January 9, 2026
**Issue**: RPC functions returning 404 despite existing in database
**Root Cause**: Frontend calling functions with wrong parameter names

---

## Problem Summary

Six RPC functions were created in Supabase to support transition tracking features, but three of them were returning 404 errors when called from the frontend, despite:
- Functions existing in database ✅
- Functions having proper EXECUTE permissions ✅
- Functions working when called directly via SQL ✅

**Failing Functions**:
1. `get_shakedown_stats` - 404
2. `get_vehicle_mod_stats` - 404
3. `get_equipment_stats` - 404

**Working Functions**:
4. `get_launch_week_progress` - Working
5. `get_user_connection_stats` - Working
6. `check_badge_eligibility` - Working

---

## Root Cause Discovered

**Parameter Name Mismatch**: The database functions ALL expect `p_user_id`, but the frontend was calling 3 of them with `p_profile_id`!

| Function | Frontend Param | DB Expects | Status |
|----------|----------------|------------|--------|
| `get_shakedown_stats` | `p_profile_id` | `p_user_id` | ❌ MISMATCH |
| `get_vehicle_mod_stats` | `p_profile_id` | `p_user_id` | ❌ MISMATCH |
| `get_equipment_stats` | `p_profile_id` | `p_user_id` | ❌ MISMATCH |
| `get_launch_week_progress` | `p_user_id` | `p_user_id` | ✅ MATCH |
| `get_user_connection_stats` | `p_user_id` | `p_user_id` | ✅ MATCH |
| `check_badge_eligibility` | `p_user_id` | `p_user_id` | ✅ MATCH |

### Why 404 Error?

When PostgREST receives an RPC call, it looks for a function with a signature that matches **both** the function name AND the parameter names.

When frontend called:
```typescript
supabase.rpc('get_shakedown_stats', { p_profile_id: 'uuid-here' })
```

PostgREST looked for:
```sql
get_shakedown_stats(p_profile_id uuid)  -- This doesn't exist!
```

But only this exists:
```sql
get_shakedown_stats(p_user_id uuid)  -- This is what we have
```

**Result**: PostgREST returns 404 "function not found" because the parameter signature doesn't match.

---

## Fixes Applied

### Fix 1: ShakedownLogger.tsx (Line 191)

**Before**:
```typescript
const { data, error } = await supabase.rpc('get_shakedown_stats', {
  p_profile_id: profileId,  // ❌ Wrong parameter name
});
```

**After**:
```typescript
const { data, error } = await supabase.rpc('get_shakedown_stats', {
  p_user_id: profileId,  // ✅ Correct parameter name
});
```

### Fix 2: VehicleModifications.tsx (Line 148)

**Before**:
```typescript
const { data, error } = await supabase
  .rpc('get_vehicle_mod_stats', { p_profile_id: profile.id });  // ❌ Wrong
```

**After**:
```typescript
const { data, error } = await supabase
  .rpc('get_vehicle_mod_stats', { p_user_id: profile.id });  // ✅ Correct
```

### Fix 3: EquipmentManager.tsx (Line 137)

**Before**:
```typescript
const { data, error } = await supabase
  .rpc('get_equipment_stats', { p_profile_id: profile.id });  // ❌ Wrong
```

**After**:
```typescript
const { data, error } = await supabase
  .rpc('get_equipment_stats', { p_user_id: profile.id });  // ✅ Correct
```

---

## Additional Improvements

### Added Error Handling to LaunchWeekPlanner.tsx (Line 173)

**Before** (Silent failure):
```typescript
const { data: progressData } = await supabase
  .rpc('get_launch_week_progress', { p_user_id: user.id });
// No error check - failures go unnoticed
```

**After** (Explicit error handling):
```typescript
const { data: progressData, error: progressError } = await supabase
  .rpc('get_launch_week_progress', { p_user_id: user.id });

if (progressError) {
  console.error('Error loading progress:', progressError);
  throw progressError;
}
```

### Added Error Handling to TransitionSupport.tsx (Line 193)

**Before** (Silent failure):
```typescript
const { data: badgesData } = await supabase
  .rpc('check_badge_eligibility', { p_user_id: user.id });
// No error check - failures go unnoticed
```

**After** (Explicit error handling):
```typescript
const { data: badgesData, error: badgesError } = await supabase
  .rpc('check_badge_eligibility', { p_user_id: user.id });

if (badgesError) {
  console.error('Error checking badge eligibility:', badgesError);
  throw badgesError;
}
```

---

## Files Modified

1. `src/components/transition/ShakedownLogger.tsx`
2. `src/components/transition/VehicleModifications.tsx`
3. `src/components/transition/EquipmentManager.tsx`
4. `src/components/transition/LaunchWeekPlanner.tsx`
5. `src/components/transition/TransitionSupport.tsx`

---

## Testing Performed

### Before Fix
- ❌ ShakedownLogger: 404 error when loading stats
- ❌ VehicleModifications: 404 error when loading stats
- ❌ EquipmentManager: 404 error when loading stats
- ✅ LaunchWeekPlanner: Working (silent failures if error)
- ✅ CommunityHub: Working
- ✅ TransitionSupport: Working (silent failures if error)

### After Fix
- ✅ All RPC functions successfully called
- ✅ Proper error messages logged when issues occur
- ✅ No more 404 errors in console
- ✅ Stats load correctly in all components

---

## Lesson Learned

### Why This Happened

The confusion arose because:
1. The database functions were created with `p_user_id` parameter (following Supabase convention)
2. Frontend developers assumed `p_profile_id` because the value being passed was from `profile.id`
3. PostgREST requires **exact parameter name matching** - it doesn't match by position or type

### Best Practice

**Always verify parameter names when creating/calling RPC functions:**

1. **Check database function signature**:
   ```sql
   SELECT
     proname as function_name,
     pg_get_function_arguments(oid) as parameters
   FROM pg_proc
   WHERE proname = 'your_function_name';
   ```

2. **Match parameter names exactly in frontend**:
   ```typescript
   // If function signature is: my_function(p_user_id uuid, p_value text)
   // Then call MUST use exact names:
   supabase.rpc('my_function', {
     p_user_id: userId,   // MUST match parameter name
     p_value: value       // MUST match parameter name
   })
   ```

3. **Use consistent naming conventions**:
   - Database: `p_user_id` (parameter prefix + snake_case)
   - Frontend: Match database exactly in RPC calls
   - Don't assume `profile.id` means parameter should be named `p_profile_id`

---

## Deployment Status

- ✅ Fixed on staging branch
- ✅ All fixes tested and working
- 🔄 Ready to merge to main

---

**Date Applied**: January 9, 2026
**Applied By**: Claude Code
**Severity**: High (blocking feature functionality)
**Status**: ✅ Complete
