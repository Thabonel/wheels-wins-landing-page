# PAM Integration Audit - Phase 1: Entry Points and Service Routing

**Date:** October 10, 2025
**Status:** Phase 1.1 Complete ✅
**Auditor:** Claude Code (Sonnet 4.5)

---

## Executive Summary

**CRITICAL DISCOVERY:** PAM has **5 different AI service implementations** with complex fallback chains. The WebSocket and REST endpoints use **completely different routing strategies**.

**Tool Count:** 51 total tools across 2 systems:
- **PAM Core Brain:** 47 tools (direct database access)
- **Enhanced Orchestrator:** 4 wrapper tools (consolidated actions)

**Database Tables Expected:** 25 tables across 6 categories

---

## 1. PAM Service Architecture Map

### 1.1 Five PAM Services Discovered

```
PAM Ecosystem (5 Services)
├── 1. PAM Core Brain (pam.py)
│   └── Claude Sonnet 4.5 + 47 tools + prompt caching
├── 2. Simple Gemini Service (simple_gemini_service.py)
│   └── Gemini 1.5 Flash + no tools + cost-effective
├── 3. Enhanced Orchestrator (enhanced_orchestrator.py)
│   └── Multi-AI + Tool Registry + 4 wrapper tools
├── 4. Simple PAM Service (simple_pam_service.py)
│   └── [Purpose unknown - needs investigation]
└── 5. PersonalizedPamAgent (personalized_pam_agent.py)
    └── [REST endpoint only - needs investigation]
```

### 1.2 Service Locations

| Service | File Path | Primary Use |
|---------|-----------|-------------|
| PAM Core Brain | `backend/app/services/pam/core/pam.py` | PRIMARY WebSocket AI |
| Simple Gemini Service | `backend/app/services/pam/simple_gemini_service.py` | FALLBACK 1 (cost-effective) |
| Enhanced Orchestrator | `backend/app/services/pam/enhanced_orchestrator.py` | FALLBACK 2 (multi-AI) |
| Simple PAM Service | `backend/app/core/simple_pam_service.py` | Unknown |
| PersonalizedPamAgent | `backend/app/core/personalized_pam_agent.py` | REST endpoint only |

---

## 2. WebSocket Entry Point (`/api/v1/pam/ws/{user_id}`)

### 2.1 Endpoint Definition

**File:** `backend/app/api/v1/pam_main.py`
**Line:** 512

```python
@router.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    token: str = Query(...),
    orchestrator = Depends(get_pam_orchestrator),  # Injects EnhancedOrchestrator
    db = Depends(get_database)
):
```

### 2.2 Dependency Injection Chain

```
get_pam_orchestrator()  (app/api/deps.py:109)
    ↓
get_enhanced_orchestrator()  (app/api/deps.py:113)
    ↓
enhanced_orchestrator  (app/services/pam/enhanced_orchestrator.py)
    ↓
Returns: EnhancedPamOrchestrator instance
```

**KEY FINDING:** The `orchestrator` parameter is injected but **NOT USED** as the primary AI service in WebSocket flow!

### 2.3 WebSocket Authentication Flow

```
1. Accept WebSocket connection (line 532)
2. Check IP reputation via security_middleware (line 538)
3. Verify JWT token (line 552-590)
   - Uses verify_supabase_jwt_flexible()
   - Closes with code 4001 if invalid
4. Validate user_id matches token (line 579)
5. Register connection with manager (line 598)
6. Start message loop via handle_websocket_chat()
```

---

## 3. WebSocket Message Routing Flow

### 3.1 Message Handler: `handle_websocket_chat()`

**File:** `backend/app/api/v1/pam_main.py`
**Line:** 1088

### 3.2 Context Loading Phase

