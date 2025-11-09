# Prompt 4.3: Psychological Support Tools - Deployment Instructions

**Feature**: Daily mood tracking, anxiety management, motivation center, partner alignment, and backup planning
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

**Location**: `docs/sql-fixes/410_psychological_support.sql`

1. Open Supabase dashboard: https://supabase.com/dashboard
2. Navigate to your project
3. Click "SQL Editor" in left sidebar
4. Click "New Query"
5. Copy entire contents of `410_psychological_support.sql`
6. Paste into SQL editor
7. Click "Run" to execute

**What this creates**:
- 7 tables for psychological support:
  - `mood_check_ins` - Daily mood tracking with unique constraint per user per day
  - `anxiety_logs` - Anxiety and fear category tracking
  - `milestone_badges` - System-defined achievement badges (10 default badges)
  - `user_badges` - User earned badges tracking
  - `partner_expectations` - Partner alignment expectations across 7 categories
  - `expectation_discussions` - Discussion threading for expectations
  - `bailout_plans` - Backup plans with no-shame messaging
- 12 indexes for performance
- 3 RPC functions:
  - `get_mood_trends(p_user_id, p_days)` - Returns mood history
  - `check_badge_eligibility(p_user_id)` - Returns all badges with earned status
  - `get_partner_alignment_stats(p_user_id)` - Partner alignment statistics

**Expected output**:
```
Success: No rows returned
```

This is normal - the script creates tables and functions but returns no data.

---

### Step 2: Verify Database Setup

**Check tables exist**:
```sql
SELECT * FROM mood_check_ins LIMIT 5;
SELECT * FROM anxiety_logs LIMIT 5;
SELECT * FROM milestone_badges LIMIT 5;
SELECT * FROM user_badges LIMIT 5;
SELECT * FROM partner_expectations LIMIT 5;
SELECT * FROM expectation_discussions LIMIT 5;
SELECT * FROM bailout_plans LIMIT 5;
```

Expected: Empty tables except `milestone_badges` which has 10 pre-inserted badges

**Verify 10 default badges**:
```sql
SELECT name, icon, order_num FROM milestone_badges ORDER BY order_num;
```

Expected:
```
First Steps | 👟 | 1
Getting Organized | 📋 | 2
Budget Master | 💰 | 3
Vehicle Ready | 🚐 | 4
Test Drive | 🏕️ | 5
Reality Check | 📊 | 6
Community Connected | 👥 | 7
Launch Week | 🚀 | 8
Departure Day | 🎉 | 9
First Month | 🏆 | 10
```

**Test get_mood_trends() function**:
```sql
SELECT * FROM get_mood_trends('your-user-uuid-here', 30);
```

Expected: Empty result (no mood check-ins yet):
```
0 rows returned
```

**Test check_badge_eligibility() function**:
```sql
SELECT badge_name, is_earned FROM check_badge_eligibility('your-user-uuid-here');
```

Expected: All 10 badges with `is_earned = false`:
```
First Steps | false
Getting Organized | false
Budget Master | false
...
```

**Test get_partner_alignment_stats() function**:
```sql
SELECT * FROM get_partner_alignment_stats('your-user-uuid-here');
```

Expected: Stats object with all zeroes:
```
total_expectations | discussed_expectations | high_priority_count | categories_covered
0                  | 0                      | 0                   | 0
```

---

### Step 3: Deploy Frontend to Staging

**Branch**: staging
**Changes committed**:
- `src/components/transition/TransitionSupport.tsx` (new component - 643 lines)
- `src/components/transition/LaunchWeekPlanner.tsx` (new component - 674 lines)
- `src/components/transition/TransitionDashboard.tsx` (integration)
- `docs/implementation-logs/PROMPT_4_3_PSYCHOLOGICAL_SUPPORT.md`
- `docs/implementation-logs/PROMPT_4_4_LAUNCH_WEEK.md`
- `docs/deployment-instructions/PROMPT_4_3_DEPLOYMENT.md` (this file)
- `docs/deployment-instructions/PROMPT_4_4_DEPLOYMENT.md`
- `docs/sql-fixes/410_psychological_support.sql`
- `docs/sql-fixes/420_launch_week_planner.sql`

