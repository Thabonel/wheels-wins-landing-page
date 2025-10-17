# PAM Backend Context Reference - THE SOURCE OF TRUTH

**Last Updated:** January 17, 2025
**Purpose:** Single source of truth for ALL context fields the PAM backend expects
**Rule:** READ THIS before sending ANY context data to PAM backend

---

## ⚠️ CRITICAL RULES

1. **Field names are SNAKE_CASE, not camelCase** (use `user_location` NOT `userLocation`)
2. **Always use `.get()` when reading context fields** (never assume they exist)
3. **Location field is `user_location` NOT `location`** (most common bug)
4. **When in doubt, check this document** (not memory, not assumptions)

---

## Quick Reference: Top 10 Most Used Fields

| Frontend Sends | Backend Expects | Type | Required? |
|----------------|-----------------|------|-----------|
| `userLocation` | `user_location` | Object | No |
| `user_id` | `user_id` | String (UUID) | Yes |
| `current_page` | `current_page` | String | No |
| `environment` | `environment` | String | No |
| `session_id` | `session_id` | String (UUID) | No |
| `vehicleInfo` | `vehicle_info` | Object | No |
| `travelStyle` | `travel_style` | String | No |
| `input_mode` | `input_mode` | String | No |
| `language` | `language` | String | No |
| `timestamp` | `timestamp` | Number | No |

---

## Section 1: User Identity & Session

### `user_id` (REQUIRED)
**Type:** String (UUID)
**Where Checked:**
- `backend/app/api/v1/pam_main.py` (line 1114, 1733)
- `backend/app/services/pam/context_manager.py` (line 67, 142, 172, 196)
- `backend/app/services/pam/intelligent_conversation.py` (line 199)

**Example:**
```python
user_id = context.get("user_id")  # Returns UUID string or None
```

**Valid Value:**
```json
{
  "user_id": "123e4567-e89b-12d3-a456-426614174000"
}
```

---

### `session_id`
**Type:** String (UUID)
**Where Checked:**
- `backend/app/api/v1/pam_main.py` (line 903, 2086)
- `backend/app/services/pam/context_manager.py` (line 68, 197)
- `backend/app/services/pam/claude_conversation_adapter.py` (line 125)

**Example:**
```python
session_id = context.get("session_id", str(uuid.uuid4()))
```

**Valid Value:**
```json
{
  "session_id": "987fcdeb-51a2-43f7-8e9c-123456789abc"
}
```

---

### `connection_type`
**Type:** String
**Where Set:**
- `backend/app/api/v1/pam_main.py` (line 1115, 1734)

**Example:**
```python
context["connection_type"] = "websocket"  # or "websocket_streaming"
```

**Valid Values:**
- `"websocket"`
- `"websocket_streaming"`
- `"http"`

---

## Section 2: Location Context (MOST PROBLEMATIC)

### `user_location` ⚠️ CRITICAL
**Type:** Object with lat/lng/city/region
**Where Checked:**
- `backend/app/services/pam/tools/openmeteo_weather_tool.py` (line 88)
- `backend/app/services/pam/enhanced_orchestrator.py` (line 1247)
- `backend/app/services/pam/agentic_orchestrator.py` (line 139)
- `backend/app/services/pam/claude_conversation_adapter.py` (line 127)
- `backend/app/services/pam/profile_router.py` (line 326)
- `backend/app/api/v1/pam_main.py` (line 1266, 1267, 2096, 2196)

**CRITICAL MAPPING:**
Frontend sends `userLocation` (camelCase) but backend expects `user_location` (snake_case).

**Mapping Code (pam_main.py lines 1276-1278, 1737-1739):**
```python
# Frontend sends 'userLocation' but backend expects 'user_location'
if context.get("userLocation"):
    context["user_location"] = context["userLocation"]
    logger.info(f"User location received: {context['user_location']}")
```

**Valid Structure:**
```json
{
  "user_location": {
    "latitude": -33.8688,
    "longitude": 151.2093,
    "city": "Sydney",
    "region": "NSW",
    "country": "Australia",
    "timezone": "Australia/Sydney",
    "accuracy": 50,
    "timestamp": 1705500000000,
    "source": "gps"
  }
}
```

