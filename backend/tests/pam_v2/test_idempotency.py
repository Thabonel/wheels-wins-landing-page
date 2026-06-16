"""
Tests for the Pam V2 idempotency guard.
"""

from __future__ import annotations

import time

from app.services.pam_v2.idempotency import IdempotencyGuard


class TestIdempotencyGuard:
    def test_fresh_message_not_processed(self):
        guard = IdempotencyGuard()
        assert not guard.is_processed("msg_1")

    def test_marked_message_is_processed(self):
        guard = IdempotencyGuard()
        guard.mark_processed("msg_1")
        assert guard.is_processed("msg_1")

    def test_ttl_expires_message(self):
        guard = IdempotencyGuard(ttl_seconds=0.1)
        guard.mark_processed("msg_1")
        assert guard.is_processed("msg_1")
        time.sleep(0.15)
        assert not guard.is_processed("msg_1")

    def test_max_entries_evicts_oldest(self):
        guard = IdempotencyGuard(max_entries=3)
        guard.mark_processed("msg_1")
        guard.mark_processed("msg_2")
        guard.mark_processed("msg_3")
        assert guard.is_processed("msg_1")
        guard.mark_processed("msg_4")  # should evict msg_1
        assert not guard.is_processed("msg_1")
        assert guard.is_processed("msg_4")

    def test_clear_removes_all(self):
        guard = IdempotencyGuard()
        guard.mark_processed("msg_1")
        guard.clear()
        assert not guard.is_processed("msg_1")

    def test_multiple_messages_independent(self):
        guard = IdempotencyGuard()
        guard.mark_processed("msg_1")
        guard.mark_processed("msg_2")
        assert guard.is_processed("msg_1")
        assert guard.is_processed("msg_2")
        assert not guard.is_processed("msg_3")
