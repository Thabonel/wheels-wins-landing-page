# Prompt 4.1: Reality Check System - Deployment Instructions

**Feature**: Timeline feasibility analyzer with traffic light system
**Status**: ✅ Code complete, ready for deployment
**Date**: October 26, 2025

---

## Prerequisites

- [ ] Access to staging environment
- [ ] Existing transition profile data (or test data)
- [ ] Existing transition tasks data (or test data)

**Note**: This feature uses existing database tables (`transition_profiles`, `transition_tasks`) and requires no new migrations.

---

## Deployment Steps

### Step 1: Verify Database Requirements

**Tables Required** (should already exist from previous prompts):
- `transition_profiles` - User transition profiles with departure dates
- `transition_tasks` - User tasks with completion status and priority

Run this query to verify:
```sql
-- Check if tables exist
SELECT COUNT(*) FROM transition_profiles;
SELECT COUNT(*) FROM transition_tasks;
```

Expected: Both queries return counts (any number, including 0 is fine).

If tables don't exist, see previous prompt deployment instructions.

---

### Step 2: Deploy Frontend to Staging

**Branch**: staging (or create feature branch)
**Changes committed**:
- `src/components/transition/RealityCheck.tsx` (new component - 453 lines)
- `src/components/transition/TransitionDashboard.tsx` (integration)
- `docs/implementation-logs/PROMPT_4_1_REALITY_CHECK.md` (comprehensive docs)
- `docs/deployment-instructions/PROMPT_4_1_DEPLOYMENT.md` (this file)

