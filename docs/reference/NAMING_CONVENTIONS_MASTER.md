# Naming Conventions Master Document

**THE SINGLE SOURCE OF TRUTH FOR ALL FIELD NAMES**

**Last Updated:** December 8, 2025
**Maintained By:** Claude Code AI + Development Team
**Version:** 1.0

---

## HOW TO USE THIS DOCUMENT

1. **Before writing ANY code** that handles field names, check this document
2. **Ctrl+F** to search for the field you need
3. **When in doubt**, use the exact names from Section 1 (Critical Fields)
4. **Update this document** when adding new fields (see Section 9)

---

## SECTION 1: Critical Bug-Causing Fields (READ FIRST)

These fields have caused the most bugs. Memorize them.

### Location Fields - THE #1 SOURCE OF BUGS

| Field | Correct Name | WRONG Names (DO NOT USE) | Where Checked |
|-------|-------------|--------------------------|---------------|
| Latitude | `lat` | latitude, Latitude, LAT, Lat | openmeteo_weather_tool.py:96 |
| Longitude | `lng` | longitude, lon, long, Lng | openmeteo_weather_tool.py:96 |
| Location Object | `user_location` | location, userLocation (frontend only), current_location | pam_main.py:2196 |

**Why This Matters:**
```python
# WRONG - Weather tool will NOT find location
if user_loc.get("latitude"):  # Returns None!

# CORRECT - Weather tool checks these exact names
if user_loc.get("lat") and user_loc.get("lng"):
```

### Profile ID - DIFFERENT FROM OTHER TABLES

| Table | ID Column | Why Different |
|-------|-----------|---------------|
| `profiles` | **`id`** | Matches auth.users(id) directly - NO user_id column exists! |
| ALL OTHER TABLES | `user_id` | References profiles.id |

**Why This Matters:**
```python
# WRONG - profiles table has no user_id column!
supabase.from_('profiles').select('*').eq('user_id', user_id)  # Returns 400 error

# CORRECT - profiles uses 'id'
supabase.from_('profiles').select('*').eq('id', user_id)  # Works!
```

---

## SECTION 2: Frontend to Backend Field Mapping

### Case Convention Rules
- **Frontend (JavaScript/TypeScript):** camelCase
- **Backend (Python):** snake_case
- **Database (PostgreSQL):** snake_case

### Automatic Conversion (pam_main.py lines 1737-1739, 2196)

The backend automatically maps these fields. Frontend should ALWAYS send camelCase.

| Frontend (camelCase) | Backend (snake_case) | Auto-Mapped? | Notes |
|---------------------|---------------------|--------------|-------|
| `userLocation` | `user_location` | Yes | CRITICAL - contains lat/lng |
| `vehicleInfo` | `vehicle_info` | Yes | RV details |
| `travelStyle` | `travel_style` | Yes | User preference |
| `travelPreferences` | `travel_preferences` | Yes | Camp types, accessibility |
| `currentPage` | `current_page` | Yes | Navigation context |
| `inputMode` | `input_mode` | Yes | voice/text |
| `sessionId` | `session_id` | Yes | Session tracking |
| `financialContext` | `financial_context` | Yes | Budget data |
| `socialContext` | `social_context` | Yes | Friends, events |
| `isRvTraveler` | `is_rv_traveler` | Yes | Boolean flag |
| `userId` | `user_id` | Yes | User identifier |

### Location Object Structure

```typescript
// FRONTEND (src/types/pamContext.ts)
interface UserLocationContext {
  lat: number;           // REQUIRED - NOT latitude!
  lng: number;           // REQUIRED - NOT longitude!
  latitude?: number;     // Backward compat only - DO NOT USE
  longitude?: number;    // Backward compat only - DO NOT USE
  city?: string;
  region?: string;
  country?: string;
  timezone?: string;
  accuracy?: number;
  timestamp?: number;
  source: 'gps' | 'ip' | 'browser' | 'cached';
}
```

```python
# BACKEND (expects this structure)
user_location = {
    "lat": -33.8688,      # REQUIRED
    "lng": 151.2093,      # REQUIRED
    "city": "Sydney",     # Optional
    "region": "NSW",      # Optional
    "country": "Australia",
    "source": "gps"
}
```

---

## SECTION 3: Database Schema Quick Reference

### All Tables with User Data

