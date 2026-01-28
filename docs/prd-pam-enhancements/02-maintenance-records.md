# PRD: PAM Maintenance Records Tools

**Document ID**: PRD-PAM-002
**Date**: 2026-01-29
**Priority**: Critical
**Effort**: Medium (1 week)
**Status**: Planning

---

## 1. Overview

### Problem Statement

Vehicle maintenance tracking is essential for RV owners, but PAM has NO tools to interact with the maintenance system. Users cannot:
- Ask PAM to create maintenance reminders
- Query when their next service is due
- Log completed maintenance via chat
- Get proactive maintenance alerts

### Business Value

- **Safety**: RV owners need reliable maintenance tracking for safe travel
- **Convenience**: Voice/chat-based logging while on the road
- **Proactive Care**: AI can remind users of upcoming services
- **Complete Experience**: Fills a critical gap in the "Wheels" section

### Success Metrics

- Users can create maintenance records via PAM
- PAM can answer "when is my next oil change?"
- Maintenance record creation via PAM matches or exceeds UI usage
- Zero missed critical maintenance reminders

---

## 2. Current State

### Existing UI Components

| Component | Location | Function |
|-----------|----------|----------|
| VehicleMaintenance | `src/components/wheels/VehicleMaintenance.tsx` | Full CRUD for maintenance records |

### Existing Database Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `maintenance_records` | Service history | `task`, `date`, `mileage`, `status` |

### Current PAM Tools

**None** - Complete gap.

### UI Functionality (What Already Works)

- Create maintenance tasks with date and mileage
- Mark tasks as overdue/upcoming/completed
- Delete tasks
- Calendar integration (adds events when saving)

---

## 3. Proposed Tools

### 3.1 `create_maintenance_record`

**Purpose**: Add a new maintenance task or record completed service

**Parameters**:
```json
{
  "type": "object",
  "properties": {
    "task": {
      "type": "string",
      "description": "Description of maintenance task (e.g., 'Oil change', 'Tire rotation')"
    },
    "date": {
      "type": "string",
      "format": "date",
      "description": "Service date (past for completed, future for scheduled)"
    },
    "mileage": {
      "type": "integer",
      "description": "Vehicle mileage at service"
    },
    "notes": {
      "type": "string",
      "description": "Additional notes"
    },
    "cost": {
      "type": "number",
      "description": "Cost of service"
    }
  },
  "required": ["task", "date"]
}
```

**Returns**:
```json
{
  "success": true,
  "record_id": "uuid",
  "message": "Scheduled oil change for 2026-02-15",
  "calendar_event_created": true
}
```

**Example Usage**:
```
User: "Schedule an oil change for February 15th at 45000 miles"
PAM: "Scheduled oil change for February 15th at 45,000 miles. Added to your calendar."

User: "I just got my tires rotated today"
PAM: "Logged tire rotation for today. What was the mileage?"
User: "44,850"
PAM: "Updated the record with mileage 44,850."
```

---

### 3.2 `get_maintenance_schedule`

**Purpose**: View upcoming and overdue maintenance

**Parameters**:
```json
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "enum": ["all", "upcoming", "overdue"],
      "default": "all"
    },
    "limit": {
      "type": "integer",
      "default": 5,
      "description": "Max records to return"
    }
  },
  "required": []
}
```

**Returns**:
```json
{
  "upcoming": [
    {"task": "Oil change", "date": "2026-02-15", "mileage": 45000, "days_until": 17}
  ],
  "overdue": [
    {"task": "Brake inspection", "date": "2026-01-15", "days_overdue": 14}
  ],
  "summary": "1 upcoming, 1 overdue"
}
```

**Example Usage**:
```
User: "When is my next service due?"
PAM: "You have an oil change scheduled for February 15th (17 days away).
      Note: Brake inspection is 14 days overdue."

User: "What maintenance is overdue?"
PAM: "You have 1 overdue item: Brake inspection was due January 15th."
```

---

### 3.3 `update_maintenance_record`

**Purpose**: Modify an existing maintenance record

**Parameters**:
```json
{
  "type": "object",
  "properties": {
    "record_id": {"type": "string"},
    "task": {"type": "string"},
    "date": {"type": "string", "format": "date"},
    "mileage": {"type": "integer"},
    "notes": {"type": "string"},
    "cost": {"type": "number"}
  },
  "required": ["record_id"]
}
```

**Example Usage**:
```
User: "Move my oil change to February 20th"
PAM: "Updated oil change to February 20th. Calendar event updated."
```

---

### 3.4 `delete_maintenance_record`

**Purpose**: Remove a maintenance record

**Parameters**:
```json
{
  "type": "object",
  "properties": {
    "record_id": {"type": "string"},
    "confirm": {
      "type": "boolean",
      "description": "Confirmation required"
    }
  },
  "required": ["record_id", "confirm"]
}
```

**Example Usage**:
```
User: "Delete the brake inspection task"
PAM: "Are you sure you want to delete the brake inspection record?"
User: "Yes"
PAM: "Deleted brake inspection record."
```

