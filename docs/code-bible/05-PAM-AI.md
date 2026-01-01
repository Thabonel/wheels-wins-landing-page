# 05 - PAM AI Assistant System

**Purpose:** Complete reference for the PAM (Personal AI Manager) implementation.

---

## What is PAM?

**PAM = Personal AI Manager** for RV travelers

PAM is a voice-first AI assistant that:
- Saves RVers money on fuel, camping, and travel
- Controls financial tracking and trip planning via natural language
- Tracks savings to prove ROI (goal: $10/month subscription pays for itself)
- Powered by Claude Sonnet 4.5 (primary) with OpenAI GPT-5.1 fallback

**Key Principle:** ONE AI brain, clean architecture (no hybrid complexity)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      USER INTERFACE                         │
│  Voice: "Hey PAM, what's the weather?"                      │
│  Text: Type messages in chat                                │
│  React + TypeScript (Mobile & Desktop PWA)                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ WebSocket (Persistent Connection)
                        │ wss://backend/api/v1/pam/ws/{user_id}
                        │
┌───────────────────────▼─────────────────────────────────────┐
│              BACKEND (FastAPI + Python 3.11)                │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │     PersonalizedPamAgent (ACTIVE ORCHESTRATOR)     │    │
│  │  Location: backend/app/core/personalized_pam...    │    │
│  │  • Loads user profile with RLS authentication      │    │
│  │  • Manages user context and conversation history   │    │
│  │  • Injects location into system prompt             │    │
│  │  • Calls AI providers with tool definitions        │    │
│  └─────────────────┬──────────────────────────────────┘    │
│                    │                                        │
│        ┌───────────┴──────────┐                            │
│        │                      │                             │
│  ┌─────▼──────┐      ┌───────▼────────┐                   │
│  │AI PROVIDER │      │CONTEXT ENGINE  │                   │
│  │Claude 4.5  │      │• User location │                   │
│  │(primary)   │      │• Financial data│                   │
│  │OpenAI 5.1  │      │• Vehicle info  │                   │
│  │(fallback)  │      │• Travel prefs  │                   │
│  └─────┬──────┘      └────────────────┘                   │
│        │                                                    │
│  ┌─────▼──────┐                                            │
│  │TOOL REGISTRY│                                            │
│  │45+ tools    │                                            │
│  └─────┬──────┘                                            │
│        │                                                    │
└────────┼───────────────────────────────────────────────────┘
         │
         │ Executes tools
         ▼
┌────────────────────────────────────────────────────────────┐
│                    TOOL CATEGORIES                          │
│  Budget (10)  │  Trip (10)  │  Social (10)  │  Shop (5)   │
│  Profile (5)  │  Calendar (3) │  Admin (2)  │             │
└────────────────────────────────────────────────────────────┘
```

---

## AI Provider Configuration

### Primary: Claude Sonnet 4.5

```python
# backend/app/services/ai/anthropic_provider.py

MODEL_REGISTRY = {
    "claude-sonnet-4-5-20250929": {
        "name": "Claude Sonnet 4.5",
        "provider": "anthropic",
        "cost_per_1m_input": 3.0,
        "cost_per_1m_output": 15.0,
        "max_tokens": 200000,
        "supports_tools": True,
        "supports_streaming": True,
    }
}
```

| Property | Value |
|----------|-------|
| Model ID | `claude-sonnet-4-5-20250929` |
| Context Window | 200K tokens |
| Input Cost | $3.00 / 1M tokens |
| Output Cost | $15.00 / 1M tokens |
| Tool Support | Native function calling |
| Streaming | Supported |

### Fallback: OpenAI GPT-5.1

```python
# backend/app/services/ai/openai_provider.py

FALLBACK_MODEL = {
    "model_id": "gpt-5.1-instant",
    "cost_per_1m_input": 1.25,
    "cost_per_1m_output": 10.0,
    "max_tokens": 128000,
}
```

### Model Validation

```python
def _validate_anthropic_model(self, model: str) -> str:
    """Ensure only Anthropic models are sent to Anthropic API"""
    if model.startswith("gpt-") or model.startswith("o1-"):
        logger.warning(f"OpenAI model {model} sent to Anthropic, using default")
        return "claude-sonnet-4-5-20250929"
    return model