| Table | ID Column | User Reference | RLS Enabled | Notes |
|-------|-----------|----------------|-------------|-------|
| `profiles` | `id` | Self (IS the user) | Yes | Uses `id` NOT `user_id`! |
| `expenses` | `id` | `user_id` | Yes | Financial tracking |
| `budgets` | `id` | `user_id` | Yes | Budget categories |
| `calendar_events` | `id` | `user_id` | Yes | Appointments |
| `trips` | `id` | `user_id` | Yes | Trip planning |
| `fuel_log` | `id` | `user_id` | Yes | Gas purchases |
| `maintenance_records` | `id` | `user_id` | Yes | Vehicle maintenance |
| `pam_conversations` | `id` | `user_id` | Yes | Chat sessions |
| `pam_messages` | `id` | `conversation_id` | Yes | Chat messages |
| `pam_savings_events` | `id` | `user_id` | Yes | PAM savings tracking |
| `posts` | `id` | `user_id` | Yes | Social posts |
| `comments` | `id` | `user_id` | Yes | Post comments |
| `likes` | `id` | `user_id` | Yes | Post likes |
| `storage_items` | `id` | `user_id` | Yes | RV storage inventory |
| `storage_categories` | `id` | `user_id` | Yes | Storage categories |
| `storage_locations` | `id` | `user_id` | Yes | Storage locations |
| `user_locations` | `id` | `user_id` | Yes | Location history |
| `affiliate_products` | `id` | N/A | Yes | Shop products |

### Common Query Patterns

```python
# For profiles table (uses 'id')
supabase.from_('profiles').select('*').eq('id', user_id)

# For all other tables (uses 'user_id')
supabase.from_('expenses').select('*').eq('user_id', user_id)
supabase.from_('calendar_events').select('*').eq('user_id', user_id)
```

---

## SECTION 4: All 45 PAM Tool Input Schemas

### Budget Tools (10)

| Tool Name | Required Params | Optional Params | Description |
|-----------|-----------------|-----------------|-------------|
| `create_expense` | user_id, amount, category | description, date, location | Add expense to tracker |
| `track_savings` | user_id, amount, category | description, event_type | Log money saved |
| `analyze_budget` | user_id | period, categories | Budget analysis and insights |
| `get_spending_summary` | user_id | period, category | Spending breakdown |
| `update_budget` | user_id, category, amount | period | Modify budget categories |
| `compare_vs_budget` | user_id | period | Actual vs planned spending |
| `predict_end_of_month` | user_id | - | Forecast spending |
| `find_savings_opportunities` | user_id | - | AI-powered suggestions |
| `categorize_transaction` | user_id, description, amount | - | Auto-categorize expense |
| `export_budget_report` | user_id | format, period | Generate reports |

### Trip Tools (11)

| Tool Name | Required Params | Optional Params | Description |
|-----------|-----------------|-----------------|-------------|
| `plan_trip` | user_id, origin, destination | budget, waypoints | Multi-stop route planning |
| `find_rv_parks` | user_id, location | radius, amenities, max_price | Search campgrounds |
| `get_weather_forecast` | location | days | Weather forecasts (uses lat/lng!) |
| `calculate_gas_cost` | distance_miles | mpg, gas_price | Estimate fuel costs |
| `find_cheap_gas` | location | radius, fuel_type | Cheapest gas stations |
| `optimize_route` | user_id, origin, destination | waypoints, optimize_for | Cost-effective routes |
| `get_road_conditions` | route | - | Check road status |
| `find_attractions` | location | radius, categories | Points of interest |
| `estimate_travel_time` | origin, destination | with_breaks | Calculate duration |
| `save_favorite_spot` | user_id, name, location | notes, category | Bookmark locations |
| `update_vehicle_fuel_consumption` | user_id | mpg, fuel_type | Update vehicle MPG |

### Social Tools (10)

| Tool Name | Required Params | Optional Params | Description |
|-----------|-----------------|-----------------|-------------|
| `create_post` | user_id, content | images, location, tags | Share travel updates |
| `message_friend` | user_id, friend_id, message | - | Send DMs |
| `comment_on_post` | user_id, post_id, content | - | Comment on posts |
| `search_posts` | user_id, query | tags, location | Find content |
| `get_feed` | user_id | limit, offset | Load social feed |
| `like_post` | user_id, post_id | - | React to posts |
| `follow_user` | user_id, target_user_id | - | Connect with RVers |
| `share_location` | user_id | message, duration | Share current spot |
| `find_nearby_rvers` | user_id, location | radius | Discover local community |
| `create_event` | user_id, title, date | location, description | Plan meetups |

