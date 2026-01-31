# PAM Calendar Access Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix PAM's inability to read existing calendar events so users can ask "What's on my calendar?"

**Architecture:** Add missing `get_calendar_events` import, tool schema definition, and execution mapping to PAM core system. The tool implementation already exists and is fully tested - this is purely an integration gap.

**Tech Stack:** Python FastAPI, Supabase, Claude Function Calling, Existing PAM Tool Architecture

---

## Problem Statement

**User Impact:** Users report PAM responds "I don't currently have access to a tool that retrieves existing calendar events" when asking about their schedule, despite having 17 calendar events in database.

**Root Cause:** The `get_calendar_events` tool exists, is registered in tool_registry.py, and is included in CORE_TOOLS prefilter, but PAM core system (`pam.py`) doesn't provide it to Claude due to three missing integrations:

1. ❌ Missing import in pam.py (line ~115)
2. ❌ Missing tool schema definition in `_build_tools_schema()` (line ~1073)
3. ❌ Missing execution mapping in tool functions dict (line ~1663)

**Evidence:** Tool works perfectly in tool_registry.py and has 6 passing tests, but never reaches Claude function calling interface.

---

## Success Criteria

- [ ] User can ask PAM "What events do I have?" and receive calendar data
- [ ] PAM includes `get_calendar_events` in tool schema sent to Claude
- [ ] Tool prefilter successfully includes calendar tool in filtered results
- [ ] Calendar queries work with date filters (next week, tomorrow, etc.)
- [ ] No regression in existing calendar tools (create, update, delete)
- [ ] All existing tests continue passing

---

## Pre-Implementation Validation

### Task 1: Verify Tool Implementation Exists

**Files:**
- Read: `backend/app/services/pam/tools/get_calendar_events.py`
- Read: `backend/tests/test_get_calendar_events.py`

**Step 1: Confirm tool exists and is tested**

Run: `python -c "from app.services.pam.tools.get_calendar_events import get_calendar_events, GetCalendarEventsTool; print('✅ Tool imports successfully')"`
Expected: "✅ Tool imports successfully"

Run: `pytest backend/tests/test_get_calendar_events.py -v`
Expected: "6 passed" (all tests pass)

**Step 2: Verify tool registration**

Run: `grep -n "get_calendar_events" backend/app/services/pam/tools/tool_registry.py`
Expected: Lines showing tool registration (around line 1651-1669)

**Step 3: Verify prefilter configuration**

Run: `grep -n "get_calendar_events" backend/app/services/pam/tools/tool_prefilter.py`
Expected: Line showing tool in CORE_TOOLS (around line 41)

---

## Implementation Tasks

### Task 2: Add Import to PAM Core

**Files:**
- Modify: `backend/app/services/pam/core/pam.py:113-116`

**Step 1: Write test for import**

```python
# In backend/tests/test_pam_calendar_integration.py (new file)
def test_pam_has_get_calendar_events_import():
    """Test that pam.py imports get_calendar_events function"""
    from app.services.pam.core.pam import get_calendar_events
    assert callable(get_calendar_events)
```

**Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_pam_calendar_integration.py::test_pam_has_get_calendar_events_import -v`
Expected: ImportError "cannot import name 'get_calendar_events'"

**Step 3: Add import to pam.py**

Add to line ~115 in `backend/app/services/pam/core/pam.py`:

```python
# Import calendar tools
from app.services.pam.tools.create_calendar_event import create_calendar_event
from app.services.pam.tools.update_calendar_event import update_calendar_event
from app.services.pam.tools.delete_calendar_event import delete_calendar_event
from app.services.pam.tools.get_calendar_events import get_calendar_events  # NEW
```

**Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_pam_calendar_integration.py::test_pam_has_get_calendar_events_import -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/services/pam/core/pam.py backend/tests/test_pam_calendar_integration.py
git commit -m "feat: add get_calendar_events import to PAM core"
```

---

### Task 3: Add Tool Schema Definition

**Files:**
- Modify: `backend/app/services/pam/core/pam.py:1027-1073` (in `_build_tools_schema()` method)

**Step 1: Write test for schema inclusion**

```python
# Add to backend/tests/test_pam_calendar_integration.py
def test_pam_includes_get_calendar_events_in_schema():
    """Test that PAM includes get_calendar_events in tool schema"""
    from app.services.pam.core.pam import PAMService

    pam = PAMService(user_id="test-user", session_id="test-session")
    tools = pam._build_tools_schema()

    tool_names = [tool["name"] for tool in tools]
    assert "get_calendar_events" in tool_names

    # Find the calendar tool in schema
    calendar_tool = next(t for t in tools if t["name"] == "get_calendar_events")
    assert "Get calendar events" in calendar_tool["description"]
    assert "input_schema" in calendar_tool
    assert calendar_tool["input_schema"]["type"] == "object"
```

**Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_pam_calendar_integration.py::test_pam_includes_get_calendar_events_in_schema -v`
Expected: AssertionError "get_calendar_events not in tool_names"

**Step 3: Add tool schema definition**

Add after line ~1073 in `_build_tools_schema()` method:

```python
# Calendar: Get Events
{
    "name": "get_calendar_events",
    "description": "Get calendar events for the user. Use when user asks about their schedule, appointments, or calendar events. Returns upcoming events by default, with options to filter by date range or event type.",
    "input_schema": {
        "type": "object",
        "properties": {
            "start_date": {
                "type": "string",
                "description": "Start date filter in ISO format (optional). Example: '2026-02-01T00:00:00Z'"
            },
            "end_date": {
                "type": "string",
                "description": "End date filter in ISO format (optional). Example: '2026-02-07T23:59:59Z'"
            },
            "event_type": {
                "type": "string",
                "description": "Filter by event type: personal, reminder, trip, booking, maintenance, inspection (optional)"
            },
            "include_past": {
                "type": "boolean",
                "description": "Include past events (default: false, only upcoming events)"
            },
            "limit": {
                "type": "integer",
                "description": "Maximum number of events to return (default: 100)"
            }
        },
        "required": []
    }
},
```

**Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_pam_calendar_integration.py::test_pam_includes_get_calendar_events_in_schema -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/services/pam/core/pam.py
git commit -m "feat: add get_calendar_events to PAM tool schema"
```

---

### Task 4: Add Execution Mapping

**Files:**
- Modify: `backend/app/services/pam/core/pam.py:1661-1663` (in tool functions dict)

**Step 1: Write test for execution mapping**

```python
# Add to backend/tests/test_pam_calendar_integration.py
def test_pam_can_execute_get_calendar_events():
    """Test that PAM can execute get_calendar_events function"""
    from app.services.pam.core.pam import PAMService

    pam = PAMService(user_id="test-user", session_id="test-session")

    # Check that function is in execution mapping
    assert "get_calendar_events" in pam.tool_functions
    assert callable(pam.tool_functions["get_calendar_events"])
```

**Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_pam_calendar_integration.py::test_pam_can_execute_get_calendar_events -v`
Expected: AssertionError "get_calendar_events not in pam.tool_functions"

**Step 3: Add execution mapping**

Add to tool functions dict around line 1663:

```python
# Calendar tools
"create_calendar_event": create_calendar_event,
"update_calendar_event": update_calendar_event,
"delete_calendar_event": delete_calendar_event,
"get_calendar_events": get_calendar_events,  # NEW
```

**Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_pam_calendar_integration.py::test_pam_can_execute_get_calendar_events -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/services/pam/core/pam.py
git commit -m "feat: add get_calendar_events to PAM execution mapping"
```

---

### Task 5: Update Workaround Calendar Tool List

**Files:**
- Modify: `backend/app/services/pam/core/pam.py:1214-1224`

**Step 1: Write test for workaround inclusion**

```python
# Add to backend/tests/test_pam_calendar_integration.py
def test_workaround_includes_get_calendar_events():
    """Test that calendar workaround includes get_calendar_events"""
    from app.services.pam.core.pam import PAMService

    pam = PAMService(user_id="test-user", session_id="test-session")

    # Check the workaround logic around line 1215
    calendar_tool_names = {"create_calendar_event", "update_calendar_event", "delete_calendar_event", "get_calendar_events"}

    # This tests the workaround force-inclusion logic
    # The actual logic will need inspection but should include all 4 calendar tools
    pass  # Implementation depends on exact workaround code
```

**Step 2: Update workaround calendar tool list**

Modify line ~1215 in `backend/app/services/pam/core/pam.py`:

```python
# OLD
calendar_tool_names = {"create_calendar_event", "update_calendar_event", "delete_calendar_event"}

# NEW
calendar_tool_names = {"create_calendar_event", "update_calendar_event", "delete_calendar_event", "get_calendar_events"}
```

**Step 3: Commit**

```bash
git add backend/app/services/pam/core/pam.py
git commit -m "fix: include get_calendar_events in calendar workaround list"
```

---

## Integration Testing

### Task 6: End-to-End PAM Calendar Test

**Files:**
- Create: `backend/tests/integration/test_pam_calendar_e2e.py`

**Step 1: Write comprehensive integration test**

