# PRD: PAM Transition System Tools

**Document ID**: PRD-PAM-001
**Date**: 2026-01-29
**Priority**: Critical
**Effort**: High (2-3 weeks)
**Status**: Planning

---

## 1. Overview

### Problem Statement

The Wheels & Wins application has a comprehensive transition planning system at `/transition` with 12 database tables and 5 UI components. However, PAM has ZERO tools to interact with this system. Users planning their transition to RV life cannot use voice/chat to manage their checklists, equipment, shakedown trips, or launch week countdown.

### Business Value

- **User Engagement**: Transition planning is a high-engagement feature for new RV owners
- **Retention**: Users in transition planning are most likely to become long-term users
- **Differentiation**: AI-assisted transition planning is a unique market offering
- **Completeness**: Fills the biggest gap in PAM's capabilities

### Success Metrics

- PAM can answer "What's my transition progress?" with accurate data
- PAM can create/complete transition tasks via chat
- PAM can log shakedown trips and issues
- Transition feature usage increases by 50%+ after PAM integration
- User satisfaction with transition planning improves

---

## 2. Current State

### Existing UI Components

| Component | Location | Function |
|-----------|----------|----------|
| TransitionDashboard | `src/components/transition/TransitionDashboard.tsx` | Main hub with countdown, progress |
| TransitionChecklist | `src/components/transition/TransitionChecklist.tsx` | Task management by category |
| EquipmentManager | `src/components/transition/EquipmentManager.tsx` | Gear tracking and budgeting |
| ShakedownLogger | `src/components/transition/ShakedownLogger.tsx` | Practice trip logging |
| LaunchWeekPlanner | `src/components/transition/LaunchWeekPlanner.tsx` | 7-day countdown |

### Existing Database Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `transition_profiles` | Main transition plan | `departure_date`, `transition_type`, `motivation` |
| `transition_tasks` | Checklist items | `category`, `title`, `priority`, `progress`, `subtasks` |
| `transition_timeline` | Milestones | `title`, `target_date`, `completed` |
| `transition_financial` | 3-bucket savings | `bucket_type`, `target_amount`, `current_amount` |
| `transition_equipment` | Gear inventory | `name`, `category`, `estimated_cost`, `purchased` |
| `transition_inventory` | Downsizing items | `room`, `item`, `action`, `completed` |
| `transition_vehicles` | Vehicle mods | `modification`, `cost`, `completed` |
| `shakedown_trips` | Practice trips | `trip_type`, `start_date`, `end_date`, `confidence_rating` |
| `shakedown_issues` | Problems found | `category`, `severity`, `description`, `resolved` |
| `launch_week_tasks` | System tasks | `day_offset`, `task`, `is_critical` |
| `user_launch_tasks` | User completion | `task_id`, `completed` |
| `user_launch_dates` | Departure info | `departure_date`, `destination` |

### Current PAM Tools for Transition

**None** - This is why this PRD exists.

---

## 3. Proposed Tools

### 3.1 Progress & Overview Tools

#### `get_transition_progress`

**Purpose**: Get overall transition readiness score and summary

**Parameters**:
```json
{
  "type": "object",
  "properties": {},
  "required": []
}
```

**Returns**:
```json
{
  "readiness_score": 65,
  "departure_date": "2026-06-01",
  "days_until_departure": 123,
  "tasks": {
    "total": 45,
    "completed": 29,
    "overdue": 3
  },
  "equipment": {
    "total_items": 24,
    "purchased": 18,
    "total_cost": 3450.00,
    "spent": 2890.00
  },
  "shakedown": {
    "trips_completed": 3,
    "issues_resolved": 8,
    "issues_open": 2
  }
}
```

**Example Usage**:
```
User: "How ready am I for departure?"
PAM: "You're at 65% readiness with 123 days to go. You've completed 29 of 45 tasks,
      have 3 overdue items, and 2 open issues from shakedown trips to resolve."
```

---

### 3.2 Task Management Tools

#### `get_transition_tasks`

**Purpose**: List transition tasks with optional filtering

**Parameters**:
```json
{
  "type": "object",
  "properties": {
    "category": {
      "type": "string",
      "enum": ["financial", "vehicle", "life", "downsizing", "equipment", "legal", "social", "custom"],
      "description": "Filter by category"
    },
    "status": {
      "type": "string",
      "enum": ["pending", "in_progress", "completed", "overdue"],
      "description": "Filter by status"
    },
    "priority": {
      "type": "string",
      "enum": ["critical", "high", "medium", "low"],
      "description": "Filter by priority"
    }
  },
  "required": []
}
```

**Returns**: Array of task objects

**Example Usage**:
```
User: "What critical tasks do I have left?"
PAM: "You have 5 critical tasks remaining: [lists tasks]"
```

---

#### `create_transition_task`

**Purpose**: Add a new task to the transition checklist