**Commands**:
```bash
# Ensure you're on staging branch
git checkout staging

# Verify changes
git status

# If changes not committed, commit them:
git add src/components/transition/RealityCheck.tsx
git add src/components/transition/TransitionDashboard.tsx
git add docs/implementation-logs/PROMPT_4_1_REALITY_CHECK.md
git add docs/deployment-instructions/PROMPT_4_1_DEPLOYMENT.md
git commit -m "feat: add Reality Check feasibility analyzer to TransitionDashboard

- Created RealityCheck component with feasibility scoring
- Implemented traffic light indicator system (green/yellow/red)
- Added risk level assessment (low/medium/high)
- Built recommendations engine with three tiers
- Added bottleneck identification system
- Calculated tasks per week and weeks remaining
- Integrated similar users success rate
- Positioned after ShakedownLogger for logical flow
- Updated implementation log and deployment instructions

Completes Prompt 4.1 implementation

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

### Step 3: Test in Staging Environment

**Staging URL**: https://wheels-wins-staging.netlify.app

#### Test Checklist

**Basic Functionality**:
- [ ] Navigate to Transition Dashboard page
- [ ] Verify RealityCheck section appears (after ShakedownLogger, before CommunityHub)
- [ ] Component loads without errors

**Empty State** (if no profile/tasks exist):
- [ ] Create transition profile with departure date (e.g., 12 weeks from today)
- [ ] Add at least 5 tasks with various priorities
- [ ] Reload page
- [ ] RealityCheck should now display metrics

**Feasibility Score Display**:
- [ ] Large circular traffic light indicator visible (20x20 grid units)
- [ ] Score percentage displayed (0-100%)
- [ ] "Feasibility Score" label shown
- [ ] Risk level badge displayed (Low/Medium/High Risk)
- [ ] Progress bar below score

**Scenario 1: On Track User** (Score should be 70-100%):
Setup:
- [ ] Set departure date: 20 weeks from today
- [ ] Create 30 tasks total (any category)
- [ ] Mark 10 as completed
- [ ] Set only 3 as high priority
- [ ] Leave 20 tasks incomplete (mix of medium/low priority)

Expected Results:
- [ ] Tasks remaining: 20
- [ ] Weeks remaining: 20
- [ ] Tasks per week: 1.0
- [ ] Feasibility score: 90-100% (very light workload)
- [ ] Traffic light: Green (bg-green-500)
- [ ] Icon: CheckCircle (green check)
- [ ] Risk level badge: "Low Risk" (green background)
- [ ] Status indicator: "Manageable" (green text)
- [ ] Similar users success rate: 85%
- [ ] No bottlenecks displayed
- [ ] Recommendations:
  - [ ] "Great progress! Maintain your current momentum"
  - [ ] "Start planning celebration milestones"
  - [ ] "Help others in the community with your experience"
  - [ ] "Focus on quality over speed in remaining tasks"

**Scenario 2: Warning User** (Score should be 50-69%):
Setup:
- [ ] Change departure date: 8 weeks from today
- [ ] Create 50 tasks total
- [ ] Mark 10 as completed
- [ ] Set 7 as high priority incomplete
- [ ] Leave 40 tasks incomplete

Expected Results:
- [ ] Tasks remaining: 40
- [ ] Weeks remaining: 8
- [ ] Tasks per week: 5.0
- [ ] Feasibility score: 60-70% (moderate workload + some high priority)
- [ ] Traffic light: Yellow (bg-yellow-500) or Green (borderline)
- [ ] Icon: AlertTriangle (yellow warning) or CheckCircle
- [ ] Risk level badge: "Medium Risk" (yellow) or "Low Risk" (borderline)
- [ ] Status indicator: "High pace" (red text - >5 tasks/week)
- [ ] Similar users success rate: 65% or 85% (depends on final score)
- [ ] Bottlenecks may include:
  - [ ] "7 high-priority tasks need immediate attention"
- [ ] Recommendations:
  - [ ] "Prioritize high-impact tasks over nice-to-haves" or "Great progress!"
  - [ ] "Review your timeline for flexibility" or celebration messages

**Scenario 3: At Risk User** (Score should be <50%):
Setup:
- [ ] Change departure date: 6 weeks from today
- [ ] Create 80 tasks total
- [ ] Mark 10 as completed
- [ ] Set 12 as high priority incomplete
- [ ] Leave 70 tasks incomplete

Expected Results:
- [ ] Tasks remaining: 70
- [ ] Weeks remaining: 6
- [ ] Tasks per week: 11.7
- [ ] Feasibility score: 25-35% (very high workload + many high priority)
- [ ] Traffic light: Red (bg-red-500)
- [ ] Icon: AlertCircle (red X)
- [ ] Risk level badge: "High Risk" (red background)
- [ ] Status indicator: "High pace" (red text - >5 tasks/week)
- [ ] Similar users success rate: 45%
- [ ] Bottlenecks section appears with 3 items:
  - [ ] "12 high-priority tasks need immediate attention"
  - [ ] "Workload of 11.7 tasks/week is very demanding"
  - [ ] May include "Limited time with significant work remaining" if <4 weeks
- [ ] Recommendations:
  - [ ] "Consider extending your departure date by 4-8 weeks"
  - [ ] "Focus only on critical 'must-do' tasks"
  - [ ] "Delegate or outsource where possible"
  - [ ] "Reach out to transition mentors for help"

**Scenario 4: Critical User** (Score should be <30%):
Setup:
- [ ] Change departure date: 2 weeks from today
- [ ] Keep 70 incomplete tasks
- [ ] Keep 12 high priority

Expected Results:
- [ ] Tasks remaining: 70
- [ ] Weeks remaining: 2
- [ ] Tasks per week: 35.0
- [ ] Feasibility score: <30% (extremely high workload + critical time + many high priority)
- [ ] Traffic light: Red (bg-red-500)
- [ ] Risk level: "High Risk"
- [ ] Similar users success rate: 45%
- [ ] Bottlenecks section displays all 3 warnings:
  - [ ] "12 high-priority tasks need immediate attention"
  - [ ] "Workload of 35.0 tasks/week is very demanding"
  - [ ] "Limited time with significant work remaining"
- [ ] Recommendations: Critical tier (extend timeline, delegate, seek mentors)

**Key Metrics Grid**:
- [ ] Three columns on desktop (lg:grid-cols-3)
- [ ] Stacks to one column on mobile
- [ ] Tasks Remaining Card:
  - [ ] ListChecks icon (gray)
  - [ ] Large bold number for remaining tasks
  - [ ] "X completed" context text (gray-500)
- [ ] Weeks Remaining Card:
  - [ ] Calendar icon (gray)
  - [ ] Large bold number for weeks
  - [ ] "Until [formatted date]" context text
- [ ] Tasks Per Week Card:
  - [ ] TrendingUp icon (gray)
  - [ ] Large bold number with 1 decimal place
  - [ ] Status indicator:
    - [ ] "High pace" with TrendingUp icon (red) if >5
    - [ ] "Manageable" with TrendingDown icon (green) if ≤5

**Similar Users Success Rate Card**:
- [ ] Users icon (blue)
- [ ] "Similar Users Success Rate" heading
- [ ] Progress bar showing percentage
- [ ] Large blue percentage value
- [ ] Descriptive text explaining the metric

**Bottlenecks Section** (conditional - only shows when bottlenecks exist):
- [ ] Orange AlertTriangle icon
- [ ] "Identified Bottlenecks" heading
- [ ] List of bottleneck items with ArrowRight icons
- [ ] Each item in gray-700 text
- [ ] Section hidden when no bottlenecks exist

**Recommendations Section**:
- [ ] Blue Lightbulb icon
- [ ] "Recommendations" heading
- [ ] List of 4 recommendations with ArrowRight icons
- [ ] Recommendations change based on score tier
- [ ] Each item in gray-700 text

**Action Button**:
- [ ] "Acknowledge Reality Check" button centered
- [ ] Outline variant styling
- [ ] Click triggers toast: "Reality Check Saved" / "Your progress has been noted"

---

### Step 4: Algorithm Verification

**Verify deduction logic** with different scenarios:

**Test 1: Workload Deductions**:
- [ ] >10 tasks/week → score deduction 40 points
- [ ] 7-10 tasks/week → score deduction 30 points
- [ ] 5-7 tasks/week → score deduction 20 points
- [ ] 3-5 tasks/week → score deduction 10 points
- [ ] <3 tasks/week → no deduction

**Test 2: Time Pressure Deductions**:
- [ ] <4 weeks remaining → score deduction 20 points
- [ ] 4-8 weeks remaining → score deduction 10 points
- [ ] >8 weeks remaining → no deduction

**Test 3: High-Priority Deductions**:
- [ ] >10 high-priority incomplete → score deduction 15 points
- [ ] 5-10 high-priority incomplete → score deduction 10 points
- [ ] <5 high-priority incomplete → no deduction

**Test 4: Ahead of Schedule Bonus**:
- [ ] <2 tasks/week AND >12 weeks remaining → score bonus +10 points
- [ ] Otherwise → no bonus

**Test 5: Risk Level Thresholds**:
- [ ] Score ≥70 → "Low Risk" (green)
- [ ] Score 50-69 → "Medium Risk" (yellow)
- [ ] Score <50 → "High Risk" (red)

**Test 6: Similar Users Success Rate**:
- [ ] Score ≥70 → 85% success rate
- [ ] Score 50-69 → 65% success rate
- [ ] Score <50 → 45% success rate

---

### Step 5: Edge Cases

**No Profile**:
- [ ] Delete transition profile (or test with new user)
- [ ] Navigate to Transition Dashboard
- [ ] RealityCheck displays message: "Create a transition profile to see your reality check"
- [ ] No error in console

**No Tasks**:
- [ ] Profile exists but no tasks
- [ ] RealityCheck displays with:
  - [ ] Tasks remaining: 0
  - [ ] Weeks remaining: calculated correctly
  - [ ] Tasks per week: 0.0
  - [ ] Feasibility score: 100% (no work = perfect score)
  - [ ] Risk level: "Low Risk"
  - [ ] No bottlenecks
  - [ ] Positive recommendations

**Zero Weeks Remaining** (departure date is today):
- [ ] Set departure date to today
- [ ] With incomplete tasks
- [ ] Tasks per week should equal total remaining tasks (all due this week)
- [ ] Score should be very low (red zone)
- [ ] Time pressure deduction applied
- [ ] Bottleneck: "Limited time with significant work remaining"

**Negative Days Remaining** (departure date in past):
- [ ] Set departure date to 1 week ago
- [ ] Weeks remaining should show 0 (clamped with Math.max)
- [ ] Tasks per week equals total remaining tasks
- [ ] Score very low
- [ ] Critical recommendations

**All Tasks Complete**:
- [ ] Mark all tasks as completed
- [ ] Tasks remaining: 0
- [ ] Tasks per week: 0.0
- [ ] Score: 100% (possibly with ahead-of-schedule bonus)
- [ ] Risk level: "Low Risk"
- [ ] Congratulatory recommendations

---

### Step 6: Mobile Responsive Testing

**Mobile devices or narrow browser window** (<768px):
- [ ] Stats grid stacks to 1 column (grid-cols-1)
- [ ] Metric cards remain full width
- [ ] Traffic light indicator stays visible (20x20 size appropriate)
- [ ] Recommendations list readable
- [ ] Bottlenecks list readable
- [ ] Action button remains centered
- [ ] No horizontal scroll
- [ ] Text sizes appropriate
- [ ] Touch targets large enough (min 44x44px)

**Tablet** (768px - 1024px):
- [ ] Stats grid may show 2-3 columns
- [ ] Layout adapts smoothly
- [ ] All content readable

**Desktop** (>1024px):
- [ ] Stats grid shows 3 columns (grid-cols-3)
- [ ] Full-width layout in dashboard (lg:col-span-3)
- [ ] Optimal spacing and readability

---

### Step 7: Performance Validation

**Load time checks**:
- [ ] Initial component render <500ms
- [ ] Metrics calculation (useMemo) <100ms
- [ ] No re-renders on unrelated state changes
- [ ] Smooth traffic light transitions

**Resource checks** (Chrome DevTools):
- [ ] Network tab - Supabase queries succeed (200 status)
- [ ] Console - no errors or warnings
- [ ] Performance tab - no layout thrashing
- [ ] Memory - useMemo prevents recalculation on every render

---

### Step 8: Integration Testing

**Test interactions with other components**:

1. **Task Completion Impact**:
   - [ ] Note current feasibility score
   - [ ] Navigate to TransitionChecklist
   - [ ] Complete 5 tasks
   - [ ] Return to RealityCheck
   - [ ] Verify score increased
   - [ ] Verify tasks remaining decreased
   - [ ] Verify tasks per week decreased
   - [ ] Risk level may improve

2. **Departure Date Change**:
   - [ ] Note current score
   - [ ] Navigate to profile settings (if available)
   - [ ] Change departure date (extend by 4 weeks)
   - [ ] Return to RealityCheck
   - [ ] Verify weeks remaining increased
   - [ ] Verify tasks per week decreased
   - [ ] Verify score increased
   - [ ] Risk level may improve

3. **Task Priority Changes**:
   - [ ] Note current score
   - [ ] Change 5 high-priority tasks to medium
   - [ ] Return to RealityCheck
   - [ ] Verify score increased slightly
   - [ ] High-priority deduction reduced
   - [ ] Bottlenecks may disappear

4. **With Financial Context**:
   - [ ] RealityCheck identifies critical timeline issues
   - [ ] Navigate to FinancialBuckets
   - [ ] Verify financial readiness aligns with timeline readiness
   - [ ] Both systems provide complementary insights

---

### Step 9: User Experience Testing

**Readability**:
- [ ] All text legible in both light/dark mode (if applicable)
- [ ] Color contrast meets WCAG AA standards
- [ ] Icon + text combinations clear
- [ ] Recommendations actionable and specific

**Visual Hierarchy**:
- [ ] Traffic light indicator draws immediate attention
- [ ] Score is most prominent metric
- [ ] Key metrics grid provides quick snapshot
- [ ] Recommendations easily scannable

**Feedback**:
- [ ] Toast notification confirms acknowledgment action
- [ ] Status indicators (High pace / Manageable) provide instant context
- [ ] Risk badges use appropriate colors and icons

**Guidance**:
- [ ] Recommendations provide clear next steps
- [ ] Bottlenecks identify specific problems
- [ ] Similar users success rate provides social proof
- [ ] Overall message is encouraging yet realistic

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

**Note**: No database changes to roll back - uses existing tables.

---

## Production Deployment (After Staging Success)

### Prerequisites
- [ ] All staging tests passed
- [ ] No critical bugs found
- [ ] Performance metrics acceptable
- [ ] Feasibility algorithm validated with real data
- [ ] Code reviewed by team
- [ ] User feedback positive (if beta tested)

### Steps
1. **Merge staging to main**:
   ```bash
   git checkout main
   git pull origin main
   git merge staging
   git push origin main
   ```

2. **Monitor production deployment**:
   - Netlify auto-deploys from main branch
   - Watch build logs for errors
   - Check production URL after deployment
   - Run smoke tests on production

3. **Post-deployment monitoring** (first 24 hours):
   - Check error tracking (Sentry, if configured)
   - Monitor database query performance
   - Watch for user reports
   - Review analytics for feature usage

---

## Known Limitations

1. **Similar Users Success Rate**: Currently mock data based on score tiers (85%/65%/45%). Future: query actual user data from completed transitions.

2. **Bottleneck Detection**: Simple checks (high-priority count, tasks/week, time remaining). Future: analyze task dependencies, identify critical path.

3. **Recommendation Personalization**: Generic recommendations based on score. Future: personalized recommendations based on user's specific situation.

4. **Historical Tracking**: Shows current snapshot only. Future: track score changes over time, show progress graph.

---

## Future Enhancements (Not in Scope)

- Save reality check snapshots to database for historical tracking
- Weekly email reminders with updated feasibility score
- Share reality check with accountability partners
- Notification when score drops below threshold
- AI-powered recommendations using actual user data patterns
- Task dependency analysis for true critical path
- Resource allocation optimizer (time, money, help needed)
- Comparison to user cohorts with similar profiles
- Predictive modeling of timeline success probability
- What-if scenario testing (extend timeline by X weeks, delegate Y tasks)

---

## Support

**Issue tracking**: https://github.com/Thabonel/wheels-wins-landing-page/issues
**Documentation**: `docs/implementation-logs/PROMPT_4_1_REALITY_CHECK.md`
**Component**: `src/components/transition/RealityCheck.tsx`

---

**Deployment Prepared**: October 26, 2025
**Status**: Ready for staging deployment