**Weather Tool Usage (openmeteo_weather_tool.py lines 88-98):**
```python
# Auto-inject user location from context if not provided
if not location and context and context.get("user_location"):
    user_loc = context["user_location"]
    if isinstance(user_loc, dict):
        # Use city, region if available
        if user_loc.get("city") and user_loc.get("region"):
            location = f"{user_loc['city']}, {user_loc['region']}"
        # Or use lat/lng
        elif user_loc.get("lat") and user_loc.get("lng"):
            location = f"{user_loc['lat']},{user_loc['lng']}"
```

---

### ❌ WRONG: `location` field
**DO NOT USE:** Some backend files incorrectly check for `location` instead of `user_location`.

**Files with WRONG field name:**
- `backend/app/services/pam/context_manager.py` (line 72, 175, 204, 214, 219, 227)
- `backend/app/services/pam/agentic_orchestrator.py` (line 139 - checks both)
- `backend/app/services/pam/unified_orchestrator.py` (line 167 - checks both)

**Fallback Pattern (checks both):**
```python
# Some files check both fields (inconsistent!)
user_location = context.get('user_location') or context.get('location')
```

**⚠️ ALWAYS USE `user_location` - Do NOT rely on `location` fallback**

---

## Section 3: User Profile Context

### `user_profile`
**Type:** Object with profile data
**Where Checked:**
- `backend/app/api/v1/pam_main.py` (lines 1180, 1192, 1779, 3708)
- `backend/app/services/pam/context_engineering/enhanced_context_engine.py` (line 99)

**Example:**
```python
user_profile = context.get("user_profile", {})
```

**Valid Structure:**
```json
{
  "user_profile": {
    "id": "user-uuid",
    "full_name": "John Doe",
    "email": "john@example.com",
    "nickname": "Johnny",
    "partner_name": "Jane",
    "region": "Australia",
    "vehicle_info": { ... },
    "travel_preferences": { ... }
  }
}
```

---

### `vehicle_info`
**Type:** Object with vehicle details
**Where Checked:**
- `backend/app/api/v1/pam_main.py` (lines 901, 1181, 1193, 1270, 1780, 3709)
- `backend/app/services/pam/enhanced_orchestrator.py` (line 1269)
- `backend/app/services/pam/context_manager.py` (line 82, 179, 203, 225)

**Example:**
```python
vehicle_info = context.get("vehicle_info", {})
is_rv = vehicle_info.get("is_rv", False)
```

**Valid Structure:**
```json
{
  "vehicle_info": {
    "is_rv": true,
    "type": "Class A Motorhome",
    "make_model": "Unimog U1700",
    "year": 2020,
    "length_ft": 30,
    "weight_lbs": 15000,
    "fuel_type": "diesel",
    "mpg": 12.5,
    "towing": "flatbed trailer"
  }
}
```

---

### `travel_preferences`
**Type:** Object with travel preferences
**Where Checked:**
- `backend/app/api/v1/pam_main.py` (lines 1182, 1194, 1781)
- `backend/app/services/pam/context_manager.py` (line 95, 220, 226)

**Example:**
```python
travel_prefs = context.get("travel_preferences", {})
```

**Valid Structure:**
```json
{
  "travel_preferences": {
    "max_driving_hours": 6,
    "camp_types": ["boondocking", "rv_parks"],
    "accessibility": "wheelchair_accessible",
    "pets": "2 dogs",
    "travel_style": "slow_travel"
  }
}
```

---

### `is_rv_traveler`
**Type:** Boolean
**Where Checked:**
- `backend/app/api/v1/pam_main.py` (lines 1183, 1195, 1782, 3687, 3710, 3788)

**Example:**
```python
is_rv = context.get("is_rv_traveler", False)
```

**Valid Value:**
```json
{
  "is_rv_traveler": true
}
```

---

## Section 4: Financial Context

### `financial_context`
**Type:** Object with financial data
**Where Set:**
- `backend/app/api/v1/pam_main.py` (lines 1130, 1154, 1748)

**Example:**
```python
financial_ctx = context.get("financial_context", {})
```

**Valid Structure:**
```json
{
  "financial_context": {
    "expenses": {
      "total_amount": 1250.50,
      "categories": {
        "fuel": 450.00,
        "food": 300.00,
        "camping": 500.50
      }
    },
    "budgets": {
      "monthly": 3000.00,
      "remaining": 1749.50
    }
  }
}
```

---

### `budget_constraints`
**Type:** Object with budget limits
**Where Checked:**
- `backend/app/services/pam/context_manager.py` (line 106, 183, 206, 213)