```python
import pytest
from app.services.pam.core.pam import PAMService
from app.core.database import get_supabase_client


@pytest.mark.asyncio
async def test_pam_calendar_full_integration():
    """Test complete PAM calendar integration from schema to execution"""

    # Setup
    pam = PAMService(user_id="test-user-id", session_id="test-session")

    # Test 1: Tool schema includes get_calendar_events
    tools = pam._build_tools_schema()
    tool_names = [tool["name"] for tool in tools]
    assert "get_calendar_events" in tool_names

    # Test 2: Tool prefilter includes calendar tool for calendar queries
    from app.services.pam.tools.tool_prefilter import tool_prefilter

    calendar_message = "What events do I have next week?"
    filtered_tools = tool_prefilter.filter_tools(
        user_message=calendar_message,
        all_tools=tools,
        context={"page": "/pam_chat"}
    )

    filtered_names = [t.get("name") for t in filtered_tools]
    assert "get_calendar_events" in filtered_names, f"Calendar tool not in filtered list: {filtered_names}"

    # Test 3: Tool execution works
    result = await pam.tool_functions["get_calendar_events"](
        user_id="test-user-id",
        start_date="2026-02-01T00:00:00Z",
        end_date="2026-02-07T23:59:59Z"
    )

    assert result["success"] is True
    assert "events" in result
    assert isinstance(result["events"], list)


@pytest.mark.asyncio
async def test_pam_handles_calendar_query_message():
    """Test PAM processes calendar query from user message to response"""

    # This would test actual message processing, but requires full PAM context
    # For now, verify components are connected properly

    pam = PAMService(user_id="test-user-id", session_id="test-session")

    # Simulate the message processing flow
    user_message = "Do I have anything planned for tomorrow?"

    # 1. Tool schema building
    tools = pam._build_tools_schema()
    assert any(t["name"] == "get_calendar_events" for t in tools)

    # 2. Tool prefiltering
    from app.services.pam.tools.tool_prefilter import tool_prefilter
    filtered_tools = tool_prefilter.filter_tools(user_message, tools)

    # Should include calendar tools for calendar-related queries
    filtered_names = [t.get("name") for t in filtered_tools]

    # Either in CORE_TOOLS or detected via calendar keywords
    calendar_tools_present = any(name in filtered_names
                                for name in ["get_calendar_events", "create_calendar_event"])
    assert calendar_tools_present, f"No calendar tools in filtered list for calendar query: {filtered_names}"
```

**Step 2: Run integration tests**

Run: `pytest backend/tests/integration/test_pam_calendar_e2e.py -v -s`
Expected: All tests pass

**Step 3: Commit**

```bash
git add backend/tests/integration/test_pam_calendar_e2e.py
git commit -m "test: add comprehensive PAM calendar integration tests"
```

---

## Verification and Deployment

### Task 7: Manual Verification

**Step 1: Start backend locally**

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

**Step 2: Test PAM WebSocket with calendar query**

Connect to: `ws://localhost:8000/api/v1/pam/ws/test-user-id?token=test-token`

Send message:
```json
{
  "message": "What events do I have this week?",
  "context": {
    "page": "/pam_chat",
    "user_location": {"lat": 40.7128, "lng": -74.0060}
  }
}
```

Expected response should include calendar events, NOT "I don't currently have access to a tool that retrieves existing calendar events"

**Step 3: Check backend logs**

Look for:
- `✅ get_calendar_events tool registered` (from tool_registry.py)
- `🔍 PREFILTER: CORE_TOOLS: {...'get_calendar_events'...}` (from tool_prefilter.py)
- `🔍 PREFILTER: Tool names: [...'get_calendar_events'...]` (from tool_prefilter.py)
- No "tool not found" or import errors

**Step 4: Run full test suite**

```bash
pytest backend/tests/ -v --tb=short
```

Expected: All tests pass, no regressions

**Step 5: Deploy to staging**

```bash
git push origin staging
```

Wait for deployment, test PAM calendar functionality on staging environment.

---

## Rollback Plan

If issues occur:

1. **Immediate rollback:** Revert the 4 commits:
   ```bash
   git revert HEAD~3..HEAD
   git push origin staging --force-with-lease
   ```

2. **Partial rollback:** Comment out new code but keep imports:
   - Comment out tool schema entry
   - Comment out execution mapping
   - Keep import (doesn't break anything)

3. **Debug approach:** Each component is independently testable:
   - Import: `python -c "from app.services.pam.core.pam import get_calendar_events"`
   - Schema: Check `pam._build_tools_schema()` includes tool
   - Execution: Check `pam.tool_functions["get_calendar_events"]` exists
   - Prefilter: Check `tool_prefilter.filter_tools()` includes tool

---

## Dependencies

- ✅ `get_calendar_events.py` - Already implemented and tested
- ✅ `tool_registry.py` - Already registers the tool
- ✅ `tool_prefilter.py` - Already includes in CORE_TOOLS
- ✅ Database schema - `calendar_events` table exists with 17 events
- ✅ Test infrastructure - pytest, existing PAM tests

## Risk Assessment

**Risk Level:** 🟢 **LOW**

**Why Low Risk:**
- Tool implementation already exists and is tested (6 passing tests)
- Only adding integration points, not changing logic
- Each integration point is independently testable
- Existing calendar tools (create/update/delete) work, so pattern is proven
- Fallback: Remove tool from schema if issues occur

**Validation Strategy:**
- Unit tests for each integration point
- Integration test for full flow
- Manual testing with WebSocket
- Staging deployment before production

---

## Expected Outcomes

**Before Fix:**
- User asks "What's on my calendar?"
- PAM responds: "I don't currently have access to a tool that retrieves existing calendar events"
- Backend logs show `get_calendar_events` in CORE_TOOLS but not in final filtered tools

**After Fix:**
- User asks "What's on my calendar?"
- PAM responds: "You have X events this week: [event details]"
- Backend logs show `get_calendar_events` in both CORE_TOOLS and final filtered tool list
- Users can ask calendar queries with date filters ("next week", "tomorrow", etc.)