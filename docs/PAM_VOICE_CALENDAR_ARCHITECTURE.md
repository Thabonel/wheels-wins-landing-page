# PAM Voice-to-Calendar Architecture

**Document Version:** 1.0
**Date:** January 20, 2026
**Status:** Working Implementation (Backup at `docs/backups/2026-01-20-pam-voice-calendar/`)

---

## Overview

This document describes how PAM (Personal AI Manager) adds calendar events through voice commands. The implementation uses a **Chat-Supervisor pattern** with OpenAI Realtime API for voice I/O and Claude Sonnet 4.5 for reasoning and tool execution.

**Example User Interaction:**
```
User: "Hey PAM, add a meeting today at 2pm"
PAM: "I've added your meeting for today at 2pm to your calendar"
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Browser)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────┐     ┌─────────────────────────────────────┐          │
│   │  Pam.tsx        │────▶│  pamVoiceHybridService.ts           │          │
│   │  (Wake Word UI) │     │  (Voice Session Management)         │          │
│   └─────────────────┘     └──────────────┬──────────────────────┘          │
│                                          │                                  │
│                           ┌──────────────┴──────────────┐                  │
│                           │                             │                  │
│                           ▼                             ▼                  │
│              ┌────────────────────┐       ┌────────────────────────┐       │
│              │  OpenAI Realtime   │       │  Claude Bridge         │       │
│              │  (WebRTC Audio)    │       │  (WebSocket)           │       │
│              └─────────┬──────────┘       └───────────┬────────────┘       │
│                        │                              │                     │
└────────────────────────┼──────────────────────────────┼─────────────────────┘
                         │                              │
                         │ Audio/Text                   │ supervisor_request
                         ▼                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND (FastAPI)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  pam_realtime_hybrid.py                                             │   │
│   │  /api/v1/pam/voice-hybrid/                                          │   │
│   │                                                                     │   │
│   │  Endpoints:                                                         │   │
│   │  - POST /create-session   → Creates OpenAI Realtime ephemeral token│   │
│   │  - WS   /bridge/{user_id} → WebSocket bridge to Claude             │   │
│   └─────────────────────────────┬───────────────────────────────────────┘   │
│                                 │                                           │
│                                 ▼                                           │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  pam.py (PAM Core)                                                  │   │
│   │                                                                     │   │
│   │  - System prompt with current date                                  │   │
│   │  - 47 tools including create_calendar_event                         │   │
│   │  - Claude Sonnet 4.5 integration                                    │   │
│   └─────────────────────────────┬───────────────────────────────────────┘   │
│                                 │                                           │
│                                 ▼                                           │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  create_calendar_event.py                                           │   │
│   │                                                                     │   │
│   │  - Pydantic validation (CreateCalendarEventInput)                   │   │
│   │  - Timezone detection (browser → coordinates → UTC fallback)        │   │
│   │  - Supabase database insert                                         │   │
│   └─────────────────────────────┬───────────────────────────────────────┘   │
│                                 │                                           │
└─────────────────────────────────┼───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE (Supabase)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Table: calendar_events                                                    │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  id              UUID PRIMARY KEY                                   │   │
│   │  user_id         UUID REFERENCES profiles(id)                       │   │
│   │  title           TEXT NOT NULL                                      │   │
│   │  description     TEXT                                               │   │
│   │  start_date      TIMESTAMP WITH TIME ZONE NOT NULL                  │   │
│   │  end_date        TIMESTAMP WITH TIME ZONE NOT NULL                  │   │
│   │  all_day         BOOLEAN DEFAULT false                              │   │
│   │  event_type      calendar_event_type (enum)                         │   │
│   │  location_name   TEXT                                               │   │
│   │  reminder_minutes INTEGER[] DEFAULT '{15}'                          │   │
│   │  color           TEXT DEFAULT '#3b82f6'                             │   │
│   │  is_private      BOOLEAN DEFAULT true                               │   │
│   │  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now()             │   │
│   │  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT now()             │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Complete Flow: Voice Command to Calendar Event

### Step 1: Wake Word Detection

**File:** `src/components/Pam.tsx`
**Lines:** 180-220

When user says "Hey PAM", the wake word service detects it and triggers voice mode:

```typescript
// Pam.tsx - Wake word handler
const handleWakeWordDetected = useCallback(async () => {
  if (isVoiceModeEnabled) return;

  setIsVoiceModeEnabled(true);
  setShowVoiceIndicator(true);

  // Start voice session
  await startVoiceSession();
}, [isVoiceModeEnabled]);
```

### Step 2: Voice Session Creation

**File:** `src/services/pamVoiceHybridService.ts`
**Lines:** 150-250

The frontend requests an ephemeral session token from the backend:

```typescript
// pamVoiceHybridService.ts - Session creation
async startSession(options: VoiceSessionOptions): Promise<void> {
  // 1. Get ephemeral token from our backend
  const sessionResponse = await fetch('/api/v1/pam/voice-hybrid/create-session', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      voice: 'marin',
      language: options.language,
      timezone: options.timezone,
      location: options.location
    })
  });

  const { session_token, ws_url } = await sessionResponse.json();

  // 2. Connect to OpenAI Realtime via WebRTC
  this.peerConnection = new RTCPeerConnection();
  // ... WebRTC setup

  // 3. Connect to Claude bridge via WebSocket
  this.bridgeConnection = new WebSocket(`/api/v1/pam/voice-hybrid/bridge/${userId}`);
}
```

### Step 3: Backend Session Creation

**File:** `backend/app/api/v1/pam_realtime_hybrid.py`
**Lines:** 78-237

The backend creates an OpenAI Realtime session with PAM's instructions:

```python
# pam_realtime_hybrid.py - Create session
@router.post("/create-session")
async def create_hybrid_voice_session(request: VoiceSessionRequest):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.openai.com/v1/realtime/sessions",
            headers={"Authorization": f"Bearer {openai_key}"},
            json={
                "model": "gpt-4o-realtime-preview",
                "voice": request.voice,
                "instructions": _get_chat_supervisor_instructions(
                    language=request.language,
                    location=request.location,
                    timezone=request.timezone
                ),
                "tools": _get_supervisor_tool()  # Single tool: delegate_to_supervisor
            }
        )
    return VoiceSessionResponse(session_token=session_token, ...)
