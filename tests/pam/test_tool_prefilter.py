"""Tests for PAM ToolPrefilter - verifies tool filtering by category"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-key")


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
    {"name": "optimize_route", "description": "Optimize route", "input_schema": {}},
    {"name": "track_savings", "description": "Track savings", "input_schema": {}},
]


def _tool_names(tools):
    return [t.get("name", t.get("function", {}).get("name", "")) for t in tools]


def test_prefilter_accepts_all_tools_param():
    """filter_tools must accept user_message and all_tools positional args"""
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
    """Budget keywords must return budget tools"""
    from app.services.pam.tools.tool_prefilter import ToolPrefilter
    prefilter = ToolPrefilter()
    result = prefilter.filter_tools("analyze my monthly budget", SAMPLE_TOOLS)
    names = _tool_names(result)
    assert "analyze_budget" in names


def test_prefilter_trip_detection():
    """Trip keywords must return trip tools"""
    from app.services.pam.tools.tool_prefilter import ToolPrefilter
    prefilter = ToolPrefilter()
    result = prefilter.filter_tools("plan a trip to Sydney", SAMPLE_TOOLS)
    names = _tool_names(result)
    assert "plan_trip" in names


def test_prefilter_social_detection():
    """Social keywords must return social tools"""
    from app.services.pam.tools.tool_prefilter import ToolPrefilter
    prefilter = ToolPrefilter()
    result = prefilter.filter_tools("message my friend about the trip", SAMPLE_TOOLS)
    names = _tool_names(result)
    assert "message_friend" in names


def test_prefilter_core_tools_always_included():
    """Core tools must always be included regardless of message"""
    from app.services.pam.tools.tool_prefilter import ToolPrefilter
    prefilter = ToolPrefilter()
    result = prefilter.filter_tools("hello there", SAMPLE_TOOLS)
    names = _tool_names(result)
    assert "analyze_budget" in names


def test_prefilter_max_tools_limits_non_core():
    """max_tools caps total - core tools are always kept, category tools trimmed"""
    from app.services.pam.tools.tool_prefilter import ToolPrefilter
    prefilter = ToolPrefilter()
    # With max_tools=15, prefilter should return at most 15
    result = prefilter.filter_tools("analyze my budget", SAMPLE_TOOLS, max_tools=15)
    assert len(result) <= 15
    # Core tools always included even if it exceeds max_tools
    result_small = prefilter.filter_tools("analyze my budget", SAMPLE_TOOLS, max_tools=3)
    core_in_sample = [t for t in SAMPLE_TOOLS if t["name"] in prefilter.CORE_TOOLS]
    assert len(result_small) >= len(core_in_sample)


def test_prefilter_global_instance():
    """Module-level tool_prefilter singleton must exist"""
    from app.services.pam.tools.tool_prefilter import tool_prefilter
    assert tool_prefilter is not None
    assert hasattr(tool_prefilter, 'filter_tools')


def test_prefilter_calendar_detection():
    """Calendar keywords must return calendar tools"""
    from app.services.pam.tools.tool_prefilter import ToolPrefilter
    prefilter = ToolPrefilter()
    result = prefilter.filter_tools("book a dentist appointment for tomorrow", SAMPLE_TOOLS)
    names = _tool_names(result)
    assert "create_calendar_event" in names


def test_prefilter_empty_tools_list():
    """Empty tools list must return empty result"""
    from app.services.pam.tools.tool_prefilter import ToolPrefilter
    prefilter = ToolPrefilter()
    result = prefilter.filter_tools("analyze budget", [])
    assert result == []
