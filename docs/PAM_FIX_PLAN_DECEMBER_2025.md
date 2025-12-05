# PAM Fix Plan - December 2025

**Status:** Analysis Complete
**Problem:** PAM talks but has no access to tools or user data
**Root Cause:** Multiple compounding issues identified

---

## Executive Summary

After deep investigation, I found **THREE SYSTEMS** competing to be PAM:

1. **PAM Core (`pam.py`)** - 43+ tools, Claude integration, CURRENTLY ACTIVE
2. **Enhanced Orchestrator (`enhanced_orchestrator.py`)** - Different tool registry, OpenAI format
3. **Tool Registry (`tool_registry.py`)** - Wrapper-based tools using nodes

The WebSocket endpoint (`pam_main.py` line 1459-1467) uses PAM Core correctly:
```python
from app.services.pam.core import get_pam
pam = await get_pam(user_id, user_language=context.get("language", "en"))
response_message = await pam.chat(message, context, stream=False)
```

---

## Root Cause Analysis

### Issue 1: Tool Prefilter Name Mismatch (CRITICAL)

**File:** `backend/app/services/pam/tools/tool_prefilter.py`

The prefilter's `TOOL_CATEGORIES` uses DIFFERENT names than actual tools:

| Prefilter Uses | Actual Tool Name |
|---------------|------------------|
| `add_expense` | `create_expense` |
| `get_expenses` | `analyze_budget` |
| `update_expense` | (no direct equivalent) |
| `get_budget` | (no direct equivalent) |
| `plan_trip` | `plan_trip` (correct) |

**Prefilter's CORE_TOOLS** are completely wrong:
```python
CORE_TOOLS = {
    "get_time",           # DOESN'T EXIST
    "get_location",       # DOESN'T EXIST
    "think",              # DOESN'T EXIST
    "load_user_profile",  # DOESN'T EXIST
    "get_user_context",   # DOESN'T EXIST
    "save_user_preference" # DOESN'T EXIST
}
```

**Impact:** Prefilter returns 0 tools, fallback sends ALL 43 tools (too many).

### Issue 2: Too Many Tools Overwhelm Claude

When prefilter fails, ALL 43 tools are sent to Claude. This:
- Uses excessive tokens (43 x 300 = 12,900+ tokens just for tools)
- Overwhelms Claude's decision-making
- Claude may default to conversation instead of tool use

### Issue 3: No Explicit Tool Usage Instructions

The system prompt mentions tools but doesn't strongly instruct Claude to USE them:
```python
**Your Capabilities:**
You can:
- Manage finances (add expenses, track budgets, log savings)
...
```

Claude needs explicit instructions like: "When the user asks about their budget/expenses/spending, you MUST call the analyze_budget tool."

### Issue 4: Context Not Reaching Tools Properly

In `_execute_tools()` (line 1407-1416):
```python
tool_input["user_id"] = self.user_id

# Extract context from the last user message in conversation history
recent_context = {}
for msg in reversed(self.conversation_history):
    if msg.get("role") == "user" and msg.get("context"):
        recent_context = msg.get("context", {})
        break

if recent_context:
    tool_input["context"] = recent_context
```

Context IS being passed, but only if it exists in conversation history.

---

## The Simple Fix Plan

### Phase 1: Fix Tool Prefilter (30 min)

Update `tool_prefilter.py` to use ACTUAL tool names:

```python
CORE_TOOLS = {
    "create_expense",
    "analyze_budget",
    "get_spending_summary",
    "plan_trip",
    "get_weather_forecast",
    "create_calendar_event"
}

TOOL_CATEGORIES = {
    # Budget tools (ACTUAL NAMES)
    "create_expense": "budget",
    "track_savings": "budget",
    "analyze_budget": "budget",
    "get_spending_summary": "budget",
    "update_budget": "budget",
    "compare_vs_budget": "budget",
    "predict_end_of_month": "budget",
    "find_savings_opportunities": "budget",
    "categorize_transaction": "budget",
    "export_budget_report": "budget",
    # Trip tools
    "plan_trip": "trip",
    "find_rv_parks": "trip",
    "get_weather_forecast": "trip",
    "calculate_gas_cost": "trip",
    "find_cheap_gas": "trip",
    "optimize_route": "trip",
    "get_road_conditions": "trip",
    "find_attractions": "trip",
    "estimate_travel_time": "trip",
    "save_favorite_spot": "trip",
    # etc.
}
```

