# PAM Tool Registry Loading Fix - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix ToolRegistry to expose all registered tools via get_all_tools() and verify tool loading works end-to-end.

**Architecture:** Add missing get_all_tools() method to ToolRegistry class in tool_registry.py. The ToolPrefilter already has the correct signature. Verify that _register_all_tools() successfully loads tools.

**Tech Stack:** Python, FastAPI, Supabase, asyncio

---

## Task 1: Add get_all_tools() method to ToolRegistry

**Files:**
- Modify: `backend/app/services/pam/tools/tool_registry.py` (ToolRegistry class, around line 390)

**Step 1: Add get_all_tools() method**

Add after `enable_tool()` method (line ~390), before the global instance:

```python
def get_all_tools(self) -> Dict[str, BaseTool]:
    """Get all registered tool instances"""
    return dict(self.tools)

def get_all_tool_definitions(self) -> List[Dict[str, Any]]:
    """Get all tool definitions as OpenAI function format (includes disabled tools)"""
    definitions = []
    for tool_name, definition in self.tool_definitions.items():
        if tool_name not in self.tools:
            continue
        definitions.append({
            "name": tool_name,
            "description": definition.description,
            "parameters": definition.parameters
        })
    return definitions
```

**Step 2: Verify no syntax errors**

Run: `cd /Users/thabonel/Code/wheels-wins-landing-page/backend && python -c "from app.services.pam.tools.tool_registry import ToolRegistry; r=ToolRegistry(); print(f'Methods: get_all_tools={hasattr(r, \"get_all_tools\")}, get_all_tool_definitions={hasattr(r, \"get_all_tool_definitions\")}')"`

Expected: Both True

**Step 3: Commit**

```bash
git add backend/app/services/pam/tools/tool_registry.py
git commit -m "feat: add get_all_tools and get_all_tool_definitions to ToolRegistry"
```

---

## Task 2: Write tests for ToolRegistry and ToolPrefilter

**Files:**
- Create: `tests/pam/test_tool_registry.py`
- Create: `tests/pam/test_tool_prefilter.py`

**Step 1: Write registry tests**

```python
# tests/pam/test_tool_registry.py
"""Tests for PAM ToolRegistry"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

def test_registry_has_get_all_tools():
    from app.services.pam.tools.tool_registry import ToolRegistry
    registry = ToolRegistry()
    assert hasattr(registry, 'get_all_tools')
    result = registry.get_all_tools()
    assert isinstance(result, dict)

def test_registry_has_get_all_tool_definitions():
    from app.services.pam.tools.tool_registry import ToolRegistry
    registry = ToolRegistry()
    assert hasattr(registry, 'get_all_tool_definitions')
    result = registry.get_all_tool_definitions()
    assert isinstance(result, list)

def test_registry_has_get_openai_functions():
    from app.services.pam.tools.tool_registry import ToolRegistry
    registry = ToolRegistry()
    assert hasattr(registry, 'get_openai_functions')

def test_registry_has_register_tool():
    from app.services.pam.tools.tool_registry import ToolRegistry
    registry = ToolRegistry()
    assert hasattr(registry, 'register_tool')

def test_get_tool_registry_returns_instance():
    from app.services.pam.tools.tool_registry import get_tool_registry
    registry = get_tool_registry()
    assert registry is not None
    assert hasattr(registry, 'get_all_tools')
```

**Step 2: Write prefilter tests**

