# Prompt 4.4: Launch Week Planner - Deployment Instructions

**Feature**: Day-by-day launch countdown with tasks, special Launch Day celebration, and post-departure check-ins
**Status**: ✅ Code complete, ready for database migration
**Date**: January 2025

---

## Prerequisites

- [ ] Access to Supabase dashboard
- [ ] Admin permissions for SQL execution
- [ ] Staging environment access for testing
- [ ] At least one test user account

---

## Deployment Steps

### Step 1: Database Migration

**Location**: `docs/sql-fixes/420_launch_week_planner.sql`

1. Open Supabase dashboard: https://supabase.com/dashboard
2. Navigate to your project
3. Click "SQL Editor" in left sidebar
4. Click "New Query"
5. Copy entire contents of `420_launch_week_planner.sql`
6. Paste into SQL editor
7. Click "Run" to execute

**What this creates**:
- 4 tables for launch week planning:
  - `launch_week_tasks` - System-defined tasks for days -7 to 0 (35 pre-loaded tasks)
  - `user_launch_tasks` - User task completion tracking
  - `user_launch_dates` - Launch date and celebration details
  - `launch_checkins` - Post-departure check-ins (day_1, week_1, month_1)
- 4 indexes for performance
- 2 RPC functions:
  - `get_launch_week_progress(p_user_id)` - Progress stats for all days
  - `get_days_until_launch(p_user_id)` - Countdown calculation

**Expected output**:
```
Success: No rows returned
```

This is normal - the script creates tables, functions, and inserts 35 default tasks.

---

### Step 2: Verify Database Setup

**Check tables exist**:
```sql
SELECT * FROM launch_week_tasks LIMIT 5;
SELECT * FROM user_launch_tasks LIMIT 5;
SELECT * FROM user_launch_dates LIMIT 5;
SELECT * FROM launch_checkins LIMIT 5;
```

Expected: `launch_week_tasks` has 35 tasks, others empty

**Verify 35 default tasks**:
```sql
SELECT
  day_number,
  COUNT(*) as task_count
FROM launch_week_tasks
GROUP BY day_number
ORDER BY day_number;
```

Expected:
```
-7 | 5
-6 | 5
-5 | 5
-4 | 5
-3 | 5
-2 | 5
-1 | 5
 0 | 5
```

**Check task categories**:
```sql
SELECT DISTINCT category FROM launch_week_tasks;
```

Expected: legal, financial, vehicle, personal, communication, safety

**Test get_launch_week_progress() function**:
```sql
SELECT * FROM get_launch_week_progress('your-user-uuid-here');
```

Expected: 8 rows (days -7 to 0) with 0% completion:
```
day_number | total_tasks | completed_tasks | critical_tasks | critical_completed | completion_percentage
-7         | 5           | 0              | 2              | 0                  | 0.0
-6         | 5           | 0              | 4              | 0                  | 0.0
...
```

**Test get_days_until_launch() function**:
```sql
SELECT get_days_until_launch('your-user-uuid-here');
```

Expected: NULL (no launch date set yet)

---

### Step 3: Deploy Frontend to Staging

**Branch**: staging
**Changes committed**: See PROMPT_4_3_DEPLOYMENT.md Step 3 (same commit for both 4.3 and 4.4)

---

### Step 4: Test in Staging Environment

**Staging URL**: https://wheels-wins-staging.netlify.app

#### Test Checklist

**Basic Functionality**:
- [ ] Navigate to Transition Dashboard page
- [ ] Verify LaunchWeekPlanner section appears (after TransitionSupport)
- [ ] Component loads without errors
- [ ] "Set Your Launch Date" form visible (initial state)

---

### Launch Date Setup (Initial State)

**No Launch Date Set**:
- [ ] Large card displays "Set Your Launch Date"
- [ ] Form fields visible:
  - [ ] Launch Date (date picker)
  - [ ] First Destination (text input, optional)
  - [ ] Emergency Contacts (textarea, JSON format, optional)
  - [ ] Celebration Plans (textarea, optional)
- [ ] Example text for emergency contacts shown

**Set Launch Date**:
- [ ] Select date 7 days from today (to test full week countdown)
- [ ] Enter first destination: "Grand Canyon National Park"
- [ ] Enter emergency contacts JSON:
  ```json
  [
    {"name": "Mom", "phone": "555-0100"},
    {"name": "Best Friend", "phone": "555-0200"}
  ]
  ```
- [ ] Enter celebration plans: "Champagne toast at sunset, first night under the stars"
- [ ] Click "Set Launch Date" button
- [ ] Toast: "Launch date set"
- [ ] Form disappears, day selector grid appears

---

### Day Selector Grid

