"""
Contract tests for Pam V2 schemas and the health endpoint.

These tests verify that request/event contracts are stable and that the
/api/v2/pam/health endpoint reports status without making model calls.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.schemas.pam_v2 import (
    PamTurnRequestV2,
    TurnStartedEvent,
    TextDeltaEvent,
    ToolStartedEvent,
    ToolCompletedEvent,
    ApprovalRequiredEvent,
    ActionEvent,
    TurnCompletedEvent,
    ErrorEvent,
    PamHealthResponseV2,
    PAM_V2_SCHEMA_VERSION,
)


client = TestClient(app)


class TestPamTurnRequestV2:
    def test_minimal_valid_request(self):
        req = PamTurnRequestV2(message="Hello Pam")
        assert req.message == "Hello Pam"
        assert req.channel.value == "text"
        assert req.locale == "en-AU"
        assert req.timezone == "Australia/Sydney"
        assert req.approval_token is None
        assert req.conversation_id
        assert req.client_message_id

    def test_whitespace_message_rejected(self):
        with pytest.raises(ValueError):
            PamTurnRequestV2(message="   ")

    def test_empty_message_rejected(self):
        with pytest.raises(ValueError):
            PamTurnRequestV2(message="")

    def test_voice_channel_accepted(self):
        req = PamTurnRequestV2(
            message="What campsites are nearby?",
            channel="voice",
            locale="en-US",
            timezone="America/New_York",
        )
        assert req.channel.value == "voice"
        assert req.locale == "en-US"


class TestPamEventV2:
    def test_turn_started_event(self):
        event = TurnStartedEvent(
            trace_id="trace-1",
            sequence=0,
            conversation_id="conv-1",
            client_message_id="msg-1",
        )
        assert event.event == "turn_started"
        assert event.schema_version == PAM_V2_SCHEMA_VERSION
        assert event.sequence == 0

    def test_text_delta_event(self):
        event = TextDeltaEvent(
            trace_id="trace-1",
            sequence=1,
            delta="Hello",
        )
        assert event.event == "text_delta"
        assert event.delta == "Hello"

    def test_tool_lifecycle_events(self):
        started = ToolStartedEvent(
            trace_id="trace-1",
            sequence=2,
            tool_call_id="tc-1",
            tool_name="get_weather",
            namespace="travel",
        )
        completed = ToolCompletedEvent(
            trace_id="trace-1",
            sequence=3,
            tool_call_id="tc-1",
            tool_name="get_weather",
            status="success",
            result_summary="Sunny, 24°C",
        )
        assert started.event == "tool_started"
        assert completed.event == "tool_completed"
        assert completed.status == "success"

    def test_approval_required_event(self):
        from datetime import datetime, timedelta

        event = ApprovalRequiredEvent(
            trace_id="trace-1",
            sequence=4,
            approval_token="token-123",
            action_type="create_calendar_event",
            action_summary="Create event 'Dinner' at 7pm",
            expires_at=datetime.utcnow() + timedelta(minutes=5),
        )
        assert event.event == "approval_required"
        assert event.approval_token == "token-123"

    def test_action_event(self):
        event = ActionEvent(
            trace_id="trace-1",
            sequence=5,
            action_type="calendar_preview",
            payload={"title": "Dinner", "start": "2026-06-20T19:00:00Z"},
        )
        assert event.event == "action"
        assert event.action_type == "calendar_preview"

    def test_turn_completed_event(self):
        event = TurnCompletedEvent(
            trace_id="trace-1",
            sequence=6,
            conversation_id="conv-1",
            client_message_id="msg-1",
            finish_reason="completed",
        )
        assert event.event == "turn_completed"
        assert event.finish_reason == "completed"

    def test_error_event(self):
        event = ErrorEvent(
            trace_id="trace-1",
            sequence=0,
            code="invalid_request",
            message="Message cannot be empty",
        )
        assert event.event == "error"
        assert event.code == "invalid_request"


class TestPamV2Health:
    def test_health_returns_schema_version(self):
        response = client.get("/api/v2/pam/health")
        assert response.status_code == 200
        data = response.json()
        assert data["schema_version"] == PAM_V2_SCHEMA_VERSION
        assert data["status"] == "ok"

    def test_health_reports_pam_v2_enabled(self):
        response = client.get("/api/v2/pam/health")
        assert response.status_code == 200
        data = response.json()
        assert "pam_v2_enabled" in data
        assert isinstance(data["pam_v2_enabled"], bool)

    def test_health_no_model_call(self):
        # Health endpoint must not depend on external model APIs.
        response = client.get("/api/v2/pam/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        # Provider/model may be None when not configured; the endpoint still works.
        assert "provider" in data
        assert "model" in data

    def test_health_matches_response_model(self):
        response = client.get("/api/v2/pam/health")
        assert response.status_code == 200
        PamHealthResponseV2(**response.json())