**Parameters**:
```json
{
  "type": "object",
  "properties": {
    "title": {
      "type": "string",
      "description": "Task title"
    },
    "category": {
      "type": "string",
      "enum": ["financial", "vehicle", "life", "downsizing", "equipment", "legal", "social", "custom"]
    },
    "priority": {
      "type": "string",
      "enum": ["critical", "high", "medium", "low"],
      "default": "medium"
    },
    "description": {
      "type": "string",
      "description": "Detailed description"
    },
    "days_before_departure": {
      "type": "integer",
      "description": "Days before departure this should be completed"
    },
    "subtasks": {
      "type": "array",
      "items": {"type": "string"},
      "description": "List of subtask descriptions"
    }
  },
  "required": ["title", "category"]
}
```

**Example Usage**:
```
User: "Add 'buy solar panels' to my equipment checklist"
PAM: "Added 'buy solar panels' to your equipment tasks with medium priority."
```

---

#### `update_transition_task`

**Purpose**: Modify an existing task

**Parameters**:
```json
{
  "type": "object",
  "properties": {
    "task_id": {"type": "string"},
    "title": {"type": "string"},
    "priority": {"type": "string"},
    "progress": {"type": "integer", "minimum": 0, "maximum": 100},
    "description": {"type": "string"}
  },
  "required": ["task_id"]
}
```

---

#### `complete_transition_task`

**Purpose**: Mark a task as complete

**Parameters**:
```json
{
  "type": "object",
  "properties": {
    "task_id": {"type": "string"},
    "notes": {"type": "string", "description": "Completion notes"}
  },
  "required": ["task_id"]
}
```

**Example Usage**:
```
User: "Mark 'sell the couch' as done"
PAM: "Marked 'sell the couch' as complete! You've now finished 30 of 45 tasks."
```

---

### 3.3 Shakedown Trip Tools

#### `log_shakedown_trip`

**Purpose**: Record a practice trip

**Parameters**:
```json
{
  "type": "object",
  "properties": {
    "trip_type": {
      "type": "string",
      "enum": ["weekend", "week", "extended"]
    },
    "start_date": {"type": "string", "format": "date"},
    "end_date": {"type": "string", "format": "date"},
    "destination": {"type": "string"},
    "confidence_rating": {
      "type": "integer",
      "minimum": 1,
      "maximum": 10,
      "description": "How confident do you feel after this trip?"
    },
    "notes": {"type": "string"}
  },
  "required": ["trip_type", "start_date", "end_date"]
}
```

**Example Usage**:
```
User: "Log my weekend trip to Lake Travis, confidence 7 out of 10"
PAM: "Logged your weekend shakedown trip to Lake Travis. Confidence: 7/10.
      You've now completed 4 practice trips."
```

---

#### `add_shakedown_issue`

**Purpose**: Track a problem found during a shakedown trip

**Parameters**:
```json
{
  "type": "object",
  "properties": {
    "trip_id": {"type": "string", "description": "Associated trip (optional, uses most recent)"},
    "category": {
      "type": "string",
      "enum": ["power", "water", "comfort", "storage", "driving", "other"]
    },
    "severity": {
      "type": "string",
      "enum": ["minor", "major", "critical"]
    },
    "description": {"type": "string"},
    "solution": {"type": "string", "description": "How you fixed it (if resolved)"},
    "cost": {"type": "number", "description": "Cost to fix"}
  },
  "required": ["category", "severity", "description"]
}
```

**Example Usage**:
```
User: "Found a water leak under the sink, major issue"
PAM: "Logged major water system issue: leak under sink. Want me to add a task to fix this?"
```

---

#### `get_shakedown_summary`

**Purpose**: View shakedown progress and issues

**Returns**: Summary of trips, issues by severity, resolution rate, readiness score

---

### 3.4 Equipment Tools

#### `add_equipment_item`

**Purpose**: Track gear to purchase

**Parameters**:
```json
{
  "type": "object",
  "properties": {
    "name": {"type": "string"},
    "category": {
      "type": "string",
      "enum": ["recovery", "kitchen", "power", "climate", "safety", "comfort", "other"]
    },
    "is_essential": {"type": "boolean", "default": true},
    "estimated_cost": {"type": "number"},
    "vendor_url": {"type": "string"},
    "notes": {"type": "string"}
  },
  "required": ["name", "category"]
}
```

---

#### `mark_equipment_purchased`

**Purpose**: Mark an item as purchased

**Parameters**:
```json
{
  "type": "object",
  "properties": {
    "item_id": {"type": "string"},
    "actual_cost": {"type": "number"},
    "purchase_date": {"type": "string", "format": "date"}
  },
  "required": ["item_id"]
}
```

---

#### `get_equipment_list`

**Purpose**: View equipment inventory and budget status

**Returns**: List of items, total estimated vs actual costs, items remaining

---

### 3.5 Launch Week Tools

#### `get_launch_week_status`

**Purpose**: View 7-day countdown progress

**Returns**: Tasks by day, completion status, critical items remaining

---

#### `complete_launch_task`

**Purpose**: Check off a launch week task

