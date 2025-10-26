# Prompt 3.1: Vehicle Modification Tracker - Deployment Instructions

**Feature**: Vehicle modification planning system with Kanban board, timeline, and photo gallery
**Status**: ✅ Code complete, ready for database migration
**Date**: October 26, 2025

---

## Prerequisites

- [ ] Access to Supabase dashboard
- [ ] Admin permissions for SQL execution
- [ ] Staging environment access for testing

---

## Deployment Steps

### Step 1: Database Migration

**Location**: `docs/sql-fixes/300_vehicle_modifications.sql`

1. Open Supabase dashboard: https://supabase.com/dashboard
2. Navigate to your project
3. Click "SQL Editor" in left sidebar
4. Click "New Query"
5. Copy entire contents of `300_vehicle_modifications.sql`
6. Paste into SQL editor
7. Click "Run" to execute

**What this creates**:
- `transition_vehicle_mods` table with proper schema
- Indexes for performance (profile_id, status, category)
- RPC function `get_vehicle_mod_stats()` for aggregated stats
- 5 sample modifications (Solar Panel, Water Filter, Diesel Heater, MaxTrax, Roof Rack)

**Expected output**:
```
Success: No rows returned
```

This is normal - the script creates tables and functions but returns no data.

---

### Step 2: Verify Database Setup

Run this query to confirm table exists:
```sql
SELECT * FROM transition_vehicle_mods LIMIT 5;
```

Expected: 5 sample modifications returned (if any profiles exist in your database)

Run this to test the stats function:
```sql
SELECT * FROM get_vehicle_mod_stats('your-profile-uuid-here');
```

Expected: Stats object with totals and percentages

---

### Step 3: Deploy Frontend to Staging

**Branch**: staging (or create feature branch)
**Changes committed**:
- `src/components/transition/TransitionDashboard.tsx` (VehicleModifications integration)
- `docs/implementation-logs/PROMPT_3_1_VEHICLE_MODIFICATIONS.md` (updated)

**Commands**:
```bash
# Ensure you're on staging branch
git checkout staging

# Verify changes
git status

# If changes not committed, commit them:
git add src/components/transition/TransitionDashboard.tsx
git add docs/implementation-logs/PROMPT_3_1_VEHICLE_MODIFICATIONS.md
git add docs/deployment-instructions/PROMPT_3_1_DEPLOYMENT.md
git commit -m "feat: integrate VehicleModifications into TransitionDashboard

- Added VehicleModifications import to TransitionDashboard
- Positioned between FinancialBuckets and TransitionTimeline
- Updated implementation log with dashboard integration
- Created deployment instructions

Completes Prompt 3.1 implementation

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to staging
git push origin staging
```

**Netlify will automatically**:
- Detect the push to staging branch
- Build the frontend (`npm run build`)
- Deploy to staging environment
- Run post-build checks

---

### Step 4: Test in Staging Environment

**Staging URL**: https://wheels-wins-staging.netlify.app

#### Test Checklist

**Basic Functionality**:
- [ ] Navigate to Transition Dashboard page
- [ ] Verify VehicleModifications section appears
- [ ] Stats dashboard displays correctly (4 metrics)
- [ ] "Add Modification" button works

**Kanban Board**:
- [ ] Three columns display: Planned | In Progress | Complete
- [ ] Sample modifications appear (if profiles exist)
- [ ] Drag card from Planned to In Progress - should update
- [ ] Drag card from In Progress to Complete - should set completion date
- [ ] Badge counts update automatically
- [ ] Toast notification appears on status change

**Add Modification Form**:
- [ ] Click "Add Modification" button
- [ ] Dialog opens with form
- [ ] "Common Modifications" dropdown shows 30+ options
- [ ] Select common mod - form auto-populates
- [ ] Fill custom fields (name, category, cost, etc.)
- [ ] Add vendor links (test add/remove)
- [ ] Add dependencies (test add/remove)
- [ ] Upload photos (max 5) - test file selection
- [ ] Click "Add Modification" - should save and refresh board

**Photo Gallery**:
- [ ] Modification card shows photo count
- [ ] Thumbnail grid displays (up to 4 visible)
- [ ] Click thumbnail - lightbox viewer opens
- [ ] Navigate with prev/next buttons
- [ ] Thumbnail strip allows quick jumping
- [ ] Click outside or X to close

**Timeline View**:
- [ ] Switch to "Timeline View" tab
- [ ] Gantt chart displays modifications
- [ ] Bars color-coded by category (or switch to status)
- [ ] View mode switcher works (Day/Week/Month)
- [ ] Color by switcher works (Category/Status)
- [ ] Legend displays correctly
- [ ] Drag bar to adjust dates - updates database
- [ ] Toast notification on date change
- [ ] Completed tasks locked (cannot drag)