**Commands**:
```bash
# Ensure you're on staging branch
git checkout staging

# Verify changes
git status

# Commit changes
git add .
git commit -m "feat: add Psychological Support Tools and Launch Week Planner to TransitionDashboard

Prompt 4.3: Psychological Support Tools
- Created TransitionSupport component with 5-tab interface
- Implemented daily mood check-in with 6 mood options
- Added anxiety management with 7 fear categories
- Built motivation center with rotating daily affirmations
- Created 10 milestone badges system
- Implemented partner alignment tool with 7 expectation categories
- Added bail-out planning with no-shame messaging
- Created 7 database tables with proper relationships
- Added 3 RPC functions for mood trends, badges, and partner stats
- Positioned after CommunityHub for logical flow

Prompt 4.4: Launch Week Planner
- Created LaunchWeekPlanner component with day-by-day countdown
- Implemented 8-day view (days -7 through 0 Launch Day)
- Added 35 pre-defined tasks across 6 categories
- Built progress tracking with completion percentages
- Created special Launch Day celebration view
- Implemented post-departure check-ins (Day 1, Week 1, Month 1)
- Created 4 database tables with proper relationships
- Added 2 RPC functions for progress stats and countdown
- Positioned after TransitionSupport for logical flow

Completes Prompts 4.3 and 4.4 implementation

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
- [ ] Verify TransitionSupport section appears (after CommunityHub)
- [ ] Component loads without errors
- [ ] 5 tabs visible: Check-in, Anxiety, Motivation, Partner, Bail-Out

---

### Tab 1: Daily Check-in (Mood Tracking)

**Empty State**:
- [ ] Verify "No recent check-ins" message displays
- [ ] Mood selector grid visible with 6 moods
- [ ] Journal entry textarea available

**Add First Mood Check-in**:
- [ ] 6 mood options displayed:
  - [ ] Excited 😊 (green text)
  - [ ] Confident ❤️ (blue text)
  - [ ] Hopeful ✨ (purple text)
  - [ ] Uncertain 😐 (gray text)
  - [ ] Anxious ⚠️ (yellow text)
  - [ ] Overwhelmed ☹️ (red text)
- [ ] Click "Excited 😊" button
- [ ] Mood button highlights (blue background)
- [ ] Enter journal entry: "Feeling great about the journey ahead!"
- [ ] Click "Save Check-in" button
- [ ] Toast notification: "Check-in saved"
- [ ] Recent check-ins section shows today's entry:
  - [ ] Date displayed
  - [ ] Mood badge with icon and color
  - [ ] Journal entry snippet
  - [ ] "Has journal" indicator (if journal provided)

**Duplicate Check-in Prevention** (UPSERT test):
- [ ] Same day, select different mood: "Anxious ⚠️"
- [ ] Enter new journal: "Actually feeling nervous about finances"
- [ ] Click "Save Check-in"
- [ ] Toast: "Check-in updated"
- [ ] Recent check-ins shows updated mood (not duplicate)
- [ ] Only one entry for today

**Multiple Day Check-ins**:
- [ ] Manually change system date or wait until next day
- [ ] Add check-in for new day
- [ ] Verify multiple days display in recent check-ins
- [ ] Each day has single entry only

---

### Tab 2: Anxiety Management

**Empty State**:
- [ ] "No anxiety logs yet" message displays
- [ ] 7 fear category cards visible

**Fear Categories**:
- [ ] Financial Security - "It's normal to worry about money..."
- [ ] Relationships - "Many couples grow stronger on the road..."
- [ ] Safety Concerns - "The RV community is incredibly supportive..."
- [ ] Feeling Lonely - "You'll be amazed by the welcoming community..."
- [ ] Fear of Unknown - "Uncertainty is part of the adventure..."
- [ ] What if I Fail? - "There's no such thing as failure..."
- [ ] Future Regrets - "Most regret not trying..."

**Log Anxiety**:
- [ ] Select fear category: "Financial Security"
- [ ] Normalizing message displays below dropdown
- [ ] Enter coping strategy: "Creating detailed budget spreadsheet"
- [ ] Enter notes: "Reviewed blog posts about RV budgeting"
- [ ] Click "Log Anxiety" button
- [ ] Toast: "Anxiety logged"
- [ ] Recent logs section shows entry:
  - [ ] Fear category badge
  - [ ] Coping strategy
  - [ ] Notes
  - [ ] Timestamp

**Talk to Someone Button**:
- [ ] "Talk to someone" button visible
- [ ] Click button
- [ ] Navigates to Community Hub or shows community resources
- [ ] No errors

---

### Tab 3: Motivation Center

**Daily Affirmation**:
- [ ] Large affirmation text displays
- [ ] One of 8 affirmations shown:
  - "I am brave enough to create the life I want."
  - "Every step forward is progress, no matter how small."
  - "I trust myself to handle whatever comes."
  - "My dreams are worth pursuing."
  - "I am capable of adapting to new situations."
  - "This journey is mine, and I get to define success."
  - "I release fear and embrace possibility."
  - "I am building a life that excites me."
- [ ] Affirmation rotates daily (based on day of year)
- [ ] Same affirmation shows all day today
- [ ] Different affirmation tomorrow

**Milestone Badges**:
- [ ] Badge grid displays all 10 badges
- [ ] Each badge shows:
  - [ ] Icon (👟 📋 💰 🚐 🏕️ 📊 👥 🚀 🎉 🏆)
  - [ ] Badge name
  - [ ] Description
  - [ ] Status (Earned or Not Earned)
- [ ] Earned badges have green checkmark
- [ ] Not earned badges grayed out
- [ ] All badges initially not earned

**Badge Earning** (manual test):
- [ ] Manually insert earned badge via SQL:
  ```sql
  INSERT INTO user_badges (user_id, badge_id)
  SELECT 'your-user-uuid', id FROM milestone_badges WHERE name = 'First Steps';
  ```
- [ ] Reload Motivation tab
- [ ] "First Steps" badge now shows green checkmark
- [ ] Badge card highlights (green border)
- [ ] Earned count increments

**Motivation Boosts**:
- [ ] List of 5+ motivational tips displays
- [ ] Each tip has icon and text
- [ ] Tips relevant to RV transition

---

### Tab 4: Partner Alignment

**Empty State**:
- [ ] "No expectations yet" message displays
- [ ] "Add Expectation" button visible

**Add First Expectation**:
- [ ] Click "Add Expectation" button
- [ ] Form displays with fields:
  - [ ] Category dropdown (7 options):
    - Budget & Spending
    - Travel Pace & Frequency
    - Work-Life Balance
    - Social Life & Friends
    - Daily Routines
    - Household Responsibilities
    - Conflict Resolution
  - [ ] Expectation textarea (required)
  - [ ] Priority dropdown (Low, Medium, High)
- [ ] Select category: "Budget & Spending"
- [ ] Enter expectation: "We'll track all expenses in shared spreadsheet"
- [ ] Select priority: "High"
- [ ] Click "Add Expectation" button
- [ ] Toast: "Expectation added"
- [ ] Expectation card displays:
  - [ ] Category badge (Budget & Spending)
  - [ ] Expectation text
  - [ ] Priority badge (High - red background)
  - [ ] Created date

**Add Multiple Expectations** (7 categories):
- [ ] Add expectation for each category
- [ ] Each category has different icon/color
- [ ] Expectations list in order added
- [ ] Priority badges show correct colors:
  - [ ] High: Red
  - [ ] Medium: Yellow
  - [ ] Low: Green

**Discussion Starters**:
- [ ] Pre-written discussion prompts visible
- [ ] Questions help facilitate partner conversations
- [ ] Examples like:
  - "How will we split household tasks?"
  - "What's our plan if we run out of money?"
  - "How often will we see family and friends?"

**Partner Invitation** (future feature note):
- [ ] No partner invite system yet (v1 is solo tracking)
- [ ] User can manually share expectations with partner
- [ ] Partner can create their own account and add expectations

---

### Tab 5: Bail-Out Planning

**No Shame Messaging**:
- [ ] Green info box displays: "Having a backup plan shows wisdom, not weakness"
- [ ] Positive framing throughout
- [ ] "Smart planning" language used

**Empty State**:
- [ ] "No backup plans yet" message displays
- [ ] "Create Backup Plan" button visible

**Create Backup Plan**:
- [ ] Click "Create Backup Plan" button
- [ ] Form displays with fields:
  - [ ] Plan Type dropdown (6 options):
    - Financial Backup
    - Housing Backup
    - Employment Backup
    - Relationship Support
    - Health Contingency
    - Complete Return Plan
  - [ ] Plan Details textarea (required)
  - [ ] Trigger Conditions textarea (optional)
  - [ ] Resources Needed textarea (optional)
- [ ] Select plan type: "Financial Backup"
- [ ] Enter plan details: "If savings drop below $5k, return to old job (they said I can come back)"
- [ ] Enter trigger: "Less than $5,000 in savings"
- [ ] Enter resources: "Former employer contact, apartment sublet options"
- [ ] Click "Save Plan" button
- [ ] Toast: "Backup plan saved"
- [ ] Plan card displays:
  - [ ] Plan type badge (Financial Backup)
  - [ ] Plan details
  - [ ] Trigger conditions (if provided)
  - [ ] Resources needed (if provided)
  - [ ] Edit and delete buttons

**Edit Backup Plan**:
- [ ] Click "Edit" button on plan card
- [ ] Form pre-fills with current values
- [ ] Modify plan details
- [ ] Click "Update Plan"
- [ ] Toast: "Plan updated"
- [ ] Card shows updated information

**Delete Backup Plan**:
- [ ] Click "Delete" button
- [ ] Confirmation dialog appears
- [ ] Confirm deletion
- [ ] Toast: "Plan deleted"
- [ ] Card removed from list

---

### Step 5: Database Verification (Post-Testing)

After completing UI tests, verify database state:

**Mood Check-ins**:
```sql
SELECT
  date,
  mood,
  LENGTH(journal_entry) as journal_length,
  created_at
