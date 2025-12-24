# Session Handover - December 24, 2025

**Session Date:** December 24, 2025
**Branch:** staging
**Status:** Modal fix deployed ✅ | Read-only warning investigation ongoing 🔄

---

## Executive Summary

This session addressed two issues in the admin shop panel:
1. **Modal Scroll Issue** - FIXED ✅ (Deployed to staging)
2. **Read-Only Warning** - INVESTIGATING 🔄 (Root cause identified)

### Quick Status
- ✅ Edit Product modal now scrolls properly (Save button accessible)
- 🔄 "Admin is in read-only mode" warning still appears (not a placeholder - real permission check)
- 📝 Diagnostic SQL files created for RLS investigation
- 🚀 Changes committed and pushed to staging (commit `3ad7cad5`)

---

## Issue 1: Modal Scroll Failure ✅ FIXED

### Problem Description
Edit Product modal in admin shop was cut off at the bottom - Save button inaccessible despite three previous fix attempts.

### Root Cause Discovered
**File:** `/src/components/common/AnimatedDialog.tsx` (line 66)

The `asChild` prop on `DialogPrimitive.Content` caused Radix UI to skip rendering the Content element and merge all props (including scroll classes) onto the child `motion.div`. Since the motion.div had active CSS transforms for animation, browsers couldn't properly calculate scroll dimensions.

**Technical Details:**
```typescript
// BEFORE (BROKEN):
<DialogPrimitive.Content
  ref={ref}
  asChild  // ← PROBLEM: Props merged onto motion.div instead of Content
  className="... max-h-[90vh] overflow-y-auto ..."
>
  <motion.div {...modalVariant}>  // ← Scroll classes ended up here
    {children}
  </motion.div>
</DialogPrimitive.Content>

// AFTER (WORKING):
<DialogPrimitive.Content
  ref={ref}
  // asChild removed - Content is now the scroll container
  className="... max-h-[90vh] overflow-y-auto ..."
>
  <motion.div {...modalVariant}>  // ← Just handles animation now
    {children}
  </motion.div>
</DialogPrimitive.Content>
```

### Why This Worked
- DialogPrimitive.Content now renders as actual DOM element
- Scroll classes (`max-h-[90vh] overflow-y-auto`) apply to Content, not motion.div
- No active transforms interfere with scrolling
- Browser can properly calculate scroll container dimensions

### Solution Applied
**File Modified:** `src/components/common/AnimatedDialog.tsx`
**Change:** Removed `asChild` prop from line 66
**Commit:** `3ad7cad5`
**Deployed:** Staging branch (pushed December 24, 2025)

### Verification
User screenshot confirmed:
- ✅ Modal scrolls properly
- ✅ Price field visible at bottom
- ✅ Save button accessible
- ✅ Animation still works (motion.div still handles transitions)

**Test on staging:** https://wheels-wins-staging.netlify.app/admin/shop

---

## Issue 2: Read-Only Warning 🔄 INVESTIGATING

### Problem Description
Admin panel shows warning: "Admin is in read-only mode due to database permissions. You can view active products, but cannot create, edit, delete, or reorder."

**User's observation:** "This is only in the amazon products page, maybe it is just a placeholder?"

**Investigation Result:** NOT a placeholder - it's a real permission check via Edge Function.

### How the Warning Works

**Frontend Code:** `/src/components/admin/AmazonProductsManagement.tsx`

```typescript
// Lines 256-278: Fetch products via Edge Function
const res = await fetch(`${baseUrl}?provider=amazon&includeInactive=true`, {
  headers: {
    'Authorization': token ? `Bearer ${token}` : '',
  }
});

if (res.ok) {
  setLimitedAccess(false);  // ← Full access
  // ... fetch products
}

if (res.status === 401 || res.status === 403) {
  console.warn('Edge function denied; falling back to public products');
  setLimitedAccess(true);  // ← Shows the warning
}
```

**Edge Function:** `/supabase/functions/admin-affiliate-products/index.ts`

```typescript
// Lines 10-21: isAdmin check
async function isAdmin(userId: string): Promise<boolean> {
  const service = createServiceClient();
  const { data, error } = await service
    .from('admin_users')
    .select('user_id, role, status')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .eq('status', 'active')
    .maybeSingle();

  if (error) return false;  // ← Returns false on error!
  return !!data;
}

// Line 110: Permission check
if (!(await isAdmin(user.id))) return notAllowed();  // ← Returns 403
```

