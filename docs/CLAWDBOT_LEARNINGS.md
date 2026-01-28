# Clawdbot Architecture Analysis & PAM Opportunities

Research on Clawdbot's architecture and how we can apply learnings to Wheels & Wins PAM.

---

## What is Clawdbot?

[Clawdbot](https://github.com/clawdbot/clawdbot) is an open-source personal AI assistant created by Peter Steinberger. It's a local-first system that runs on minimal hardware (even a Raspberry Pi 4) and supports multi-channel messaging.

**Key stats:**
- Runs on 1 CPU core, 1GB RAM, 500MB disk
- Supports 12+ messaging platforms
- Voice wake + talk mode with ElevenLabs
- Self-hosted, ~$5/month API costs

---

## Clawdbot Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLAWDBOT ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Messaging Channels                                             │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│   │ WhatsApp │ │ Telegram │ │  Slack   │ │ Discord  │ ...      │
│   └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘          │
│        │            │            │            │                  │
│        └────────────┴─────┬──────┴────────────┘                  │
│                           ▼                                      │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                    GATEWAY (WS)                          │   │
│   │              ws://127.0.0.1:18789                        │   │
│   │  • Session management    • Multi-channel routing         │   │
│   │  • Tool execution        • Presence tracking             │   │
│   └─────────────────────────┬───────────────────────────────┘   │
│                             │                                    │
│        ┌────────────────────┼────────────────────┐              │
│        ▼                    ▼                    ▼              │
│   ┌─────────┐        ┌─────────────┐      ┌───────────┐        │
│   │  Agent  │        │   Memory    │      │  Skills   │        │
│   │ Runtime │        │   (JSONL)   │      │  System   │        │
│   └─────────┘        └─────────────┘      └───────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Core Components

| Component | Purpose | How It Works |
|-----------|---------|--------------|
| **Gateway** | Central control plane | WebSocket server managing all sessions, channels, tools |
| **Agent Runtime** | AI execution | Runs Claude/GPT with tool streaming |
| **Skills** | Modular capabilities | Markdown files defining tools and behaviors |
| **Memory** | Persistence | JSONL session files with compaction |
| **Channels** | Multi-platform I/O | WhatsApp, Telegram, Slack, Discord, iMessage, etc. |

### Bootstrap Files (Context Injection)

Clawdbot injects these markdown files into every session:

| File | Purpose |
|------|---------|
| `AGENTS.md` | Operating instructions |
| `SOUL.md` | Persona and boundaries |
| `TOOLS.md` | Tool usage guidance |
| `IDENTITY.md` | Agent identity |
| `USER.md` | User profile and preferences |
| `BOOTSTRAP.md` | First-run ritual (auto-deleted) |

**Key insight**: Large files are automatically trimmed to keep prompts lean.

### Skills System (3 Tiers)

```
Priority (highest to lowest):
1. Workspace skills  → <workspace>/skills/
2. Managed skills    → ~/.clawdbot/skills/
3. Bundled skills    → Included with installation
```

Skills are defined in `SKILL.md` files with:
- Description
- Available tools
- Usage examples
- Activation rules

### Session Isolation

- **Main session**: Full tool access, runs on host
- **Group/channel sessions**: Sandboxed in Docker containers
- Per-session toggles: `thinkingLevel`, `verboseLevel`, `model`, `sendPolicy`
- Commands: `/compact`, `/new`, `/reset`

### Voice Mode

- Always-on wake word detection
- ElevenLabs TTS integration
- Push-to-talk overlay on macOS
- Continuous conversation (Talk Mode)

---

## PAM Current Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      PAM ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Frontend (React)                                               │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │  pamVoiceHybridService.ts                                 │  │
│   │  • OpenAI Realtime (STT + TTS)                           │  │
│   │  • Wake word detection                                    │  │
│   │  • Instant local greetings                               │  │
│   └─────────────────────────┬────────────────────────────────┘  │
│                             │                                    │
│                             ▼                                    │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │               Backend WebSocket                           │  │
│   │     wss://pam-backend.onrender.com/api/v1/pam/ws         │  │
│   └─────────────────────────┬────────────────────────────────┘  │
│                             │                                    │
│                             ▼                                    │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │                Claude Sonnet 4.5                          │  │
│   │  • enhanced_pam_prompt.py (personality)                  │  │
│   │  • 47 tools (budget, trip, social, calendar, etc.)       │  │
│   └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Opportunities: Apply Clawdbot Patterns to PAM

### 1. Bootstrap File Pattern (HIGH VALUE)

**Current**: PAM's personality is in `enhanced_pam_prompt.py` (400+ lines)

**Clawdbot approach**: Separate into modular markdown files

```
backend/app/services/pam/context/
├── SOUL.md          # PAM's personality, warmth, boundaries
├── TOOLS.md         # Tool usage guidance
├── USER.md          # Loaded per-user (preferences, vehicle, location)
├── TRIP_CONTEXT.md  # Current trip if active
└── MEMORY.md        # Recent conversation summary
```

**Benefits**:
- Easier to edit personality without touching code
- Per-user customization
- Dynamic context loading
- Cleaner separation of concerns

### 2. Multi-Channel Support (MEDIUM VALUE)

**Current**: PAM only works via web app

**Clawdbot approach**: Gateway routes messages from multiple channels

**Potential channels for RVers**:
- **WhatsApp** - Most RVers already use it
- **Telegram** - Tech-savvy users
- **SMS** - Fallback for poor connectivity areas
- **Voice device** - The PAM hardware project

```
User sends WhatsApp message → Gateway → PAM Backend → Response → WhatsApp
```

### 3. Session/Memory Architecture (HIGH VALUE)

**Current**: Conversation stored in Supabase, loaded each time

**Clawdbot approach**: JSONL session files with compaction

**Ideas for PAM**:
- `/compact` command to summarize long conversations
- Session isolation for different contexts (trip planning vs. budget vs. social)
- Automatic memory pruning based on relevance

### 4. Skills as Modular Markdown (MEDIUM VALUE)

**Current**: Tools defined in Python files

**Clawdbot approach**: Skills defined in SKILL.md with metadata

```markdown
# Trip Planning Skill

## Description
Plan RV trips with route optimization, weather, and campsites.

## Tools
- plan_trip
- find_campsites
- get_weather_forecast
- optimize_route

## Activation
Triggers: "plan a trip", "route to", "drive from X to Y"

## Examples
User: "Plan a trip from Sydney to Melbourne"
PAM: Calls plan_trip with origin/destination, considers ferries, weather, budget
```

### 5. Local-First Option (FOR PAM DEVICE)

**Current**: PAM requires internet connection

**Clawdbot approach**: Runs locally with optional cloud

**For PAM Device**:
- Local wake word (already planned - microWakeWord)
- Local speaker verification (WeSpeaker)
- Local fallback responses for common queries
- Cloud for complex reasoning

---

## PAM Device Integration

Your `/Users/thabonel/Code/Pam-Wakeword/` project aligns well with Clawdbot patterns:

### Hardware Stack (~$96 AUD)
- Raspberry Pi Zero 2 WH
- ReSpeaker 2-Mics HAT
- 3" Speaker

### Software Stack (All Apache 2.0)
- microWakeWord ("Hey Pam")
- WeSpeaker (speaker verification)
- Connection to PAM backend

### Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  PAM DEVICE + CLOUD HYBRID                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   PAM Device (Raspberry Pi)                                      │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │  LOCAL PROCESSING                                         │  │
│   │  • Wake word: "Hey Pam" (microWakeWord)                  │  │
│   │  • Speaker verification (WeSpeaker)                      │  │
│   │  • Audio capture/playback                                │  │
│   │  • Basic offline responses                               │  │
│   └─────────────────────────┬────────────────────────────────┘  │
│                             │ WiFi                               │
│                             ▼                                    │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │  PAM BACKEND (Cloud)                                      │  │
│   │  • Claude Sonnet 4.5 reasoning                           │  │
│   │  • 47 tools (trip, budget, social, etc.)                 │  │
│   │  • User profile + memory                                 │  │
│   └─────────────────────────┬────────────────────────────────┘  │
│                             │                                    │
│                             ▼                                    │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │  TTS OPTIONS                                              │  │
│   │  • OpenAI Realtime (current)                             │  │
│   │  • Qwen3-TTS (open source, voice cloning)                │  │
│   │  • ElevenLabs (Clawdbot uses this)                       │  │
│   └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Recommended Next Steps

### Immediate (Low Effort, High Value)

1. **Adopt Bootstrap File Pattern**
   - Split `enhanced_pam_prompt.py` into modular markdown files
   - Create per-user `USER.md` loaded from profile
   - Easier personality tuning

2. **Add /compact Command**
   - Summarize long conversations
   - Reduce token usage
   - Improve response time

### Medium Term

3. **WhatsApp Channel**
   - Many RVers use WhatsApp groups
   - "Hey Pam, what's the weather?" via WhatsApp
   - Uses existing PAM backend

4. **PAM Device MVP**
   - Follow the build guide
   - Connect to PAM backend via WebSocket
   - Local wake word + cloud reasoning

### Long Term

5. **Skills Marketplace**
   - Community-contributed PAM skills
   - Vehicle-specific skills (caravan vs. motorhome)
   - Regional skills (Australia vs. USA camping rules)

6. **Self-Hosted Option**
   - For privacy-conscious users
   - Run PAM backend locally
   - Use Qwen3-TTS for voice

---

## Resources

- [Clawdbot GitHub](https://github.com/clawdbot/clawdbot)
- [Clawdbot Docs](https://docs.clawd.bot/)
- [MacStories Review](https://www.macstories.net/stories/clawdbot-showed-me-what-the-future-of-personal-ai-assistants-looks-like/)
- [Clawdbot Architecture Deep Dive](https://collabnix.com/what-is-clawdbot-and-why-is-it-getting-popular/)

---

## Deep Dive: Key Implementation Details

### SKILL.md Format (Actual Structure)

From analyzing their `weather` and `1password` skills:

```yaml
---
name: weather
description: Get current weather and forecasts (no API key required).
homepage: https://wttr.in/:help
metadata: {"clawdbot":{"emoji":"🌤️","requires":{"bins":["curl"]}}}
---

# Weather

Two free services, no API keys needed.

## wttr.in (primary)
Quick one-liner:
```bash
curl -s "wttr.in/London?format=3"
# Output: London: ⛅️ +8°C
```

## Workflow
1. Check OS + shell.
2. Verify CLI present.
3. Sign in / authorize.
4. Verify access.

## Guardrails
- Never paste secrets into logs, chat, or code.
- Prefer `op run` / `op inject` over writing secrets to disk.
```

**Key elements:**
- YAML frontmatter with name, description, homepage, metadata
- Metadata includes emoji, required binaries, install instructions
- Body is documentation the AI reads and follows
- Workflow sections with numbered steps
- Guardrails section for safety rules

### Send Policy System

Clawdbot has sophisticated message routing control:

```typescript
type SessionSendPolicyDecision = "allow" | "deny";

// Per-session override
entry.sendPolicy = "allow" | "deny"

// Global rules based on:
// - channel (whatsapp, telegram, discord, etc.)
// - chatType (group, channel, direct)
// - keyPrefix (session key pattern matching)

// Example config:
session.sendPolicy = {
  rules: [
    { match: { channel: "telegram", chatType: "group" }, action: "deny" },
    { match: { keyPrefix: "work:" }, action: "allow" }
  ],
  default: "allow"
}
```

**PAM application:** Could use this pattern to control which channels PAM responds in (e.g., only respond to direct messages in WhatsApp groups, not every message).

### Model Override System

Per-session AI model switching:

```typescript
interface ModelOverrideSelection {
  provider: string;   // "anthropic", "openai", etc.
  model: string;      // "claude-sonnet-4-5", "gpt-4", etc.
  isDefault?: boolean;
}

// Stored in session entry:
entry.providerOverride = "anthropic";
entry.modelOverride = "claude-sonnet-4-5";
entry.authProfileOverride = "work-account";  // Different API keys
```

**PAM application:** Allow users to switch between Claude and GPT mid-conversation, or use different API keys for different contexts (personal vs. family account).

### AGENTS.md: Operating Instructions Pattern

Their 17KB AGENTS.md serves as the AI's "operating manual". Key sections:

| Section | Purpose | PAM Equivalent |
|---------|---------|----------------|
| **Project Structure** | Where code lives | PAM architecture docs |
| **Build/Test Commands** | How to run things | Development guide |
| **Coding Style** | Conventions | Style guide |
| **Commit Guidelines** | Git workflow | PR process |
| **Multi-agent Safety** | Coordination rules | Device + cloud sync |
| **Security** | Guardrails | Privacy policies |

**Multi-agent safety rules** (relevant for PAM device + web app):
- Don't create/apply git stash entries (other agents may be working)
- When user says "push", pull --rebase to integrate changes
- Focus on your changes only, don't touch unrecognized files
- Each agent should have its own session

### Memory Architecture

From exploring `src/memory/`:

```
src/memory/
├── embeddings/           # Vector embeddings for semantic search
│   ├── gemini.ts        # Gemini embedding provider
│   └── openai.ts        # OpenAI embedding provider
├── manager.ts           # Central memory management (~2000 lines)
├── sync.ts             # Cross-device sync
└── vector-store.ts     # SQLite vector storage
```

**Key features:**
- Embeddings stored locally in SQLite
- Supports multiple embedding providers (Gemini, OpenAI)
- Sync across devices
- Session files as JSONL for portability

**PAM application:** Currently we store conversations in Supabase. Could add:
- Local embedding cache for faster semantic search
- Offline conversation access
- Cross-device sync for PAM hardware device

---

## Implementation Patterns to Adopt

### Pattern 1: Markdown-Based Configuration

**Instead of:**
```python
# enhanced_pam_prompt.py (400+ lines of Python strings)
SYSTEM_PROMPT = """You are PAM, a friendly assistant..."""
```

**Use:**
```
backend/app/services/pam/prompts/
├── SOUL.md              # Personality, tone, boundaries
├── TOOLS.md             # When to use each tool
├── CONTEXT.md           # How to use user context
└── templates/
    ├── USER.md          # Per-user data template
    └── TRIP.md          # Active trip context template
```

**Benefits:**
- Non-engineers can edit personality
- Version control shows prompt evolution
- Hot-reload without code deploy
- A/B test different personalities

### Pattern 2: Skill Definition Standard

For PAM's 47 tools, create skill documentation:

```markdown
---
name: trip-planning
description: Plan RV trips with route optimization, weather, and campsites
triggers: ["plan a trip", "route to", "drive from X to Y", "road trip"]
tools: [plan_trip, find_campsites, get_weather_forecast, optimize_route]
---

# Trip Planning Skill

## When to Use
- User mentions planning a trip or journey
- User asks about routes between locations
- User wants to find campsites or caravan parks

## Workflow
1. Get origin and destination (use user's location if not specified)
2. Check weather along route
3. Suggest campsites based on preferences
4. Optimize route for fuel/time/scenery

## Guardrails
- Always confirm dates before booking
- Check vehicle dimensions against campsite requirements
- Warn about road closures or seasonal access
```

### Pattern 3: Session Isolation for Contexts

```
PAM Sessions:
├── trip:sydney-melbourne     # Active trip context
├── budget:monthly            # Budget tracking context
├── social:default            # Social feed interactions
└── device:kitchen-pi         # PAM hardware device
```

Each session can have:
- Different verbosity levels
- Different model preferences
- Isolated conversation history
- Context-specific tools enabled

---

## Concrete Action Items

### Phase 1: Bootstrap Files (1-2 days)

1. Create `backend/app/services/pam/prompts/` directory
2. Split `enhanced_pam_prompt.py` into:
   - `SOUL.md` - Personality and tone
   - `TOOLS.md` - Tool usage guidance
   - `CONTEXT.md` - Context awareness rules
3. Create loader that assembles prompt from markdown files
4. Test with existing PAM interactions

### Phase 2: Skill Documentation (2-3 days)

1. Create `backend/app/services/pam/skills/` directory
2. Write SKILL.md for each tool category:
   - `trip-planning.md`
   - `budget-tracking.md`
   - `social-features.md`
   - `calendar-management.md`
3. Update prompt loader to inject relevant skills

### Phase 3: WhatsApp Channel (1 week)

1. Set up WhatsApp Business API or Twilio
2. Create channel adapter following Clawdbot pattern:
   ```python
   class WhatsAppChannel:
       async def receive_message(self, payload) -> Message
       async def send_message(self, message: Message)
   ```
3. Route to existing PAM backend
4. Test with real WhatsApp messages

### Phase 4: PAM Device Integration (2 weeks)

1. Complete Pam-Wakeword hardware build
2. Create device channel adapter:
   ```python
   class PamDeviceChannel:
       async def receive_audio(self, audio_data) -> Message
       async def send_audio(self, text: str)  # TTS
   ```
3. Connect to PAM backend via WebSocket
4. Add offline fallback responses

---

## Resources

- [Clawdbot GitHub](https://github.com/clawdbot/clawdbot)
- [Clawdbot Docs](https://docs.clawd.bot/)
- [MacStories Review](https://www.macstories.net/stories/clawdbot-showed-me-what-the-future-of-personal-ai-assistants-looks-like/)
- [Clawdbot Architecture Deep Dive](https://collabnix.com/what-is-clawdbot-and-why-is-it-getting-popular/)

---

*Document created: January 2025*
*Last updated: January 2025 (Deep Dive)*
*Research for: Wheels & Wins PAM Enhancement*