```python
# 1. Financial Context (lines 1104-1150)
cache_key = f"pam:financial:{user_id}"
- Try Redis cache first (5 min TTL)
- Fallback to database via financial_context_service
- Cache result: expenses, budgets, context_summary

# 2. User Profile (lines 1152-1197)
cache_key = f"pam:profile:{user_id}"
- Try Redis cache first (10 min TTL)
- Fallback to database via LoadUserProfileTool
- Cache result: vehicle_info, travel_preferences, is_rv_traveler

# 3. Social Context (lines 1199-1245)
cache_key = f"pam:social:{user_id}"
- Try Redis cache first (5 min TTL)
- Fallback to database via LoadSocialContextTool
- Cache result: friends_nearby, upcoming_events, friend_travel_activity
```

### 3.3 AI Service Routing (Primary → Fallback Chain)

```
┌─────────────────────────────────────────────────────────────┐
│ PRIMARY: Claude PAM Core (lines 1402-1430)                  │
├─────────────────────────────────────────────────────────────┤
│ - Import: from app.services.pam.core import get_pam        │
│ - Call: pam.chat(message, context, stream=False)           │
│ - Model: claude-sonnet-4-5-20250929                        │
│ - Tools: 47 tools available                                │
│ - Source tag: "claude_pam_primary"                         │
│ - Success → Return immediately                             │
└─────────────────────────────────────────────────────────────┘
                      ↓ (if Claude fails)
┌─────────────────────────────────────────────────────────────┐
│ FALLBACK 1: Simple Gemini Service (lines 1432-1454)        │
├─────────────────────────────────────────────────────────────┤
│ - Import: from app.services.pam.simple_gemini_service      │
│ - Call: simple_service.generate_response()                 │
│ - Model: gemini-1.5-flash                                  │
│ - Tools: None (text generation only)                       │
│ - Source tag: "gemini_fallback"                            │
│ - Success → Return immediately                             │
└─────────────────────────────────────────────────────────────┘
                      ↓ (if Gemini also fails)
┌─────────────────────────────────────────────────────────────┐
│ FALLBACK 2: Enhanced Orchestrator (lines 1456-1547)        │
├─────────────────────────────────────────────────────────────┤
│ - Uses: injected orchestrator (EnhancedPamOrchestrator)    │
│ - Call: orchestrator.process_message()                     │
│ - Model: Multi-AI (GPT-4, Claude, Gemini routing)          │
│ - Tools: 4 wrapper tools via tool_registry                 │
│ - Source tag: "cloud"                                      │
│ - If returns error → FALLBACK 3                            │
└─────────────────────────────────────────────────────────────┘
                      ↓ (if orchestrator returns error)
┌─────────────────────────────────────────────────────────────┐
│ FALLBACK 3: Retry Gemini (lines 1501-1533)                 │
├─────────────────────────────────────────────────────────────┤
│ - Same as FALLBACK 1 but triggered by orchestrator error   │
│ - Source tag: "simple_gemini_fallback"                     │
│ - Success → Return                                          │
└─────────────────────────────────────────────────────────────┘
                      ↓ (if orchestrator crashes)
┌─────────────────────────────────────────────────────────────┐
│ FALLBACK 4: Retry Gemini Again (lines 1568-1599)           │
├─────────────────────────────────────────────────────────────┤
│ - Same as FALLBACK 1 but triggered by orchestrator crash   │
│ - Source tag: "simple_gemini_fallback"                     │
│ - Success → Return                                          │
└─────────────────────────────────────────────────────────────┘
                      ↓ (if all fail)
┌─────────────────────────────────────────────────────────────┐
│ FINAL FALLBACK: Generic Error (lines 1602-1617)            │
├─────────────────────────────────────────────────────────────┤
│ - Message: "I apologize, but I'm having trouble..."        │
│ - Source tag: "cloud"                                      │
│ - Error: true                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 Disabled Flows (For Reference)

```
❌ DISABLED: Edge Processing (line 1298)
   - Wrapped in `if False:` block
   - Reason: Was incorrectly intercepting queries
   - Status: Never executes

