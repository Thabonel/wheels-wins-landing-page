"""
Repository protocols for Pam V2 durable state.

Implementations provide persistence; the runtime depends only on these protocols.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional, Protocol
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


class ConversationRepository(Protocol):
    """Storage for conversations and messages."""

    async def create_conversation(self, user_id: str, title: Optional[str] = None) -> ConversationRecord:
        ...

    async def get_conversation(self, conversation_id: UUID) -> Optional[ConversationRecord]:
        ...

    async def list_user_conversations(self, user_id: str, limit: int = 20, offset: int = 0) -> List[ConversationRecord]:
        ...

    async def add_message(self, message: MessageRecord) -> MessageRecord:
        ...

    async def get_conversation_messages(
        self, conversation_id: UUID, limit: int = 100, before_id: Optional[UUID] = None
    ) -> List[MessageRecord]:
        ...

    async def get_message_by_client_id(self, conversation_id: UUID, client_message_id: str) -> Optional[MessageRecord]:
        ...

    async def add_tool_call(self, record: ToolCallRecord) -> ToolCallRecord:
        ...

    async def update_tool_call_status(
        self, conversation_id: UUID, tool_call_id: str, status: ToolCallStatus,
        result_code: Optional[str] = None, result_summary: Optional[str] = None,
    ) -> None:
        ...

    async def is_client_message_duplicate(self, conversation_id: UUID, client_message_id: str) -> bool:
        ...


class ApprovalRepository(Protocol):
    """Storage for approval tokens."""

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
        ...

    async def get_approval_by_token_hash(self, token_hash: str) -> Optional[ApprovalRecord]:
        ...

    async def update_approval_status(
        self, approval_id: UUID, status: ApprovalStatus, expected_status: ApprovalStatus = ApprovalStatus.REQUESTED
    ) -> bool:
        ...

    async def expire_stale_approvals(self) -> int:
        ...


class CompactSummaryRepository(Protocol):
    """Storage for compact conversation summaries."""

    async def save_summary(self, record: CompactSummaryRecord) -> CompactSummaryRecord:
        ...

    async def get_latest_summary(self, conversation_id: UUID) -> Optional[CompactSummaryRecord]:
        ...