**Example:**
```python
budget = context.get("budget_constraints", {})
fuel_budget = budget.get("fuel_budget")
```

**Valid Structure:**
```json
{
  "budget_constraints": {
    "fuel_budget": 500.00,
    "daily_budget": 100.00,
    "monthly_budget": 3000.00
  }
}
```

---

## Section 5: Social Context

### `social_context`
**Type:** Object with social data
**Where Set:**
- `backend/app/api/v1/pam_main.py` (lines 1227, 1239, 1802)

**Example:**
```python
social_ctx = context.get("social_context", {})
```

**Valid Structure:**
```json
{
  "social_context": {
    "friends": {
      "count": 12,
      "list": [...]
    },
    "friend_locations": {
      "count": 3,
      "nearby": [...]
    },
    "nearby_events": {
      "count": 5,
      "events": [...]
    },
    "friend_travel_activity": {
      "recent_trips": [...]
    }
  }
}
```

---

### `friends_nearby`
**Type:** Object
**Where Set:**
- `backend/app/api/v1/pam_main.py` (lines 1228, 1240, 1803)

**Example:**
```python
friends_nearby = context.get("friends_nearby", {})
```

---

### `upcoming_events`
**Type:** Object
**Where Set:**
- `backend/app/api/v1/pam_main.py` (lines 1229, 1241, 1804)

**Example:**
```python
events = context.get("upcoming_events", {})
```

---

## Section 6: Navigation & Page Context

### `current_page`
**Type:** String
**Where Checked:**
- `backend/app/services/pam/context_manager.py` (line 69, 187)
- `backend/app/services/pam/intent_handlers.py` (line 405)
- `backend/app/services/pam/intelligent_conversation.py` (line 734)
- `backend/app/services/pam/claude_conversation_adapter.py` (line 128)
- `backend/app/services/pam/enhanced_orchestrator.py` (line 704)

**Example:**
```python
current_page = context.get("current_page", "")
```

**Valid Values:**
- `"pam_chat"`
- `"wheels"`
- `"wins"`
- `"social"`
- `"shop"`
- `"you"`
- `"home"`

---

### `viewing_expenses`
**Type:** Boolean
**Where Checked:**
- `backend/app/services/pam/profile_router.py` (line 331)

**Example:**
```python
if context.get("viewing_expenses"):
    # User is looking at expenses page
```

---

### `planning_trip`
**Type:** Boolean
**Where Checked:**
- `backend/app/services/pam/profile_router.py` (line 336)

**Example:**
```python
if context.get("planning_trip"):
    # User is planning a trip
```

---

### `in_financial_section`
**Type:** Boolean
**Where Checked:**
- `backend/app/services/pam/profile_router.py` (line 331)

---

## Section 7: Input & Language

### `input_mode`
**Type:** String
**Where Checked:**
- `backend/app/services/pam/profile_router.py` (line 322)
- `backend/app/services/pam/usecase_profiles.py` (line 518)

**Example:**
```python
if context.get("input_mode") == "voice":
    # Handle voice input differently
```

**Valid Values:**
- `"voice"`
- `"text"`
- `"keyboard"`

---

### `input_type`
**Type:** String
**Where Checked:**
- `backend/app/services/pam/enhanced_orchestrator.py` (line 1292)

**Example:**
```python
conversation_mode = context.get("input_type", "text")
```

---

### `language`
**Type:** String (ISO 639-1 language code)
**Where Checked:**
- `backend/app/api/v1/pam_main.py` (line 1424)

**Example:**
```python
user_language = context.get("language", "en")
```

**Valid Values:**
- `"en"` (English)
- `"es"` (Spanish)
- `"fr"` (French)
- `"de"` (German)
- etc.

---

## Section 8: Environment & Timestamps

### `environment`
**Type:** String
**Where Checked:**
- `backend/app/services/pam/simple_gemini_service.py` (line 307)
- `backend/app/services/pam/simple_openai_service.py` (line 284)

**Example:**
```python
env = context.get("environment", "production")
```

**Valid Values:**
- `"staging"`
- `"production"`
- `"development"`

---

### `timestamp`
**Type:** Number (Unix timestamp in milliseconds)
**Where Checked:**
- `backend/app/services/pam/context_manager.py` (line 198)

