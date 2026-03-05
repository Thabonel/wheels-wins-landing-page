# PAM Calendar Timezone Fix

## Context

PAM creates calendar events 1 hour early. User says "book an appointment at 3pm", calendar shows 2pm. Root cause is two independent bugs in `pam.py` that compound each other.

---

## Root Cause 1 - CRITICAL: System prompt example teaches wrong format

`pam.py` line 429:
```
start_date="2025-01-07T14:00:00Z"
```

The `Z` means UTC. Claude learns from this example to append `Z` to whatever hour the user says.

In `create_calendar_event.py` lines 171-176:
```python
start_dt_raw = validated.start_date.replace('Z', '+00:00')
start_dt = datetime.fromisoformat(start_dt_raw)
if start_dt.tzinfo is None:   # False when Z present - block SKIPPED
    start_dt = ...replace(tzinfo=user_timezone)  # Never runs
```

Z bypass = user timezone correction NEVER applied = event stored in UTC = wrong time for non-UTC users.

---

## Root Cause 2 - SECONDARY: Wrong timezone path in system prompt builder

`pam.py` line 261:
```python
tz_str = self.user_context.get('timezone')  # Wrong path
```

Timezone is nested at `user_location.timezone`, not top-level. Falls back to UTC, so system prompt tells Claude "Current time: 04:00 (UTC)" even when user is in AEDT.

---

## File to modify: `backend/app/services/pam/core/pam.py` only

### Change 1: Fix system prompt examples - remove Z suffix (lines 427-434)

**Current:**
```
- User: "Add a doctor appointment for next Tuesday at 2pm"
  YOU: Call create_calendar_event(title="Doctor Appointment", start_date="2025-01-07T14:00:00Z", ...)
  THEN respond: "I've added your doctor appointment for Tuesday at 2pm"

- User: "Remind me about oil change next month"
  YOU: Call create_calendar_event(title="Oil Change Reminder", start_date="2025-02-15T10:00:00Z", event_type="maintenance")
```

**Replace with:**
```
IMPORTANT: Use LOCAL TIME without Z suffix for calendar event dates.
The backend automatically applies the user's timezone. Never use Z or +00:00.

- User: "Add a doctor appointment for next Tuesday at 2pm"
  YOU: Call create_calendar_event(title="Doctor Appointment", start_date="2025-01-07T14:00:00", ...)
  THEN respond: "I've added your doctor appointment for Tuesday at 2pm"

- User: "Remind me about oil change next month"
  YOU: Call create_calendar_event(title="Oil Change Reminder", start_date="2025-02-15T10:00:00", event_type="maintenance")
```

### Change 2: Fix timezone path in `_get_current_datetime_for_user()` (line 261)

**Current:**
```python
tz_str = self.user_context.get('timezone')
```

**Replace with:**
```python
tz_str = (
    self.user_context.get('timezone') or
    (self.user_context.get('user_location') or {}).get('timezone', '')
)
```

---

## Commit message

```
fix: remove Z suffix from calendar examples and fix timezone path in system prompt

- System prompt calendar examples: remove Z suffix. When Claude appends Z,
  create_calendar_event.py sees tzinfo != None and skips user timezone
  correction, storing raw UTC. Sydney user asking "3pm" gets 3pm UTC
  (= 2am AEDT) stored instead of 3pm AEDT.
- _get_current_datetime_for_user: read from user_location.timezone (nested)
  not just top-level timezone key (always empty). System prompt now shows
  correct local time for the user, not UTC.
```

---

## Verification

After deploying staging backend:
1. Tell PAM "book a dentist appointment tomorrow at 3pm"
2. Backend logs: confirm `start_date` has no `Z` suffix in tool input
3. Backend logs: confirm `Timezone: Australia/Sydney (detected via context)`
4. Calendar shows 3pm (not 2pm or 2am)
5. System prompt log shows correct local time (e.g., "2026-03-06 15:00 (Australia/Sydney)")