---

### 3.5 `get_maintenance_history`

**Purpose**: View past maintenance records

**Parameters**:
```json
{
  "type": "object",
  "properties": {
    "task_type": {
      "type": "string",
      "description": "Filter by task type (e.g., 'oil change')"
    },
    "limit": {
      "type": "integer",
      "default": 10
    }
  },
  "required": []
}
```

**Example Usage**:
```
User: "When did I last change the oil?"
PAM: "Your last oil change was on December 10th, 2025 at 42,000 miles."

User: "Show my maintenance history"
PAM: "Recent maintenance:
      - Dec 10: Oil change (42,000 mi)
      - Nov 15: Tire rotation (40,500 mi)
      - Oct 1: Brake pads replaced (38,000 mi)"
```

---

## 4. Technical Implementation

### File Structure

```
backend/app/services/pam/tools/maintenance/
├── __init__.py
├── maintenance_crud.py        # create, update, delete
└── maintenance_queries.py     # get_schedule, get_history
```

### Example Implementation

```python
# maintenance_crud.py

from datetime import date
from typing import Optional
from app.integrations.supabase import get_supabase_client

async def create_maintenance_record(
    user_id: str,
    task: str,
    service_date: str,
    mileage: Optional[int] = None,
    notes: Optional[str] = None,
    cost: Optional[float] = None
) -> dict:
    """Create a new maintenance record"""
    supabase = get_supabase_client()

    record = {
        "user_id": user_id,
        "task": task,
        "date": service_date,
        "mileage": mileage or 0,
        "notes": notes,
        "cost": cost
    }

    result = await supabase.table('maintenance_records')\
        .insert(record)\
        .execute()

    if result.error:
        return {"success": False, "error": str(result.error)}

    # Determine if scheduled or completed
    is_future = date.fromisoformat(service_date) > date.today()

    return {
        "success": True,
        "record_id": result.data[0]['id'],
        "message": f"{'Scheduled' if is_future else 'Logged'} {task} for {service_date}",
        "calendar_event_created": is_future
    }
```

### Registration

```python
# In tool_registry.py

from app.services.pam.tools.maintenance import (
    create_maintenance_record,
    get_maintenance_schedule,
    update_maintenance_record,
    delete_maintenance_record,
    get_maintenance_history,
)

# Add to _register_all_tools function
```

---

## 5. User Stories

### US-001: Schedule Maintenance
**As a** RV owner
**I want to** tell PAM to schedule maintenance
**So that** I don't forget important services

### US-002: Check Schedule
**As a** user
**I want to** ask PAM what's due soon
**So that** I can plan my maintenance stops

### US-003: Log Completed Service
**As a** user who just got service done
**I want to** log it via PAM
**So that** I have a record without manual entry

### US-004: Review History
**As a** user
**I want to** ask when I last did a specific service
**So that** I know if it's time to do it again

---

## 6. Conversation Examples

### Example 1: Creating a Reminder
```
User: "Remind me to change the oil in 3000 miles"
PAM: "What's your current mileage?"
User: "44,500"
PAM: "Scheduled oil change at 47,500 miles. Based on your typical driving,
      that's approximately March 15th. Want me to add a calendar reminder?"
User: "Yes"
PAM: "Done! Calendar event added for March 15th."
```

### Example 2: Checking Status
```
User: "What maintenance do I have coming up?"
PAM: "You have 2 upcoming services:
      1. Oil change - February 15th (17 days) at 45,000 miles
      2. Tire rotation - March 1st (31 days) at 46,000 miles

      Note: Brake inspection is 14 days overdue. Would you like to reschedule it?"
```

### Example 3: Logging Service
```
User: "I just got my brakes done"
PAM: "Logged brake service for today, January 29th. What was the mileage and cost?"
User: "44,800 miles, $450"
PAM: "Updated: Brake service at 44,800 miles, $450. That completes your overdue
      brake inspection."
```

---

## 7. Testing Plan

### Unit Tests
- Create record with all fields
- Create record with minimal fields
- Get schedule with various filters
- Update record
- Delete record
- Get history with task filter

### Integration Tests
- Full conversation flow
- Calendar event creation
- Overdue detection logic

### Edge Cases
- No maintenance records exist
- All tasks completed (no upcoming)
- Multiple overdue items

---

## 8. Rollout Plan

### Phase 1: Read-Only (Day 1-2)
- `get_maintenance_schedule`
- `get_maintenance_history`

### Phase 2: Full CRUD (Day 3-5)
- `create_maintenance_record`
- `update_maintenance_record`
- `delete_maintenance_record`

---

## 9. Dependencies

- `maintenance_records` table (exists)
- Calendar integration (existing postMessage API)
- Supabase service role access

---

## 10. Open Questions

1. Should PAM proactively remind users of upcoming maintenance?
2. Should we add mileage-based calculations (estimate dates from driving patterns)?
3. Should maintenance integrate with expense tracking?

---

**Document End**