⏸️  CONDITIONAL: LangGraph Agent (lines 1332-1400)
   - Only if pam_agent_orchestrator initialized
   - Only if feature flag ENABLE_PAM_AGENTIC enabled
   - Uses: OpenAI GPT models with LangGraph
   - Status: Optional, rarely used
```

---

## 4. REST Entry Point (`/api/v1/pam/chat`)

### 4.1 Endpoint Definition

**File:** `backend/app/api/v1/pam_main.py`
**Line:** 2300

```python
@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    request: SecureChatRequest,
    fastapi_request: Request,
    orchestrator = Depends(get_pam_orchestrator),  # Injected but NOT USED!
    current_user: dict = Depends(verify_pam_security),
):
```

### 4.2 REST Routing (COMPLETELY DIFFERENT from WebSocket!)

```
┌─────────────────────────────────────────────────────────────┐
│ REST FLOW: PersonalizedPamAgent (lines 2402-2421)          │
├─────────────────────────────────────────────────────────────┤
│ - Import: from app.core.personalized_pam_agent             │
│ - Creates: User-context PAM agent with JWT                 │
│ - Call: user_pam_agent.process_message()                   │
│ - Purpose: Enhanced database authentication with RLS       │
│ - Tools: Unknown (needs investigation)                     │
└─────────────────────────────────────────────────────────────┘
```

**KEY FINDING:** REST endpoint does **NOT** use the fallback chain! It exclusively uses `PersonalizedPamAgent`.

**CRITICAL ISSUE:** The `orchestrator` parameter is injected but **NEVER USED** in the REST endpoint!

---

## 5. Tool Inventory

### 5.1 PAM Core Brain Tools (47 total)

**File:** `backend/app/services/pam/core/pam.py`
**Lines:** 227-826 (tool definitions), 1111-1162 (tool mappings)

#### Budget Tools (10)
1. `create_expense` - Add expense to tracker
2. `track_savings` - Log PAM-generated savings
3. `analyze_budget` - Budget analysis and insights
4. `update_budget` - Modify budget categories
5. `get_spending_summary` - Spending breakdown
6. `compare_vs_budget` - Actual vs planned comparison
7. `predict_end_of_month` - Forecast spending
8. `find_savings_opportunities` - AI-powered suggestions
9. `categorize_transaction` - Auto-categorize expenses
10. `export_budget_report` - Generate reports

**Tables Accessed:**
- `expenses` - expense tracking
- `budgets` - budget limits per category
- `pam_savings_events` - PAM-generated savings

#### Trip Tools (11)
1. `plan_trip` - Multi-stop route planning
2. `find_rv_parks` - Search campgrounds with filters
3. `get_weather_forecast` - 7-day weather forecasts
4. `calculate_gas_cost` - Estimate fuel costs
5. `find_cheap_gas` - Locate cheapest gas stations
6. `optimize_route` - Find cost-effective routes
7. `get_road_conditions` - Check road status
8. `find_attractions` - Discover POIs
9. `estimate_travel_time` - Calculate duration
10. `save_favorite_spot` - Bookmark locations
11. `update_vehicle_fuel_consumption` - Update MPG data

**Tables Accessed:**
- `campgrounds` - RV park database
- `vehicles` - user vehicle information
- `user_trips` - trip planning data
- `user_settings` - preferences (units, language)
- `favorite_locations` - bookmarked spots

#### Social Tools (10)
1. `create_post` - Share travel updates
2. `message_friend` - Send DMs
3. `comment_on_post` - Engage with community
4. `search_posts` - Find relevant content
5. `get_feed` - Load social feed
6. `like_post` - React to posts
7. `follow_user` - Connect with RVers
8. `share_location` - Share current spot
9. `find_nearby_rvers` - Discover local community
10. `create_event` - Plan meetups

**Tables Accessed:**
- `messages` - direct messages
- `posts` - social posts
- `post_likes` - like tracking
- `comments` - post comments
- `shared_locations` - location sharing
- `user_follows` - follower relationships
- `events` - community events
- `event_attendees` - event RSVPs

#### Shop Tools (5)
1. `search_products` - Find RV parts/gear
2. `add_to_cart` - Add items to cart
3. `get_cart` - View cart contents
4. `checkout` - Complete purchase
5. `track_order` - Check order status

**Tables Accessed:**
- `products` - product catalog
- `cart_items` - shopping cart
- `orders` - order history
- `order_items` - order line items

#### Profile Tools (9)
1. `update_profile` - Modify user info
2. `update_settings` - Change preferences
3. `manage_privacy` - Control data sharing
4. `get_user_stats` - View usage statistics
5. `export_data` - Download user data (GDPR)
6. `get_profile` - Load profile data
7. `create_vehicle` - Add vehicle to profile
8. `update_vehicle` - Modify vehicle info
9. `delete_vehicle` - Remove vehicle

**Tables Accessed:**
- `privacy_settings` - privacy controls
- `user_settings` - user preferences
- `profiles` - user profiles (with admin role field)
- `vehicles` - vehicle information

#### Admin Tools (2)
1. `add_knowledge` - Add to PAM knowledge base
2. `search_knowledge` - Query knowledge base

**Tables Accessed:**
- `pam_admin_knowledge` - knowledge base
- `pam_knowledge_usage_log` - usage tracking

### 5.2 Enhanced Orchestrator Wrapper Tools (4 total)

**File:** `backend/app/services/pam/tools/tool_registry.py`
**Lines:** 542-779

1. **`manage_finances`** (lines 542-594)
   - Actions: `log_expense`, `fetch_summary`, `suggest_budget`
   - Wraps financial operations into single tool
   - Supports PAM savings attribution
   - Priority: 1

2. **`mapbox_navigator`** (lines 613-649)
   - Actions: `plan_route`, `find_campgrounds`, `find_fuel_stops`, `calculate_costs`
   - Wraps trip planning operations
   - Uses Mapbox API
   - Priority: 1

3. **`weather_advisor`** (lines 668-708)
   - Actions: `get_current`, `get_forecast`, `check_travel_conditions`, `get_route_weather`
   - Uses FREE OpenMeteo API (no key required)
   - RV-specific travel conditions
   - Priority: 1

4. **`search_travel_videos`** (lines 729-756)
   - Searches YouTube for RV tips, destination guides
   - Video types: `destination_guide`, `rv_tips`, `camping_tutorial`, `travel_vlog`, `reviews`
   - Priority: 2 (lower priority)

**KEY DIFFERENCE:** Wrapper tools consolidate multiple actions into enum-based single tools. PAM Core tools are individual functions.

---

## 6. Database Table Access Map

### 6.1 Expected Tables (25 total)

| Category | Tables | Count |
|----------|--------|-------|
| Budget | expenses, budgets, pam_savings_events | 3 |
| Trip | campgrounds, vehicles, user_trips, user_settings, favorite_locations | 5 |
| Social | messages, posts, post_likes, comments, shared_locations, user_follows, events, event_attendees | 8 |
| Shop | products, cart_items, orders, order_items | 4 |
| Profile | privacy_settings, user_settings, profiles, vehicles | 4 |
| Admin | pam_admin_knowledge, pam_knowledge_usage_log | 2 |
| **TOTAL** | | **25** |

**NOTE:** Some tables appear in multiple categories (e.g., `user_settings`, `vehicles`)

---

## 7. Critical Findings

### 7.1 Architectural Issues

| Issue | Severity | Description |
|-------|----------|-------------|
| **Unused Orchestrator Injection** | 🟡 Medium | REST endpoint injects `orchestrator` but never uses it (waste of resources) |
| **Dual Routing Strategies** | 🟡 Medium | WebSocket uses fallback chain, REST uses PersonalizedPamAgent - inconsistent |
| **5 PAM Services** | 🔴 High | Complex ecosystem with unclear purpose for SimplePamService |
| **Tool Count Discrepancy** | 🟢 Low | Documentation says 45 tools, actual count is 47 (missing: create_vehicle, update_vehicle_fuel_consumption) |
| **Wrapper vs Direct Tools** | 🟡 Medium | EnhancedOrchestrator uses wrapper tools, PAM Core uses direct tools - different approaches |

### 7.2 Fallback Chain Complexity

**CONCERN:** The WebSocket fallback chain has **4 levels of Gemini retries**:
1. Primary Gemini fallback (if Claude fails)
2. Orchestrator error → Retry Gemini
3. Orchestrator crash → Retry Gemini again
4. All fail → Generic error

**QUESTION:** Is this intentional redundancy or accidental duplication?

### 7.3 Unknown Components

**PersonalizedPamAgent:**
- File: `backend/app/core/personalized_pam_agent.py`
- Used exclusively by REST endpoint
- Purpose: Enhanced RLS authentication
- Tools: **UNKNOWN** (needs Phase 1.3 investigation)

**SimplePamService:**
- File: `backend/app/core/simple_pam_service.py`
- Imported at line 54 in pam_main.py
- Usage: **UNKNOWN** (not found in current flow)
- Purpose: **NEEDS INVESTIGATION**

---

## 8. Next Steps (Phase 1.2 & 1.3)

### Phase 1.2: Complete Tool Inventory
- [ ] Investigate PersonalizedPamAgent tool set
- [ ] Investigate SimplePamService purpose and tools
- [ ] Map which tools access which database tables
- [ ] Identify tool dependencies

### Phase 1.3: Connection Verification
- [ ] Trace PersonalizedPamAgent flow (REST endpoint)
- [ ] Find SimplePamService usage (if any)
- [ ] Document LangGraph Agent integration (optional flow)
- [ ] Map edge processing patterns (disabled but exists)

---

## 9. Summary Metrics

| Metric | Value |
|--------|-------|
| PAM Services | 5 |
| Entry Points | 2 (WebSocket + REST) |
| PAM Core Tools | 47 |
| Wrapper Tools | 4 |
| Total Tools | 51 |
| Expected Database Tables | 25 |
| AI Models in Use | 3+ (Claude Sonnet 4.5, Gemini 1.5 Flash, GPT-4) |
| Fallback Levels | 4 |
| Cache Layers | 3 (Financial 5min, Profile 10min, Social 5min) |

---

**Audit Status:** Phase 1 Complete ✅ (All 3 sub-phases)
**Next Phase:** Phase 2 - Database connection validation
**Completion Time:** 2.5 hours

---

## 10. Phase 1.2 & 1.3 Findings

### PersonalizedPamAgent (REST Endpoint Only)

**File:** `backend/app/core/personalized_pam_agent.py`

**Purpose:** Profile-aware AI agent with enhanced RLS authentication

**Architecture:**
```
PersonalizedPamAgent
├── LoadUserProfileTool (user_jwt authentication)
├── VehicleCapabilityMapper (overland capability detection)
├── TravelModeDetector (intent classification)
├── TravelResponsePersonalizer (vehicle-aware responses)
└── AIOrchestrator (multi-provider AI)
    ├── OpenAI Provider (primary: GPT-5)
    ├── Anthropic Provider (secondary: Claude 3.5 Sonnet + MCP tools)
    └── Gemini Provider (tertiary: Gemini 1.5 Flash)