FROM mood_check_ins
WHERE user_id = 'your-user-uuid'
ORDER BY date DESC;
```

Expected: One check-in per day, no duplicates

**Mood Trends Query**:
```sql
SELECT * FROM get_mood_trends('your-user-uuid', 30);
```

Expected: Returns mood history with has_journal indicator

**Anxiety Logs**:
```sql
SELECT
  fear_category,
  coping_strategy_used,
  notes,
  created_at
FROM anxiety_logs
WHERE user_id = 'your-user-uuid'
ORDER BY created_at DESC;
```

Expected: Anxiety logs from testing

**Badge Eligibility**:
```sql
SELECT * FROM check_badge_eligibility('your-user-uuid');
```

Expected: All 10 badges with earned status

**Partner Expectations**:
```sql
SELECT
  category,
  expectation,
  priority,
  created_at
FROM partner_expectations
WHERE user_id = 'your-user-uuid'
ORDER BY created_at ASC;
```

Expected: Expectations from testing

**Alignment Stats**:
```sql
SELECT * FROM get_partner_alignment_stats('your-user-uuid');
```

Expected:
```
total_expectations: 7 (if all categories filled)
discussed_expectations: 0 (no discussion threading yet)
high_priority_count: 1 (from "High" priority test)
categories_covered: 7 (if all categories filled)
```

**Bailout Plans**:
```sql
SELECT
  plan_type,
  plan_details,
  trigger_conditions,
  resources_needed
