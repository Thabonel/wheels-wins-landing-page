# PRD: Register Existing Unregistered Tools

**Document ID**: PRD-PAM-004
**Date**: 2026-01-29
**Priority**: Low-Medium (Quick Wins)
**Effort**: Very Low (1-2 days)
**Status**: Planning

---

## 1. Overview

### Problem Statement

17 tool implementations exist in the codebase but are NOT registered in the tool registry. These tools are fully implemented and just need to be wired up.

### Business Value

- **Quick Wins**: Minimal effort for immediate capability expansion
- **Code Cleanup**: Use existing code instead of letting it rot
- **Feature Completion**: Fill minor gaps without new development

### Success Metrics

- All selected tools successfully registered
- Tools function correctly in production
- No regressions in existing functionality

---

## 2. Unregistered Tools Inventory

### Category: Budget (3 tools)

| Tool | File | Purpose | Register? |
|------|------|---------|-----------|
| `auto_track_savings` | `budget/auto_track_savings.py` | Automatic savings tracking | Yes - useful |
| `categorize_transaction` | `budget/categorize_transaction.py` | Auto-categorize expenses | Yes - useful |
| `export_budget_report` | `budget/export_budget_report.py` | Generate budget reports | Yes - useful |

### Category: Shop (1 tool)

| Tool | File | Purpose | Register? |
|------|------|---------|-----------|
| `compare_prices` | `shop/compare_prices.py` | Price comparison | Yes - useful |

### Category: Social (5 tools)

| Tool | File | Purpose | Register? |
|------|------|---------|-----------|
| `create_event` | `social/create_event.py` | Create community events | Yes - useful |
| `follow_user` | `social/follow_user.py` | Follow other users | Yes - useful |
| `message_friend` | `social/message_friend.py` | Direct messaging | Yes - useful |
| `search_posts` | `social/search_posts.py` | Search social content | Yes - useful |
| `share_location` | `social/share_location.py` | Share current location | Maybe - privacy concerns |

### Category: Profile (4 tools)

| Tool | File | Purpose | Register? |
|------|------|---------|-----------|
| `create_vehicle` | `profile/create_vehicle.py` | Add vehicle to profile | Yes - useful |
| `export_data` | `profile/export_data.py` | Export user data | Yes - GDPR compliance |
| `manage_privacy` | `profile/manage_privacy.py` | Privacy settings | Yes - important |
| `update_settings` | `profile/update_settings.py` | App settings | Yes - useful |

### Category: Trip (3 tools)

| Tool | File | Purpose | Register? |
|------|------|---------|-----------|
| `get_weather_forecast` | `trip/get_weather_forecast.py` | Detailed forecasts | Maybe - redundant with weather_advisor? |
| `save_favorite_spot` | `trip/save_favorite_spot.py` | Save locations | Yes - useful |
| `update_vehicle_fuel_consumption` | `trip/update_vehicle_fuel_consumption.py` | Update MPG data | Yes - useful |

### Category: Community (1 tool)

| Tool | File | Purpose | Register? |
|------|------|---------|-----------|
| `submit_tip` | `community/submit_tip.py` | Submit community tip | No - duplicate of submit_community_tip |

---

## 3. Recommended Registration Priority

### Priority 1: High Value (Register Immediately)

| Tool | Reason |
|------|--------|
| `message_friend` | Social messaging is a requested feature |
| `save_favorite_spot` | Trip planning enhancement |
| `export_data` | GDPR compliance requirement |
| `manage_privacy` | User control over data |
| `create_vehicle` | Profile completion |

### Priority 2: Medium Value (Register Next)

| Tool | Reason |
|------|--------|
| `follow_user` | Social graph building |
| `search_posts` | Content discovery |
| `create_event` | Community engagement |
| `update_settings` | User preferences |
| `compare_prices` | Shopping assistance |

### Priority 3: Low Value (Evaluate First)

| Tool | Reason |
|------|--------|
| `auto_track_savings` | May overlap with existing tools |
| `categorize_transaction` | May overlap with existing tools |
| `export_budget_report` | Useful but low frequency |
| `update_vehicle_fuel_consumption` | Useful but niche |

### Do Not Register

| Tool | Reason |
|------|--------|
| `submit_tip` | Duplicate of `submit_community_tip` |
| `get_weather_forecast` | Redundant with `weather_advisor` |
| `share_location` | Privacy concerns - needs review |

---

## 4. Implementation Steps

### Step 1: Review Existing Implementations

For each tool, verify:
- [ ] Function signature matches expected pattern
- [ ] Error handling is in place
- [ ] RLS policies are respected
- [ ] Return format is consistent with other tools

