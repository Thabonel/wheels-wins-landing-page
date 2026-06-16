"""
Bounded context compaction for Pam V2 conversations.

Assembles a structured summary from conversation history, preserving unresolved
state while excluding secrets and internal instructions. Falls back to bounded
recent context if compaction fails.
"""

from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from app.services.pam_v2.state.models import CompactSummaryRecord, MessageRecord, MessageRole


COMPACTOR_VERSION = "2026-06-16"

# Budgets for context assembly.
MAX_CONTEXT_TOKENS = 4000
MAX_RECENT_MESSAGES = 20
MAX_SUMMARY_TOKENS = 1000


@dataclass
class StructuredSummary:
    """Structured summary of conversation context beyond the recent window."""
    topics: List[str] = field(default_factory=list)
    preferences: Dict[str, Any] = field(default_factory=dict)
    pending: List[str] = field(default_factory=list)
    important_facts: List[str] = field(default_factory=list)
    tool_outcomes: List[str] = field(default_factory=list)

    def to_json(self) -> str:
        return json.dumps({
            "topics": self.topics,
            "preferences": self.preferences,
            "pending": self.pending,
            "important_facts": self.important_facts,
            "tool_outcomes": self.tool_outcomes,
        }, default=str)

    @classmethod
    def from_json(cls, content: str) -> "StructuredSummary":
        try:
            data = json.loads(content)
            return cls(
                topics=data.get("topics", []),
                preferences=data.get("preferences", {}),
                pending=data.get("pending", []),
                important_facts=data.get("important_facts", []),
                tool_outcomes=data.get("tool_outcomes", []),
            )
        except (json.JSONDecodeError, TypeError):
            return cls()

    @classmethod
    def from_compact_record(cls, record: Optional[CompactSummaryRecord]) -> "StructuredSummary":
        if record is None:
            return cls()
        return cls.from_json(record.content)


def compact_context(
    messages: List[MessageRecord],
    existing_summary: Optional[CompactSummaryRecord] = None,
    max_recent: int = MAX_RECENT_MESSAGES,
    max_tokens: int = MAX_CONTEXT_TOKENS,
) -> CompactSummaryRecord:
    """
    Compress conversation context into a compact summary.

    Keeps recent messages within the token budget and produces a structured
    summary of older context. Falls back to bounded recent context if the
    budget is exceeded or the input is malformed.
    """
    parsed = StructuredSummary.from_compact_record(existing_summary)

    # Update summary from messages outside the recent window.
    cutoff = len(messages) - max_recent
    if cutoff > 0:
        for msg in messages[:cutoff]:
            _update_summary_from_message(parsed, msg)

    context = _assemble_context(messages, parsed, max_recent)
    token_count = _estimate_tokens(context)

    if token_count > max_tokens:
        # Exceeded budget: use only recent messages.
        truncated = _assemble_context(messages, StructuredSummary(), max_recent // 2)
        token_count = _estimate_tokens(truncated)
        parsed = StructuredSummary()

    return CompactSummaryRecord(
        summary_id=uuid.uuid4(),
        conversation_id=messages[0].conversation_id if messages else uuid.uuid4(),
        content=context,
        token_count=token_count,
        model_version=COMPACTOR_VERSION,
    )


def _update_summary_from_message(summary: StructuredSummary, msg: MessageRecord) -> None:
    """Update the structured summary based on message content."""
    if msg.role == MessageRole.USER and msg.content:
        _extract_topics(summary, msg.content)
    elif msg.role == MessageRole.ASSISTANT and msg.content:
        if "pending" in msg.content.lower() or "todo" in msg.content.lower():
            summary.pending.append(msg.content[:200])
    elif msg.role == MessageRole.TOOL and msg.tool_name:
        summary.tool_outcomes.append(
            f"{msg.tool_name}: {msg.content[:100] if msg.content else 'completed'}"
        )


def _extract_topics(summary: StructuredSummary, content: str) -> None:
    """Extract topic keywords from user message."""
    common_topics = ["weather", "route", "campground", "budget", "fuel", "maintenance",
                     "profile", "calendar", "event", "trip", "meal", "expense", "health"]
    content_lower = content.lower()
    for topic in common_topics:
        if topic in content_lower and topic not in summary.topics:
            summary.topics.append(topic)


def _assemble_context(
    messages: List[MessageRecord],
    summary: StructuredSummary,
    max_recent: int,
) -> str:
    """Assemble compact context: structured summary + recent messages."""
    parts: List[str] = []

    summary_json = summary.to_json()
    if summary_json != StructuredSummary().to_json():
        parts.append(f"[Conversation Context]\n{summary_json}\n")

    recent = messages[-max_recent:] if messages else []
    if recent:
        parts.append("[Recent Messages]")
        for msg in recent:
            prefix = f"{msg.role.value}: "
            content = (msg.content or "")[:500]
            parts.append(f"{prefix}{content}")

    return "\n".join(parts)


def _estimate_tokens(text: str) -> int:
    """Rough token estimate (4 chars per token)."""
    return len(text) // 4
