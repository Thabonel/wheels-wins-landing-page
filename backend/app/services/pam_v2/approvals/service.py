"""
Exact-action approval service for Pam V2 write tools.

Approvals bind user, conversation, tool, canonical arguments hash, expiry,
and a one-time token. The service creates, validates, and consumes approvals.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
from uuid import UUID

from app.services.pam_v2.state.models import (
    ApprovalRecord,
    ApprovalStatus,
    canonical_arguments_hash,
    generate_approval_token,
    hash_approval_token,
)
from app.services.pam_v2.state.repository import ApprovalRepository


APPROVAL_TTL_MINUTES = 10


class ApprovalService:
    """Create, validate, and consume exact-action approvals."""

    def __init__(self, repo: ApprovalRepository):
        self._repo = repo

    async def request_approval(
        self,
        conversation_id: UUID,
        user_id: str,
        tool_name: str,
        arguments: Dict,
        action_summary: str,
    ) -> Tuple[str, ApprovalRecord]:
        """
        Create an approval request.

        Returns (opaque_token, record). The token is returned to the user;
        only its hash is stored.
        """
        token = generate_approval_token()
        token_hash = hash_approval_token(token)
        arg_hash = canonical_arguments_hash(tool_name, arguments)

        record = await self._repo.create_approval(
            conversation_id=conversation_id,
            user_id=user_id,
            tool_name=tool_name,
            arguments_hash=arg_hash,
            action_summary=action_summary,
            token_hash=token_hash,
            expires_at=datetime.utcnow() + timedelta(minutes=APPROVAL_TTL_MINUTES),
        )
        return token, record

    async def validate_approval(
        self,
        token: str,
        conversation_id: UUID,
        user_id: str,
        tool_name: str,
        arguments: Dict,
    ) -> ApprovalRecord:
        """
        Validate an approval token.

        Raises ValueError on any failure: unknown token, wrong user/conversation/
        tool/arguments, expired, already consumed.
        """
        token_hash = hash_approval_token(token)
        record = await self._repo.get_approval_by_token_hash(token_hash)

        if record is None:
            raise ValueError("Approval token not found")
        if record.status != ApprovalStatus.REQUESTED:
            raise ValueError(f"Approval is {record.status.value}, not 'requested'")
        if record.user_id != user_id:
            raise ValueError("Approval belongs to another user")
        if record.conversation_id != conversation_id:
            raise ValueError("Approval belongs to another conversation")
        if record.tool_name != tool_name:
            raise ValueError("Approval is for a different tool")
        if record.arguments_hash != canonical_arguments_hash(tool_name, arguments):
            raise ValueError("Approval arguments do not match")
        if record.expires_at < datetime.utcnow():
            raise ValueError("Approval has expired")

        return record

    async def consume_approval(self, record: ApprovalRecord) -> bool:
        """
        Mark an approval as consumed (one-time use).

        Returns True if consumed successfully, False if already consumed
        or in an unexpected state.
        """
        ok = await self._repo.update_approval_status(
            record.approval_id,
            ApprovalStatus.CONSUMED,
            expected_status=ApprovalStatus.REQUESTED,
        )
        if not ok:
            raise ValueError("Approval could not be consumed (already used or not in requested state)")
        return True

    async def expire_stale(self) -> int:
        """Expire any approvals past their TTL."""
        return await self._repo.expire_stale_approvals()
