"""
Tests for Pam V2 context compaction.
"""

from __future__ import annotations

from uuid import uuid4

import pytest

from app.services.pam_v2.state.compactor import (
    COMPACTOR_VERSION,
    MAX_CONTEXT_TOKENS,
    StructuredSummary,
    compact_context,
)
from app.services.pam_v2.state.models import (
    CompactSummaryRecord,
    MessageRecord,
    MessageRole,
)


def make_msg(role: MessageRole, content: str, **kwargs) -> MessageRecord:
    return MessageRecord(
        message_id=uuid4(),
        conversation_id=uuid4(),
        client_message_id=kwargs.get("client_message_id", str(uuid4())),
        role=role,
        content=content,
        tool_call_id=kwargs.get("tool_call_id"),
        tool_name=kwargs.get("tool_name"),
        tool_arguments=kwargs.get("tool_arguments"),
    )


class TestStructuredSummary:
    def test_empty_summary(self):
        s = StructuredSummary()
        assert s.topics == []
        assert s.preferences == {}

    def test_to_from_json_roundtrip(self):
        s1 = StructuredSummary(
            topics=["weather", "route"],
            preferences={"locale": "en-AU"},
            pending=["Check route"],
            important_facts=["User is in Sydney"],
        )
        json_str = s1.to_json()
        s2 = StructuredSummary.from_json(json_str)
        assert s2.topics == ["weather", "route"]
        assert s2.preferences == {"locale": "en-AU"}

    def test_from_json_handles_malformed_input(self):
        s = StructuredSummary.from_json("not-json")
        assert isinstance(s, StructuredSummary)
        assert s.topics == []

    def test_from_compact_record(self):
        rec = CompactSummaryRecord(
            summary_id=uuid4(),
            conversation_id=uuid4(),
            content='{"topics": ["weather"], "preferences": {}, "pending": [], "important_facts": [], "tool_outcomes": []}',
            token_count=10,
        )
        s = StructuredSummary.from_compact_record(rec)
        assert s.topics == ["weather"]

    def test_from_compact_record_none(self):
        s = StructuredSummary.from_compact_record(None)
        assert isinstance(s, StructuredSummary)
        assert s.topics == []


class TestCompactContext:
    def test_empty_messages(self):
        result = compact_context([])
        assert isinstance(result, CompactSummaryRecord)
        assert result.model_version == COMPACTOR_VERSION
        assert result.token_count >= 0

    def test_short_conversation(self):
        messages = [
            make_msg(MessageRole.USER, "What is the weather in Sydney?"),
            make_msg(MessageRole.ASSISTANT, "It is 25C and sunny."),
        ]
        result = compact_context(messages)
        assert result.token_count > 0
        assert "weather" in result.content or "Weather" in result.content

    def test_preserves_recent_messages(self):
        messages = [make_msg(MessageRole.USER, f"Message {i}") for i in range(30)]
        result = compact_context(messages, max_recent=5)
        # Should contain recent messages
        assert "Message 29" in result.content or "Message 28" in result.content

    def test_existing_summary_integrated(self):
        messages = [make_msg(MessageRole.USER, f"Q{i}") for i in range(5)]
        existing = CompactSummaryRecord(
            summary_id=uuid4(),
            conversation_id=uuid4(),
            content='{"topics": ["weather"], "preferences": {}, "pending": [], "important_facts": [], "tool_outcomes": []}',
            token_count=10,
        )
        result = compact_context(messages, existing_summary=existing)
        assert "weather" in result.content

    def test_budget_exceeded_truncates(self):
        long_content = "A" * 20000
        messages = [make_msg(MessageRole.USER, long_content)]
        result = compact_context(messages, max_tokens=1000)
        assert result.token_count <= 1000

    def test_tool_outcome_tracked(self):
        messages = [
            make_msg(MessageRole.ASSISTANT, "", tool_call_id="call_1", tool_name="get_weather"),
            make_msg(MessageRole.TOOL, '{"temp": 25}', tool_name="get_weather", tool_call_id="call_1"),
        ]
        result = compact_context(messages)
        assert result.token_count > 0

    def test_compactor_version_recorded(self):
        result = compact_context([])
        assert result.model_version == COMPACTOR_VERSION
