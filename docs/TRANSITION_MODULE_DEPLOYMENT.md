# Transition Module - Deployment Checklist

**Date:** October 28, 2025
**Status:** Frontend fixes committed ✅ | SQL fixes ready for deployment ⏳

---

## What Was Completed

### ✅ Frontend Query Pattern Fixes (Commit 57a78c36)

Fixed 4 transition components that were using incorrect database query patterns:

1. **ShakedownLogger.tsx** - Line 137
   - Fixed: `.eq('user_id', user.id)` → `.eq('id', user.id)`
   - Impact: Component can now correctly fetch user's transition profile

2. **RealityCheck.tsx** - Line 64
   - Fixed: `.eq('user_id', user.id)` → `.eq('id', user.id)`
   - Impact: Feasibility metrics will now load properly

3. **VehicleModifications.tsx** - Lines 107 & 142
   - Fixed: 2 occurrences in fetchModifications() and fetchStats()
   - Impact: Kanban board and timeline views will now work

4. **EquipmentManager.tsx** - Lines 95 & 131
   - Fixed: 2 occurrences in fetchEquipment() and fetchStats()
   - Impact: Equipment tracking will now function correctly

**Quality Checks:**
- ✅ TypeScript validation passed
- ✅ ESLint passed (no new errors)
- ✅ Git commit successful
- ✅ No secrets detected

---

## Next Steps Required

### 1. Apply SQL Fixes to Supabase Database ⏳

**File:** `docs/sql-fixes/MASTER_FIX_ALL_RLS_ISSUES.sql`

This comprehensive SQL script will:
- Fix transition_profiles RLS policies (uses `id = auth.uid()`)
- Fix calendar_events RLS policies (uses `user_id = auth.uid()`)
- Create likes table with proper RLS

**How to Apply:**

1. **Open Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/kycoklimpzkyrecbjecn
   - Go to SQL Editor

2. **Run the MASTER_FIX_ALL_RLS_ISSUES.sql script**
   - Copy entire contents of the SQL file
   - Paste into SQL Editor
   - Click "Run"

3. **Verify the results**
   - Check that verification queries at the end return expected policies
   - Confirm no errors in execution

**Expected Verification Output:**
```
transition_profiles policies:
- Users can create their own transition profile (INSERT)
- Users can delete their own transition profile (DELETE)
- Users can update their own transition profile (UPDATE)
- Users can view their own transition profile (SELECT)

calendar_events policies:
- Users can create own calendar events (INSERT)
- Users can delete own calendar events (DELETE)
- Users can update own calendar events (UPDATE)
- Users can view own calendar events (SELECT)

likes policies:
- Users can like posts (INSERT)
- Users can unlike their own likes (DELETE)
- Users can view all likes (SELECT)
```

---

### 2. Deploy to Staging Branch 🚀

**Current Branch:** staging

**Deploy Frontend:**
```bash
git push origin staging
```

This will trigger Netlify deployment to:
- https://wheels-wins-staging.netlify.app

**Verify Backend:**
- Backend should auto-deploy on Render
- Check: https://wheels-wins-backend-staging.onrender.com/api/health

---

### 3. Testing Checklist ✓

Once SQL fixes are applied and deployed, test the following:

#### A. Transition Profile Access
- [ ] Navigate to Life Transition module
- [ ] Verify no 403 or 406 errors in browser console
- [ ] Confirm profile data loads

#### B. Shakedown Logger
- [ ] Open Shakedown Logger component
- [ ] Verify it loads without errors
- [ ] Test adding a new shakedown entry

#### C. Reality Check
- [ ] Open Reality Check component
- [ ] Verify feasibility metrics display correctly
- [ ] Confirm task counts are accurate

#### D. Vehicle Modifications
- [ ] Open Vehicle Modifications (Kanban view)
- [ ] Verify modifications load
- [ ] Test drag-and-drop between columns
- [ ] Switch to Timeline view
- [ ] Verify timeline displays correctly

#### E. Equipment Manager
- [ ] Open Equipment Manager
- [ ] Verify equipment list loads
- [ ] Check statistics display correctly
- [ ] Test adding new equipment item

#### F. Calendar Events
- [ ] Navigate to calendar
- [ ] Verify events load without errors
- [ ] Test creating a new event
- [ ] Test editing an event

#### G. Social Features (Likes Table)
- [ ] Navigate to Social feed
- [ ] Test liking a post
- [ ] Test unliking a post
- [ ] Verify like counts update correctly

---

### 4. Rollback Plan (If Issues Occur)

If any issues are discovered after deployment:

**Frontend Rollback:**
```bash
git revert 57a78c36
git push origin staging
```

**Database Rollback:**
Use Supabase dashboard to manually restore previous RLS policies or use point-in-time recovery if available.

---

## Additional SQL Files Available

The following individual SQL fix files are also available if needed for targeted fixes:

- `add_get_transition_profile_function.sql` - Helper function for profile access
- `create_likes_table.sql` - Standalone likes table creation
- `fix_calendar_events_admin_access.sql` - Calendar events RLS fix
- `fix_transition_profiles_admin_access.sql` - Transition profiles RLS fix

These are included in MASTER_FIX_ALL_RLS_ISSUES.sql, so you only need to run the master file.

---

## Success Criteria

The deployment is successful when:

1. ✅ All transition components load without 403/406 errors
2. ✅ Users can view their own transition profile data
3. ✅ Users can create, update, and delete transition-related records
4. ✅ Calendar events work correctly
5. ✅ Social features (likes) function properly
6. ✅ No RLS policy violations in Supabase logs
7. ✅ No console errors related to transition_profiles queries

---

## Support

If issues persist after applying fixes:

1. Check browser console for specific error messages
2. Check Supabase logs for RLS policy violations
3. Verify SQL script was executed completely without errors
4. Review pg_policies table to confirm policies are correctly created

---

**Next Action:** Apply MASTER_FIX_ALL_RLS_ISSUES.sql to Supabase database
