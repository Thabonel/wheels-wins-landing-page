# PAM Voice Hybrid Architecture

## Chat-Supervisor Pattern: OpenAI Realtime + Claude Integration

**Date:** January 2026
**Updated:** January 2026 (Chat-Supervisor Pattern + Language/Location Awareness)
**System:** PAM (Personal AI Mobility assistant) for Wheels & Wins

---

## Executive Summary

PAM uses the **Chat-Supervisor Pattern** (recommended by OpenAI) that combines OpenAI Realtime API for conversational voice with Claude Sonnet 4.5 as a supervisor for complex reasoning and tool execution.

**Key Innovation:** Instead of treating OpenAI as a "dumb pipe", we give it one powerful tool (`delegate_to_supervisor`) that routes complex requests to Claude with full conversation context. This solves the "two disconnected AIs" problem.

**Reference:** [OpenAI Realtime Agents - Chat-Supervisor Pattern](https://github.com/openai/openai-realtime-agents)

---

## Architecture Overview: Chat-Supervisor Pattern

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              USER'S BROWSER                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  User: "Book me a dentist appointment for tomorrow at 3pm"                   │
│                            │                                                  │
│                            ▼                                                  │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                    OpenAI Realtime (gpt-4o-realtime)                    │  │
│  │                                                                         │  │
│  │  🎤 Voice I/O          🧠 Decides: "This needs calendar access"        │  │
│  │  ✓ Greetings           → Calls: delegate_to_supervisor(                │  │
│  │  ✓ Simple chat              user_request: "Book dentist for 3pm",      │  │
│  │  ✓ Acknowledgments          request_type: "calendar"                   │  │
│  │                          )                                              │  │
│  └─────────────────────────────────┬──────────────────────────────────────┘  │
│                                    │                                          │
│                    Tool call with conversation context                        │
│                                    │                                          │
│  ┌─────────────────────────────────▼──────────────────────────────────────┐  │
│  │                      PAMVoiceHybridService                              │  │
│  │                                                                         │  │
│  │  handleSupervisorToolCall() → sendToClaudeBridge({                     │  │
│  │                                  type: 'supervisor_request',            │  │
│  │                                  user_request: "...",                   │  │
│  │                                  conversation_summary: "...",           │  │
│  │                                  context: {...}                         │  │
│  │                                })                                       │  │
│  └─────────────────────────────────┬──────────────────────────────────────┘  │
│                                    │                                          │
└────────────────────────────────────┼──────────────────────────────────────────┘
                                     │ WebSocket
                                     ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (FastAPI)                                     │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                    pam_realtime_hybrid.py                                │   │
│  │                                                                          │   │
│  │  /create-session: Creates OpenAI session WITH delegate_to_supervisor    │   │
│  │  /bridge/{user}: WebSocket that maintains conversation_history[]        │   │
│  │                                                                          │   │
│  │  supervisor_request handler:                                             │   │
│  │    1. Load user context (cached + browser)                              │   │
│  │    2. Add conversation_summary to context                               │   │
│  │    3. Call PAM.chat() with full context                                 │   │
│  │    4. Return supervisor_response                                        │   │
│  └──────────────────────────────────┬──────────────────────────────────────┘   │
│                                     │                                           │
│  ┌──────────────────────────────────▼──────────────────────────────────────┐   │
│  │                    Claude Sonnet 4.5 (Supervisor)                        │   │
│  │                                                                          │   │
│  │  • Receives full conversation context                                   │   │
│  │  • Has 45 tools (calendar, budget, trip, etc.)                         │   │
│  │  • Executes: create_calendar_event(title="Dentist", time="3pm")        │   │
│  │  • Returns: "Done! I've booked your dentist appointment for 3pm."      │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ supervisor_response
                                     ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│  PAMVoiceHybridService receives response, sends tool result to OpenAI         │
│                                     │                                          │
│                                     ▼                                          │
│  OpenAI Realtime speaks: "Done! I've booked your dentist appointment..."      │
└────────────────────────────────────────────────────────────────────────────────┘
```

## Why Chat-Supervisor Pattern?

| Old Architecture | Chat-Supervisor Pattern |
|------------------|------------------------|
| GPT was a "dumb pipe" | GPT is a smart router with personality |
| Every message went to Claude | Simple chat handled instantly by GPT |
| GPT had no context of what Claude did | GPT gets Claude's response as tool result |
| "Change to 4pm" failed - no context | Works - conversation_history preserved |
| Two disconnected AIs | Single coherent conversation experience |

## The Key: `delegate_to_supervisor` Tool

OpenAI Realtime is configured with ONE tool that bridges to Claude:

```json
{
  "type": "function",
  "name": "delegate_to_supervisor",
  "description": "Delegate complex requests to supervisor (Claude) who has tools for calendar, budget, trips, etc.",
  "parameters": {
    "user_request": "The user's request in their own words",
    "conversation_summary": "Relevant context from the conversation",
    "request_type": "calendar|budget|trip|weather|profile|social|shopping|general"
  }
}
```

## When GPT Delegates vs Responds Directly

**GPT Handles Directly (instant response):**
- Greetings: "Hi!", "Hello PAM"
- Simple chat: "How are you?", "Thanks"
- Clarifications: "What do you mean?"

**GPT Delegates to Claude (via tool):**
- Any action: "Book...", "Create...", "Track..."
- Data lookup: "What's on my calendar?", "How much did I spend?"
- Recommendations: "Where should I go?", "What's the weather?"

---

## The Three-Phase Voice Flow

### Phase 1: Voice Input (User → OpenAI)

```
User speaks → Microphone → Resample to 24kHz PCM16 → OpenAI Realtime WebSocket
```

1. **Microphone Capture**: Browser captures audio at native sample rate (typically 48kHz)
2. **Resampling**: Audio is resampled to 24kHz mono PCM16 (OpenAI's required format)
3. **Streaming**: Audio chunks are base64-encoded and sent to OpenAI via WebSocket
4. **VAD**: OpenAI's server-side Voice Activity Detection triggers transcription

**Key Configuration:**
```javascript
turn_detection: {
  type: 'server_vad',
  threshold: 0.5,
  prefix_padding_ms: 300,
  silence_duration_ms: 500
}
```

### Phase 2: Reasoning (OpenAI Transcript → Claude → Response)

```
Transcript → Claude Bridge WebSocket → PAM.chat() → Claude Sonnet 4.5 → Tool Execution → Response Text
```

1. **Transcript Received**: OpenAI fires `conversation.item.created` with transcribed text
2. **Context Assembly**: Frontend sends transcript + context to Claude bridge
3. **PAM Processing**: Backend forwards to PAM core with full user context
4. **Tool Execution**: Claude decides which tools to use, executes them
5. **Response Generation**: Claude formulates natural language response

**Critical Context Passed:**
```python
context = {
    "user_id": "...",
    "language": "en",
    "user_location": {"lat": ..., "lng": ..., "city": "..."},
    "timezone": "America/New_York",
    "current_page": "pam_chat",
    "is_voice": True  # CRITICAL: Bypasses aggressive tool prefiltering
}
```

### Phase 3: Voice Output (Claude Response → OpenAI TTS → User)

```
Claude Response Text → OpenAI conversation.item.create → response.create → Audio Chunks → AudioProcessor → Speaker
```

1. **Text Injection**: Claude's response is sent to OpenAI as an assistant message
2. **TTS Trigger**: `response.create` with `modalities: ['audio']` generates speech
3. **Audio Streaming**: OpenAI streams PCM16 audio chunks via `response.audio.delta`
4. **Gapless Playback**: AudioProcessor schedules chunks with crossfade for seamless audio

---

## Component Deep Dive

### Frontend: PAMVoiceHybridService

**Location:** `src/services/pamVoiceHybridService.ts`

**Responsibilities:**
- Manage two WebSocket connections (OpenAI + Claude bridge)
- Capture and resample microphone audio
- Play audio chunks with gapless scheduling
- Handle voice status (listening, speaking, connected)
- Dispatch UI events for tool results (calendar reload, etc.)

**Key Classes:**
- `PAMVoiceHybridService`: Main orchestrator
- `AudioProcessor`: Handles gapless audio playback with crossfade

### Backend: Claude Bridge

**Location:** `backend/app/api/v1/pam_realtime_hybrid.py`

**Endpoints:**
- `POST /create-session`: Creates ephemeral OpenAI session token
- `WS /bridge/{user_id}`: WebSocket for text-based Claude communication

**Key Design Decisions:**
1. **No tools on OpenAI**: OpenAI Realtime receives empty `tools: []` - it only does voice I/O
2. **Claude handles all reasoning**: Every user message goes through PAM core
3. **Context merging**: Cached user context + browser context combined

### PAM Core

**Location:** `backend/app/services/pam/core/pam.py`

**Capabilities:**
- 45 tools across 6 categories (budget, trip, social, shop, profile, calendar)
- Claude Sonnet 4.5 with prompt caching
- Intelligent tool prefiltering (87% token reduction)

### Tool Prefiltering

**Location:** `backend/app/services/pam/tools/tool_prefilter.py`

**Problem Solved:** 45 tools × 300 tokens = 13,500 tokens per request (expensive!)

**Solution:** Keyword-based category detection reduces to 7-10 relevant tools

**Voice Mode Exception:** When `is_voice: True`, prefiltering is more lenient because:
- Voice commands are often vague ("book an appointment")
- User can't easily retry like they can with text
- Better to include extra tools than miss the user's intent

---

## Security Architecture

### Session Token Flow

```
1. Browser authenticates with JWT
2. Browser requests ephemeral OpenAI token from backend
3. Backend validates JWT, creates OpenAI session
4. Browser receives short-lived token (expires in minutes)
5. Browser connects directly to OpenAI with ephemeral token
```

**Why this matters:**
- User's OpenAI API key never exposed to browser
- Ephemeral tokens limit blast radius if compromised
- Backend maintains authentication control

### Claude Bridge Authentication

```
Browser → WebSocket with JWT query param → Backend validates → Claude processing
```

---

## Audio Processing Details

### Resampling (48kHz → 24kHz)

```javascript
function resampleFloat32(input, inRate, outRate) {
  const ratio = outRate / inRate;
  const outLength = Math.floor(input.length * ratio);
  const output = new Float32Array(outLength);
  const step = inRate / outRate;
  // Linear interpolation between samples
  ...
}
```

### Gapless Playback

The `AudioProcessor` uses Web Audio API scheduling:

1. **Preroll Buffer**: 200ms lookahead prevents underruns
2. **Crossfade**: 10ms fade at chunk boundaries prevents clicks
3. **Completion Tracking**: Timeout scheduled after last chunk for accurate `isSpeaking` status

---

## Known Issues and Fixes Applied

### Issue 1: Voice Commands Couldn't Execute Tools
**Root Cause:** Tool prefilter was too aggressive for voice mode
**Fix:** Added `is_voice` flag that bypasses strict prefiltering

### Issue 2: Double Voice (Two TTS Systems Speaking)
**Root Cause:** Both OpenAI Realtime TTS and local `speakText()` were active
**Fix:** Set `shouldSpeak: false` in voice mode, added `!realtimeService` guard

### Issue 3: Calendar Keywords Not Detected
**Root Cause:** Tool prefilter missing calendar-related keywords
**Fix:** Added comprehensive calendar keyword patterns

### Issue 4: PAM Speaking Wrong Language (Spanish Instead of English)
**Root Cause:** OpenAI instructions were static - no user language/location context passed
**Fix:**
1. `VoiceSessionRequest` now accepts `language`, `location`, `timezone`, `user_name`
2. `_get_chat_supervisor_instructions()` is now parameterized with user context
3. Instructions explicitly state "ALWAYS speak in {language}" as the FIRST rule
4. Frontend passes user context when creating the session

---

## User Context Injection

The session creation flow now passes user context to personalize GPT's behavior:

```typescript
// Frontend (pamVoiceHybridService.ts)
body: JSON.stringify({
  voice: 'marin',
  temperature: 0.65,
  language: 'en',           // User's language preference
  location: {               // User's current location
    city: 'Austin',
    state: 'Texas',
    lat: 30.2672,
    lng: -97.7431
  },
  timezone: 'America/Chicago'
})
```

```python
# Backend (pam_realtime_hybrid.py)
def _get_chat_supervisor_instructions(
    language: str = "en",
    location: Optional[Dict] = None,
    timezone: Optional[str] = None,
    user_name: Optional[str] = None
) -> str:
    # Generates personalized instructions like:
    # "ALWAYS speak in English..."
    # "The user is currently in Austin, Texas..."
```

This ensures PAM:
1. **Speaks the correct language** (English by default)
2. **Knows the user's location** for context-aware responses
3. **Understands timezone** for scheduling
4. **Can use the user's name** for personalization

---

## Performance Characteristics

| Metric | Value |
|--------|-------|
| Speech-to-Text Latency | ~300-500ms (OpenAI Realtime) |
| Claude Reasoning | ~1-3s (depends on tool execution) |
| Text-to-Speech Start | ~200ms after response received |
| End-to-End (simple query) | ~2-3s |
| End-to-End (with tools) | ~3-5s |

---

## Future Considerations

1. **Streaming Responses**: Currently waits for full Claude response; could stream text to TTS
2. **Interruption Handling**: Barge-in works but could be smoother
3. **Multi-turn Context**: Voice sessions don't persist context across browser refreshes
4. **Offline Mode**: No fallback when either service is unavailable

---

## Conclusion

The PAM hybrid voice architecture successfully combines:
- **OpenAI Realtime**: Best-in-class voice I/O with low latency
- **Claude Sonnet 4.5**: Superior reasoning and reliable tool execution
- **Separation of Concerns**: Voice processing decoupled from business logic

This design allows each AI to do what it does best while maintaining a seamless user experience.