FROM bailout_plans
WHERE user_id = 'your-user-uuid'
ORDER BY created_at DESC;
```

Expected: Backup plans from testing

---

### Step 6: Integration Testing

**With Other Components**:

1. **With MilestoneBadges System**:
   - [ ] Complete 10 tasks in checklist
   - [ ] Badge "Getting Organized" earned
   - [ ] Navigate to Motivation tab
   - [ ] Badge displays as earned

2. **With FinancialBuckets**:
   - [ ] Create comprehensive budget
   - [ ] Badge "Budget Master" earned
   - [ ] Navigate to Motivation tab
   - [ ] Badge displays as earned

3. **Cross-Component User Flow**:
   - [ ] User feels anxious about money
   - [ ] Logs anxiety with coping strategy
   - [ ] Reads daily affirmation
   - [ ] Navigates to FinancialBuckets
   - [ ] Creates detailed budget (coping action)
   - [ ] Returns to Motivation tab
   - [ ] Sees progress via badges

---

### Step 7: Mobile Responsive Testing

**Mobile devices or narrow browser window** (<768px):
- [ ] 5 tabs stack nicely
- [ ] Mood selector grid wraps (2 columns)
- [ ] Fear category cards stack vertically
- [ ] Badge grid shows 2 columns
- [ ] Expectation cards full width
- [ ] Backup plan cards full width
- [ ] Forms remain usable
- [ ] No horizontal scroll

**Tablet** (768px - 1024px):
- [ ] Mood selector shows 3 columns
- [ ] Badge grid shows 3 columns
- [ ] All content readable

**Desktop** (>1024px):
- [ ] Mood selector shows 3 columns (as designed)
- [ ] Badge grid shows 5 columns
- [ ] Full-width layout in dashboard (lg:col-span-3)
- [ ] Optimal spacing and readability

---

### Step 8: Performance Validation

**Load time checks**:
- [ ] Initial component render <500ms
- [ ] Mood check-in save <300ms
- [ ] Badge query <1s
- [ ] Expectation add <300ms
- [ ] Backup plan save <300ms

**RPC Function Performance**:
- [ ] get_mood_trends() <500ms
- [ ] check_badge_eligibility() <500ms
- [ ] get_partner_alignment_stats() <500ms

**Resource checks** (Chrome DevTools):
- [ ] Network tab - all Supabase queries succeed
- [ ] Console - no errors or warnings
- [ ] Performance tab - no jank during interactions
- [ ] Memory - no leaks after multiple check-ins

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
-- Drop tables (will lose all data!)
DROP TABLE IF EXISTS expectation_discussions CASCADE;
DROP TABLE IF EXISTS partner_expectations CASCADE;
DROP TABLE IF EXISTS bailout_plans CASCADE;
DROP TABLE IF EXISTS user_badges CASCADE;
DROP TABLE IF EXISTS milestone_badges CASCADE;
DROP TABLE IF EXISTS anxiety_logs CASCADE;
DROP TABLE IF EXISTS mood_check_ins CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS get_mood_trends(UUID, INTEGER);
DROP FUNCTION IF EXISTS check_badge_eligibility(UUID);
DROP FUNCTION IF EXISTS get_partner_alignment_stats(UUID);
```