**Example:**
```python
timestamp = context.get("timestamp")
```

**Valid Value:**
```json
{
  "timestamp": 1705500000000
}
```

---

### `server_timestamp`
**Type:** String (ISO 8601 format)
**Where Set:**
- `backend/app/api/v1/pam_main.py` (line 1281, 1742)

**Example:**
```python
context["server_timestamp"] = datetime.utcnow().isoformat()
```

**Valid Value:**
```json
{
  "server_timestamp": "2025-01-17T10:30:00.000000"
}
```

---

### `user_timezone_note`
**Type:** String
**Where Set:**
- `backend/app/api/v1/pam_main.py` (line 1285)

---

## Section 9: Conversation & Memory

### `conversation_history`
**Type:** Array of message objects
**Where Checked:**
- `backend/app/services/pam/intelligent_conversation.py` (line 336, 616, 1075, 1078)
- `backend/app/services/pam/enhanced_orchestrator.py` (line 1271)
- `backend/app/services/pam/context_manager.py` (line 117)
- `backend/app/services/pam/claude_conversation_adapter.py` (line 129)
- `backend/app/services/pam/agentic_orchestrator.py` (line 152)
- `backend/app/api/v1/pam_main.py` (line 1964)

**Example:**
```python
history = context.get("conversation_history", [])
```

**Valid Structure:**
```json
{
  "conversation_history": [
    {
      "role": "user",
      "content": "What's the weather like?",
      "timestamp": 1705500000000
    },
    {
      "role": "assistant",
      "content": "It's 72°F and sunny in Sydney.",
      "timestamp": 1705500001000
    }
  ]
}
```

---

### `preferences`
**Type:** Object
**Where Checked:**
- `backend/app/services/pam/intelligent_conversation.py` (line 1078)

---

## Section 10: RAG (Retrieval Augmented Generation)

### `rag_enabled`
**Type:** Boolean
**Where Checked:**
- `backend/app/services/pam/rag_integration_mixin.py` (line 337)
- `backend/app/services/pam/unified_orchestrator.py` (line 282)

**Example:**
```python
if context.get("rag_enabled"):
    # Use RAG for enhanced context
```

---

### `similar_conversations`
**Type:** Array
**Where Checked:**
- `backend/app/services/pam/rag_integration_mixin.py` (line 341)
- `backend/app/services/pam/unified_orchestrator.py` (line 287)

---

### `relevant_preferences`
**Type:** Array
**Where Checked:**
- `backend/app/services/pam/rag_integration_mixin.py` (line 342, 407)
- `backend/app/services/pam/unified_orchestrator.py` (line 288)

---

### `contextual_memories`
**Type:** Array
**Where Checked:**
- `backend/app/services/pam/rag_integration_mixin.py` (line 343)
- `backend/app/services/pam/unified_orchestrator.py` (line 289)

---

### `user_knowledge`
**Type:** Array
**Where Checked:**
- `backend/app/services/pam/rag_integration_mixin.py` (line 344)
- `backend/app/services/pam/unified_orchestrator.py` (line 290)

---

### `context_summary`
**Type:** String
**Where Checked:**
- `backend/app/services/pam/rag_integration_mixin.py` (line 345, 406)
- `backend/app/services/pam/unified_orchestrator.py` (line 291)

---

### `confidence_score`
**Type:** Number (0.0 to 1.0)
**Where Checked:**
- `backend/app/services/pam/rag_integration_mixin.py` (line 346)
- `backend/app/services/pam/unified_orchestrator.py` (line 264, 292)

---

### `retrieval_time_ms`
**Type:** Number (milliseconds)
**Where Checked:**
- `backend/app/services/pam/rag_integration_mixin.py` (line 347)

---

## Section 11: RV-Specific Context

### `rv_context`
**Type:** Object
**Where Checked:**
- `backend/app/api/v1/pam_main.py` (line 3686, 3787)

**Example:**
```python
rv_context = context.get("rv_context", {})
if rv_context.get("is_rv_traveler"):
    context["travel_mode"] = "RV"
```

---

### `travel_mode`
**Type:** String
**Where Set:**
- `backend/app/api/v1/pam_main.py` (line 3689, 3790)

**Valid Values:**
- `"RV"`
- `"car"`
- `"motorcycle"`

---

### `requires_rv_planning`
**Type:** Boolean
**Where Set:**
- `backend/app/api/v1/pam_main.py` (line 3690, 3791)

