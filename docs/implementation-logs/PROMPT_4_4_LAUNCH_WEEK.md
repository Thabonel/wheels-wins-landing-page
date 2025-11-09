# Prompt 4.4 Implementation Log: Launch Week Planner

**Date**: January 2025
**Component**: LaunchWeekPlanner.tsx
**Database Schema**: 420_launch_week_planner.sql
**Status**: ✅ Complete

---

## Overview

Implemented a comprehensive launch week countdown and preparation system with day-by-day task tracking, special Launch Day celebration, and post-departure check-ins.

## Features Implemented

### 1. Launch Week Countdown
- **8-Day View**: Days -7 through 0 (Launch Day)
- **Day Selector Grid**: Visual grid with completion indicators
- **Progress Tracking**: Per-day completion percentage and task counts
- **Days Until Launch**: Real-time countdown using RPC function
- **Visual Indicators**:
  - Green border: Day 100% complete
  - Blue border: Currently selected day
  - Gray border: Incomplete day

### 2. Day-by-Day Task System
- **35 Pre-Defined Tasks** across all 8 days
- **Task Categories**: Legal, Financial, Vehicle, Personal, Communication, Safety
- **Critical vs Optional**: Clear markers for must-do tasks
- **Time Estimates**: Minutes per task for planning
- **Completion Checkboxes**: Track task completion
- **Notes Field**: Add personal notes per task

### 3. Launch Day Special View
- **Ceremonial Elements**:
  - Orange/yellow gradient background
  - Party popper and celebration emojis
  - First destination display
  - Emergency contacts summary
  - Celebration plans
  - Special "You did it!" message
- **Final Checklist**:
  - Safety check
  - Departure photo
  - Notify tracking person
  - Start navigation
  - Breathe and enjoy!

### 4. Launch Date Setup
- **Initial Form** (if no launch date set):
  - Date picker
  - First destination input
  - Emergency contacts (JSON format)
  - Celebration plans textarea
- **Edit Option**: Modify launch details anytime

### 5. Post-Departure Check-ins
- **3 Check-in Types**:
  - Day 1 (first day on the road)
  - Week 1 (first week completed)
  - Month 1 (first month milestone)
- **Check-in Form**:
  - 8 mood options (excited, anxious, overwhelmed, confident, uncertain, hopeful, relieved, exhausted)
  - Overall experience textarea
  - Wins and challenges sections
- **Check-in History**: Display previous check-ins with mood and date

---

## Database Schema

### Tables Created

#### 1. launch_week_tasks
```sql
CREATE TABLE launch_week_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_number INTEGER NOT NULL CHECK (day_number >= -7 AND day_number <= 0),
  task_name TEXT NOT NULL,
  description TEXT NOT NULL,
  is_critical BOOLEAN NOT NULL DEFAULT false,
  time_estimate_minutes INTEGER NOT NULL,
  order_num INTEGER NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('legal', 'financial', 'vehicle', 'personal', 'communication', 'safety')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 2. user_launch_tasks
```sql
CREATE TABLE user_launch_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES launch_week_tasks(id) ON DELETE CASCADE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, task_id)
);
```

#### 3. user_launch_dates
```sql
CREATE TABLE user_launch_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  launch_date DATE NOT NULL,
  first_destination TEXT,
  emergency_contacts JSONB,
  celebration_plans TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);
