"""
Tests for the versioned Pam V2 system prompt builder.
"""

from __future__ import annotations

from datetime import datetime

import pytest

from app.services.pam_v2.models import Message
from app.services.pam_v2.prompts import PROMPT_VERSION, build_messages, build_system_prompt


class FakeTool:
    def __init__(self, name, namespace):
        self.name = name
        self.namespace = namespace


@pytest.fixture
def tool_specs():
    return [
        FakeTool(name="get_weather", namespace="weather"),
        FakeTool(name="load_profile", namespace="profile"),
    ]


class TestPromptInvariants:
    def test_prompt_version_present(self, tool_specs):
        prompt = build_system_prompt("en-AU", "Australia/Sydney", tool_specs)
        assert PROMPT_VERSION in prompt
        assert f"prompt_version: {PROMPT_VERSION}" in prompt

    def test_locale_and_timezone_present(self, tool_specs):
        prompt = build_system_prompt("en-AU", "Australia/Sydney", tool_specs)
        assert "locale: en-AU" in prompt
        assert "timezone: Australia/Sydney" in prompt

    def test_no_secrets_in_prompt(self, tool_specs):
        prompt = build_system_prompt(
            "en-AU",
            "Australia/Sydney",
            tool_specs,
            extra_context={"api_key": "sk-secret", "password": "hunter2"},
        )
        assert "sk-secret" not in prompt
        assert "hunter2" not in prompt

    def test_no_full_tool_schema_enumeration(self, tool_specs):
        prompt = build_system_prompt("en-AU", "Australia/Sydney", tool_specs)
        assert "input_schema" not in prompt
        assert "properties" not in prompt
        assert "required" not in prompt

    def test_capability_boundary_mentioned(self, tool_specs):
        prompt = build_system_prompt("en-AU", "Australia/Sydney", tool_specs)
        assert "read-only" in prompt.lower()
        assert "cannot book" in prompt.lower()
        assert "buy," in prompt.lower() or "buy" in prompt.lower()

    def test_static_precedes_dynamic(self, tool_specs):
        prompt = build_system_prompt("en-AU", "Australia/Sydney", tool_specs)
        static_end = prompt.find("Runtime context:")
        dynamic_start = prompt.find("prompt_version:")
        assert static_end < dynamic_start

    def test_tool_summary_grouped_by_namespace(self, tool_specs):
        prompt = build_system_prompt("en-AU", "Australia/Sydney", tool_specs)
        assert "profile: load_profile" in prompt
        assert "weather: get_weather" in prompt

    def test_current_time_included(self, tool_specs):
        now = datetime(2026, 6, 16, 12, 0, 0)
        prompt = build_system_prompt("en-AU", "Australia/Sydney", tool_specs, now=now)
        assert "2026-06-16T12:00:00" in prompt


class TestBuildMessages:
    def test_build_messages_structure(self, tool_specs):
        messages = build_messages(
            user_message="What is the weather?",
            locale="en-AU",
            timezone="Australia/Sydney",
            tools=tool_specs,
        )
        assert len(messages) == 2
        assert messages[0].role == "system"
        assert messages[1].role == "user"
        assert messages[1].content == "What is the weather?"

    def test_build_messages_with_history(self, tool_specs):
        history = [Message(role="assistant", content="Hello")]
        messages = build_messages(
            user_message="What is the weather?",
            locale="en-AU",
            timezone="Australia/Sydney",
            tools=tool_specs,
            history=history,
        )
        assert len(messages) == 3
        assert messages[1] == history[0]
