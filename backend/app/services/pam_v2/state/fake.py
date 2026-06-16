"""
In-memory fake implementations of Pam V2 repository protocols for testing.
"""

from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Optional
from uuid import UUID

from .models import (
    ApprovalRecord,
    ApprovalStatus,
    CompactSummaryRecord,
    ConversationRecord,
    MessageRecord,
    ToolCallRecord,
    ToolCallStatus,
)
from .repository import ApprovalRepository, CompactSummaryRepository, ConversationRepository


class FakeConversationRepository(ConversationRepository):
    """In-memory conversation storage."""

    def __init__(self):
        self.conversations: Dict[UUID, ConversationRecord] = {}
        self.messages: Dict[UUID, MessageRecord] = {}
        self.tool_calls: Dict[str, ToolCallRecord] = {}

    async def create_conversation(self, user_id: str, title: Optional[str] = None) -> ConversationRecord:
        from uuid import uuid4

        rec = ConversationRecord(
            conversation_id=uuid4(),
            user_id=user_id,
            title=title,
        )
        self.conversations[rec.conversation_id] = rec
        return rec

    async def get_conversation(self, conversation_id: UUID) -> Optional[ConversationRecord]:
        return self.conversations.get(conversation_id)

    async def list_user_conversations(self, user_id: str, limit: int = 20, offset: int = 0) -> List[ConversationRecord]:
        all_conv = sorted(
            [c for c in self.conversations.values() if c.user_id == user_id],
            key=lambda c: c.created_at,
            reverse=True,
        )
        return all_conv[offset : offset + limit]

    async def add_message(self, message: MessageRecord) -> MessageRecord:
        self.messages[message.message_id] = message
        return message

    async def get_conversation_messages(
        self, conversation_id: UUID, limit: int = 100, before_id: Optional[UUID] = None
    ) -> List[MessageRecord]:
        msgs = [m for m in self.messages.values() if m.conversation_id == conversation_id]
        if before_id:
            before = self.messages.get(before_id)
            if before:
                msgs = [m for m in msgs if m.created_at < before.created_at]
        msgs.sort(key=lambda m: m.created_at)
        return msgs[-limit:]

    async def get_message_by_client_id(self, conversation_id: UUID, client_message_id: str) -> Optional[MessageRecord]:
        for m in self.messages.values():
            if m.conversation_id == conversation_id and m.client_message_id == client_message_id:
                return m
        return None

    async def add_tool_call(self, record: ToolCallRecord) -> ToolCallRecord:
        key = f"{record.conversation_id}.{record.tool_call_id}"
        self.tool_calls[key] = record
        return record

    async def update_tool_call_status(
        self, conversation_id: UUID, tool_call_id: str, status: ToolCallStatus,
        result_code: Optional[str] = None, result_summary: Optional[str] = None,
    ) -> None:
        key = f"{conversation_id}.{tool_call_id}"
        rec = self.tool_calls.get(key)
        if rec:
            rec = ToolCallRecord(
                tool_call_id=rec.tool_call_id,
                conversation_id=rec.conversation_id,
                message_id=rec.message_id,
                tool_name=rec.tool_name,
                arguments_hash=rec.arguments_hash,
                status=status,
                result_code=result_code or rec.result_code,
                result_summary=result_summary or rec.result_summary,
                duration_ms=rec.duration_ms,
            )
            self.tool_calls[key] = rec

    async def is_client_message_duplicate(self, conversation_id: UUID, client_message_id: str) -> bool:
        return await self.get_message_by_client_id(conversation_id, client_message_id) is not None


class FakeApprovalRepository(ApprovalRepository):
    """In-memory approval storage."""

    def __init__(self):
        self.approvals: Dict[UUID, ApprovalRecord] = {}

    async def create_approval(
        self,
        conversation_id: UUID,
        user_id: str,
        tool_name: str,
        arguments_hash: str,
        action_summary: str,
        token_hash: str,
        expires_at: datetime,
    ) -> ApprovalRecord:
        from uuid import uuid4

        rec = ApprovalRecord(
            approval_id=uuid4(),
            conversation_id=conversation_id,
            user_id=user_id,
            tool_name=tool_name,
            arguments_hash=arguments_hash,
            action_summary=action_summary,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        self.approvals[rec.approval_id] = rec
        return rec

    async def get_approval_by_token_hash(self, token_hash: str) -> Optional[ApprovalRecord]:
        for a in self.approvals.values():
            if a.token_hash == token_hash:
                return a
        return None

    async def update_approval_status(
        self, approval_id: UUID, status: ApprovalStatus, expected_status: ApprovalStatus = ApprovalStatus.REQUESTED
    ) -> bool:
        rec = self.approvals.get(approval_id)
        if rec is None or rec.status != expected_status:
            return False
        self.approvals[approval_id] = ApprovalRecord(
            approval_id=rec.approval_id,
            conversation_id=rec.conversation_id,
            user_id=rec.user_id,
            tool_name=rec.tool_name,
            arguments_hash=rec.arguments_hash,
            action_summary=rec.action_summary,
            token_hash=rec.token_hash,
            status=status,
            expires_at=rec.expires_at,
        )
        return True

    async def expire_stale_approvals(self) -> int:
        now = datetime.utcnow()
        count = 0
        for aid, rec in list(self.approvals.items()):
            if rec.status == ApprovalStatus.REQUESTED and rec.expires_at < now:
                self.approvals[aid] = ApprovalRecord(
                    approval_id=rec.approval_id,
                    conversation_id=rec.conversation_id,
                    user_id=rec.user_id,
                    tool_name=rec.tool_name,
                    arguments_hash=rec.arguments_hash,
                    action_summary=rec.action_summary,
                    token_hash=rec.token_hash,
                    status=ApprovalStatus.EXPIRED,
                    expires_at=rec.expires_at,
                )
                count += 1
        return count


class FakeCompactSummaryRepository(CompactSummaryRepository):
    """In-memory compact summary storage."""

    def __init__(self):
        self.summaries: Dict[UUID, CompactSummaryRecord] = {}

    async def save_summary(self, record: CompactSummaryRecord) -> CompactSummaryRecord:
        self.summaries[record.summary_id] = record
        return record

    async def get_latest_summary(self, conversation_id: UUID) -> Optional[CompactSummaryRecord]:
        matching = [s for s in self.summaries.values() if s.conversation_id == conversation_id]
        if not matching:
            return None
        return max(matching, key=lambda s: s.created_at)