```

#### 4. launch_checkins
```sql
CREATE TABLE launch_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_type TEXT NOT NULL CHECK (checkin_type IN ('day_1', 'week_1', 'month_1')),
  response TEXT NOT NULL,
  mood TEXT CHECK (mood IN ('excited', 'anxious', 'overwhelmed', 'confident', 'uncertain', 'hopeful', 'relieved', 'exhausted')),
  challenges TEXT,
  wins TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, checkin_type)
);
```

### RPC Functions Created

#### 1. get_launch_week_progress
Returns progress statistics for all launch week days.

```sql
CREATE OR REPLACE FUNCTION get_launch_week_progress(p_user_id UUID)
RETURNS TABLE (
  day_number INTEGER,
  total_tasks INTEGER,
  completed_tasks INTEGER,
  critical_tasks INTEGER,
  critical_completed INTEGER,
  completion_percentage DECIMAL
)
```

#### 2. get_days_until_launch
Calculates days remaining until launch date.

```sql
CREATE OR REPLACE FUNCTION get_days_until_launch(p_user_id UUID)
RETURNS INTEGER
```
- Returns positive number for days until launch
- Returns negative number for days since launch
- Returns NULL if no launch date set

---

## Component Architecture

### File Structure
```
src/components/transition/LaunchWeekPlanner.tsx (674 lines)
├── Imports (shadcn/ui components, icons, types)
├── Interfaces (LaunchWeekTask, DayProgress, LaunchDate, CheckIn)
├── Constants (DAY_LABELS, MOOD_OPTIONS)
├── Component State (selected day, tasks, progress, launch date, check-ins)
├── Data Loading (useEffect for Supabase queries with LEFT JOIN)
├── Event Handlers (task toggle, date setup, check-in submit)
└── UI Rendering (day grid, task list, special Launch Day view, check-ins)
```

### Data Flow
```
1. Load all launch_week_tasks (system-defined)
2. LEFT JOIN with user_launch_tasks (user completion status)
3. Transform to flat structure with is_completed flag
4. Call RPC for progress stats (per day aggregation)
5. Call RPC for days until launch (countdown)
6. Render day grid with progress indicators
7. Render selected day tasks with checkboxes
```

---

## Default Task Data (35 Tasks)

### Day -7 (One Week Before)
1. Final vehicle inspection (Critical, 120 min, Vehicle)
2. Confirm insurance coverage (Critical, 30 min, Legal)
3. Notify key contacts (Optional, 20 min, Communication)
4. Stock up on essentials (Optional, 90 min, Personal)
5. Create backup digital files (Optional, 45 min, Safety)

### Day -6
1. Cancel/forward mail (Critical, 30 min, Legal)
2. Close or suspend utilities (Critical, 60 min, Financial)
3. Pack kitchen essentials (Optional, 90 min, Personal)
4. Test all RV systems (Critical, 60 min, Vehicle)
5. Update GPS/maps (Optional, 20 min, Safety)

### Day -5
1. Final banking setup (Critical, 30 min, Financial)
2. Pack clothing and bedding (Optional, 120 min, Personal)
3. Set up roadside assistance (Critical, 20 min, Safety)
4. Organize tools and repair kit (Optional, 45 min, Vehicle)
5. Plan first week route (Optional, 60 min, Safety)

### Day -4
1. Weigh RV fully loaded (Critical, 60 min, Vehicle)
2. Pack personal items (Optional, 90 min, Personal)
3. Share itinerary with trusted person (Critical, 20 min, Safety)
4. Stock medications and prescriptions (Critical, 30 min, Personal)
5. Test backup communication (Optional, 30 min, Communication)

### Day -3
1. Deep clean RV interior (Optional, 120 min, Personal)
2. Secure all items for travel (Critical, 60 min, Vehicle)
3. Charge all devices (Optional, 15 min, Personal)
4. Review emergency procedures (Critical, 30 min, Safety)
5. Say goodbye to local connections (Optional, 180 min, Communication)

### Day -2
1. Final shopping run (Optional, 90 min, Personal)
2. Fill fuel tank (Critical, 20 min, Vehicle)
3. Dump tanks and refill fresh water (Critical, 30 min, Vehicle)
4. Double-check all connections (Critical, 30 min, Vehicle)
5. Rest and relax (Optional, 120 min, Personal)

### Day -1
1. Final walkthrough of home/storage (Critical, 60 min, Legal)
2. Exterior vehicle inspection (Critical, 30 min, Vehicle)
3. Pack day-of essentials (Optional, 20 min, Personal)
4. Set departure time alarm (Optional, 5 min, Personal)
5. Journal/reflect on moment (Optional, 30 min, Personal)

### Day 0 (Launch Day!)
1. Final safety check (Critical, 15 min, Safety)
2. Take departure photo (Optional, 5 min, Personal)
3. Notify tracking person (Critical, 5 min, Communication)
4. Start navigation system (Critical, 10 min, Vehicle)
5. Breathe and enjoy (Optional, 5 min, Personal)

---

## Key Implementation Details

### Task Loading with User Completion
```typescript
const { data: tasksData } = await supabase
  .from('launch_week_tasks')
  .select(`
    *,
    user_launch_tasks!left(id, is_completed, user_id)
  `)
  .order('day_number', { ascending: true })
  .order('order_num', { ascending: true });

const transformedTasks = (tasksData || []).map((task: any) => {
  const userTask = task.user_launch_tasks?.find((ut: any) => ut.user_id === user.id);
  return {
    ...task,
    is_completed: userTask?.is_completed || false,
    user_task_id: userTask?.id,
  };
});
```

### Progress Calculation via RPC
```typescript
const { data: progressData } = await supabase
  .rpc('get_launch_week_progress', { p_user_id: user.id });
setDayProgress(progressData || []);
```

### Days Until Launch Countdown
```typescript
const { data: daysData } = await supabase
  .rpc('get_days_until_launch', { p_user_id: user.id });