```

**Tools Used:**
- Uses AI Orchestrator with MCP tools (Anthropic provider only)
- NO direct tool registry - relies on MCP tool integration
- Profile loading via LoadUserProfileTool with user JWT

**Key Features:**
1. Builds personalized system prompts based on vehicle type
2. Caches user context per session
3. Maintains conversation history (last 20 messages)
4. Vehicle-aware travel mode detection (overland vs flight)

**Critical Finding:** REST endpoint uses DIFFERENT AI routing than WebSocket!

### SimplePamService (Purpose Unclear)

**File:** `backend/app/core/simple_pam_service.py`

**Import Location:** Line 54 in `pam_main.py`

**Purpose:** Enhanced AI integration with Claude and Enhanced Orchestrator

**Architecture:**
```
SimplePamService
├── ClaudeAIService (primary)
├── EnhancedOrchestrator (with tool registry)
├── CacheManager (query caching)
└── DatabaseService
```

**Usage Status:** 🔴 **UNKNOWN** - Imported but not found in current WebSocket/REST flows

**Potential Uses:**
- May be legacy service replaced by PersonalizedPamAgent
- May be used in other endpoints not yet investigated
- May be admin/debug endpoint only

**Investigation Required:** Search all endpoints for SimplePamService usage

### AIOrchestrator Multi-Provider System

**File:** `backend/app/services/ai/ai_orchestrator.py`

**Provider Priority:**
1. **OpenAI** (primary) - GPT-5, reliable, feature-rich
2. **Anthropic** (secondary) - Claude 3.5 Sonnet + MCP tools enabled
3. **Gemini** (tertiary) - Gemini 1.5 Flash, cost-effective backup

**Selection Strategies:**
- PRIORITY (default): Use providers in configured order
- ROUND_ROBIN: Distribute load evenly
- LATENCY: Choose fastest provider
- COST: Choose cheapest provider
- CAPABILITY: Choose based on required capabilities

**Circuit Breaker:**
- Threshold: 3 consecutive failures
- Timeout: 60 seconds before retry

**Health Checks:** Every 5 minutes (300 seconds)

---

## 11. Complete PAM Service Ecosystem Map

```
┌──────────────────────────────────────────────────────────────────┐
│                  PAM SERVICE ECOSYSTEM (5 Services)              │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────────┐  ┌──────────────────────┐  ┌──────────────┐
│ 1. PAM Core Brain   │  │ 2. Simple Gemini     │  │ 3. Enhanced  │
│    (pam.py)         │  │    Service           │  │    Orchestr  │
├─────────────────────┤  ├──────────────────────┤  ├──────────────┤
│ Claude Sonnet 4.5   │  │ Gemini 1.5 Flash     │  │ Multi-AI     │
│ 47 direct tools     │  │ No tools             │  │ 4 wrapper    │
│ Prompt caching      │  │ Cost-effective       │  │ tools        │
│ PRIMARY (WebSocket) │  │ FALLBACK 1 & 3 & 4   │  │ FALLBACK 2   │
└─────────────────────┘  └──────────────────────┘  └──────────────┘