**8-Day Grid Display**:
- [ ] Grid shows 8 buttons (4 columns on mobile, 8 on desktop)
- [ ] Days labeled: "Day -7", "Day -6", ..., "Day -1", "🚀" (Day 0)
- [ ] Each button shows:
  - [ ] Day label
  - [ ] Task completion count (0/5 initially)
- [ ] Gray borders (incomplete days)
- [ ] No green borders yet (no days 100% complete)

**Days Until Launch Countdown**:
- [ ] Large countdown displays: "7 days until launch!" (or calculated number)
- [ ] Blue info badge
- [ ] Countdown updates if launch date changed

**Select Day -7**:
- [ ] Click "Day -7" button
- [ ] Button border turns blue (selected state)
- [ ] Day detail view appears below grid

---

### Day -7 Tasks (One Week Before)

**Task List Display**:
- [ ] Card title: "Day -7: One Week Before Launch"
- [ ] Progress bar shows 0% (gray)
- [ ] Task count: "0 of 5 tasks completed"
- [ ] 5 tasks displayed:

**Task 1: Final vehicle inspection**
- [ ] Task name and description visible
- [ ] "Critical" red badge displayed
- [ ] "120 min" time estimate shown
- [ ] "Vehicle" category badge
- [ ] Checkbox unchecked

**Task 2: Confirm insurance coverage**
- [ ] "Critical" red badge
- [ ] "30 min" time estimate
- [ ] "Legal" category badge

**Task 3: Notify key contacts**
- [ ] NO critical badge (optional task)
- [ ] "20 min" time estimate
- [ ] "Communication" category badge

**Task 4: Stock up on essentials**
- [ ] Optional task (no critical badge)
- [ ] "90 min" time estimate
- [ ] "Personal" category badge

**Task 5: Create backup digital files**
- [ ] Optional task
- [ ] "45 min" time estimate
- [ ] "Safety" category badge

**Complete Task 1**:
- [ ] Click checkbox for "Final vehicle inspection"
- [ ] Checkbox becomes checked
- [ ] Toast: "Task completed"
- [ ] Task text may show strikethrough or green checkmark
- [ ] Progress bar updates to 20% (1/5 tasks)
- [ ] Task count updates to "1 of 5 tasks completed"
- [ ] Day -7 button in grid updates to "1/5"

**Complete All 5 Tasks**:
- [ ] Check all 5 task checkboxes
- [ ] Progress bar reaches 100% (green)
- [ ] Task count: "5 of 5 tasks completed"
- [ ] Day -7 button shows green border (complete)
- [ ] Day -7 button shows checkmark icon
- [ ] Grid button shows "5/5"

---

### Test All 8 Days

**Day -6 through Day -1**:
- [ ] Select each day in grid
- [ ] Each day shows 5 unique tasks
- [ ] Critical vs optional tasks clearly marked
- [ ] Time estimates and categories displayed
- [ ] Progress tracked independently per day
- [ ] Completion saves to database (refresh preserves state)

**Critical Task Distribution**:
- [ ] Day -7: 2 critical tasks (vehicle inspection, insurance)
- [ ] Day -6: 4 critical tasks (mail, utilities, RV systems, banking)
- [ ] Day -5: 2 critical tasks (banking, roadside assistance)
- [ ] Day -4: 3 critical tasks (weigh RV, share itinerary, medications)
- [ ] Day -3: 2 critical tasks (secure items, emergency procedures)
- [ ] Day -2: 4 critical tasks (fuel, dump tanks, check connections)
- [ ] Day -1: 2 critical tasks (home walkthrough, exterior inspection)
- [ ] Day 0: 2 critical tasks (safety check, notify tracking person)

---

### Day 0: Launch Day Special View

**Select Launch Day (🚀 button)**:
- [ ] Grid button shows "🚀" instead of "Day 0"
- [ ] Click 🚀 button
- [ ] Special celebration card appears
- [ ] Orange/yellow gradient background
- [ ] Party popper icon 🎉

**Launch Day Task Checklist**:
- [ ] 5 special tasks visible:
  1. Final safety check (Critical, 15 min, Safety)
  2. Take departure photo (Optional, 5 min, Personal)
  3. Notify tracking person (Critical, 5 min, Communication)
  4. Start navigation system (Critical, 10 min, Vehicle)
  5. Breathe and enjoy (Optional, 5 min, Personal)

**Celebration Details Display**:
- [ ] First Destination section:
  - [ ] Map pin icon
  - [ ] "Grand Canyon National Park" displayed
- [ ] Emergency Contacts section:
  - [ ] Phone icon
  - [ ] Mom: 555-0100
  - [ ] Best Friend: 555-0200
- [ ] Celebration Plans section:
  - [ ] Sparkles icon
  - [ ] "Champagne toast at sunset..." displayed
- [ ] Final message box (orange background):
  - [ ] "🎉 You did it! Safe travels and enjoy your new adventure! 🎉"

---

### Post-Departure Check-ins

