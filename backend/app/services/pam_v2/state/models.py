"""
Domain models for Pam V2 durable conversation state and approvals.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import secrets
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    TOOL = "tool"


class ToolCallStatus(str, Enum):
    PENDING = "pending"
    SUCCESS = "success"
    ERROR = "error"
    BLOCKED = "blocked"


class ApprovalStatus(str, Enum):
    REQUESTED = "requested"
    APPROVED = "approved"
    DENIED = "denied"
    EXPIRED = "expired"
    CONSUMED = "consumed"


@dataclass(frozen=True)
class ConversationRecord:
    """A single V2 conversation."""
    conversation_id: UUID
    user_id: str
    title: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    is_active: bool = True


@dataclass(frozen=True)
class MessageRecord:
    """A single message within a V2 conversation."""
    message_id: UUID
    conversation_id: UUID
    client_message_id: str
    role: MessageRole
    content: Optional[str]
    tool_call_id: Optional[str] = None
    tool_name: Optional[str] = None
    tool_arguments: Optional[Dict[str, Any]] = None
    token_count: int = 0
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass(frozen=True)
class ToolCallRecord:
    """Record of a single tool execution."""
    tool_call_id: str
    conversation_id: UUID
    message_id: UUID
    tool_name: str
    arguments_hash: str
    status: ToolCallStatus = ToolCallStatus.PENDING
    result_code: Optional[str] = None
    result_summary: Optional[str] = None
    duration_ms: Optional[int] = None
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass(frozen=True)
class ApprovalRecord:
    """An exact-action approval request."""
    approval_id: UUID
    conversation_id: UUID
    user_id: str
    tool_name: str
    arguments_hash: str
    action_summary: str
    token_hash: str
    status: ApprovalStatus = ApprovalStatus.REQUESTED
    expires_at: datetime = field(default_factory=lambda: datetime.utcnow())
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass(frozen=True)
class CompactSummaryRecord:
    """A structured compact summary of conversation state."""
    summary_id: UUID
    conversation_id: UUID
    content: str
    token_count: int = 0
    model_version: str = "2026-06-16"
    created_at: datetime = field(default_factory=datetime.utcnow)


def canonical_arguments_hash(tool_name: str, arguments: Dict[str, Any]) -> str:
    """Deterministic hash of tool name and sorted canonical arguments."""
    raw = json.dumps({"tool": tool_name, "arguments": arguments}, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(raw.encode()).hexdigest()


def generate_approval_token() -> str:
    """Generate a cryptographically random opaque approval token."""
    return secrets.token_urlsafe(32)


def hash_approval_token(token: str) -> str:
    """One-way hash of an approval token for storage."""
    return hashlib.sha256(token.encode()).hexdigest()
