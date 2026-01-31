"""
Test PAM calendar integration to ensure get_calendar_events is properly imported.
"""
import pytest


def test_pam_has_get_calendar_events_import():
    """Test that pam.py imports get_calendar_events function"""
    from app.services.pam.core.pam import get_calendar_events
    assert callable(get_calendar_events)