setDaysUntilLaunch(daysData);
```

### Task Toggle with UPSERT
```typescript
const { error } = await supabase
  .from('user_launch_tasks')
  .upsert({
    user_id: user.id,
    task_id: taskId,
    is_completed: !task.is_completed,
    completed_at: !task.is_completed ? new Date().toISOString() : null,
  }, {
    onConflict: 'user_id,task_id'
  });
```

### Launch Date Setup with UPSERT
```typescript
const { error } = await supabase
  .from('user_launch_dates')
  .upsert({
    user_id: user.id,
    launch_date: launchDate,
    first_destination: firstDestination || null,
    emergency_contacts: emergencyContacts ? JSON.parse(emergencyContacts) : null,
    celebration_plans: celebrationPlans || null,
  }, {
    onConflict: 'user_id'
  });
```

---

## UI Components Used

### Day Selector Grid
```typescript
<div className="grid grid-cols-4 md:grid-cols-8 gap-2">
  {[-7, -6, -5, -4, -3, -2, -1, 0].map((day) => (
    <button
      key={day}
      onClick={() => setSelectedDay(day)}
      className={`p-3 rounded-lg border-2 ${isComplete ? 'border-green-500' : 'border-gray-200'}`}
    >
      <div>{day === 0 ? '🚀' : `Day ${day}`}</div>
      <div>{completed}/{total}</div>
      {isComplete && <CheckCircle2 />}
    </button>
  ))}
</div>
```

### Progress Bar
```typescript
<div className="w-full bg-gray-200 rounded-full h-2">
  <div
    className="bg-green-500 h-2 rounded-full transition-all"
    style={{ width: `${completionPercentage}%` }}
  />
</div>
```

### Task Checklist
```typescript
{selectedDayTasks.map((task) => (
  <div key={task.id} className="flex items-start gap-3 p-3 border rounded-lg">
    <Checkbox
      checked={task.is_completed}
      onCheckedChange={() => handleToggleTask(task.id)}
    />
    <div className="flex-1">
      <p className="font-medium">{task.task_name}</p>
      <p className="text-sm text-gray-600">{task.description}</p>
      <div className="flex gap-2 mt-2 text-xs">
        {task.is_critical && <Badge variant="destructive">Critical</Badge>}
        <span className="text-gray-500">{task.time_estimate_minutes} min</span>
        <span className="text-gray-500">{task.category}</span>
      </div>
    </div>
  </div>
))}
```

---

## Testing Checklist

- [x] Database tables created successfully
- [x] RPC functions execute without errors
- [x] 35 default tasks inserted
- [x] Component renders without errors
- [x] Day selector grid displays correctly
- [x] Day selection updates task list
- [x] Progress bars show correct percentages
- [x] Task completion toggles work
- [x] Launch date form submits correctly
- [x] Days until launch countdown displays
- [x] Special Launch Day view renders
- [x] Post-departure check-ins work
- [x] Check-in history displays
- [x] Responsive layout works on mobile

---

## Files Created

1. `docs/sql-fixes/420_launch_week_planner.sql` - Database schema
2. `src/components/transition/LaunchWeekPlanner.tsx` - React component
3. `docs/implementation-logs/PROMPT_4_4_LAUNCH_WEEK.md` - This file

---

## Files Modified

1. `src/components/transition/TransitionDashboard.tsx` - Added LaunchWeekPlanner import and rendering

---

## Integration Points

- **Dashboard**: Rendered in TransitionDashboard.tsx after TransitionSupport
- **Authentication**: Uses `useAuth()` hook for user context
- **Database**: Uses `supabase` client for all queries with LEFT JOINs
- **UI Components**: Uses shadcn/ui Card, Progress, Checkbox, Select, Textarea, Button, Badge

---

## Next Steps

1. ✅ Database schema applied to Supabase
2. ✅ Component integrated into dashboard
3. ⬜ Email reminders (Day -7, Day -3, Day -1, Launch Day)
4. ⬜ Push notifications for mobile (task reminders)
5. ⬜ Export checklist as PDF
6. ⬜ Print-friendly version for offline reference
7. ⬜ Social sharing (Launch Day celebration post)
8. ⬜ Photo upload for departure photo
9. ⬜ Analytics tracking (most completed tasks, common struggles)

---

## Notes

- **Ceremonial Design**: Launch Day intentionally feels celebratory, not stressful
- **Flexible Timeline**: Users can start planning any time before departure
- **Critical Tasks**: Clear visual distinction between must-dos and optional tasks
- **Time Management**: Time estimates help users plan their week effectively
- **Post-Launch Support**: Check-ins help track transition success and identify issues early
- **Privacy**: All data scoped to user_id with RLS policies

---

**Implementation Time**: ~2.5 hours
**Complexity**: Medium-High
**Dependencies**: Supabase, shadcn/ui, lucide-react, date-fns