**After Launch Day** (simulate by setting launch date to past):
- [ ] Manually update launch date to 5 days ago:
  ```sql
  UPDATE user_launch_dates
  SET launch_date = CURRENT_DATE - 5
  WHERE user_id = 'your-user-uuid';
  ```
- [ ] Reload LaunchWeekPlanner component
- [ ] Days until launch shows negative: "-5 days since launch"

**Post-Departure Card Appears**:
- [ ] New card displays: "Post-Departure Check-ins"
- [ ] Subtitle: "How's your journey going?"
- [ ] Check-in form visible with fields:
  - [ ] Check-in Type dropdown (Day 1, Week 1, Month 1)
  - [ ] Mood dropdown (8 options):
    - Excited 😊
    - Anxious ⚠️
    - Overwhelmed 😰
    - Confident 💪
    - Uncertain 🤔
    - Hopeful ✨
    - Relieved 😌
    - Exhausted 😴
  - [ ] Overall thoughts textarea (required)
  - [ ] Wins textarea (optional)
  - [ ] Challenges textarea (optional)

**Submit Day 1 Check-in**:
- [ ] Select type: "Day 1"
- [ ] Select mood: "Excited 😊"
- [ ] Enter thoughts: "First day on the road! Everything went smoothly."
- [ ] Enter wins: "Successfully drove 200 miles, found great campsite"
- [ ] Enter challenges: "Took longer to set up than expected"
- [ ] Click "Submit Check-in" button
- [ ] Toast: "Check-in saved"
- [ ] Check-in appears in "Previous Check-ins" section:
  - [ ] Type badge (Day 1)
  - [ ] Mood badge with icon
  - [ ] Thoughts text
  - [ ] Wins section (if provided)
  - [ ] Challenges section (if provided)
  - [ ] Timestamp

**UPSERT Test** (prevent duplicate check-ins):
- [ ] Submit another "Day 1" check-in with different mood: "Anxious ⚠️"
- [ ] Toast: "Check-in updated"
- [ ] Only one "Day 1" check-in displays (not duplicate)
- [ ] Mood updated to latest submission

**Week 1 and Month 1 Check-ins**:
- [ ] Submit "Week 1" check-in
- [ ] Submit "Month 1" check-in
- [ ] Each check-in type appears independently
- [ ] All 3 check-ins display in chronological order

---

### Step 5: Database Verification (Post-Testing)

**Launch Date Setup**:
```sql
SELECT
  launch_date,
  first_destination,
  emergency_contacts,
  celebration_plans
FROM user_launch_dates
WHERE user_id = 'your-user-uuid';
```

Expected: Launch date and celebration details from testing

**Task Completion Status**:
```sql
SELECT
  lwt.day_number,
  lwt.task_name,
  ult.is_completed,
  ult.completed_at
FROM launch_week_tasks lwt
LEFT JOIN user_launch_tasks ult ON ult.task_id = lwt.id AND ult.user_id = 'your-user-uuid'
ORDER BY lwt.day_number, lwt.order_num;
```

Expected: 35 tasks with completion status from testing

**Progress Query**:
```sql
SELECT * FROM get_launch_week_progress('your-user-uuid');
```

Expected: Completion percentages match UI display

**Days Until Launch**:
```sql
SELECT get_days_until_launch('your-user-uuid');
```

Expected: Calculated days remaining (positive) or days since launch (negative)

**Check-ins**:
```sql
SELECT
  checkin_type,
  mood,
  response,
  challenges,
  wins,
  created_at
FROM launch_checkins
WHERE user_id = 'your-user-uuid'
ORDER BY created_at ASC;
```

Expected: Check-ins from testing (Day 1, Week 1, Month 1)

---

### Step 6: Integration Testing

**With TransitionTimeline**:
- [ ] Add milestone: "Complete Launch Week Checklist"
- [ ] Complete all tasks in Launch Week Planner
- [ ] Mark milestone complete in timeline
- [ ] Verify both systems show completion

**With DepartureCountdown**:
- [ ] Set launch date in Launch Week Planner
- [ ] Navigate to DepartureCountdown component
- [ ] Verify countdown shows same date
- [ ] Both components show consistent countdown

**Cross-Component User Flow**:
- [ ] User sets launch date (today + 7 days)
- [ ] Completes Day -7 tasks
- [ ] Each day, returns to complete next day's tasks
- [ ] Launch Day: completes final checklist
- [ ] Post-departure: submits Day 1 check-in
- [ ] Week 1: submits week check-in
- [ ] Month 1: submits month check-in
- [ ] Full lifecycle tested

---

### Step 7: Mobile Responsive Testing

