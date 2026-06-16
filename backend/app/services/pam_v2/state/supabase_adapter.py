"""
Supabase-backed repository adapters for Pam V2 durable state.

Uses the project's Supabase client. All tests marked as staging-only.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from app.core.database import get_supabase_client
from app.services.pam_v2.state.models import (
    ApprovalRecord,
    ApprovalStatus,
    CompactSummaryRecord,
    ConversationRecord,
    MessageRecord,
    MessageRole,
    ToolCallRecord,
    ToolCallStatus,
)
from app.services.pam_v2.state.repository import (
    ApprovalRepository,
    CompactSummaryRepository,
    ConversationRepository,
)


class SupabaseConversationRepository(ConversationRepository):
    """Conversation storage backed by Supabase pam_v2_conversations table."""

    def __init__(self):
        self._client = get_supabase_client()

    def _table(self, table: str):
        return self._client.table(table)

    async def create_conversation(self, user_id: str, title: Optional[str] = None) -> ConversationRecord:
        row = {"user_id": user_id}
        if title:
            row["title"] = title
        result = self._table("pam_v2_conversations").insert(row).execute()
        data = result.data[0]
        return _parse_conversation(data)

    async def get_conversation(self, conversation_id: UUID) -> Optional[ConversationRecord]:
        result = self._table("pam_v2_conversations").select("*").eq("id", str(conversation_id)).execute()
        if not result.data:
            return None
        return _parse_conversation(result.data[0])

    async def list_user_conversations(self, user_id: str, limit: int = 20, offset: int = 0) -> List[ConversationRecord]:
        result = (
            self._table("pam_v2_conversations")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return [_parse_conversation(r) for r in result.data]

    async def add_message(self, message: MessageRecord) -> MessageRecord:
        row = {
            "id": str(message.message_id),
            "conversation_id": str(message.conversation_id),
            "client_message_id": message.client_message_id,
            "role": message.role.value,
            "content": message.content,
            "tool_call_id": message.tool_call_id,
            "tool_name": message.tool_name,
            "tool_arguments": message.tool_arguments,
            "token_count": message.token_count,
        }
        result = self._table("pam_v2_messages").insert(row).execute()
        return _parse_message(result.data[0])

    async def get_conversation_messages(
        self, conversation_id: UUID, limit: int = 100, before_id: Optional[UUID] = None
    ) -> List[MessageRecord]:
        query = (
            self._table("pam_v2_messages")
            .select("*")
            .eq("conversation_id", str(conversation_id))
            .order("created_at")
            .limit(limit)
        )
        if before_id:
            query = query.lt("created_at", self._get_timestamp_for_id(before_id))
        result = query.execute()
        return [_parse_message(r) for r in result.data]

    async def get_message_by_client_id(self, conversation_id: UUID, client_message_id: str) -> Optional[MessageRecord]:
        result = (
            self._table("pam_v2_messages")
            .select("*")
            .eq("conversation_id", str(conversation_id))
            .eq("client_message_id", client_message_id)
            .limit(1)
            .execute()
        )
        if not result.data:
            return None
        return _parse_message(result.data[0])

    async def add_tool_call(self, record: ToolCallRecord) -> ToolCallRecord:
        row = {
            "id": record.tool_call_id,
            "conversation_id": str(record.conversation_id),
            "message_id": str(record.message_id),
            "tool_name": record.tool_name,
            "arguments_hash": record.arguments_hash,
            "status": record.status.value,
            "result_code": record.result_code,
            "result_summary": record.result_summary,
            "duration_ms": record.duration_ms,
        }
        self._table("pam_v2_tool_calls").insert(row).execute()
        return record

    async def update_tool_call_status(
        self, conversation_id: UUID, tool_call_id: str, status: ToolCallStatus,
        result_code: Optional[str] = None, result_summary: Optional[str] = None,
    ) -> None:
        row: Dict[str, Any] = {"status": status.value}
        if result_code:
            row["result_code"] = result_code
        if result_summary:
            row["result_summary"] = result_summary
        self._table("pam_v2_tool_calls").update(row).eq("id", tool_call_id).eq("conversation_id", str(conversation_id)).execute()

    async def is_client_message_duplicate(self, conversation_id: UUID, client_message_id: str) -> bool:
        return await self.get_message_by_client_id(conversation_id, client_message_id) is not None

    def _get_timestamp_for_id(self, message_id: UUID) -> str:
        result = self._table("pam_v2_messages").select("created_at").eq("id", str(message_id)).limit(1).execute()
        if result.data:
            return result.data[0]["created_at"]
        return datetime.utcnow().isoformat()


class SupabaseApprovalRepository(ApprovalRepository):
    """Approval storage backed by Supabase pam_v2_approvals table."""

    def __init__(self):
        self._client = get_supabase_client()

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
        row = {
            "conversation_id": str(conversation_id),
            "user_id": user_id,
            "tool_name": tool_name,
            "arguments_hash": arguments_hash,
            "action_summary": action_summary,
            "token_hash": token_hash,
            "expires_at": expires_at.isoformat(),
        }
        result = self._client.table("pam_v2_approvals").insert(row).execute()
        return _parse_approval(result.data[0])

    async def get_approval_by_token_hash(self, token_hash: str) -> Optional[ApprovalRecord]:
        result = self._client.table("pam_v2_approvals").select("*").eq("token_hash", token_hash).limit(1).execute()
        if not result.data:
            return None
        return _parse_approval(result.data[0])

    async def update_approval_status(
        self, approval_id: UUID, status: ApprovalStatus, expected_status: ApprovalStatus = ApprovalStatus.REQUESTED
    ) -> bool:
        result = (
            self._client.table("pam_v2_approvals")
            .update({"status": status.value})
            .eq("id", str(approval_id))
            .eq("status", expected_status.value)
            .execute()
        )
        return len(result.data) > 0

    async def expire_stale_approvals(self) -> int:
        result = (
            self._client.table("pam_v2_approvals")
            .update({"status": "expired"})
            .eq("status", "requested")
            .lt("expires_at", datetime.utcnow().isoformat())
            .execute()
        )
        return len(result.data)


class SupabaseCompactSummaryRepository(CompactSummaryRepository):
    """Compact summary storage backed by Supabase pam_v2_compact_summaries table."""

    def __init__(self):
        self._client = get_supabase_client()

    async def save_summary(self, record: CompactSummaryRecord) -> CompactSummaryRecord:
        row = {
            "id": str(record.summary_id),
            "conversation_id": str(record.conversation_id),
            "content": record.content,
            "token_count": record.token_count,
            "model_version": record.model_version,
        }
        result = self._client.table("pam_v2_compact_summaries").insert(row).execute()
        return _parse_compact_summary(result.data[0])

    async def get_latest_summary(self, conversation_id: UUID) -> Optional[CompactSummaryRecord]:
        result = (
            self._client.table("pam_v2_compact_summaries")
            .select("*")
            .eq("conversation_id", str(conversation_id))
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if not result.data:
            return None
        return _parse_compact_summary(result.data[0])


def _parse_conversation(data: dict) -> ConversationRecord:
    return ConversationRecord(
        conversation_id=UUID(data["id"]),
        user_id=data["user_id"],
        title=data.get("title"),
        created_at=_parse_ts(data["created_at"]),
        updated_at=_parse_ts(data["updated_at"]),
        is_active=data.get("is_active", True),
    )


def _parse_message(data: dict) -> MessageRecord:
    return MessageRecord(
        message_id=UUID(data["id"]),
        conversation_id=UUID(data["conversation_id"]),
        client_message_id=data["client_message_id"],
        role=MessageRole(data["role"]),
        content=data.get("content"),
        tool_call_id=data.get("tool_call_id"),
        tool_name=data.get("tool_name"),
        tool_arguments=data.get("tool_arguments"),
        token_count=data.get("token_count", 0),
        created_at=_parse_ts(data["created_at"]),
    )


def _parse_approval(data: dict) -> ApprovalRecord:
    return ApprovalRecord(
        approval_id=UUID(data["id"]),
        conversation_id=UUID(data["conversation_id"]),
        user_id=data["user_id"],
        tool_name=data["tool_name"],
        arguments_hash=data["arguments_hash"],
        action_summary=data["action_summary"],
        token_hash=data["token_hash"],
        status=ApprovalStatus(data["status"]),
        expires_at=_parse_ts(data["expires_at"]),
        created_at=_parse_ts(data["created_at"]),
    )


def _parse_compact_summary(data: dict) -> CompactSummaryRecord:
    return CompactSummaryRecord(
        summary_id=UUID(data["id"]),
        conversation_id=UUID(data["conversation_id"]),
        content=data["content"],
        token_count=data.get("token_count", 0),
        model_version=data.get("model_version", "2026-06-16"),
        created_at=_parse_ts(data["created_at"]),
    )


def _parse_ts(value: str) -> datetime:
    if isinstance(value, str):
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    return value