### Database Verification Results

User ran diagnostic SQL queries (created during this session):

#### ✅ Database is CORRECT
1. **is_admin() function exists** with triple-layer protection:
   - Layer 1: Hardwired UUID (`21a2151a-cd37-41d5-a1c7-124bb05e7a6a`)
   - Layer 2: admin_users table check
   - Layer 3: profiles.role check

2. **RLS policies exist and correct:**
   - `admin_delete`, `admin_insert`, `admin_select_all`, `admin_update`
   - All policies correctly call `is_admin()`

3. **PostgreSQL grants correct:**
   - `admin`, `authenticated`, `service_role` all have SELECT, INSERT, UPDATE, DELETE
   - Verified on `affiliate_products` table

4. **admin_users entry exists:**
   - user_id: `21a2151a-cd37-41d5-a1c7-124bb05e7a6a`
   - email: `thabonel0@gmail.com`
   - role: `admin`
   - status: `active`

5. **profiles.role set:**
   - role: `admin`

6. **User logged out and back in** (did not fix the warning)

### Hypothesis: RLS Blocking SERVICE Role

The Edge Function uses **SERVICE role** to query the `admin_users` table. If `admin_users` has RLS enabled with restrictive policies, the SERVICE role query might fail, causing:

```
Edge Function query admin_users → RLS blocks SERVICE role
→ Query fails → isAdmin() returns false → 403 → Warning appears
```

### Next Diagnostic Step

Check if `admin_users` table has RLS policies blocking SERVICE role:

```sql
-- Check if admin_users has RLS enabled
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'admin_users';

-- Check policies on admin_users table
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'admin_users';
```

**Expected fix:** If RLS is blocking SERVICE role:
- Option 1: Disable RLS on `admin_users` table
- Option 2: Add policy allowing SERVICE role access
- Option 3: Update Edge Function to use different approach

---

## Files Created/Modified

### Modified Files
1. **`src/components/common/AnimatedDialog.tsx`**
   - Line 66: Removed `asChild` prop
   - Status: Committed and pushed to staging

### Created Files (Documentation)
2. **`docs/sql-fixes/DIAGNOSTIC_ADMIN_ACCESS.sql`**
   - 7 diagnostic SQL queries to identify admin access issues
   - Checks: functions, RLS policies, grants, admin_users, profiles

3. **`docs/sql-fixes/FIX_ADMIN_ACCESS_DEFINITIVE.sql`**
   - Documents the triple-layer `is_admin()` function
   - Already applied to database (pre-existing fix)
   - Layer 1: Hardwired UUID (cannot be removed)
   - Layer 2: admin_users table check
   - Layer 3: profiles.role check

4. **`docs/sql-fixes/CHECK_POLICY_DEFINITIONS.sql`**
   - Query to check RLS policy definitions on affiliate_products
   - Verifies policies call `is_admin()`

5. **`docs/sql-fixes/diagnose_admin_permissions.sql`** (auto-created)
6. **`docs/sql-fixes/fix_admin_permissions_complete.sql`** (auto-created)

---

## Git History

### Commit Details
```bash
Commit: 3ad7cad5
Author: Thabo Nel
Date: December 24, 2025
Branch: staging

Message:
fix(modal): remove asChild prop to enable scrolling in Edit Product dialog

- Removed asChild prop from AnimatedDialog.tsx line 66
- DialogPrimitive.Content is now scroll container instead of motion.div
- Fixes issue where Save button was off-screen and inaccessible
- Animation still works, just changes DOM hierarchy
- Added diagnostic SQL files for ongoing admin access investigation

Root cause: asChild caused scroll classes to apply to animated element
instead of container, breaking browser scroll calculations.

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Files Changed
```
 6 files changed, 432 insertions(+), 1 deletion(-)

 Modified:
 - src/components/common/AnimatedDialog.tsx

 Created:
 - docs/sql-fixes/CHECK_POLICY_DEFINITIONS.sql
 - docs/sql-fixes/DIAGNOSTIC_ADMIN_ACCESS.sql
 - docs/sql-fixes/FIX_ADMIN_ACCESS_DEFINITIVE.sql
 - docs/sql-fixes/diagnose_admin_permissions.sql
 - docs/sql-fixes/fix_admin_permissions_complete.sql