```

---

## PersonalizedPamAgent

The unified PAM agent that handles all AI interactions.

### Location

```
backend/app/core/personalized_pam_agent.py
```

### Core Responsibilities

1. **Profile Loading** - Fetches user profile with vehicle info
2. **Context Engineering** - Builds rich context from user data
3. **Prompt Generation** - Creates personalized system prompts
4. **Tool Execution** - Handles Claude function calling
5. **Memory Management** - Integrates 4-tier memory system

### Initialization

```python
@dataclass
class PersonalizedPamAgent:
    """Unified PAM agent - single point of AI interaction"""

    user_id: str
    session_id: str
    profile: Optional[Dict[str, Any]] = None
    conversation_history: List[Dict[str, Any]] = field(default_factory=list)
    context_engine: Optional[ContextEngine] = None
    domain_memory: Optional[DomainMemoryRouter] = None
    user_location: Optional[Dict[str, Any]] = None

    def __post_init__(self):
        self.ai_provider = get_ai_provider("anthropic")
        self.tool_registry = get_tool_registry()
```

### Context Engineering (4-Tier Memory)

```python
CONTEXT_TIERS = {
    "working_context": {
        "purpose": "Immediate conversation context",
        "ttl": "session",
        "storage": "in-memory"
    },
    "session_logs": {
        "purpose": "Recent interaction history",
        "ttl": "24 hours",
        "storage": "Redis"
    },
    "durable_memory": {
        "purpose": "User preferences and patterns",
        "ttl": "permanent",
        "storage": "Supabase"
    },
    "artifacts": {
        "purpose": "Generated content (reports, plans)",
        "ttl": "permanent",
        "storage": "Supabase Storage"
    }
}
```

### System Prompt Generation

```python
async def _build_system_prompt(self) -> str:
    """Build personalized system prompt with user context"""

    base_prompt = """You are PAM (Personal AI Manager), the AI travel
    companion for Wheels & Wins RV travelers.

    Your Core Identity:
    - Friendly travel partner (not servant, not boss - an equal)
    - Help RVers save money, plan trips, manage budgets
    - Take ACTION - don't just answer, DO things

    Your Personality:
    - Friendly, not cutesy: "I've got you" not "OMG yay!"
    - Confident, not arrogant
    - Brief by default: 1-2 sentences
    """

    # Add user-specific context
    if self.profile:
        base_prompt += self._build_profile_context()

    # Add vehicle context
    if vehicle_info := self.profile.get("vehicle_info"):
        base_prompt += self._build_vehicle_context(vehicle_info)

    # Add location context
    if self.user_location:
        base_prompt += self._build_location_context()

    return base_prompt
