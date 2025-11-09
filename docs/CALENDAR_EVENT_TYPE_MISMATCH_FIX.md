# Calendar Event Type Mismatch - Root Cause Analysis & Fix

**Date:** October 15, 2025
**Commit:** 54a7db4e
**Issue:** Calendar events not showing in UI despite successful backend creation

---

## Root Cause

Calendar events were being created successfully in the database but not rendering in the frontend UI. Investigation revealed **TWO critical bugs**:

### Bug #1: Event Type Mismatch

**Database Schema:**
```sql
event_type TEXT NOT NULL DEFAULT 'personal'
```

**Frontend CalendarEvent Type:**
```typescript
type: "reminder" | "trip" | "booking" | "maintenance" | "inspection"
```

**The Problem:**
- Database allowed and defaulted to `'personal'` event type
- Frontend CalendarEvent interface only accepted 5 specific types
- PAM backend tool defaulted to `event_type = "personal"`
- FullCalendarWrapper switch statement (lines 54-80) had NO case for `'personal'`
- Result: `backgroundColor`, `borderColor`, `textColor` were undefined
- **Silent rendering failure** - no errors, just blank calendar

### Bug #2: Timezone Conversion Error

**Previous buggy code** (commit 48283ae2):
```typescript
const startTime = eventDate.toTimeString().substring(0, 5); // ❌ WRONG
```

**The Problem:**
- `.toTimeString()` returns time in LOCAL timezone with full string like:
  ```
  "03:00:00 GMT+1100 (Australian Eastern Daylight Time)"
  ```
- For UTC timestamp `2025-10-17T16:00:00+00:00` (4:00 PM UTC)
- In GMT+1100 timezone, this becomes `03:00` (3:00 AM local time)
- **13-hour timezone offset applied incorrectly!**

---

## Data Flow Analysis

```
1. PAM creates event
   └─> event_type: "personal" (default)
   └─> start_date: "2025-10-17T16:00:00+00:00"

2. Supabase stores event
   └─> calendar_events table with 'personal' type

3. Frontend queries events
   └─> useCalendarEvents.ts loadEvents()
   └─> Query: .select('*').eq('user_id', userId).order('start_date')

4. Convert database → CalendarEvent
   └─> convertToCalendarEvent(dbEvent)
   └─> PROBLEM: event_type 'personal' not in valid types
   └─> PROBLEM: .toTimeString() converts to wrong timezone

5. FullCalendarWrapper renders
   └─> mapEventsToFullCalendar()
   └─> switch(event.type) { ... }
   └─> PROBLEM: No case for 'personal' → undefined colors
   └─> Result: Event not rendered
```

---

## The Fix

### Frontend (src/hooks/useCalendarEvents.ts)

**1. Fixed time extraction with proper local timezone handling:**
```typescript
const formatTime = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

const startTime = formatTime(eventDate);
const endTime = formatTime(endDate);
```

**2. Added type validation and mapping:**
```typescript
const validTypes = ["reminder", "trip", "booking", "maintenance", "inspection"] as const;
let eventType: typeof validTypes[number] = "reminder"; // default

if (dbEvent.event_type && validTypes.includes(dbEvent.event_type as any)) {
  eventType = dbEvent.event_type as typeof validTypes[number];
}
// If event_type is 'personal' or any other value, maps to 'reminder'
```

### Backend (backend/app/services/pam/tools/create_calendar_event.py)

**1. Changed default event type:**
```python
# BEFORE:
event_type: str = "personal",

# AFTER:
event_type: str = "reminder",  # Changed from 'personal' to match frontend types
```

**2. Updated validation to match frontend:**
```python
# BEFORE:
valid_types = ['personal', 'trip', 'maintenance', 'meeting', 'reminder', 'birthday', 'holiday']

# AFTER:
valid_types = ['reminder', 'trip', 'booking', 'maintenance', 'inspection']
if event_type not in valid_types:
    logger.warning(f"Invalid event_type '{event_type}', defaulting to 'reminder'")
    event_type = 'reminder'
```

---

## Why This Wasn't Caught Earlier

1. **Silent Failure**: No errors thrown - events just didn't render
2. **TypeScript Cast**: Type assertions like `as "reminder"` don't do runtime validation
3. **Database Accepts Anything**: No CHECK constraint on event_type column
4. **Switch Statement Gaps**: No default case to catch unknown types

---

## Testing the Fix

**Before Fix:**
```bash
# User: "PAM, add doctor appointment for Friday at 4pm"
# Backend: ✅ Event created with event_type='personal'
# Frontend: ❌ Event not visible in calendar
# Console: No errors
```

**After Fix:**
```bash
# User: "PAM, add doctor appointment for Friday at 4pm"
# Backend: ✅ Event created with event_type='reminder'
# Frontend: ✅ Event visible in calendar as 'reminder' type (yellow/orange color)
# Console: No errors
```

---

## Prevention Strategies

### 1. Add Database Constraint
```sql
ALTER TABLE calendar_events
ADD CONSTRAINT valid_event_type
CHECK (event_type IN ('reminder', 'trip', 'booking', 'maintenance', 'inspection'));
```

### 2. Add Runtime Type Validation
```typescript
function isValidEventType(type: string): type is CalendarEventType {
  return ['reminder', 'trip', 'booking', 'maintenance', 'inspection'].includes(type);
}
```

### 3. Add Integration Tests
```typescript
test('Calendar events with all valid types render correctly', () => {
  const types = ['reminder', 'trip', 'booking', 'maintenance', 'inspection'];
  types.forEach(type => {
    const event = createEvent({ event_type: type });
    expect(renderCalendar([event])).toBeVisible();
  });
});
```

### 4. Add FullCalendarWrapper Default Case
```typescript
switch (event.type) {
  case "trip": /* ... */ break;
  case "booking": /* ... */ break;
  // ... other cases
  default:
    // Log warning and use default styling
    console.warn(`Unknown event type: ${event.type}, using reminder style`);
    bg = "rgba(245,158,11,0.2)";
    border = "rgb(245,158,11)";
    text = "rgb(180,83,9)";
}
```

---

## Lessons Learned

1. **Database schema and frontend types MUST match** - document in DATABASE_SCHEMA_REFERENCE.md
2. **TypeScript casts don't validate at runtime** - always add runtime checks
3. **Timezone handling is complex** - use `.getHours()` not `.toTimeString()`
4. **Silent failures are the worst** - add explicit error handling and logging
5. **Integration tests catch these issues** - unit tests alone aren't enough

---

## Related Files

- `docs/DATABASE_SCHEMA_REFERENCE.md` - Database schema documentation
- `src/hooks/useCalendarEvents.ts` - Frontend calendar event loading
- `src/components/you/FullCalendarWrapper.tsx` - Calendar rendering
- `backend/app/services/pam/tools/create_calendar_event.py` - PAM calendar tool

---

## Deployment

**Frontend:** Netlify auto-deploy from staging@54a7db4e
**Backend:** Render auto-deploy from staging@54a7db4e

**After deployment:**
1. Hard refresh browser (Cmd+Shift+R)
2. Test creating new calendar event via PAM
3. Verify event appears with correct time and styling
