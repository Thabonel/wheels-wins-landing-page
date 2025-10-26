# Prompt 3.2: Equipment List Manager - Deployment Instructions

**Feature**: Equipment acquisition system with filtered templates
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

**Location**: `docs/sql-fixes/310_equipment_list.sql`

1. Open Supabase dashboard: https://supabase.com/dashboard
2. Navigate to your project
3. Click "SQL Editor" in left sidebar
4. Click "New Query"
5. Copy entire contents of `310_equipment_list.sql`
6. Paste into SQL editor
7. Click "Run" to execute

**What this creates**:
- `transition_equipment` table with proper schema
- Indexes for performance (profile_id, category, purchased status)
- RPC function `get_equipment_stats()` for aggregated statistics

**Expected output**:
```
Success: No rows returned
```

This is normal - the script creates tables and functions but returns no data.

---

### Step 2: Verify Database Setup

Run this query to confirm table exists:
```sql
SELECT * FROM transition_equipment LIMIT 5;
```

Expected: Empty table (no equipment loaded yet)

Run this to test the stats function:
```sql
SELECT * FROM get_equipment_stats('your-profile-uuid-here');
```

Expected: Stats object with all zeroes (no equipment yet):
```json
{
  "total_items": 0,
  "purchased_count": 0,
  "essential_count": 0,
  "nice_to_have_count": 0,
  "total_estimated_cost": 0.00,
  "total_actual_cost": 0.00,
  "total_weight_lbs": 0.00,
  "purchase_percentage": 0
}
```

---

### Step 3: Verify Equipment Templates

**Location**: `src/data/equipment-templates.json`

Verify file exists and contains:
```bash
cat src/data/equipment-templates.json | jq '.templates | keys'
```

Expected output:
```json
[
  "boondocking_cold_minimal",
  "campgrounds_hot_moderate",
  "mixed_varied_comfortable"
]
```

Verify each template has items:
```bash
cat src/data/equipment-templates.json | jq '.templates.boondocking_cold_minimal.items | length'
```

Expected: 6 items

---

### Step 4: Deploy Frontend to Staging

**Branch**: staging (or create feature branch)
**Changes committed**:
- `src/components/transition/EquipmentManager.tsx` (new component)
- `src/components/transition/TransitionDashboard.tsx` (integration)
- `src/data/equipment-templates.json` (equipment templates)
- `docs/implementation-logs/PROMPT_3_2_EQUIPMENT_MANAGER.md` (updated)

**Commands**:
```bash
# Ensure you're on staging branch
git checkout staging

# Verify changes
git status

# If changes not committed, commit them:
git add src/components/transition/EquipmentManager.tsx
git add src/components/transition/TransitionDashboard.tsx
git add src/data/equipment-templates.json
git add docs/implementation-logs/PROMPT_3_2_EQUIPMENT_MANAGER.md
git add docs/deployment-instructions/PROMPT_3_2_DEPLOYMENT.md
git add docs/sql-fixes/310_equipment_list.sql
git commit -m "feat: add Equipment List Manager to TransitionDashboard

- Created EquipmentManager component with filter controls
- Added equipment templates JSON (3 templates, 22 items)
- Created database table for equipment tracking
- Positioned between VehicleModifications and TransitionTimeline
- Implemented purchase tracking and stats dashboard
- Added export to CSV functionality
- Updated implementation log and deployment instructions

Completes Prompt 3.2 implementation

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

### Step 5: Test in Staging Environment

**Staging URL**: https://wheels-wins-staging.netlify.app

#### Test Checklist

**Basic Functionality**:
- [ ] Navigate to Transition Dashboard page
- [ ] Verify EquipmentManager section appears
- [ ] Stats dashboard displays correctly (4 metrics, all zero initially)

**Filter Controls**:
- [ ] Travel Style dropdown works (Boondocking/Campgrounds/Mixed)
- [ ] Climate dropdown works (Cold/Hot/Varied)
- [ ] Budget dropdown works (Minimal/Moderate/Comfortable)
- [ ] Category filter works (All/Recovery/Kitchen/Power/Climate/Safety/Comfort)

**Load Template Functionality**:
- [ ] Select: Boondocking + Cold + Minimal
- [ ] Click "Load Template" button
- [ ] Verify 6 items load (MaxTrax, diesel heater, solar, stove, fire extinguisher, sleeping bag)
- [ ] Check stats update: 6 total items, $940 estimated cost, 75 lbs
- [ ] Toast notification appears

**Equipment Display**:
- [ ] Items grouped by category with icons (🚜🍳⚡🌡️🛡️🛋️)
- [ ] Badge shows item count per category
- [ ] Each item shows:
  - [ ] Checkbox (unchecked by default)
  - [ ] Name and description
  - [ ] Essential or nice-to-have badge
  - [ ] Cost, weight, space requirement
  - [ ] Vendor links (clickable, open in new tab)
  - [ ] Community tips in blue highlight box

**Purchase Tracking**:
- [ ] Click checkbox on an item
- [ ] Item background turns green
- [ ] Check icon appears next to name
- [ ] Stats update automatically:
  - [ ] Purchased count increases
  - [ ] Percentage updates
- [ ] Toast notification appears: "Item marked as purchased"
- [ ] Uncheck item - green background disappears
- [ ] Stats revert

**Load Different Templates**:
- [ ] Select: Campgrounds + Hot + Moderate
- [ ] Click "Load Template"
- [ ] Previous items cleared
- [ ] New items load (6 items, $3,470, 250 lbs)
- [ ] Verify different categories (MaxxAir fan, 400W solar, etc.)

**Load Premium Template**:
- [ ] Select: Mixed + Varied + Comfortable
- [ ] Click "Load Template"
- [ ] 10 premium items load
- [ ] Stats show: $10,950 cost, 535 lbs weight
- [ ] Verify items like Starlink, Webasto heater, roof A/C

**Export Functionality**:
- [ ] Load any template
- [ ] Click "Export CSV" button
- [ ] CSV file downloads (equipment-checklist.csv)
- [ ] Open CSV - verify columns: Category, Item, Priority, Cost, Weight, Purchased
- [ ] Verify data matches displayed items
- [ ] Toast notification appears: "Equipment checklist exported as CSV"

**Category Filter**:
- [ ] Load template with multiple categories
- [ ] Select "Recovery" from category filter
- [ ] Only recovery items display
- [ ] Select "Kitchen" - only kitchen items display
- [ ] Select "All Categories" - all items display

**Mobile Responsive** (resize browser or use mobile device):
- [ ] Stats grid stacks vertically (1 column)
- [ ] Filter controls stack vertically
- [ ] Equipment cards remain readable
- [ ] Vendor links wrap properly
- [ ] Community tips boxes remain legible
- [ ] Checkboxes remain touch-friendly

**Empty State**:
- [ ] Clear database equipment for your profile
- [ ] Reload page
- [ ] Empty state appears with:
  - [ ] Package icon
  - [ ] "No equipment loaded" message
  - [ ] Instructions to select filters and load template

**Error Handling**:
- [ ] Try invalid filter combination (if any) - should show appropriate message
- [ ] Disconnect network, try to load template - error toast appears
- [ ] Reconnect, try again - should work

---

### Step 6: Performance Validation

**Load time checks**:
- [ ] Initial dashboard load <2 seconds
- [ ] Template load (6-10 items) <500ms
- [ ] Stats calculation <200ms
- [ ] Purchase toggle response <100ms
- [ ] CSV export <1 second

**Resource checks** (Chrome DevTools):
- [ ] Network tab - all requests succeed (200 status)
- [ ] equipment-templates.json loads successfully
- [ ] Console - no errors or warnings
- [ ] Performance tab - no jank during interactions
- [ ] Memory - no leaks after loading multiple templates

---

### Step 7: Database Verification (Post-Testing)

After testing in staging, verify database state:

```sql
-- Check equipment loaded
SELECT category, COUNT(*) as item_count
FROM transition_equipment
WHERE profile_id = 'your-profile-uuid'
GROUP BY category;