### Step 2: Create Function Definitions

Each tool needs an OpenAI-compatible function definition:

```python
{
    "name": "tool_name",
    "description": "Clear description of what the tool does",
    "parameters": {
        "type": "object",
        "properties": {
            "param1": {"type": "string", "description": "..."},
            "param2": {"type": "integer", "description": "..."}
        },
        "required": ["param1"]
    }
}
```

### Step 3: Register in tool_registry.py

```python
# Import the tool
from app.services.pam.tools.social.message_friend import message_friend

# In _register_all_tools function, add:
registry.register_tool(
    tool=MessageFriendTool(),
    function_definition={
        "name": "message_friend",
        "description": "Send a direct message to another user",
        "parameters": {
            "type": "object",
            "properties": {
                "recipient_id": {"type": "string", "description": "User ID to message"},
                "message": {"type": "string", "description": "Message content"}
            },
            "required": ["recipient_id", "message"]
        }
    },
    capability=ToolCapability.SOCIAL
)
```

### Step 4: Test Each Tool

- Unit test with valid inputs
- Test error handling
- Test in PAM conversation

---

## 5. Individual Tool Specifications

### 5.1 message_friend

**Current Implementation**: `backend/app/services/pam/tools/social/message_friend.py`

**Expected Parameters**:
- `recipient_id` (string): User ID to message
- `message` (string): Message content

**Expected Response**:
```json
{
  "success": true,
  "message_id": "uuid",
  "delivered": true
}
```

**Example Usage**:
```
User: "Send a message to John saying we'll meet at the campground at 3pm"
PAM: "Message sent to John: 'We'll meet at the campground at 3pm'"
```

---

### 5.2 save_favorite_spot

**Current Implementation**: `backend/app/services/pam/tools/trip/save_favorite_spot.py`

**Expected Parameters**:
- `name` (string): Spot name
- `location` (object): {lat, lng}
- `category` (string): campground, restaurant, attraction, etc.
- `notes` (string): Optional notes

**Expected Response**:
```json
{
  "success": true,
  "spot_id": "uuid",
  "message": "Saved 'Lake Travis Campground' to favorites"
}
```

---

### 5.3 export_data

**Current Implementation**: `backend/app/services/pam/tools/profile/export_data.py`

**Expected Parameters**:
- `data_types` (array): ["profile", "trips", "expenses", "all"]
- `format` (string): "json" or "csv"

**Expected Response**:
```json
{
  "success": true,
  "download_url": "https://...",
  "expires_in": "24 hours"
}
```

---

### 5.4 manage_privacy

**Current Implementation**: `backend/app/services/pam/tools/profile/manage_privacy.py`

**Expected Parameters**:
- `setting` (string): profile_visibility, location_sharing, trip_sharing
- `value` (string): public, friends, private

**Expected Response**:
```json
{
  "success": true,
  "setting": "profile_visibility",
  "new_value": "friends"
}
```

---

### 5.5 create_vehicle

**Current Implementation**: `backend/app/services/pam/tools/profile/create_vehicle.py`

**Expected Parameters**:
- `name` (string): Vehicle name
- `type` (string): motorhome, trailer, van, truck
- `year` (integer): Model year
- `make` (string): Manufacturer
- `model` (string): Model name
- `fuel_type` (string): gas, diesel, electric

**Expected Response**:
```json
{
  "success": true,
  "vehicle_id": "uuid",
  "message": "Added '2020 Winnebago View' to your profile"
}
```

---

## 6. Testing Checklist

For each tool being registered:

- [ ] Tool file exists and is importable
- [ ] Function accepts user_id as first parameter
- [ ] Function returns dict with success/error fields
- [ ] RLS policies allow operation for authenticated user
- [ ] Error messages are user-friendly
- [ ] Tool works in PAM conversation
- [ ] No breaking changes to existing functionality

---

## 7. Rollout Plan

### Day 1: Priority 1 Tools
1. Review implementations
2. Create function definitions
3. Register tools
4. Test in staging

### Day 2: Priority 2 Tools
1. Same process for remaining tools
2. Full regression testing
3. Deploy to production

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Tool implementation is broken | Review code before registering |
| Missing database tables | Verify schema exists |
| RLS policy issues | Test with real user context |
| Duplicate functionality | Compare with existing tools first |

---

## 9. Out of Scope

- Creating new tools (covered in other PRDs)
- Modifying existing tool implementations
- Changes to database schema
- UI changes

---

## 10. Success Criteria

- [ ] All Priority 1 tools registered and working
- [ ] All Priority 2 tools registered and working
- [ ] No regressions in existing functionality
- [ ] Documentation updated

---

**Document End**
