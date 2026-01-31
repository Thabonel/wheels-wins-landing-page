"""
Test PAM calendar integration to ensure get_calendar_events is properly imported.
"""
import pytest


def test_pam_has_get_calendar_events_import():
    """Test that pam.py imports get_calendar_events function"""
    from app.services.pam.core.pam import get_calendar_events
    assert callable(get_calendar_events)


def test_pam_includes_get_calendar_events_in_schema():
    """Test that PAM includes get_calendar_events in tool schema"""
    from app.services.pam.core.pam import PAM

    pam = PAM(user_id="test-user")
    tools = pam._build_tools_schema()

    tool_names = [tool["name"] for tool in tools]
    assert "get_calendar_events" in tool_names

    # Find the calendar tool in schema
    calendar_tool = next(t for t in tools if t["name"] == "get_calendar_events")
    assert "Get calendar events" in calendar_tool["description"]
    assert "input_schema" in calendar_tool
    assert calendar_tool["input_schema"]["type"] == "object"