**Mobile Responsive** (resize browser or use mobile device):
- [ ] Stats grid stacks vertically
- [ ] Kanban columns stack vertically on mobile
- [ ] Cards remain draggable on touch devices
- [ ] Timeline scales appropriately
- [ ] Form fields stack vertically
- [ ] Photo gallery remains usable

**Error Handling**:
- [ ] Try to add mod without required fields - validation error shows
- [ ] Try to upload file >5MB - error message shows
- [ ] Try to upload >5 photos - shows limit warning
- [ ] Network error during save - error toast appears

---

### Step 5: Performance Validation

**Load time checks**:
- [ ] Initial dashboard load <2 seconds
- [ ] Stats calculation <500ms
- [ ] Modification list fetch <1 second
- [ ] Photo upload <3 seconds per image
- [ ] Drag-and-drop response <100ms
- [ ] Timeline render <1 second

**Resource checks** (Chrome DevTools):
- [ ] Network tab - all requests succeed (200 status)
- [ ] Console - no errors or warnings
- [ ] Performance tab - no jank during interactions
- [ ] Memory - no leaks after prolonged use

---

### Step 6: Database Verification (Post-Testing)

After testing in staging, verify database state:

```sql
-- Check modifications created
SELECT COUNT(*) as total_mods, status, category
FROM transition_vehicle_mods
GROUP BY status, category;

-- Check photo URLs stored correctly
SELECT name, array_length(photo_urls, 1) as photo_count
FROM transition_vehicle_mods
WHERE photo_urls IS NOT NULL AND array_length(photo_urls, 1) > 0;

-- Check stats function accuracy
SELECT
    tm.total_mods,
    tm.planned_count,
    tm.in_progress_count,
    tm.complete_count,
    tm.completion_percentage
FROM get_vehicle_mod_stats('your-profile-uuid') tm;
```

**Expected**:
- Modifications count matches what you added
- Photo URLs are valid Supabase Storage URLs
- Stats function returns accurate counts and percentages

---

## Rollback Plan (If Issues Found)

### Frontend Rollback
```bash
# Revert last commit
git revert HEAD
git push origin staging

# Or revert specific commit
git log --oneline  # Find commit hash
git revert <commit-hash>
git push origin staging
```

### Database Rollback
```sql
-- Drop table (will lose all data!)
DROP TABLE IF EXISTS transition_vehicle_mods CASCADE;

-- Or disable feature via RLS policy
ALTER TABLE transition_vehicle_mods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_isolation ON transition_vehicle_mods;

-- This prevents new data but keeps existing data intact
```

**Note**: Only use rollback if critical issues prevent basic app functionality. Minor bugs should be fixed forward.

---

## Production Deployment (After Staging Success)

### Prerequisites
- [ ] All staging tests passed
- [ ] No critical bugs found
- [ ] Performance metrics acceptable
- [ ] Code reviewed by team

### Steps
1. **Merge staging to main**:
   ```bash
   git checkout main
   git pull origin main
   git merge staging
   git push origin main
   ```

2. **Run same SQL migration on production database**:
   - Open production Supabase project
   - Execute `300_vehicle_modifications.sql`
   - Verify with same queries as staging

3. **Monitor production deployment**:
   - Netlify auto-deploys from main branch
   - Watch build logs for errors
   - Check production URL after deployment
   - Run smoke tests on production

4. **Post-deployment monitoring** (first 24 hours):
   - Check error tracking (Sentry, if configured)
   - Monitor database query performance
   - Watch for user reports
   - Review analytics for feature usage

---

## Known Limitations

1. **Mobile drag-and-drop**: Touch events may require additional tuning on some devices
2. **Photo upload size**: Limited to 5 photos per modification (configurable in code)
3. **Supabase Storage**: Uses `avatars` bucket (consider creating dedicated bucket in future)
4. **Sample data**: Pre-populates 5 modifications per profile (may want to make this optional)
5. **Dependencies**: Text array, not foreign key relationships (future enhancement)

---

## Support

**Issue tracking**: https://github.com/Thabonel/wheels-wins-landing-page/issues
**Documentation**: `docs/implementation-logs/PROMPT_3_1_VEHICLE_MODIFICATIONS.md`
**SQL Schema**: `docs/sql-fixes/300_vehicle_modifications.sql`

---

**Deployment Prepared**: October 26, 2025
**Status**: Ready for staging deployment
