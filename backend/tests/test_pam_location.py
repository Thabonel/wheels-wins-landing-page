"""
Regression tests for PAM location awareness.

These tests catch the recurring bug where per-request GPS coordinates
do not reach PAM's system prompt.

Bug history: broke and was re-patched 5+ times in 6 months (Aug 2025 - Feb 2026).
Each time the fix addressed one code path while leaving others broken, and no test
existed to catch regressions. Do not remove these tests.

Root causes fixed:
- RC-2: pam.py read 'location' string key instead of 'user_location' dict
- RC-4: chat() never merged per-request GPS into system prompt
"""
import pytest
from unittest.mock import patch, MagicMock, AsyncMock

from app.services.pam.core.pam import PAM


def make_pam(user_context=None):
    """Create a PAM instance with optional pre-loaded user context."""
    return PAM(user_id="test-user", user_language="en", user_context=user_context or {})


# ---------------------------------------------------------------------------
# Unit tests: pam.py location logic
# ---------------------------------------------------------------------------

def test_merge_request_location_updates_system_prompt():
    """RC-4: per-request GPS must reach the system prompt via _merge_request_location."""
    pam = make_pam()
    pam._merge_request_location({
        "user_location": {
            "lat": -33.8688, "lng": 151.2093,
            "city": "Sydney", "country": "Australia"
        }
    })
    assert "Sydney" in pam.system_prompt
    assert "Australia" in pam.system_prompt


def test_merge_request_location_skips_rebuild_when_unchanged():
    """Performance: system prompt not rebuilt when location hasn't changed."""
    pam = make_pam()
    loc = {"lat": -33.8688, "lng": 151.2093, "city": "Sydney", "country": "Australia"}
    pam._merge_request_location({"user_location": loc})
    original_prompt = pam.system_prompt
    pam._merge_request_location({"user_location": loc})  # Same location - no rebuild
    assert pam.system_prompt is original_prompt  # Same object, not rebuilt


def test_merge_request_location_rebuilds_on_location_change():
    """System prompt is rebuilt when user moves to a new location."""
    pam = make_pam()
    pam._merge_request_location({
        "user_location": {"lat": -33.8688, "lng": 151.2093, "city": "Sydney", "country": "Australia"}
    })
    first_prompt = pam.system_prompt
    pam._merge_request_location({
        "user_location": {"lat": -37.8136, "lng": 144.9631, "city": "Melbourne", "country": "Australia"}
    })
    assert pam.system_prompt is not first_prompt
    assert "Melbourne" in pam.system_prompt
    assert "Sydney" not in pam.system_prompt


def test_location_section_reads_user_location_dict():
    """RC-2: _build_user_context_section must read 'user_location' dict, not 'location' string."""
    pam = make_pam({
        "user_location": {
            "lat": -27.47, "lng": 153.03,
            "city": "Brisbane", "country": "Australia"
        }
    })
    section = pam._build_user_context_section()
    assert "Brisbane" in section
    assert "Australia" in section


def test_location_section_includes_coordinates():
    """Coordinates (lat/lng) must appear in the location section for tools that need them."""
    pam = make_pam({
        "user_location": {
            "lat": -33.8688, "lng": 151.2093,
            "city": "Sydney", "country": "Australia"
        }
    })
    section = pam._build_user_context_section()
    assert "-33.8688" in section
    assert "151.2093" in section


def test_location_fallback_to_region_string():
    """Backward compat: region string in 'location' key still works as fallback."""
    pam = make_pam({"location": "Queensland"})
    section = pam._build_user_context_section()
    assert "Queensland" in section


def test_no_crash_when_location_missing():
    """No location should not crash or produce garbage output."""
    pam = make_pam({})
    section = pam._build_user_context_section()
    assert "Location" not in section


def test_no_crash_when_user_location_is_none():
    """Explicit None from cache_warming (Slice 3) handled gracefully - falls back to string."""
    pam = make_pam({"user_location": None, "location": "Victoria"})
    section = pam._build_user_context_section()
    assert "Victoria" in section


def test_no_crash_when_user_location_is_empty_dict():
    """Empty dict falls through to region string fallback."""
    pam = make_pam({"user_location": {}, "location": "New South Wales"})
    section = pam._build_user_context_section()
    assert "New South Wales" in section


# ---------------------------------------------------------------------------
# Integration test: chat() -> _merge_request_location -> system prompt
#
# This test catches the "6th code path bypass" pattern where someone adds a new
# orchestrator or refactors chat() and accidentally skips _merge_request_location.
# ---------------------------------------------------------------------------

async def test_chat_calls_merge_request_location_with_context():
    """
    Full-path integration: chat() must call _merge_request_location so that
    per-request GPS coordinates reach the system prompt passed to Claude.

    This test catches the bypass pattern. If someone removes the
    _merge_request_location() call from chat(), or adds a new code path that
    skips it, this test will fail.
    """
    pam = make_pam()
    context_with_location = {
        "user_location": {
            "lat": -33.8688, "lng": 151.2093,
            "city": "Sydney", "country": "Australia"
        }
    }

    # Track calls to _merge_request_location
    merge_calls = []
    original_merge = pam._merge_request_location

    def capturing_merge(ctx):
        merge_calls.append(ctx)
        original_merge(ctx)

    pam._merge_request_location = capturing_merge

    # Mock check_message_safety (network call) and _get_response (Claude API call)
    mock_safety = MagicMock()
    mock_safety.is_malicious = False
    mock_safety.detection_method = "test"
    mock_safety.latency_ms = 1.0

    with patch(
        "app.services.pam.core.pam.check_message_safety",
        new_callable=AsyncMock,
        return_value=mock_safety
    ), patch.object(pam, "_get_response", new_callable=AsyncMock, return_value="Sunny in Sydney."):
        await pam.chat(message="What's the weather?", context=context_with_location)

    assert merge_calls, (
        "chat() never called _merge_request_location. "
        "Someone removed the call from chat() or added a bypass."
    )
    assert "Sydney" in pam.system_prompt, (
        "Location 'Sydney' missing from system prompt after chat(). "
        "_merge_request_location was called but did not update the system prompt correctly."
    )