```

### Message Processing Flow

```python
async def process_message(
    self,
    message: str,
    context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Process user message through PAM"""

    # 1. Load/refresh user context
    await self._ensure_context_loaded()

    # 2. Check for complex request patterns
    if self._is_complex_request(message):
        return await self._handle_complex_request(message, context)

    # 3. Build messages for Claude
    messages = self._build_messages(message)

    # 4. Get available tools
    tools = await self.tool_registry.get_tools_for_context(context)

    # 5. Call AI provider
    response = await self.ai_provider.complete(
        messages=messages,
        system=await self._build_system_prompt(),
        tools=tools,
        temperature=0.7,
        max_tokens=4096
    )

    # 6. Handle tool calls if present
    if response.tool_calls:
        response = await self._execute_tool_loop(response)

    # 7. Update conversation history
    self._add_to_history("assistant", response.content)

    return {
        "response": response.content,
        "tool_results": response.tool_results,
        "metadata": {"model": response.model, "tokens": response.usage}
    }
```

---

## Tool Registry

### Location

```
backend/app/services/pam/tools/tool_registry.py
```

### Tool Categories

| Category | Count | Description |
|----------|-------|-------------|
| Budget | 10 | Financial management tools |
| Trip | 10 | Travel planning tools |
| Social | 10 | Community interaction tools |
| Shop | 5 | Product search tools |
| Profile | 5 | User management tools |
| Calendar | 3 | Event management tools |
| Admin | 2 | Knowledge management tools |

### Budget Tools (10)

```python
BUDGET_TOOLS = [
    "create_expense",        # Add expense to tracker
    "analyze_budget",        # Budget analysis and insights
    "track_savings",         # Log money saved
    "update_budget",         # Modify budget categories
    "get_spending_summary",  # Spending breakdown
    "compare_vs_budget",     # Actual vs planned
    "predict_end_of_month",  # Forecast spending
    "find_savings_opportunities",  # AI suggestions
    "categorize_transaction",      # Auto-categorize
    "export_budget_report",        # Generate reports
]
```

### Trip Tools (10)

```python
TRIP_TOOLS = [
    "plan_trip",             # Multi-stop route planning
    "find_rv_parks",         # Search campgrounds
    "get_weather_forecast",  # Weather along route
    "calculate_gas_cost",    # Estimate fuel expenses
    "find_cheap_gas",        # Cheapest gas stations
    "optimize_route",        # Minimize cost and time
    "get_road_conditions",   # Check road status
    "find_attractions",      # Points of interest
    "estimate_travel_time",  # Calculate duration
    "save_favorite_spot",    # Bookmark locations
]
```

### Tool Definition Format

```python
{
    "name": "create_expense",
    "description": "Add a new expense to the user's financial tracker",
    "input_schema": {
        "type": "object",
        "properties": {
            "amount": {
                "type": "number",
                "description": "Expense amount in dollars"
            },
            "category": {
                "type": "string",
                "description": "Expense category",
                "enum": ["fuel", "food", "camping", "maintenance", "other"]
            },
            "description": {
                "type": "string",
                "description": "Brief description of the expense"
            },
            "date": {
                "type": "string",
                "description": "Date of expense (ISO format)"
            }
        },
        "required": ["amount", "category"]
    }
}
```

### Tool Execution

```python
async def execute_tool(
    self,
    tool_name: str,
    args: Dict[str, Any],
    user_id: str
) -> Dict[str, Any]:
    """Execute a registered tool"""

    if tool_name not in self.tools:
        return {"error": f"Unknown tool: {tool_name}"}

    try:
        # All tools receive user_id for authorization
        result = await self.tools[tool_name](user_id=user_id, **args)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Tool execution failed: {tool_name}", error=str(e))
        return {"error": str(e)}
```

---

## Voice Integration

### Wake Word Detection

```typescript
// Frontend: src/services/voiceService.ts

class VoiceService {
    private recognition: SpeechRecognition;
    private wakeWord = "hey pam";

    startListening() {
        this.recognition = new webkitSpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.toLowerCase();
            if (transcript.includes(this.wakeWord)) {
                this.onWakeWordDetected();
            }
        };
    }
}
```

### Speech-to-Text (Backend)

```python
# backend/app/services/voice/whisper.py

async def transcribe_audio(audio_data: bytes) -> str:
    """Convert audio to text using OpenAI Whisper"""

    response = await openai_client.audio.transcriptions.create(
        model="whisper-1",
        file=audio_data,
        response_format="text"
    )
    return response
```

### Text-to-Speech (Backend)

```python
# backend/app/services/voice/tts.py

async def speak_response(text: str) -> bytes:
    """Convert PAM response to speech using Edge TTS"""

    communicate = edge_tts.Communicate(
        text=text,
        voice="en-US-AriaNeural"  # Friendly, natural voice
    )

    audio_data = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data += chunk["data"]

    return audio_data
```

---

## WebSocket Communication

### Connection Flow

```
1. User opens PAM chat
2. Frontend creates WebSocket: wss://backend/api/v1/pam/ws/{user_id}?token={jwt}
3. Backend validates JWT and accepts connection
4. Heartbeat ping/pong every 20-30 seconds
5. Messages flow bidirectionally
6. Auto-reconnect on disconnect (up to 5 attempts)
```

### Message Format

```typescript
// Frontend to Backend
interface PamRequest {
    type: "chat_message" | "voice_input";
    message: string;
    context: {
        current_page: string;
        userLocation?: LocationData;
        input_mode: "text" | "voice";
    };
}

// Backend to Frontend
interface PamResponse {
    type: "chat_message" | "tool_result" | "error";
    response: string;
    metadata?: {
        tool_used?: string;
        processing_time_ms?: number;
    };
}
```

### WebSocket Endpoint

```python
# backend/app/api/v1/pam_main.py

@router.websocket("/ws/{user_id}")
async def pam_websocket(
    websocket: WebSocket,
    user_id: str,
    token: str = Query(...)
):
    # Validate JWT
    try:
        user = await verify_token(token)
        if user["sub"] != user_id:
            await websocket.close(code=4003)
            return
    except Exception:
        await websocket.close(code=4001)
        return

    await websocket.accept()

    # Create PAM agent for this user
    agent = PersonalizedPamAgent(
        user_id=user_id,
        session_id=str(uuid.uuid4())
    )

    try:
        while True:
            data = await websocket.receive_json()

            # Process message
            response = await agent.process_message(
                message=data["message"],
                context=data.get("context", {})
            )

            await websocket.send_json({
                "type": "chat_message",
                "response": response["response"],
                "metadata": response.get("metadata")
            })

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {user_id}")
```

---

## Location Awareness

### Location Flow

```
Browser Geolocation API
        ↓
src/utils/pamLocationContext.ts
        ↓
Frontend sends: { userLocation: { lat, lng, city, ... } }
        ↓
pam_main.py maps: userLocation → user_location
        ↓
PersonalizedPamAgent receives user_location
        ↓
Injects into system prompt + AI messages
        ↓
Claude sees location context automatically
```

### Location Context Format

```python
user_location = {
    "lat": -33.8688,        # MUST be 'lat' not 'latitude'
    "lng": 151.2093,        # MUST be 'lng' not 'longitude'
    "city": "Sydney",
    "region": "NSW",
    "country": "Australia",
    "timezone": "Australia/Sydney",
    "source": "gps"         # gps, ip, browser, cached
}
```

### System Prompt Injection

```python
def _build_location_context(self) -> str:
    """Add location to system prompt"""

    loc = self.user_location
    return f"""

    USER LOCATION CONTEXT:
    - Current location: {loc.get('city')}, {loc.get('region')}, {loc.get('country')}
    - Coordinates: {loc.get('lat')}, {loc.get('lng')}
    - IMPORTANT: When user asks about weather, gas prices, or nearby places,
      use this location automatically. Do NOT ask "where are you?" if
      location is already known.
    """
```

---

## Security (7 Layers)

### 1. Authentication
- JWT validation with Supabase
- Token refresh mechanism
- Session management

### 2. Input Validation
- Message size limits (max 10,000 characters)
- Character sanitization
- Rate limiting per user

### 3. Prompt Injection Defense
```python
INJECTION_PATTERNS = [
    r"ignore previous instructions",
    r"disregard all prior",
    r"you are now",
    r"pretend you are",
    r"act as if",
]

def detect_injection(message: str) -> bool:
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, message, re.IGNORECASE):
            return True
    return False
```

### 4. Tool Authorization
- Every tool checks `user_id`
- Admin tools require admin role
- RLS on all database queries

### 5. Output Filtering
- API keys never in responses
- PII redaction
- Secrets scanning

### 6. Rate Limiting
- Per-user request limits
- WebSocket message throttling
- Exponential backoff on abuse

### 7. Audit Logging
- All tool calls logged
- Immutable security trail
- Error tracking via Sentry

---

## Error Handling

### Graceful Degradation

```python
async def process_with_fallback(self, message: str) -> Dict[str, Any]:
    """Try Claude, fall back to OpenAI if needed"""

    try:
        return await self._call_claude(message)
    except AnthropicAPIError as e:
        logger.warning(f"Claude API error: {e}, falling back to OpenAI")
        return await self._call_openai(message)
    except Exception as e:
        logger.error(f"All AI providers failed: {e}")
        return {
            "response": "I'm having trouble right now. Please try again.",
            "error": True
        }
```

### Circuit Breaker Pattern

```python
class AICircuitBreaker:
    def __init__(self, failure_threshold: int = 5, reset_timeout: int = 60):
        self.failures = 0
        self.threshold = failure_threshold
        self.reset_timeout = reset_timeout
        self.last_failure_time = None
        self.state = "closed"  # closed, open, half-open

    async def call(self, func, *args, **kwargs):
        if self.state == "open":
            if self._should_reset():
                self.state = "half-open"
            else:
                raise CircuitOpenError("Circuit breaker is open")

        try:
            result = await func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise
```

---

## Performance Optimization

### Response Caching

```python
# Cache frequently used data
CACHE_TTL = {
    "user_profile": 300,      # 5 minutes
    "financial_context": 60,   # 1 minute
    "tool_definitions": 3600,  # 1 hour
}

async def get_cached_profile(user_id: str) -> Optional[Dict]:
    cache_key = f"pam:profile:{user_id}"
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)
    return None
```

### Conversation Pruning

```python
MAX_HISTORY_MESSAGES = 20

def _prune_history(self):
    """Keep only last N messages to manage token usage"""
    if len(self.conversation_history) > MAX_HISTORY_MESSAGES:
        self.conversation_history = self.conversation_history[-MAX_HISTORY_MESSAGES:]
```

### Tool Prefiltering

```python
async def get_tools_for_context(self, context: Dict) -> List[Dict]:
    """Only return relevant tools based on context"""

    page = context.get("current_page", "")

    if page == "wins":
        return self._get_budget_tools()
    elif page == "wheels":
        return self._get_trip_tools()
    elif page == "social":
        return self._get_social_tools()
    else:
        # Return subset of most common tools
        return self._get_common_tools()
```

---

## Testing PAM

### Unit Tests

```python
# backend/tests/test_pam_agent.py

@pytest.mark.asyncio
async def test_pam_processes_budget_request():
    agent = PersonalizedPamAgent(
        user_id="test-user",
        session_id="test-session"
    )

    response = await agent.process_message(
        message="Add $50 gas expense",
        context={"current_page": "wins"}
    )

    assert response["response"] is not None
    assert "expense" in response["response"].lower()
```

### Integration Tests

```python
@pytest.mark.asyncio
async def test_tool_execution():
    result = await tool_registry.execute_tool(
        tool_name="create_expense",
        args={"amount": 50.0, "category": "fuel"},
        user_id="test-user"
    )

    assert result["success"] == True
    assert "data" in result
```

### WebSocket Tests

```python
@pytest.mark.asyncio
async def test_websocket_connection():
    async with websockets.connect(
        f"ws://localhost:8000/api/v1/pam/ws/test-user?token={test_token}"
    ) as ws:
        await ws.send(json.dumps({
            "type": "chat_message",
            "message": "Hello PAM"
        }))

        response = await ws.recv()
        data = json.loads(response)

        assert data["type"] == "chat_message"
        assert data["response"] is not None
```

---

## Monitoring

### Health Checks

```python
@router.get("/health/pam")
async def pam_health():
    """Check PAM-specific health"""

    checks = {
        "anthropic_api": await check_anthropic(),
        "tool_registry": await check_tool_registry(),
        "context_engine": await check_context_engine(),
    }

    all_healthy = all(c["status"] == "healthy" for c in checks.values())

    return {
        "status": "healthy" if all_healthy else "degraded",
        "checks": checks
    }
```

### Metrics

```python
# Prometheus metrics
PAM_REQUESTS = Counter("pam_requests_total", "Total PAM requests")
PAM_LATENCY = Histogram("pam_latency_seconds", "PAM response latency")
PAM_ERRORS = Counter("pam_errors_total", "Total PAM errors")
TOOL_CALLS = Counter("pam_tool_calls_total", "Tool calls by name", ["tool_name"])
```

---

## Quick Reference

### Key Files

| File | Purpose |
|------|---------|
| `backend/app/core/personalized_pam_agent.py` | Main PAM orchestrator |
| `backend/app/services/ai/anthropic_provider.py` | Claude API provider |
| `backend/app/services/ai/openai_provider.py` | OpenAI fallback provider |
| `backend/app/services/pam/tools/tool_registry.py` | Tool definitions |
| `backend/app/api/v1/pam_main.py` | WebSocket endpoint |
| `src/services/pamService.ts` | Frontend WebSocket client |
| `src/utils/pamLocationContext.ts` | Location gathering |

### Environment Variables

```bash
ANTHROPIC_API_KEY=sk-ant-xxx     # Required
OPENAI_API_KEY=sk-xxx            # Fallback
REDIS_URL=redis://...            # Caching
```

### Common Commands

```bash
# Test PAM endpoint
curl -X POST http://localhost:8000/api/v1/pam/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "What is my fuel budget?"}'

# Check PAM health
curl http://localhost:8000/api/health/pam
```