**Note**: Only use rollback if critical issues prevent basic app functionality. Minor bugs should be fixed forward.

---

## Production Deployment (After Staging Success)

### Prerequisites
- [ ] All staging tests passed
- [ ] No critical bugs found
- [ ] Performance metrics acceptable
- [ ] Badge system validated
- [ ] UPSERT prevents duplicates
- [ ] No shame messaging verified
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
   - Execute `410_psychological_support.sql`
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
   - Monitor mood check-in patterns

---

## Known Limitations

1. **Real-time Updates**: Mood trends don't update in real-time (requires page refresh)

2. **Badge Automation**: Badges must be manually awarded via SQL (no automated triggers yet)

3. **Partner Linking**: No partner invitation system (users manage expectations solo in v1)

4. **Discussion Threading**: Expectation discussions not implemented (v2 feature)

5. **Affirmation Customization**: Users can't add custom affirmations (8 system-defined only)

6. **Export**: No export functionality for backup plans or mood history

---

## Future Enhancements (Not in Scope)

- Automated badge earning triggers
- Partner invitation and linking system
- Real-time expectation discussion threading
- Custom affirmations per user
- Mood trend charts and visualizations
- Export mood history and backup plans to PDF
- Push notifications for daily check-ins
- Guided meditation and coping resources
- Professional counselor integration
- Anonymous peer support groups

---

## Security Considerations

**RLS Policies Applied**:
- Users can only see/modify their own mood check-ins
- Users can only see/modify their own anxiety logs
- Badge eligibility checked per user
- Users can only see/modify their own expectations
- Users can only see/modify their own backup plans

**Verify RLS Working**:
```sql
-- Try to access another user's mood check-ins (should return 0 rows)
SELECT * FROM mood_check_ins WHERE user_id = 'other-user-uuid';

-- Try to access another user's backup plans (should return 0 rows)
SELECT * FROM bailout_plans WHERE user_id = 'other-user-uuid';
```

Expected: 0 rows (RLS prevents unauthorized access)

---

## Support

**Issue tracking**: https://github.com/Thabonel/wheels-wins-landing-page/issues
**Documentation**: `docs/implementation-logs/PROMPT_4_3_PSYCHOLOGICAL_SUPPORT.md`
**SQL Schema**: `docs/sql-fixes/410_psychological_support.sql`
**Component**: `src/components/transition/TransitionSupport.tsx`

---

**Deployment Prepared**: January 2025
**Status**: Ready for staging deployment