### Shop Tools (3)

| Tool Name | Required Params | Optional Params | Description |
|-----------|-----------------|-----------------|-------------|
| `search_products` | query | category, max_price, limit | Find RV parts/gear |
| `get_product_details` | product_id | - | View product info |
| `recommend_products` | user_id | category, budget | Personalized suggestions |

### Profile Tools (6)

| Tool Name | Required Params | Optional Params | Description |
|-----------|-----------------|-----------------|-------------|
| `update_profile` | user_id | full_name, nickname, etc. | Modify user info |
| `update_settings` | user_id | preferences | Change settings |
| `manage_privacy` | user_id, settings | - | Control data sharing |
| `get_user_stats` | user_id | - | View usage statistics |
| `export_data` | user_id | format | Download user data (GDPR) |
| `create_vehicle` | user_id, make, model | year, fuel_type, mpg | Add vehicle |

### Calendar Tools (3)

| Tool Name | Required Params | Optional Params | Description |
|-----------|-----------------|-----------------|-------------|
| `create_calendar_event` | user_id, title, start_date | end_date, description, location | Add appointment |
| `update_calendar_event` | user_id, event_id | title, start_date, etc. | Modify event |
| `delete_calendar_event` | user_id, event_id | - | Remove event |

### Admin Tools (2)

| Tool Name | Required Params | Optional Params | Description |
|-----------|-----------------|-----------------|-------------|
| `add_knowledge` | user_id, content, category | tags, source | Add to knowledge base |
| `search_knowledge` | user_id, query | category, limit | Search knowledge base |

---

## SECTION 5: Deprecated Field Names

**DO NOT USE THESE NAMES - They are kept only for backward compatibility**

| Deprecated | Use Instead | Migration Status | Remove After |
|-----------|-------------|------------------|--------------|
| `location` | `user_location` | Fallback active | v2.0 |
| `latitude` | `lat` | Fallback active | v2.0 |
| `longitude` | `lng` | Fallback active | v2.0 |
| `current_location` | `user_location` | Code fix needed | Immediate |
| `add_expense` | `create_expense` | Tool renamed | Done |
| `get_location` | (removed) | No replacement | Done |
| `userLocation` (backend) | `user_location` | Auto-mapped | N/A |

### Code That Still Checks Deprecated Names

These files have fallback logic - document for reference only:

| File | Line | Pattern | Notes |
|------|------|---------|-------|
| `context_manager.py` | 72+ | `context.get('location')` | Fallback after user_location |
| `pamContext.ts` | 186-196 | latitude/longitude check | Logs warning if used |

---

## SECTION 6: Validation Rules

### Field Formats

| Field | Format | Max Length | Valid Range | Example |
|-------|--------|------------|-------------|---------|
| `user_id` | UUID v4 | 36 chars | - | `123e4567-e89b-12d3-a456-426614174000` |
| `session_id` | alphanumeric+dash | 64 chars | - | `sess_abc123-def456` |
| `email` | RFC 5322 | 254 chars | - | `user@example.com` |
| `timestamp` | Unix ms OR ISO 8601 | - | - | `1705500000000` or `2025-01-17T10:30:00Z` |
| `lat` | float | - | -90 to 90 | `-33.8688` |
| `lng` | float | - | -180 to 180 | `151.2093` |
| `amount` | decimal(10,2) | - | 0+ | `123.45` |
| `message` | string | 2000 chars | - | Any text |
| `category` | string | 50 chars | - | `fuel`, `food`, `camping` |

### Security Sanitization

All user input is sanitized:
- **Text fields:** `bleach.clean()` applied
- **SQL queries:** Parameterized queries only (no string concatenation)
- **Context fields:** Max 50 fields, 1000 chars each
- **Message length:** Max 2000 characters

---

## SECTION 7: Enums & Constants

### Intent Types (backend/app/models/domain/pam.py)

