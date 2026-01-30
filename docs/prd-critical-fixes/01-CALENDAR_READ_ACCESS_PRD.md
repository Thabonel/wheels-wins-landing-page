# PRD: Calendar Read Access Implementation

**Status:** Ready for Implementation
**Priority:** Critical (High Impact, Medium Effort)
**Created:** January 30, 2026
**Based on:** PAM Audit Report - 65% Working Assessment

---

## Problem Statement

### Critical Gap
PAM can create, update, and delete calendar events but **cannot read existing events**. When users ask "What are my upcoming appointments?", PAM responds: *"I don't have a tool to retrieve your existing calendar events—I can only create, update, or delete them."*

### User Impact
- **Broken conversation flow**: Users cannot get basic schedule information
- **Poor UX**: PAM cannot help plan around existing commitments
- **Fundamental limitation**: Calendar assistant that can't read calendars

### Business Impact
- **Core feature gap**: Calendar management is incomplete
- **User frustration**: Most basic calendar question fails
- **Credibility issue**: "AI assistant" that can't see your schedule

---

## Solution Overview

Implement `get_calendar_events` tool to complete the calendar CRUD operations.

### Current State (3 of 4 tools)
- ✅ **CREATE** - `create_calendar_event` - Working
- ✅ **UPDATE** - `update_calendar_event` - Working
- ✅ **DELETE** - `delete_calendar_event` - Working
- ❌ **READ** - `get_calendar_events` - **MISSING**

### Target State (4 of 4 tools)
- ✅ All CRUD operations complete
- ✅ PAM can answer "What's on my calendar?"
- ✅ Smart scheduling around existing events

---

## Technical Requirements

### Database Schema (Already Exists)
```sql
-- Table: calendar_events
- id: UUID PRIMARY KEY
- user_id: UUID (correct field name confirmed)
- title: TEXT NOT NULL
- description: TEXT
- start_date: TIMESTAMPTZ NOT NULL (correct field name)
- end_date: TIMESTAMPTZ NOT NULL (correct field name)
- all_day: BOOLEAN DEFAULT FALSE
- event_type: TEXT DEFAULT 'personal'
- location_name: TEXT
- reminder_minutes: INTEGER[]
- color: TEXT DEFAULT '#3b82f6'
- is_private: BOOLEAN DEFAULT TRUE
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### Function Signature
```python
async def get_calendar_events(
    user_id: str,
    start_date: Optional[str] = None,      # Filter from date (ISO format)
    end_date: Optional[str] = None,        # Filter to date (ISO format)
    event_type: Optional[str] = None,      # Filter by type
    limit: int = 50,                       # Max events (1-100)
    include_private: bool = True,          # Include private events
    **kwargs
) -> Dict[str, Any]:
```

### Response Format
```python
{
    "success": True,
    "message": "Retrieved 5 upcoming events",
    "events": [
        {
            "id": "uuid",
            "title": "Vehicle Service",
            "start_date": "2025-02-13T10:00:00Z",
            "end_date": "2025-02-13T11:00:00Z",
            "description": "Oil change and inspection",
            "location_name": "Joe's Auto Shop",
            "event_type": "maintenance",
            "all_day": False,
            "is_private": True,
            "reminder_minutes": [15, 60]
        }
    ],
    "total_count": 5,
    "filters_applied": {
        "start_date": "2025-02-01",
        "end_date": "2025-02-28",
        "limit": 50
    }
}
```

---

## Implementation Plan

### Phase 1: Core Tool Implementation (1-2 hours)

#### Step 1.1: Create Tool File
**File:** `backend/app/services/pam/tools/get_calendar_events.py`

**Key Features:**
- Use existing `safe_db_select` utility pattern
- Support date range filtering with validation
- Handle timezone conversion properly
- Return events in chronological order
- Implement comprehensive error handling

#### Step 1.2: Pydantic Validation Schema
**File:** `backend/app/services/pam/tools/utils/validation.py` (add to existing)

```python
class GetCalendarEventsInput(BaseToolInput):
    start_date: Optional[str] = Field(None, description="Start date filter (ISO format)")
    end_date: Optional[str] = Field(None, description="End date filter (ISO format)")
    event_type: Optional[EventType] = Field(None, description="Filter by event type")
    limit: int = Field(50, ge=1, le=100, description="Max events (1-100)")
    include_private: bool = Field(True, description="Include private events")
```

#### Step 1.3: Tool Registration
**File:** `backend/app/services/pam/tools/tool_registry.py` (line ~1648)

Register tool following existing calendar tool patterns with proper metadata.

### Phase 2: Database Integration (30 minutes)

#### Step 2.1: Query Implementation
```sql
-- Core query with filters
SELECT * FROM calendar_events
WHERE user_id = $1
  AND ($2::date IS NULL OR start_date >= $2::date)
  AND ($3::date IS NULL OR start_date <= $3::date)
  AND ($4::text IS NULL OR event_type = $4::text)
  AND ($5::boolean IS FALSE OR is_private = true)