```

### Step 4: User Speaks "Add meeting today at 2pm"

OpenAI Realtime transcribes the audio and recognizes this needs delegation:

```
User speech → OpenAI STT → "Add meeting today at 2pm"
OpenAI decides: This is a calendar request → Call delegate_to_supervisor tool
```

### Step 5: OpenAI Calls delegate_to_supervisor

**File:** `backend/app/api/v1/pam_realtime_hybrid.py`
**Lines:** 356-406

OpenAI's tool definition tells it when to delegate:

```python
# Tool definition sent to OpenAI
{
    "type": "function",
    "name": "delegate_to_supervisor",
    "description": """Delegate complex requests to your supervisor (Claude) who has access to tools for:
    - Calendar management (create/update/delete events, appointments)
    - Budget tracking, Trip planning, Weather forecasts, etc.

    Call this for ANY request that requires:
    1. Looking up real data (calendar events, expenses, weather)
    2. Taking an action (booking appointments, logging expenses)
    """,
    "parameters": {
        "type": "object",
        "properties": {
            "user_request": {"type": "string", "description": "The user's request"},
            "request_type": {"type": "string", "enum": ["calendar", "budget", "trip", ...]}
        }
    }
}
```

### Step 6: Frontend Forwards to Claude Bridge

**File:** `src/services/pamVoiceHybridService.ts`
**Lines:** 350-420

When OpenAI calls the tool, the frontend forwards it to our WebSocket bridge:

```typescript
// pamVoiceHybridService.ts - Handle tool call
private handleToolCall(toolCall: any) {
  if (toolCall.name === 'delegate_to_supervisor') {
    const args = JSON.parse(toolCall.arguments);

    // Forward to Claude via WebSocket bridge
    this.bridgeConnection.send(JSON.stringify({
      type: 'supervisor_request',
      user_request: args.user_request,      // "Add meeting today at 2pm"
      request_type: args.request_type,       // "calendar"
      conversation_summary: args.conversation_summary,
      context: {
        timezone: this.userTimezone,         // "Australia/Sydney"
        user_location: this.userLocation     // {lat: -33.9, lng: 151.1}
      }
    }));
  }
}
```

### Step 7: Backend WebSocket Bridge Receives Request

**File:** `backend/app/api/v1/pam_realtime_hybrid.py`
**Lines:** 433-550

The bridge receives the supervisor request and forwards to Claude:

```python
# pam_realtime_hybrid.py - WebSocket bridge
@router.websocket("/bridge/{user_id}")
async def voice_to_claude_bridge(websocket: WebSocket, user_id: str):
    while True:
        data = await websocket.receive_json()

        if data.get("type") == "supervisor_request":
            user_request = data.get("user_request")  # "Add meeting today at 2pm"
            browser_context = data.get("context", {})

            # Load full context (timezone, location, preferences)
            context = await _load_voice_context(user_id, browser_context)

            # Get PAM instance (Claude brain)
            pam = await get_pam(user_id, user_language=context.get("language", "en"))

            # Execute via Claude
            pam_result = await pam.chat(
                message=user_request,
                context=context,  # Contains timezone!
                stream=False
            )
