"""
Contract tests for Pam V2 repository interfaces.

Each test function receives a factory that produces the repository under test.
Run these tests against both fake and real (Supabase) adapters.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from uuid import UUID, uuid4

import pytest

from app.services.pam_v2.state.models import (
    ApprovalRecord,
    ApprovalStatus,
    CompactSummaryRecord,
    ConversationRecord,
    MessageRecord,
    MessageRole,
    ToolCallRecord,
    ToolCallStatus,
    canonical_arguments_hash,
    generate_approval_token,
    hash_approval_token,
)
from app.services.pam_v2.state.repository import (
    ApprovalRepository,
    CompactSummaryRepository,
    ConversationRepository,
)


@pytest.mark.asyncio
class ConversationRepositoryContractTests:
    """Mixin: extend with a fixture that returns a ConversationRepository."""

    @pytest.fixture
    def repo(self) -> ConversationRepository:
        raise NotImplementedError

    async def test_create_and_get_conversation(self, repo):
        conv = await repo.create_conversation(user_id="user_1", title="Test")
        assert conv.conversation_id is not None
        assert conv.user_id == "user_1"
        assert conv.title == "Test"

        fetched = await repo.get_conversation(conv.conversation_id)
        assert fetched is not None
        assert fetched.conversation_id == conv.conversation_id

    async def test_list_user_conversations(self, repo):
        await repo.create_conversation(user_id="user_1", title="Trip 1")
        await repo.create_conversation(user_id="user_1", title="Trip 2")
        await repo.create_conversation(user_id="user_2", title="Other")

        user1 = await repo.list_user_conversations(user_id="user_1")
        assert len(user1) == 2

    async def test_add_and_get_messages(self, repo):
        conv = await repo.create_conversation(user_id="user_1")
        msg = MessageRecord(
            message_id=uuid4(),
            conversation_id=conv.conversation_id,
            client_message_id="cm1",
            role=MessageRole.USER,
            content="Hello",
        )
        await repo.add_message(msg)

        msgs = await repo.get_conversation_messages(conv.conversation_id)
        assert len(msgs) == 1
        assert msgs[0].content == "Hello"

    async def test_duplicate_client_message_detection(self, repo):
        conv = await repo.create_conversation(user_id="user_1")
        msg = MessageRecord(
            message_id=uuid4(),
            conversation_id=conv.conversation_id,
            client_message_id="dup_1",
            role=MessageRole.USER,
            content="First",
        )
        await repo.add_message(msg)

        assert await repo.is_client_message_duplicate(conv.conversation_id, "dup_1") is True
        assert await repo.is_client_message_duplicate(conv.conversation_id, "new_msg") is False

    async def test_get_message_by_client_id(self, repo):
        conv = await repo.create_conversation(user_id="user_1")
        msg = MessageRecord(
            message_id=uuid4(),
            conversation_id=conv.conversation_id,
            client_message_id="cm2",
            role=MessageRole.USER,
            content="Hi",
        )
        await repo.add_message(msg)

        found = await repo.get_message_by_client_id(conv.conversation_id, "cm2")
        assert found is not None
        assert found.content == "Hi"

    async def test_tool_call_lifecycle(self, repo):
        conv = await repo.create_conversation(user_id="user_1")
        msg = MessageRecord(
            message_id=uuid4(),
            conversation_id=conv.conversation_id,
            client_message_id="cm3",
            role=MessageRole.ASSISTANT,
            content="",
        )
        await repo.add_message(msg)

        call = ToolCallRecord(
            tool_call_id="call_1",
            conversation_id=conv.conversation_id,
            message_id=msg.message_id,
            tool_name="get_weather",
            arguments_hash=canonical_arguments_hash("get_weather", {"location": "Sydney"}),
        )
        await repo.add_tool_call(call)
        await repo.update_tool_call_status(
            conv.conversation_id, "call_1", ToolCallStatus.SUCCESS,
            result_code="ok", result_summary="Sydney weather",
        )

    async def test_separate_conversations_isolated(self, repo):
        conv_a = await repo.create_conversation(user_id="user_1")
        conv_b = await repo.create_conversation(user_id="user_1")

        await repo.add_message(MessageRecord(
            message_id=uuid4(), conversation_id=conv_a.conversation_id,
            client_message_id="cm_a", role=MessageRole.USER, content="A",
        ))

        msgs_b = await repo.get_conversation_messages(conv_b.conversation_id)
        assert len(msgs_b) == 0


@pytest.mark.asyncio
class ApprovalRepositoryContractTests:
    """Mixin: extend with a fixture that returns an ApprovalRepository."""

    @pytest.fixture
    def repo(self) -> ApprovalRepository:
        raise NotImplementedError

    async def test_create_and_get_approval(self, repo):
        conv_id = uuid4()
        token = generate_approval_token()
        token_hash = hash_approval_token(token)
        rec = await repo.create_approval(
            conversation_id=conv_id,
            user_id="user_1",
            tool_name="create_calendar_event",
            arguments_hash="hash123",
            action_summary="Create event",
            token_hash=token_hash,
            expires_at=datetime.utcnow() + timedelta(minutes=5),
        )
        assert rec.status == ApprovalStatus.REQUESTED
        assert rec.tool_name == "create_calendar_event"

        found = await repo.get_approval_by_token_hash(token_hash)
        assert found is not None
        assert found.approval_id == rec.approval_id

    async def test_update_approval_status(self, repo):
        conv_id = uuid4()
        rec = await repo.create_approval(
            conversation_id=conv_id,
            user_id="user_1",
            tool_name="create_calendar_event",
            arguments_hash="hash456",
            action_summary="Create event",
            token_hash=hash_approval_token("tok"),
            expires_at=datetime.utcnow() + timedelta(minutes=5),
        )
        ok = await repo.update_approval_status(rec.approval_id, ApprovalStatus.CONSUMED)
        assert ok is True

        # Can't consume again
        ok2 = await repo.update_approval_status(rec.approval_id, ApprovalStatus.CONSUMED, ApprovalStatus.REQUESTED)
        assert ok2 is False

    async def test_expire_stale_approvals(self, repo):
        conv_id = uuid4()
        past = datetime.utcnow() - timedelta(hours=1)
        rec = await repo.create_approval(
            conversation_id=conv_id,
            user_id="user_1",
            tool_name="create_calendar_event",
            arguments_hash="hash789",
            action_summary="Old event",
            token_hash=hash_approval_token("old_tok"),
            expires_at=past,
        )
        count = await repo.expire_stale_approvals()
        assert count == 1

        fetched = await repo.get_approval_by_token_hash(hash_approval_token("old_tok"))
        assert fetched.status == ApprovalStatus.EXPIRED


@pytest.mark.asyncio
class CompactSummaryRepositoryContractTests:
    """Mixin: extend with a fixture that returns a CompactSummaryRepository."""

    @pytest.fixture
    def repo(self) -> CompactSummaryRepository:
        raise NotImplementedError

    async def test_save_and_get_latest_summary(self, repo):
        conv_id = uuid4()
        rec = CompactSummaryRecord(
            summary_id=uuid4(),
            conversation_id=conv_id,
            content="Compact summary content",
            token_count=50,
        )
        await repo.save_summary(rec)

        latest = await repo.get_latest_summary(conv_id)
        assert latest is not None
        assert latest.content == "Compact summary content"

    async def test_latest_summary_none_for_new_conversation(self, repo):
        latest = await repo.get_latest_summary(uuid4())
        assert latest is None
