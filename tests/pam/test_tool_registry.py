"""Tests for PAM ToolRegistry - verifies tool discovery and registration"""
import sys
import os
import asyncio

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

# Override env vars that break pydantic Settings in test context
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-key")


def test_registry_has_get_all_tools():
    """ToolRegistry must expose get_all_tools() method"""
    from app.services.pam.tools.tool_registry import ToolRegistry
    registry = ToolRegistry()
    assert hasattr(registry, 'get_all_tools')
    result = registry.get_all_tools()
    assert isinstance(result, dict)


def test_registry_has_get_all_tool_definitions():
    """ToolRegistry must expose get_all_tool_definitions() method"""
    from app.services.pam.tools.tool_registry import ToolRegistry
    registry = ToolRegistry()
    assert hasattr(registry, 'get_all_tool_definitions')
    result = registry.get_all_tool_definitions()
    assert isinstance(result, list)


def test_registry_has_get_openai_functions():
    """ToolRegistry must expose get_openai_functions() method"""
    from app.services.pam.tools.tool_registry import ToolRegistry
    registry = ToolRegistry()
    assert hasattr(registry, 'get_openai_functions')


def test_registry_has_register_tool():
    """ToolRegistry must expose register_tool() method"""
    from app.services.pam.tools.tool_registry import ToolRegistry
    registry = ToolRegistry()
    assert hasattr(registry, 'register_tool')


def test_get_tool_registry_returns_instance():
    """get_tool_registry() must return a ToolRegistry instance"""
    from app.services.pam.tools.tool_registry import get_tool_registry
    registry = get_tool_registry()
    assert registry is not None
    assert hasattr(registry, 'get_all_tools')
    assert hasattr(registry, 'get_openai_functions')


def test_tool_loading_registers_tools():
    """_register_all_tools must register >50 tools"""
    from app.services.pam.tools.tool_registry import ToolRegistry, _register_all_tools

    registry = ToolRegistry()
    registered, failed = asyncio.get_event_loop().run_until_complete(
        _register_all_tools(registry)
    )

    assert registered > 50, f"Expected >50 tools, got {registered}"

    all_tools = registry.get_all_tools()
    assert len(all_tools) > 50, f"Expected >50 tools in dict, got {len(all_tools)}"

    functions = registry.get_openai_functions()
    assert len(functions) > 50, f"Expected >50 OpenAI functions, got {len(functions)}"

    definitions = registry.get_all_tool_definitions()
    assert len(definitions) > 50, f"Expected >50 definitions, got {len(definitions)}"


def test_tool_categories_covered():
    """Must have tools from budget, trip, social, and calendar categories"""
    from app.services.pam.tools.tool_registry import ToolRegistry, _register_all_tools

    registry = ToolRegistry()
    asyncio.get_event_loop().run_until_complete(_register_all_tools(registry))

    tool_names = set(registry.get_all_tools().keys())

    # Budget tools
    assert "analyze_budget" in tool_names or "manage_finances" in tool_names
    assert "create_expense" in tool_names or "manage_finances" in tool_names
    # Trip tools
    assert "plan_trip" in tool_names
    assert "find_rv_parks" in tool_names
    assert "calculate_gas_cost" in tool_names
    # Social tools
    assert "create_post" in tool_names
    # Calendar tools
    assert "create_calendar_event" in tool_names
    assert "get_calendar_events" in tool_names