```python
class IntentType(str, Enum):
    BUDGET_QUERY = "budget_query"
    EXPENSE_LOG = "expense_log"
    TRIP_PLANNING = "trip_planning"
    WEATHER_CHECK = "weather_check"
    SOCIAL_INTERACTION = "social_interaction"
    PRODUCT_SEARCH = "product_search"
    CALENDAR_MANAGEMENT = "calendar_management"
    PROFILE_UPDATE = "profile_update"
    GENERAL_CHAT = "general_chat"
    HELP_REQUEST = "help_request"
```

### Conversation Status

```python
class ConversationStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    PAUSED = "paused"
    ARCHIVED = "archived"
```

### Memory Types

```python
class MemoryType(str, Enum):
    CONVERSATION = "conversation"
    PREFERENCE = "preference"
    FACT = "fact"
    LOCATION = "location"
    FINANCIAL = "financial"
```

### Message Roles

```python
class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
```

### Expense Categories

Standard categories for budget tracking:
- `fuel` - Gas, diesel, propane
- `food` - Groceries, dining out
- `camping` - Campground fees, RV parks
- `maintenance` - Vehicle repairs, service
- `entertainment` - Activities, attractions
- `utilities` - Electric hookups, water, wifi
- `insurance` - Vehicle insurance
- `subscriptions` - PAM, apps, streaming
- `other` - Miscellaneous

### Event Types

Calendar event types:
- `personal` - Personal appointments
- `maintenance` - Vehicle service
- `travel` - Trip-related
- `social` - Meetups, gatherings
- `reminder` - General reminders

---

## SECTION 8: Source of Truth Files

When in doubt, these files are authoritative:

| Category | Authoritative File | Purpose |
|----------|-------------------|---------|
| **This Document** | `docs/NAMING_CONVENTIONS_MASTER.md` | Field naming rules |
| Database Schema | `docs/DATABASE_SCHEMA_REFERENCE.md` | Table columns, relationships |
| Backend Context | `docs/PAM_BACKEND_CONTEXT_REFERENCE.md` | Context field names |
| Frontend Types | `src/types/pamContext.ts` | TypeScript interfaces |
| Tool Definitions | `backend/app/services/pam/core/pam.py` | Tool names, parameters |
| API Schemas | `backend/app/models/schemas/pam.py` | Request/response validation |
| System Architecture | `docs/PAM_SYSTEM_ARCHITECTURE.md` | Overall system design |

### File Hierarchy

If there's a conflict between documents:
1. **This document** (NAMING_CONVENTIONS_MASTER.md) - highest priority
2. Actual code behavior - what's deployed
3. Other documentation - may be outdated

---

## SECTION 9: Living Document Maintenance

### When to Update This Document

Update this document when:
- [ ] New tool added - Add to Section 4
- [ ] New database table - Add to Section 3
- [ ] Field renamed - Add old name to Section 5 (Deprecated)
- [ ] New validation rule - Add to Section 6
- [ ] New enum value - Add to Section 7
- [ ] New context field - Add to Section 2

### Update Checklist (Copy-Paste for PRs)

```markdown
## Naming Document Update
- [ ] Added new fields to NAMING_CONVENTIONS_MASTER.md
- [ ] Marked deprecated fields in Section 5
- [ ] Updated "Last Updated" date at top
- [ ] Verified changes match actual code
```

### Quarterly Review Checklist

Every 3 months, verify:
- [ ] All 45 tool names match actual code in pam.py
- [ ] All database tables are listed in Section 3
- [ ] Deprecated fields past removal date are removed from code
- [ ] No undocumented field mappings exist

---

## Quick Reference Card

**Print this for your desk:**

```
CRITICAL FIELD NAMES
====================
Location coords:  lat, lng (NOT latitude/longitude)
Location object:  user_location (NOT location)
Profile table:    id (NOT user_id)
All other tables: user_id

FRONTEND -> BACKEND
===================
userLocation -> user_location (auto-mapped)
vehicleInfo  -> vehicle_info  (auto-mapped)
All others:     camelCase -> snake_case

WEATHER TOOL
============
MUST have: user_location.lat AND user_location.lng
Will NOT work: latitude, longitude, location

PROFILES TABLE
==============
Query by: .eq('id', user_id)  NOT .eq('user_id', user_id)
```

---

**Document Version:** 1.0
**Created:** December 8, 2025
**Last Verified Against Code:** December 8, 2025