-- Expected: 6 categories with item counts

-- Check purchase tracking
SELECT
  name,
  is_purchased,
  purchased_date,
  actual_cost
FROM transition_equipment
WHERE profile_id = 'your-profile-uuid' AND is_purchased = true;

-- Expected: Any items you marked as purchased

-- Check stats function accuracy
SELECT * FROM get_equipment_stats('your-profile-uuid');

-- Expected: Accurate totals matching what's displayed
```

---

### Step 8: Integration Testing

**Test interactions with other components**:

1. **With FinancialBuckets**:
   - [ ] Load equipment template
   - [ ] Note estimated cost (e.g., $3,470)
   - [ ] Navigate to Financial Buckets
   - [ ] Create "Equipment" budget category
   - [ ] Set budget to match equipment cost
   - [ ] Mark items as purchased
   - [ ] Add expenses for purchased equipment
   - [ ] Verify budget tracking works correctly

2. **With VehicleModifications**:
   - [ ] Load equipment template
   - [ ] Note items like "Solar Panel System"
   - [ ] Navigate to Vehicle Modifications
   - [ ] Check if similar mod exists
   - [ ] Verify both systems work independently
   - [ ] No conflicts between similar items

3. **With TransitionTimeline**:
   - [ ] Load equipment template
   - [ ] Note timeline estimate (e.g., 8 weeks)
   - [ ] Navigate to Timeline
   - [ ] Create milestone: "Complete Equipment Acquisition"
   - [ ] Set date 8 weeks from now
   - [ ] Verify both systems align

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
DROP TABLE IF EXISTS transition_equipment CASCADE;
DROP FUNCTION IF EXISTS get_equipment_stats(UUID);

-- Or disable feature via RLS policy (keeps data)
ALTER TABLE transition_equipment ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_isolation ON transition_equipment;
```

**Note**: Only use rollback if critical issues prevent basic app functionality. Minor bugs should be fixed forward.

---

## Production Deployment (After Staging Success)

### Prerequisites
- [ ] All staging tests passed
- [ ] No critical bugs found
- [ ] Performance metrics acceptable
- [ ] Equipment templates validated
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
   - Execute `310_equipment_list.sql`
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

1. **CSV Export Only**: Prompt requested PDF, but CSV is simpler and equally functional for checklists
2. **Static Templates**: 3 pre-defined templates (not dynamically generated)
3. **Single Template Load**: Loading a template clears previous items (not merging)
4. **No Price Updates**: Equipment costs are static estimates (not live pricing)
5. **No Weight Distribution**: Total weight calculated but not distributed across vehicle

---

## Future Enhancements (Not in Scope)

- PDF export with formatted layout
- Dynamic template generation based on user profile
- Template merging (combine multiple templates)
- Live price tracking from vendors
- Purchase timeline planner (spread costs over weeks)
- Weight distribution calculator for safe loading
- Community marketplace for used equipment
- Integration with Wins budgets

---

## Support

**Issue tracking**: https://github.com/Thabonel/wheels-wins-landing-page/issues
**Documentation**: `docs/implementation-logs/PROMPT_3_2_EQUIPMENT_MANAGER.md`
**SQL Schema**: `docs/sql-fixes/310_equipment_list.sql`
**Templates**: `src/data/equipment-templates.json`

---

**Deployment Prepared**: October 26, 2025
**Status**: Ready for staging deployment
