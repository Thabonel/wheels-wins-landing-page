# Calendar Tool Fix - January 15, 2025

**Issue**: #271 - PAM Calendar Tool Execution Failure
**Status**: ✅ FIXED - Deployed to Staging
**Commit**: 56cac256

---

## Problem Summary

Calendar event creation via PAM failed with generic error:
- **User Message**: "I need a doctors appointment on friday at 12"
- **Expected**: Calendar event created
- **Actual**: "I'm having trouble processing your request right now"

---

## Root Cause

Schema mismatch between tool code and actual database table.

### Tool Was Sending (WRONG):
```python
{
    "date": "2025-01-17",  # Separate date column (doesn't exist)
    "start_time": "12:00:00",  # Separate time column (doesn't exist)
    "end_time": "13:00:00",  # Separate end time (doesn't exist)
    "type": "personal",  # Wrong column name
    "location": "location_name",  # Wrong type (GEOGRAPHY vs TEXT)
}
```

### Database Schema Expects (CORRECT):
```sql
CREATE TABLE calendar_events (
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  event_type TEXT DEFAULT 'personal',
  location_name TEXT,
  reminder_minutes INTEGER[],  -- Array, not single integer
  ...
);
```

---

## Fix Applied

**File**: `backend/app/services/pam/tools/create_calendar_event.py`

**Changes**:
1. ✅ `date` + `start_time` → `start_date` (TIMESTAMP WITH TIME ZONE)
2. ✅ `end_time` → `end_date` (TIMESTAMP WITH TIME ZONE)
3. ✅ `type` → `event_type` (correct column name)
4. ✅ `location` → `location_name` (TEXT column)
5. ✅ `reminder_minutes` → array `[reminder_minutes]` (INTEGER[])

**Before**:
```python
event_data = {
    "date": start_dt.date().isoformat(),
    "start_time": start_dt.time().isoformat(),
    "end_time": end_dt.time().isoformat(),
    "type": event_type,
    "location": location_name,
    "reminder_minutes": reminder_minutes,
}
```

**After**:
```python
event_data = {
    "start_date": start_dt.isoformat(),  # Full timestamp
    "end_date": end_dt.isoformat(),  # Full timestamp
    "event_type": event_type,  # Correct column name
    "location_name": location_name,  # TEXT column
    "reminder_minutes": [reminder_minutes],  # Array
}
```

---

## Deployment Status

**Commit**: `56cac256` - "fix: calendar tool schema mismatch - fix column names"

**Pushed to**: staging branch
**Auto-Deploy**: Render backend staging (in progress)
**Expected Deployment**: ~5-10 minutes

**Check Deployment**:
```bash
# Wait 5-10 minutes, then verify:
curl https://wheels-wins-backend-staging.onrender.com/api/v1/pam/health
# Should show healthy status
```

---

## Testing Instructions

### Test 1: Simple Appointment
**Message**: "I need a doctors appointment on friday at 12"

**Expected**:
1. PAM calls `create_calendar_event` tool
2. Event inserted into `calendar_events` table
3. PAM responds: "I've added your doctor's appointment for Friday at 12 PM"
4. Event appears in calendar

### Test 2: Event with Details
**Message**: "Schedule a team meeting next Tuesday at 2pm for 1 hour at the office"

**Expected**:
1. Title: "team meeting"
2. Start: Next Tuesday 2:00 PM
3. End: Next Tuesday 3:00 PM
4. Location: "the office"
5. Event type: "meeting"

### Test 3: All-Day Event
**Message**: "Add my birthday to the calendar on March 15th"

**Expected**:
1. Title: "birthday"
2. All-day: true
3. Date: March 15
4. Event type: "birthday"

---

## Verification Checklist

After backend redeploys (~5-10 min):

- [ ] Open https://wheels-wins-staging.netlify.app
- [ ] Login with test account
- [ ] Open PAM chat
- [ ] Send: "I need a doctors appointment on friday at 12"
- [ ] Verify: PAM creates event (no error)
- [ ] Check Supabase: calendar_events table has new row
- [ ] Verify: Event data matches expected schema
- [ ] Try 2-3 more calendar commands
- [ ] Confirm: All work without errors

---

## Success Criteria

✅ **PASS if**:
- Calendar event creation works
- No "I'm having trouble" errors
- Events persist in database
- Event data matches schema

❌ **FAIL if**:
- Still getting generic errors
- Database errors in backend logs
- Events not saving to database

---

## Rollback Plan

If fix doesn't work:
```bash
git revert 56cac256
git push origin staging
```

Then investigate further errors in backend logs.

---

## Next Steps After Testing

**If PASS**:
1. Mark Issue #271 as resolved
2. Update PAM_TEST_RESULTS_JAN_15_2025.md
3. Move to Issue #272 (JWT verification)

**If FAIL**:
1. Check backend logs for detailed error
2. Verify table schema in Supabase matches expectations
3. Test tool directly via backend endpoint
4. Document new findings in Issue #271

---

**Fix Completed**: January 15, 2025
**Deployed**: Staging branch
**Testing**: Ready after backend redeploy (~5-10 min)
**Next**: Test calendar event creation