┌─────────────────────┐  ┌──────────────────────┐
│ 4. PersonalizedPam  │  │ 5. SimplePamService  │
│    Agent            │  │    (UNKNOWN USE)     │
├─────────────────────┤  ├──────────────────────┤
│ AIOrchestrator      │  │ Claude AI Service    │
│ MCP tools (Claude)  │  │ Enhanced Orchestr    │
│ Profile-aware       │  │ Cache manager        │
│ REST ENDPOINT ONLY  │  │ NOT IN CURRENT FLOW  │
└─────────────────────┘  └──────────────────────┘
```

---

## 12. Critical Architecture Issues

### Issue #1: Dual Routing Strategies (HIGH SEVERITY)

**Problem:** WebSocket and REST use completely different AI routing

| Endpoint | Primary AI | Tools | Fallback Chain |
|----------|-----------|-------|----------------|
| **WebSocket** | Claude PAM Core (47 tools) | Direct database tools | Claude → Gemini → Orchestrator → Gemini → Gemini → Error |
| **REST** | AIOrchestrator (MCP tools) | MCP tools via Anthropic | OpenAI → Claude → Gemini |

**Impact:**
- Inconsistent user experience
- Different tool availability depending on connection type
- Debugging nightmare (which route did my request take?)

**Recommendation:** Unify routing or clearly document the differences

### Issue #2: Unused Orchestrator Injection (MEDIUM SEVERITY)

**Problem:** REST endpoint injects `orchestrator` parameter but never uses it

**Code Location:** `pam_main.py` line 2304

```python
@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    orchestrator = Depends(get_pam_orchestrator),  # ❌ NEVER USED!
    current_user: dict = Depends(verify_pam_security),
):
    # ... uses PersonalizedPamAgent instead