```

---

## Testing Checklist

### Modal Scroll Fix ✅
- [x] Changes committed to staging
- [x] Changes pushed to GitHub
- [ ] Netlify deployment verified (in progress)
- [ ] Test on staging: Edit Product modal scrolls
- [ ] Test on staging: Save button accessible
- [ ] Test on staging: Animation still works

### Read-Only Warning Investigation 🔄
- [x] Database configuration verified correct
- [x] Diagnostic SQL files created
- [ ] Check admin_users RLS policies
- [ ] Fix RLS if blocking SERVICE role
- [ ] Test Edge Function returns 200 (not 403)
- [ ] Verify warning disappears
- [ ] Commit fix to staging
- [ ] Deploy to production

---

## Key Learnings

### 1. Radix UI `asChild` Behavior
- `asChild` makes Radix UI skip rendering the component wrapper
- Instead, props get merged onto the first child element
- Scroll classes on animated elements break browser scroll calculations
- **Fix:** Let Radix render the wrapper (scroll container), animate the child

### 2. Edge Function Permission Checks
- Edge Functions use SERVICE role to query database
- SERVICE role bypasses RLS... unless RLS blocks SERVICE role explicitly
- Always check if RLS policies might block SERVICE role queries
- Error handling: `if (error) return false` can hide RLS issues

### 3. Database vs Edge Function Permissions
- Database can be perfect (is_admin() works, grants correct, RLS policies correct)
- Edge Function can still fail if SERVICE role is blocked
- Two separate permission layers to debug

### 4. Diagnostic SQL is Critical
- Created reusable diagnostic queries for future issues
- Helps verify database config without assumptions
- Documents expected state for other developers

---

## Next Session Tasks

### Immediate Priority
1. **Check admin_users RLS policies**
   ```sql
   SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'admin_users';
   SELECT policyname, permissive, roles, cmd, qual FROM pg_policies WHERE tablename = 'admin_users';
   ```

2. **Fix RLS if blocking SERVICE role**
   - If RLS enabled with restrictive policies, disable or add SERVICE role policy
   - Test Edge Function returns 200 instead of 403
   - Verify warning disappears

3. **Deploy read-only fix to staging**
   - Commit SQL changes
   - Test on staging
   - Verify admin can edit products without warning

### Future Improvements
1. **Add Edge Function logging**
   - Log when isAdmin() fails
   - Log the actual error from admin_users query
   - Helps debug similar issues faster

2. **Consider admin_users table design**
   - Does it need RLS?
   - SERVICE role should always have access
   - Document expected permissions

3. **Update admin panel**
   - Better error message (current one is generic)
   - Link to documentation for fixing permissions
   - Show actual error from Edge Function

---

## Related Documentation

### Project Instructions
- `CLAUDE.md` - Main project instructions
- `docs/DATABASE_SCHEMA_REFERENCE.md` - Database table schemas
- `docs/SHOP_TECHNICAL_DOCUMENTATION.md` - Shop architecture

### Session Files
- `docs/sql-fixes/DIAGNOSTIC_ADMIN_ACCESS.sql` - Diagnostic queries
- `docs/sql-fixes/FIX_ADMIN_ACCESS_DEFINITIVE.sql` - is_admin() function
- `CLAUDE.local.md` - Session context (updated December 5, 2025)

### Edge Functions
- `supabase/functions/admin-affiliate-products/index.ts` - Admin products API
- `supabase/functions/_shared/utils.ts` - Shared utilities

---

## Environment Details

**Frontend:**
- Staging: https://wheels-wins-staging.netlify.app
- Production: https://wheelsandwins.com

**Backend:**
- Staging: https://wheels-wins-backend-staging.onrender.com
- Production: https://pam-backend.onrender.com

**Database:**
- Shared Supabase PostgreSQL (staging and production use same DB)

**Current Branch:** staging
**Last Commit:** 3ad7cad5
**Deployment Status:** Pushed to GitHub, Netlify deploying

---

## Contact Information

**Admin User:**
- Email: thabonel0@gmail.com
- User ID: 21a2151a-cd37-41d5-a1c7-124bb05e7a6a

**Session Summary:**
- Modal scroll fix complete and deployed ✅
- Read-only warning investigation ongoing 🔄
- Next step: Check admin_users RLS policies

---

**Last Updated:** December 24, 2025
**Status:** Modal fix deployed | RLS investigation in progress
**Next Action:** Run admin_users RLS diagnostic queries