ORDER BY start_date ASC
LIMIT $6;
```

#### Step 2.2: RLS Policy Verification
- ✅ Policies recently fixed for admin access
- ✅ User isolation via `user_id` working
- ✅ Performance indexes on `user_id` and `start_date`

### Phase 3: Integration Testing (30 minutes)

#### Step 3.1: Tool Testing
```python
# Test scenarios
- get_calendar_events(user_id="test") # All events
- get_calendar_events(user_id="test", start_date="2025-02-01") # Future only
- get_calendar_events(user_id="test", limit=5) # Limited results
- get_calendar_events(user_id="test", event_type="maintenance") # Filtered
```

#### Step 3.2: PAM Integration
```bash
# Test via PAM chat
"What are my upcoming appointments?"
"Show me my calendar for next week"
"What meetings do I have on Friday?"
```

### Phase 4: Verification (30 minutes)

Using **Ralph Loop / Verification-Before-Completion**:

#### Step 4.1: Tool Registration Verification
```bash
# Check tool is registered
grep -A 5 "get_calendar_events" backend/app/services/pam/tools/tool_registry.py
```

#### Step 4.2: Database Query Verification
```bash
# Test database access directly
psql $DATABASE_URL -c "SELECT COUNT(*) FROM calendar_events WHERE user_id = 'test-user';"
```

#### Step 4.3: PAM Response Verification
```bash
# Test actual PAM response
curl -X POST https://pam-backend.onrender.com/api/v1/pam/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What are my upcoming appointments?", "user_id": "test-user"}'
```

**Success Criteria:**
- Tool returns valid JSON with events array
- PAM responds with actual calendar data (not "I don't have a tool")
- No database errors or permission issues
- Response time < 2 seconds

---

## Risk Assessment

### Low Risk Implementation
| Factor | Risk Level | Mitigation |
|--------|------------|------------|
| **Database Access** | Low | Existing tables and RLS policies working |
| **Tool Pattern** | Low | Copy structure from `delete_calendar_event` |
| **Infrastructure** | Low | All utilities available (`safe_db_select`, validation) |

### Potential Issues
1. **Performance**: Large date ranges without LIMIT
   - **Mitigation**: Default 50-event limit, paginated results
2. **Timezone**: User expectation vs UTC storage
   - **Mitigation**: Reuse timezone handling from create tool
3. **Privacy**: Ensure `is_private` flag respected
   - **Mitigation**: Include `include_private` parameter

---

## Success Metrics

### Primary KPIs
- **Functionality**: PAM answers "What's on my calendar?" with actual events
- **Performance**: Response time < 2 seconds for typical queries
- **Reliability**: 0 database permission errors

### User Experience Metrics
- **Conversation Flow**: Users can plan around existing events
- **Query Support**: Natural language date filtering works
- **Data Accuracy**: Events display correct times and details

### Technical Metrics
- **Tool Registration**: Shows in PAM tools list
- **Database Performance**: Query execution < 200ms
- **Error Rate**: < 1% failure rate for valid queries

---

## Dependencies

### Required (All Available)
- ✅ `app.services.pam.tools.utils.validation` (input validation)
- ✅ `app.services.pam.tools.utils.database` (safe queries)
- ✅ `app.services.pam.tools.exceptions` (error handling)
- ✅ Supabase database access (working)

### Integration Points
- ✅ **Frontend calendar**: Will automatically sync via existing patterns
- ✅ **PAM responses**: Will include actual user events
- ✅ **Tool registry**: Well-established registration system

---

## Implementation Estimate

### Total Time: **2-4 hours**

**Breakdown:**
- Core tool implementation: 1-2 hours
- Database integration: 30 minutes
- Testing and verification: 30 minutes
- Documentation and PR: 30 minutes

### Complexity: **LOW-MEDIUM**
- Template available (copy from existing calendar tools)
- Database schema ready
- All infrastructure components available
- Proven patterns to follow

---

## Acceptance Criteria

### Must Have
- [ ] Tool `get_calendar_events` registered and functional
- [ ] PAM responds to "What are my upcoming appointments?" with actual data
- [ ] Date range filtering works correctly
- [ ] Response includes proper event details (title, time, location)
- [ ] Performance acceptable for typical user data volumes

### Should Have
- [ ] Natural language date parsing ("next week", "this Friday")
- [ ] Event type filtering (maintenance, personal, work)
- [ ] Privacy controls (include/exclude private events)
- [ ] Pagination for large result sets

### Nice to Have
- [ ] Smart suggestions based on calendar gaps
- [ ] Integration with trip planning (avoid scheduling during travel)
- [ ] Conflict detection for new event creation

---

## Ralph Loop Verification Plan

Before marking this complete, **must verify**:

1. **Run the tool directly**:
```bash
python3 -c "from app.services.pam.tools.get_calendar_events import get_calendar_events; print(asyncio.run(get_calendar_events('test-user')))"
```

2. **Check PAM integration**:
```bash
# Test actual PAM conversation
curl -X POST $PAM_BACKEND_URL/api/v1/pam/chat -d '{"message": "What are my appointments?", "user_id": "test-user"}'
```

3. **Verify database access**:
```bash
# Confirm no permission errors
tail -f $BACKEND_LOGS | grep "get_calendar_events"
```

**No completion claims without fresh verification evidence.**

---

## Next Steps

1. **Create `get_calendar_events.py`** - Copy structure from `delete_calendar_event.py`
2. **Add validation schema** - Extend existing validation utils
3. **Register tool** - Add to tool registry with proper metadata
4. **Test integration** - Verify PAM can answer calendar questions
5. **Deploy and verify** - Use Ralph Loop verification before completion

**Success will transform PAM from "incomplete calendar tool" to "functional calendar assistant."**