**Mobile devices or narrow browser window** (<768px):
- [ ] Day selector grid shows 4 columns
- [ ] Day labels readable
- [ ] Task list stacks vertically
- [ ] Task checkboxes easy to tap (44x44px minimum)
- [ ] Progress bar full width
- [ ] Launch Day celebration card readable
- [ ] Check-in form usable
- [ ] No horizontal scroll

**Tablet** (768px - 1024px):
- [ ] Day selector grid may show 6-8 columns
- [ ] Task cards comfortable spacing
- [ ] All content readable

**Desktop** (>1024px):
- [ ] Day selector grid shows all 8 days in one row
- [ ] Full-width layout in dashboard (lg:col-span-3)
- [ ] Optimal spacing and readability
- [ ] Launch Day celebration has maximum impact

---

### Step 8: Performance Validation

**Load time checks**:
- [ ] Initial component render <500ms
- [ ] Task toggle <300ms
- [ ] Progress calculation <500ms
- [ ] Launch date save <400ms
- [ ] Check-in submit <400ms

**RPC Function Performance**:
- [ ] get_launch_week_progress() <500ms
- [ ] get_days_until_launch() <100ms (simple calculation)

**Resource checks** (Chrome DevTools):
- [ ] Network tab - all Supabase queries succeed
- [ ] Console - no errors or warnings
- [ ] LEFT JOIN query efficient
- [ ] 35 tasks load without pagination lag
- [ ] Memory - no leaks after toggling many tasks

---

## Rollback Plan (If Issues Found)

### Frontend Rollback
```bash
# Revert last commit
git revert HEAD
git push origin staging

# Or revert specific commit
git log --oneline
git revert <commit-hash>
git push origin staging
```

### Database Rollback
```sql
-- Drop tables (will lose all data!)
DROP TABLE IF EXISTS launch_checkins CASCADE;
DROP TABLE IF EXISTS user_launch_tasks CASCADE;
DROP TABLE IF EXISTS user_launch_dates CASCADE;
DROP TABLE IF EXISTS launch_week_tasks CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS get_launch_week_progress(UUID);
DROP FUNCTION IF EXISTS get_days_until_launch(UUID);
```

**Note**: Only use rollback if critical issues prevent basic app functionality.

---

## Production Deployment (After Staging Success)

### Prerequisites
- [ ] All staging tests passed
- [ ] No critical bugs found
- [ ] Performance metrics acceptable
- [ ] Progress tracking validated
- [ ] UPSERT prevents duplicate check-ins
- [ ] Launch Day celebration tested
- [ ] Code reviewed by team
- [ ] Privacy and security verified

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
   - Execute `420_launch_week_planner.sql`
   - Verify with same queries as staging

3. **Monitor production deployment**:
   - Netlify auto-deploys from main branch
   - Watch build logs for errors
   - Check production URL after deployment
   - Run smoke tests on production

4. **Post-deployment monitoring** (first 24 hours):
   - Check error tracking
   - Monitor database query performance
   - Watch for user reports
   - Review analytics for feature usage
   - Monitor countdown accuracy

---

## Known Limitations

1. **Real-time Updates**: Progress doesn't update in real-time across devices (requires page refresh)

2. **Task Customization**: Users can't add custom tasks (35 system-defined only)

3. **Reminders**: No email or push notifications for upcoming tasks

4. **Calendar Integration**: Doesn't sync with Google Calendar or Apple Calendar

5. **PDF Export**: Can't export checklist to PDF for offline reference

6. **Photo Upload**: Launch Day departure photo not actually uploaded (UI only)

---

## Future Enhancements (Not in Scope)

- Email reminders (Day -7, -3, -1, Launch Day)
- Push notifications for mobile
- Export checklist as PDF
- Print-friendly version
- Social sharing (Launch Day celebration post)
- Photo upload for departure photo
- Custom task addition
- Task reordering
- Calendar integration (Google, Apple)
- Share checklist with partner
- Analytics (most completed tasks, common challenges)

---

## Security Considerations

**RLS Policies Applied**:
- Users can only see/modify their own launch tasks
- Users can only see/modify their own launch date
- Users can only see/modify their own check-ins

**Verify RLS Working**:
```sql
-- Try to access another user's launch date (should return 0 rows)
SELECT * FROM user_launch_dates WHERE user_id = 'other-user-uuid';

-- Try to access another user's check-ins (should return 0 rows)
SELECT * FROM launch_checkins WHERE user_id = 'other-user-uuid';
```

Expected: 0 rows (RLS prevents unauthorized access)

---

## Support

**Issue tracking**: https://github.com/Thabonel/wheels-wins-landing-page/issues
**Documentation**: `docs/implementation-logs/PROMPT_4_4_LAUNCH_WEEK.md`
**SQL Schema**: `docs/sql-fixes/420_launch_week_planner.sql`
**Component**: `src/components/transition/LaunchWeekPlanner.tsx`

---

**Deployment Prepared**: January 2025
**Status**: Ready for staging deployment