**Parameters**:
```json
{
  "type": "object",
  "properties": {
    "task_id": {"type": "string"},
    "notes": {"type": "string"}
  },
  "required": ["task_id"]
}
```

---

## 4. Technical Implementation

### File Structure

```
backend/app/services/pam/tools/transition/
├── __init__.py
├── progress_tools.py          # get_transition_progress
├── task_tools.py              # CRUD for transition tasks
├── shakedown_tools.py         # Trip and issue tracking
├── equipment_tools.py         # Equipment inventory
└── launch_week_tools.py       # 7-day countdown
```

### Registration in tool_registry.py

```python
# In _register_all_tools function, add:

from app.services.pam.tools.transition import (
    get_transition_progress,
    get_transition_tasks,
    create_transition_task,
    update_transition_task,
    complete_transition_task,
    log_shakedown_trip,
    add_shakedown_issue,
    get_shakedown_summary,
    add_equipment_item,
    mark_equipment_purchased,
    get_equipment_list,
    get_launch_week_status,
    complete_launch_task,
)

# Register each tool with appropriate function definitions
```

### Database Access Pattern

```python
async def get_transition_progress(user_id: str) -> dict:
    """Get transition readiness score and summary"""
    supabase = get_supabase_client()

    # Get profile
    profile = await supabase.table('transition_profiles')\
        .select('*')\
        .eq('user_id', user_id)\
        .single()\
        .execute()

    if not profile.data:
        return {"error": "No transition plan found. Start one at /transition"}

    # Get task stats
    tasks = await supabase.table('transition_tasks')\
        .select('progress')\
        .eq('user_id', user_id)\
        .execute()

    # Calculate readiness
    total_tasks = len(tasks.data)
    completed = len([t for t in tasks.data if t['progress'] == 100])
    readiness = (completed / total_tasks * 100) if total_tasks > 0 else 0

    return {
        "readiness_score": round(readiness),
        "departure_date": profile.data['departure_date'],
        "tasks": {"total": total_tasks, "completed": completed}
        # ... more fields
    }
```

---

## 5. User Stories

### US-001: Check Transition Progress
**As a** user planning my RV transition
**I want to** ask PAM about my progress
**So that** I can see how ready I am without opening the app

**Acceptance Criteria**:
- PAM returns readiness percentage
- PAM shows days until departure
- PAM summarizes tasks, equipment, and shakedown status

### US-002: Add Task via Chat
**As a** user
**I want to** add tasks by telling PAM
**So that** I can capture ideas without navigating to the checklist

**Acceptance Criteria**:
- PAM creates task with correct category
- PAM confirms creation with task details
- Task appears in UI immediately

### US-003: Log Shakedown Trip
**As a** user returning from a practice trip
**I want to** log my trip via PAM
**So that** I can record issues while they're fresh

**Acceptance Criteria**:
- PAM records trip with dates and type
- PAM captures confidence rating
- PAM prompts for issues if confidence is low

### US-004: Track Equipment
**As a** user shopping for RV gear
**I want to** tell PAM what I bought
**So that** I can track spending without manual entry

**Acceptance Criteria**:
- PAM records purchase with cost
- PAM updates budget tracking
- PAM confirms remaining budget

---

## 6. Testing Plan

### Unit Tests

- Test each tool function with valid inputs
- Test error handling for missing transition profile
- Test RLS policy compliance (user can only access own data)

### Integration Tests

- Test full conversation flow: create task -> verify in database -> complete task
- Test shakedown flow: log trip -> add issues -> mark resolved
- Test equipment flow: add item -> mark purchased -> verify budget

### User Acceptance Tests

- "What's my transition progress?" returns accurate data
- "Add buy solar panels to equipment" creates correct task
- "Log my weekend trip, confidence 8" records trip correctly
- "Mark sell the car as done" updates task status

---

## 7. Rollout Plan

### Phase 1: Read-Only Tools (Week 1)
- `get_transition_progress`
- `get_transition_tasks`
- `get_shakedown_summary`
- `get_equipment_list`
- `get_launch_week_status`

### Phase 2: Task Management (Week 2)
- `create_transition_task`
- `update_transition_task`
- `complete_transition_task`

### Phase 3: Shakedown & Equipment (Week 3)
- `log_shakedown_trip`
- `add_shakedown_issue`
- `add_equipment_item`
- `mark_equipment_purchased`
- `complete_launch_task`

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| RLS policy conflicts | Data leakage | Test all queries with multiple users |
| Concurrent updates | Data corruption | Use optimistic locking on updates |
| Missing profile | Tool failures | Return helpful error, suggest /transition |
| Complex queries | Performance | Add database indexes, use efficient queries |

---

## 9. Dependencies

- Supabase service role access for PAM backend
- Existing database tables (all present)
- Tool registry infrastructure (exists)

---

## 10. Open Questions

1. Should PAM proactively suggest transition features to new users?
2. Should shakedown issues automatically create transition tasks?
3. Should equipment purchases trigger budget alerts if over budget?

---

**Document End**