---

### `vehicle_constraints`
**Type:** Object
**Where Set:**
- `backend/app/api/v1/pam_main.py` (line 3691, 3792)

---

## Section 12: Action & Response Context

### `visual_action`
**Type:** Object
**Where Checked:**
- `backend/app/api/v1/pam_main.py` (line 1689, 2039, 2103)

**Example:**
```python
if 'visual_action' in response_context:
    visual_action = response_context['visual_action']
```

---

### `user_settings`
**Type:** Object
**Where Checked:**
- `backend/app/api/v1/pam_main.py` (line 1329, 1667)

**Example:**
```python
user_settings = context.get("user_settings", {})
```

---

## Common Mistakes & How to Avoid Them

### Mistake #1: Using `location` instead of `user_location` ❌
```python
# WRONG
location = context.get("location")  # Will return None!

# CORRECT
user_location = context.get("user_location")
```

---

### Mistake #2: Using camelCase instead of snake_case ❌
```python
# WRONG
user_id = context.get("userId")  # Will return None!

# CORRECT
user_id = context.get("user_id")
```

---

### Mistake #3: Not using `.get()` with default ❌
```python
# WRONG (crashes if field missing)
user_id = context["user_id"]

# CORRECT (returns None if missing)
user_id = context.get("user_id")

# EVEN BETTER (returns default if missing)
user_id = context.get("user_id", "anonymous")
```

---

### Mistake #4: Assuming nested fields exist ❌
```python
# WRONG (crashes if vehicle_info is None)
is_rv = context.get("vehicle_info").get("is_rv")

# CORRECT
vehicle_info = context.get("vehicle_info", {})
is_rv = vehicle_info.get("is_rv", False)
```

---

## Frontend Integration Guide

### How to Build Context Object (TypeScript)

```typescript
import { getPamLocationContext, formatLocationForPam } from '@/utils/pamLocationContext';

async function buildPamContext(userId: string): Promise<Record<string, any>> {
  // Get location context
  const locationContext = await getPamLocationContext(userId);
  const locationData = formatLocationForPam(locationContext);

  return {
    user_id: userId,
    session_id: generateUUID(),
    current_page: getCurrentPage(),
    environment: getEnvironment(),
    timestamp: Date.now(),

    // CRITICAL: Location must be in 'location' object (gets mapped to user_location)
    ...locationData,  // This adds { location: { lat, lng, city, ... } }

    // Also add as userLocation for backward compatibility mapping
    userLocation: locationContext,

    // Optional context
    vehicle_info: getUserVehicleInfo(),
    travel_preferences: getTravelPreferences(),
    input_mode: 'text',
    language: getUserLanguage()
  };
}
```

---

### Testing Checklist

Before sending context to PAM backend, verify:

- [ ] `user_id` exists and is valid UUID
- [ ] Location data is in `location` object (gets mapped to `user_location`)
- [ ] Also send as `userLocation` for compatibility
- [ ] Field names are snake_case (user_id, not userId)
- [ ] All optional fields have defaults
- [ ] No undefined or null values
- [ ] Timestamps are Unix milliseconds (not seconds)
- [ ] Environment is set ("staging" or "production")

---

## Backend Code Quality Standards

When writing backend code that reads context:

```python
# ALWAYS use .get() with sensible defaults
user_id = context.get("user_id")
session_id = context.get("session_id", str(uuid.uuid4()))
current_page = context.get("current_page", "unknown")

# ALWAYS check nested objects exist before accessing
vehicle_info = context.get("vehicle_info", {})
is_rv = vehicle_info.get("is_rv", False)

# NEVER assume fields exist
# WRONG:
user_location = context["user_location"]  # Crashes if missing!

# CORRECT:
user_location = context.get("user_location")
if user_location:
    # Use location data
```

---

## Related Documents

- **CLAUDE.md** - Main project instructions
- **DATABASE_SCHEMA_REFERENCE.md** - Database table schemas
- **PAM_FINAL_PLAN.md** - PAM rebuild roadmap
- **backend/docs/api.md** - API endpoint documentation
- **backend/docs/architecture.md** - System architecture

---

**Remember:** This document is THE SOURCE OF TRUTH for PAM context fields. When in doubt, check here, not memory or assumptions.

**Last Updated:** January 17, 2025 by Claude Code AI Assistant
