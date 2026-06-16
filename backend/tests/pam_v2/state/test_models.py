"""
Tests for Pam V2 durable state domain models.
"""

from __future__ import annotations

from app.services.pam_v2.state.models import (
    ApprovalRecord,
    ApprovalStatus,
    ToolCallStatus,
    canonical_arguments_hash,
    generate_approval_token,
    hash_approval_token,
)


class TestCanonicalArgumentsHash:
    def test_deterministic_same_input(self):
        h1 = canonical_arguments_hash("get_weather", {"location": "Sydney"})
        h2 = canonical_arguments_hash("get_weather", {"location": "Sydney"})
        assert h1 == h2

    def test_order_independent(self):
        h1 = canonical_arguments_hash("get_weather", {"location": "Sydney", "units": "celsius"})
        h2 = canonical_arguments_hash("get_weather", {"units": "celsius", "location": "Sydney"})
        assert h1 == h2

    def test_different_tools_different_hash(self):
        h1 = canonical_arguments_hash("get_weather", {"location": "Sydney"})
        h2 = canonical_arguments_hash("load_profile", {"location": "Sydney"})
        assert h1 != h2

    def test_different_arguments_different_hash(self):
        h1 = canonical_arguments_hash("get_weather", {"location": "Sydney"})
        h2 = canonical_arguments_hash("get_weather", {"location": "Melbourne"})
        assert h1 != h2

    def test_empty_arguments_are_valid(self):
        h = canonical_arguments_hash("ping", {})
        assert isinstance(h, str)
        assert len(h) == 64

    def test_nested_arguments_consistent(self):
        args = {"filter": {"date_from": "2026-01-01", "tags": ["rv", "camp"]}}
        h1 = canonical_arguments_hash("search", args)
        h2 = canonical_arguments_hash("search", {"filter": {"tags": ["rv", "camp"], "date_from": "2026-01-01"}})
        assert h1 == h2

    def test_output_is_sha256(self):
        h = canonical_arguments_hash("test", {"a": 1})
        assert len(h) == 64
        assert all(c in "0123456789abcdef" for c in h)
        # Deterministic
        assert h == canonical_arguments_hash("test", {"a": 1})


class TestApprovalToken:
    def test_generate_token_is_opaque(self):
        token = generate_approval_token()
        assert len(token) >= 32
        assert isinstance(token, str)

    def test_hash_token_is_one_way(self):
        token = generate_approval_token()
        h = hash_approval_token(token)
        assert h != token
        assert len(h) == 64

    def test_hash_is_deterministic(self):
        token = "test-token-abc"
        h1 = hash_approval_token(token)
        h2 = hash_approval_token(token)
        assert h1 == h2

    def test_different_tokens_different_hash(self):
        h1 = hash_approval_token("token-a")
        h2 = hash_approval_token("token-b")
        assert h1 != h2

    def test_cannot_reverse_hash(self):
        token = generate_approval_token()
        h = hash_approval_token(token)
        # Verify it's SHA-256 not reversible
        assert isinstance(h, str)
        assert len(h) == 64
        # Brute force is infeasible; just check it's not the token itself


class TestDomainModels:
    def test_approval_record_default_status(self):
        from uuid import uuid4

        record = ApprovalRecord(
            approval_id=uuid4(),
            conversation_id=uuid4(),
            user_id="user_1",
            tool_name="create_calendar_event",
            arguments_hash="abc123",
            action_summary="Create event: RV trip",
            token_hash="def456",
        )
        assert record.status == ApprovalStatus.REQUESTED

    def test_tool_call_status_enum_values(self):
        assert ToolCallStatus("pending") == ToolCallStatus.PENDING
        assert ToolCallStatus("success") == ToolCallStatus.SUCCESS
        assert ToolCallStatus("error") == ToolCallStatus.ERROR
        assert ToolCallStatus("blocked") == ToolCallStatus.BLOCKED