```

### Step 8: Claude Decides to Call create_calendar_event

**File:** `backend/app/services/pam/core/pam.py`
**Lines:** 234-416

Claude sees PAM's system prompt which includes:

```python
# pam.py - System prompt excerpt (lines 297-361)
"""
**Calendar Tools (3):**
- create_calendar_event - Add events to calendar
- update_calendar_event - Modify events
- delete_calendar_event - Remove events

**CRITICAL - Tool Usage Rules (ALWAYS FOLLOW):**
- Calendar, appointment, event, schedule, reminder, add to calendar -> ALWAYS call create_calendar_event
  * NEVER just say "I'll add that" - actually call the tool FIRST
  * Extract: title, date/time (convert natural language like "tomorrow at 3pm" to ISO format)

**Current date:** {datetime.now().strftime("%Y-%m-%d")}
"""
```

Claude reasons:
1. User wants to add a meeting
2. "today at 2pm" means today's date at 14:00
3. Must call create_calendar_event tool

Claude generates tool call:
```json
{
  "name": "create_calendar_event",
  "input": {
    "title": "Meeting",
    "start_date": "2026-01-20T14:00:00",
    "event_type": "meeting"
  }
}
```

### Step 9: Tool Execution - create_calendar_event

**File:** `backend/app/services/pam/tools/create_calendar_event.py`
**Lines:** 84-246

The calendar tool executes with timezone awareness:

```python
# create_calendar_event.py - Core logic

async def create_calendar_event(
    user_id: str,
    title: str,
    start_date: str,
    context: Optional[Dict[str, Any]] = None,
    **kwargs
) -> Dict[str, Any]:

    # 1. Validate input with Pydantic
    validated = CreateCalendarEventInput(
        user_id=user_id,
        title=title,
        start_date=start_date,
        ...
    )

    # 2. Detect user's timezone (3 strategies)
    ctx = context or kwargs.get('context', {})
    user_timezone, user_timezone_str, detection_method = detect_user_timezone(ctx)

    # 3. Parse datetime with timezone awareness
    start_dt = datetime.fromisoformat(validated.start_date)
    if start_dt.tzinfo is None:
        # If naive datetime, interpret in user's timezone
        start_dt = start_dt.replace(tzinfo=user_timezone)

    # 4. Default end time (1 hour after start)
    end_dt = start_dt + timedelta(hours=1)

    # 5. Insert into database
    event_data = {
        "user_id": validated.user_id,
        "title": validated.title,
        "start_date": start_dt.isoformat(),  # Stores with timezone!
        "end_date": end_dt.isoformat(),
        ...
    }

    response = supabase.table("calendar_events").insert(event_data).execute()

    return {
        "success": True,
        "event": response.data[0],
        "message": f"Successfully added '{title}' to your calendar"
    }
```

### Step 10: Timezone Detection Logic

**File:** `backend/app/services/pam/tools/create_calendar_event.py`
**Lines:** 40-81

Three-tier fallback for timezone detection:

```python
def detect_user_timezone(context: Dict[str, Any]) -> tuple[ZoneInfo, str, str]:
    """
    Strategy:
    1. Try browser-detected timezone (context['timezone'])
    2. Try coordinate-based detection (context['user_location'])
    3. Fall back to UTC
    """

    # Strategy 1: Browser-detected timezone (PRIMARY)
    if 'timezone' in context and context['timezone']:
        user_timezone_str = context['timezone']  # e.g., "Australia/Sydney"
        try:
            user_timezone = ZoneInfo(user_timezone_str)
            logger.info(f"Timezone detected from browser: {user_timezone_str}")
            return user_timezone, user_timezone_str, "browser"
        except Exception:
            pass

    # Strategy 2: Coordinate-based detection (FALLBACK)
    if TIMEZONE_FINDER_AVAILABLE and 'user_location' in context:
        lat = context['user_location'].get('lat')
        lng = context['user_location'].get('lng')
        if lat and lng:
            tf = TimezoneFinder()
            timezone_str = tf.timezone_at(lat=lat, lng=lng)
            if timezone_str:
                return ZoneInfo(timezone_str), timezone_str, "coordinates"

    # Strategy 3: UTC fallback
    return ZoneInfo('UTC'), 'UTC', "fallback"