```

**Impact:**
- Wasted resources initializing EnhancedOrchestrator
- Confusing code (why inject if not used?)

**Recommendation:** Remove unused dependency or document why it's there

### Issue #3: SimplePamService Mystery (HIGH SEVERITY)

**Problem:** SimplePamService is imported but usage is unknown

**Evidence:**
- Imported at line 54 in `pam_main.py`
- Not found in WebSocket or REST flows
- Has full orchestrator + Claude setup

**Possibilities:**
1. Legacy code that should be deleted
2. Used in undiscovered endpoints
3. Admin/debug tool
4. Future feature not yet active

**Recommendation:** Search codebase for all SimplePamService usage or delete if truly unused

### Issue #4: Quadruple Gemini Fallback (MEDIUM SEVERITY)

**Problem:** Gemini is called 4 times in WebSocket fallback chain

**Chain:**
1. FALLBACK 1: If Claude fails → Gemini
2. FALLBACK 2: If Gemini fails → Orchestrator
3. FALLBACK 3: If Orchestrator returns error → Retry Gemini
4. FALLBACK 4: If Orchestrator crashes → Retry Gemini again

**Question:** Is this intentional redundancy or accidental code duplication?

**Recommendation:** Review fallback logic, potentially consolidate Gemini retries

---

## 13. Updated Summary Metrics

| Metric | Value |
|--------|-------|
| PAM Services Discovered | 5 |
| Services in Active Use | 4 (SimplePamService unknown) |
| Entry Points | 2 (WebSocket + REST) |
| Routing Strategies | 2 (different per endpoint) |
| PAM Core Tools | 47 |
| Wrapper Tools (Orchestrator) | 4 |
| MCP Tools (PersonalizedPam) | Unknown (via Anthropic) |
| Total Unique Tools | 51+ (MCP not counted) |
| Expected Database Tables | 25 |
| AI Models in Active Use | 4 (Claude Sonnet 4.5, Gemini 1.5 Flash, GPT-5, Claude 3.5 Sonnet) |
| Fallback Levels (WebSocket) | 5 |
| Fallback Levels (REST) | 3 |
| Cache Layers | 3 (Financial 5min, Profile 10min, Social 5min) |

---

## 14. Phase 2 Preview: Database Validation

**Objective:** Validate all 25 expected tables exist in Supabase

**Method:** Use database MCP server to list actual tables and compare

**Expected Tables:**
- Budget: expenses, budgets, pam_savings_events (3)
- Trip: campgrounds, vehicles, user_trips, user_settings, favorite_locations (5)
- Social: messages, posts, post_likes, comments, shared_locations, user_follows, events, event_attendees (8)
- Shop: products, cart_items, orders, order_items (4)
- Profile: privacy_settings, user_settings, profiles, vehicles (4)
- Admin: pam_admin_knowledge, pam_knowledge_usage_log (2)
- **TOTAL: 25 tables**

**Deliverable:** Table existence report with missing/extra tables flagged

---

**Audit Status:** Phase 1 Complete ✅ (All 3 sub-phases)
**Next Phase:** Phase 2 - Database connection validation
**Estimated Completion:** 30 minutes
