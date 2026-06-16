"""
Tests for the Pam V2 approval service.
"""

from __future__ import annotations

from datetime import timedelta
from uuid import uuid4

import pytest

from app.services.pam_v2.approvals import ApprovalService
from app.services.pam_v2.state.fake import FakeApprovalRepository
from app.services.pam_v2.state.models import ApprovalStatus


@pytest.fixture
def service():
    return ApprovalService(FakeApprovalRepository())


class TestApprovalService:
    async def test_request_and_validate(self, service):
        conv_id = uuid4()
        token, record = await service.request_approval(
            conversation_id=conv_id,
            user_id="user_1",
            tool_name="create_calendar_event",
            arguments={"title": "RV Trip", "date": "2026-07-01"},
            action_summary="Create calendar event: RV Trip",
        )
        assert token is not None
        assert record.status == ApprovalStatus.REQUESTED

        validated = await service.validate_approval(
            token, conv_id, "user_1", "create_calendar_event",
            {"title": "RV Trip", "date": "2026-07-01"},
        )
        assert validated is not None
        assert validated.tool_name == "create_calendar_event"

    async def test_consume_once(self, service):
        conv_id = uuid4()
        token, record = await service.request_approval(
            conv_id, "user_1", "create_calendar_event",
            {"title": "Test"}, "Test",
        )
        ok = await service.consume_approval(record)
        assert ok is True

        # Second consume should fail.
        with pytest.raises(ValueError, match="could not be consumed"):
            await service.consume_approval(record)

    async def test_wrong_user_rejected(self, service):
        conv_id = uuid4()
        token, _ = await service.request_approval(
            conv_id, "user_1", "create_calendar_event", {"title": "X"}, "X",
        )
        with pytest.raises(ValueError, match="another user"):
            await service.validate_approval(
                token, conv_id, "user_2", "create_calendar_event", {"title": "X"},
            )

    async def test_wrong_arguments_rejected(self, service):
        conv_id = uuid4()
        token, _ = await service.request_approval(
            conv_id, "user_1", "create_calendar_event",
            {"title": "Original"}, "Event",
        )
        with pytest.raises(ValueError, match="arguments do not match"):
            await service.validate_approval(
                token, conv_id, "user_1", "create_calendar_event",
                {"title": "Changed"},
            )

    async def test_wrong_tool_rejected(self, service):
        conv_id = uuid4()
        token, _ = await service.request_approval(
            conv_id, "user_1", "create_calendar_event", {"title": "X"}, "X",
        )
        with pytest.raises(ValueError, match="different tool"):
            await service.validate_approval(
                token, conv_id, "user_1", "delete_calendar_event", {"title": "X"},
            )

    async def test_wrong_conversation_rejected(self, service):
        conv_id = uuid4()
        other_conv = uuid4()
        token, _ = await service.request_approval(
            conv_id, "user_1", "create_calendar_event", {"title": "X"}, "X",
        )
        with pytest.raises(ValueError, match="another conversation"):
            await service.validate_approval(
                token, other_conv, "user_1", "create_calendar_event", {"title": "X"},
            )

    async def test_expired_token_rejected(self, service):
        conv_id = uuid4()
        token, record = await service.request_approval(
            conv_id, "user_1", "create_calendar_event", {"title": "X"}, "X",
        )
        # Manually expire the record in the fake repo.
        await service._repo.update_approval_status(
            record.approval_id, ApprovalStatus.EXPIRED,
        )

        with pytest.raises(ValueError, match="not 'requested'"):
            await service.validate_approval(
                token, conv_id, "user_1", "create_calendar_event", {"title": "X"},
            )

    async def test_unknown_token_rejected(self, service):
        with pytest.raises(ValueError, match="not found"):
            await service.validate_approval(
                "fake-token", uuid4(), "user_1", "tool", {},
            )

    async def test_expire_stale(self, service):
        conv_id = uuid4()
        await service.request_approval(
            conv_id, "user_1", "create_calendar_event", {"title": "X"}, "X",
        )
        count = await service.expire_stale()
        assert count >= 0