```

### Step 11: Response Flows Back

1. Tool returns success message
2. Claude generates natural language response
3. Backend sends response via WebSocket
4. Frontend forwards to OpenAI Realtime
5. OpenAI TTS speaks: "I've added your meeting for today at 2pm to your calendar"

---

## Key Files Reference

| File | Purpose | Critical Lines |
|------|---------|----------------|
| `src/components/Pam.tsx` | Wake word UI, voice mode toggle | 180-220 |
| `src/services/pamVoiceHybridService.ts` | Voice session management, OpenAI/Claude bridge | 150-420 |
| `backend/app/api/v1/pam_realtime_hybrid.py` | Session creation, WebSocket bridge | 78-620 |
| `backend/app/services/pam/core/pam.py` | PAM brain, system prompt, tool definitions | 234-416, 454-700 |
| `backend/app/services/pam/tools/create_calendar_event.py` | Calendar event creation with timezone | 40-246 |

---

## Database Schema

### calendar_events Table

```sql
CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    all_day BOOLEAN DEFAULT false,
    event_type calendar_event_type DEFAULT 'reminder',
    location_name TEXT,
    reminder_minutes INTEGER[] DEFAULT '{15}',
    color TEXT DEFAULT '#3b82f6',
    is_private BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Event type enum
CREATE TYPE calendar_event_type AS ENUM (
    'reminder', 'trip', 'booking', 'maintenance',
    'inspection', 'meeting', 'personal', 'birthday', 'holiday'
);
```

---

## Environment Variables Required

### Backend (.env)
```bash
ANTHROPIC_API_KEY=sk-ant-...     # Claude Sonnet 4.5
OPENAI_API_KEY=sk-...            # OpenAI Realtime API
SUPABASE_URL=https://...         # Database
SUPABASE_SERVICE_ROLE_KEY=...    # Service role for PAM operations
```

### Frontend (.env)
```bash
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...
```

---

## Debugging Tips

### Check OpenAI Realtime Connection
```javascript
// In browser console
window.pamVoiceService?.getConnectionState()
// Should return: { openai: 'connected', bridge: 'connected' }
```

### Check Backend Logs
```bash
# Look for these log patterns:
[PAMVoiceHybrid] Session created
[PAM] Tool call: create_calendar_event
[Calendar] Creating event: Meeting at 2026-01-20 14:00 (Australia/Sydney)
```

### Test Calendar Tool Directly
```bash
curl -X POST http://localhost:8000/api/v1/pam/chat \
  -H "Authorization: Bearer $JWT" \
  -d '{"message": "Add a meeting today at 2pm", "context": {"timezone": "Australia/Sydney"}}'
```

---

## Known Issues and Workarounds

### Issue: Events Created for Wrong Day

**Symptom:** User says "today at 2pm" but event appears on yesterday's date.

**Root Cause:** PAM's system prompt uses `datetime.now()` (UTC server time) for "Current date". If user is in Sydney (UTC+11) and it's early morning there, UTC time is still "yesterday".

**Location:** `backend/app/services/pam/core/pam.py` line 412

**Workaround:** Ensure timezone is passed in context and the calendar tool's timezone detection works correctly.

**Future Fix:** Update `_build_system_prompt()` to use user's timezone for "Current date".

---

## Backup Location

All files as of January 20, 2026 (working state):
```
docs/backups/2026-01-20-pam-voice-calendar/
├── pam.py                    # PAM core brain
├── pam_realtime_hybrid.py    # Voice hybrid backend
├── create_calendar_event.py  # Calendar tool
├── pamVoiceHybridService.ts  # Frontend voice service
├── Pam.tsx                   # Frontend component
├── pamLocationContext.ts     # Location utilities
└── __init__.py               # Schemas init
```

---

## Maintenance Notes

- **Do not modify** the tool call flow without testing end-to-end
- **Always test** with multiple timezones (Sydney, London, New York)
- **Monitor logs** for timezone detection method ("browser", "coordinates", "fallback")
- **Backup before changes** - this took months to get working correctly