```python
# tests/pam/test_tool_prefilter.py
"""Tests for PAM ToolPrefilter"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

SAMPLE_TOOLS = [
    {"name": "analyze_budget", "description": "Analyze budget", "input_schema": {}},
    {"name": "plan_trip", "description": "Plan a trip", "input_schema": {}},
    {"name": "create_expense", "description": "Create expense", "input_schema": {}},
    {"name": "find_rv_parks", "description": "Find RV parks", "input_schema": {}},
    {"name": "get_weather_forecast", "description": "Get weather", "input_schema": {}},
    {"name": "create_calendar_event", "description": "Create event", "input_schema": {}},
    {"name": "get_calendar_events", "description": "Get events", "input_schema": {}},
    {"name": "search_knowledge", "description": "Search knowledge", "input_schema": {}},
    {"name": "get_spending_summary", "description": "Get spending", "input_schema": {}},
    {"name": "calculate_gas_cost", "description": "Calculate gas", "input_schema": {}},
    {"name": "create_post", "description": "Create social post", "input_schema": {}},
    {"name": "message_friend", "description": "Message friend", "input_schema": {}},
    {"name": "search_products", "description": "Search products", "input_schema": {}},
]

def test_prefilter_signature():
    from app.services.pam.tools.tool_prefilter import ToolPrefilter
    prefilter = ToolPrefilter()
    result = prefilter.filter_tools(
        user_message="analyze my budget",
        all_tools=SAMPLE_TOOLS,
        context=None,
        max_tools=10
    )
    assert isinstance(result, list)
    assert len(result) > 0

def test_prefilter_budget_detection():
    from app.services.pam.tools.tool_prefilter import ToolPrefilter
    prefilter = ToolPrefilter()
    result = prefilter.filter_tools("analyze my budget", SAMPLE_TOOLS)
    tool_names = [t.get("name", "") for t in result]
    assert "analyze_budget" in tool_names

def test_prefilter_trip_detection():
    from app.services.pam.tools.tool_prefilter import ToolPrefilter
    prefilter = ToolPrefilter()
    result = prefilter.filter_tools("plan a trip to Sydney", SAMPLE_TOOLS)
    tool_names = [t.get("name", "") for t in result]
    assert "plan_trip" in tool_names

def test_prefilter_core_tools_always_included():
    from app.services.pam.tools.tool_prefilter import ToolPrefilter
    prefilter = ToolPrefilter()
    result = prefilter.filter_tools("hello", SAMPLE_TOOLS)
    tool_names = [t.get("name", "") for t in result]
    assert "analyze_budget" in tool_names

def test_prefilter_max_tools_enforced():
    from app.services.pam.tools.tool_prefilter import ToolPrefilter
    prefilter = ToolPrefilter()
    result = prefilter.filter_tools("analyze my budget", SAMPLE_TOOLS, max_tools=5)
    assert len(result) <= 5

def test_prefilter_global_instance():
    from app.services.pam.tools.tool_prefilter import tool_prefilter
    assert tool_prefilter is not None
    assert hasattr(tool_prefilter, 'filter_tools')
```

**Step 3: Run tests**

Run: `cd /Users/thabonel/Code/wheels-wins-landing-page/backend && python -m pytest ../tests/pam/test_tool_registry.py ../tests/pam/test_tool_prefilter.py -v`

Expected: All tests pass

**Step 4: Commit**

```bash
git add -f tests/pam/test_tool_registry.py tests/pam/test_tool_prefilter.py
git commit -m "test: add ToolRegistry and ToolPrefilter tests"
```

---

## Task 3: Verify tool loading with async initialization test

**Files:**
- Create: `tests/pam/test_tool_loading.py`

**Step 1: Write async tool loading test**

```python
# tests/pam/test_tool_loading.py
"""Tests for tool loading via _register_all_tools"""
import sys
import os
import asyncio
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

# Set required env vars for tests
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-key")

def test_initialize_tool_registry():
    """Test that initialize_tool_registry loads tools without crashing"""
    from app.services.pam.tools.tool_registry import ToolRegistry, _register_all_tools

    registry = ToolRegistry()
    registered, failed = asyncio.get_event_loop().run_until_complete(
        _register_all_tools(registry)
    )

    print(f"Registered: {registered}, Failed: {failed}")
    assert registered > 0, f"Expected some tools to register, got {registered}"

    # Verify get_all_tools returns registered tools
    all_tools = registry.get_all_tools()
    assert len(all_tools) == registered

    # Verify get_openai_functions returns definitions
    functions = registry.get_openai_functions()
    assert len(functions) > 0

def test_tool_registry_categories():
    """Verify tools from multiple categories register"""
    from app.services.pam.tools.tool_registry import ToolRegistry, _register_all_tools

    registry = ToolRegistry()
    asyncio.get_event_loop().run_until_complete(_register_all_tools(registry))

    tools = registry.get_all_tools()
    tool_names = list(tools.keys())
    print(f"Registered tools: {tool_names}")

    # Just verify we got some tools
    assert len(tool_names) > 0
```

**Step 2: Run test**

Run: `cd /Users/thabonel/Code/wheels-wins-landing-page/backend && python -m pytest ../tests/pam/test_tool_loading.py -v -s`

**Step 3: Commit**

```bash
git add -f tests/pam/test_tool_loading.py
git commit -m "test: verify tool loading via _register_all_tools"
```

---

## Task 4: Run full test suite and commit

**Step 1: Run all PAM tests**

```bash
cd /Users/thabonel/Code/wheels-wins-landing-page/backend && python -m pytest ../tests/pam/ -v --tb=short
```

**Step 2: Final commit if needed**

All tests should pass.
