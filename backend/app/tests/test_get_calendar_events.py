"""
Test for get_calendar_events tool - enables PAM to read existing calendar events

This tool fills the critical functional gap identified in the PAM audit:
users cannot ask "What are my upcoming appointments?" because PAM lacks
the ability to read existing calendar events.

Following TDD principles - this test is written BEFORE implementation.
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import patch

# Import will fail initially - this is expected for TDD RED phase
from app.services.pam.tools.get_calendar_events import get_calendar_events


@pytest.mark.asyncio
async def test_get_calendar_events_success(test_user_id):
    """Test successful retrieval of calendar events for user"""

    # Mock data - upcoming events
    mock_events = [
        {
            "id": "event-1",
            "user_id": test_user_id,
            "title": "Doctor Appointment",
            "description": "Annual checkup",
            "start_date": (datetime.utcnow() + timedelta(days=1)).isoformat() + "Z",
            "end_date": (datetime.utcnow() + timedelta(days=1, hours=1)).isoformat() + "Z",
            "all_day": False,
            "event_type": "appointment",
            "location_name": "Medical Center",
            "reminder_minutes": [15, 60],
            "color": "#3b82f6",
            "is_private": True,
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "id": "event-2",
            "user_id": test_user_id,
            "title": "Trip to Yosemite",
            "description": "Weekend camping trip",
            "start_date": (datetime.utcnow() + timedelta(days=7)).isoformat() + "Z",
            "end_date": (datetime.utcnow() + timedelta(days=9)).isoformat() + "Z",
            "all_day": True,
            "event_type": "trip",
            "location_name": "Yosemite National Park",
            "reminder_minutes": [1440],  # 1 day before
            "color": "#059669",
            "is_private": False,
            "created_at": datetime.utcnow().isoformat()
        }
    ]

    with patch('app.services.pam.tools.get_calendar_events.safe_db_select', return_value=mock_events):
        result = await get_calendar_events(user_id=test_user_id)

    # Assertions
    assert result["success"] is True
    assert "events" in result
    assert len(result["events"]) == 2
    assert result["events"][0]["title"] == "Doctor Appointment"
    assert result["events"][1]["title"] == "Trip to Yosemite"

    # Assertions about the results
    assert "message" in result
    assert result["count"] == 2


@pytest.mark.asyncio
async def test_get_calendar_events_filter_upcoming(test_user_id):
    """Test filtering for upcoming events only (default behavior)"""

    # Mock data with past and future events
    now = datetime.utcnow()
    past_event = {
        "id": "past-event",
        "user_id": test_user_id,
        "title": "Past Event",
        "start_date": (now - timedelta(days=1)).isoformat() + "Z",
        "end_date": (now - timedelta(hours=23)).isoformat() + "Z",
        "all_day": False
    }

    future_event = {
        "id": "future-event",
        "user_id": test_user_id,
        "title": "Future Event",
        "start_date": (now + timedelta(days=1)).isoformat() + "Z",
        "end_date": (now + timedelta(days=1, hours=1)).isoformat() + "Z",
        "all_day": False
    }

    # Return both events, but function should filter out past events
    mock_events = [past_event, future_event]

    with patch('app.services.pam.tools.get_calendar_events.safe_db_select', return_value=mock_events):
        result = await get_calendar_events(user_id=test_user_id)

    assert result["success"] is True
    assert len(result["events"]) == 1
    assert result["events"][0]["title"] == "Future Event"


@pytest.mark.asyncio
async def test_get_calendar_events_with_date_range(test_user_id):
    """Test filtering events within specific date range"""

    start_date = datetime.utcnow() + timedelta(days=1)
    end_date = datetime.utcnow() + timedelta(days=7)

    mock_events = [
        {
            "id": "event-in-range",
            "user_id": test_user_id,
            "title": "Event In Range",
            "start_date": (start_date + timedelta(days=2)).isoformat() + "Z",
            "end_date": (start_date + timedelta(days=2, hours=1)).isoformat() + "Z",
            "all_day": False
        }
    ]

    with patch('app.services.pam.tools.get_calendar_events.safe_db_select', return_value=mock_events):
        result = await get_calendar_events(
            user_id=test_user_id,
            start_date=start_date.isoformat() + "Z",
            end_date=end_date.isoformat() + "Z"
        )

    assert result["success"] is True
    assert len(result["events"]) == 1
    assert result["events"][0]["title"] == "Event In Range"


@pytest.mark.asyncio
async def test_get_calendar_events_no_events(test_user_id):
    """Test when user has no calendar events"""

    mock_events = []  # No events

    with patch('app.services.pam.tools.get_calendar_events.safe_db_select', return_value=mock_events):
        result = await get_calendar_events(user_id=test_user_id)

    assert result["success"] is True
    assert "events" in result
    assert len(result["events"]) == 0
    assert "message" in result
    assert "no events" in result["message"].lower()


@pytest.mark.asyncio
async def test_get_calendar_events_database_error(test_user_id):
    """Test handling of database errors"""

    with patch('app.services.pam.tools.get_calendar_events.safe_db_select', side_effect=Exception("Database error")):
        result = await get_calendar_events(user_id=test_user_id)

    assert result["success"] is False
    assert "error" in result


@pytest.mark.asyncio
async def test_get_calendar_events_invalid_user_id():
    """Test with invalid user ID"""

    result = await get_calendar_events(user_id="invalid-uuid")

    assert result["success"] is False
    assert "error" in result
    assert "invalid" in result["error"].lower() or "uuid" in result["error"].lower()