### Phase 2: Strengthen System Prompt (15 min)

Add explicit tool usage instructions to `_build_system_prompt()`:

```python
**CRITICAL - Tool Usage Rules:**
You MUST use tools when the user asks about:
- Expenses, spending, money, budget, costs -> Call analyze_budget or get_spending_summary
- Trips, travel, route, drive -> Call plan_trip or optimize_route
- Weather, forecast, temperature -> Call get_weather_forecast
- Calendar, appointment, event -> Call create_calendar_event or update_calendar_event
- Find RV parks, campgrounds -> Call find_rv_parks

DO NOT just respond with text when tools can provide real data.
ALWAYS prefer tool results over generic answers.
```

### Phase 3: Reduce Tool Count (15 min)

Group related tools or limit to top 15 most useful tools for better Claude decision-making.

Most important tools to keep:
1. `create_expense` - Log expenses
2. `analyze_budget` - Budget analysis
3. `get_spending_summary` - Spending report
4. `plan_trip` - Trip planning
5. `get_weather_forecast` - Weather
6. `find_rv_parks` - Campground search
7. `calculate_gas_cost` - Fuel costs
8. `find_cheap_gas` - Gas stations
9. `create_calendar_event` - Calendar
10. `search_products` - Shop
11. `search_knowledge` - Knowledge base
12. `update_profile` - Profile updates
13. `get_user_stats` - User statistics
14. `track_savings` - Savings tracking
15. `optimize_route` - Route optimization

### Phase 4: Add Debug Logging (10 min)

Add logging to verify tools are being called:

```python
# In _get_response(), after Claude returns:
logger.info(f"Claude response stop_reason: {response.stop_reason}")
logger.info(f"Claude response content types: {[type(b).__name__ for b in response.content]}")

if response.stop_reason == "tool_use":
    tool_names = [b.name for b in response.content if hasattr(b, 'name')]
    logger.info(f"Tools being called: {tool_names}")
```

---

## Implementation Priority

| Step | Action | Time | Impact |
|------|--------|------|--------|
| 1 | Fix tool prefilter names | 30 min | HIGH - Tools will be selected correctly |
| 2 | Strengthen system prompt | 15 min | HIGH - Claude will use tools proactively |
| 3 | Add debug logging | 10 min | MEDIUM - Visibility into issues |
| 4 | Test on staging | 15 min | CRITICAL - Verify fix works |
| 5 | Deploy to production | 10 min | Deliver working PAM |

**Total Time:** ~1.5 hours

---

## Verification Steps

After fixes, test these queries:

1. "What did I spend this month?" -> Should call `analyze_budget` or `get_spending_summary`
2. "Add $50 gas expense" -> Should call `create_expense`
3. "What's the weather in Phoenix?" -> Should call `get_weather_forecast`
4. "Plan a trip from Phoenix to Denver" -> Should call `plan_trip`
5. "Find RV parks near Yellowstone" -> Should call `find_rv_parks`

Check logs for:
- "Tool prefiltering: X/43 tools" (should be 5-10, not 0 or 43)
- "Claude response stop_reason: tool_use" (confirms tool is called)
- "Executing tool: [tool_name]" (confirms execution)
- Tool results in response

---

## Long-term Recommendations

1. **Remove Enhanced Orchestrator complexity** - It adds confusion
2. **Standardize on PAM Core** - One system, one truth
3. **Add tool usage metrics** - Track which tools are called
4. **Monitor tool success rate** - Catch failures early
5. **User feedback loop** - Learn which tools users need most

---

**Next Steps:** Implement Phase 1-4, test on staging, then deploy.
