"""
Temporary idempotency and concurrency guard for Pam V2 turns.

Prevents duplicate execution of the same client_message_id within a bounded
window. Falls back to process memory when Redis is unavailable.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Dict, Optional, Set


@dataclass
class IdempotencyGuard:
    """Bounded in-memory deduplication cache with TTL."""

    ttl_seconds: float = 300.0
    max_entries: int = 1000
    _entries: Dict[str, float] = field(default_factory=dict)

    def is_processed(self, message_id: str) -> bool:
        """Return True if the message_id was seen within the TTL window."""
        self._evict_expired()
        return message_id in self._entries

    def mark_processed(self, message_id: str) -> None:
        """Record a message_id as processed."""
        self._evict_expired()
        if len(self._entries) >= self.max_entries:
            oldest = min(self._entries, key=self._entries.get)
            del self._entries[oldest]
        self._entries[message_id] = time.monotonic()

    def clear(self) -> None:
        """Remove all entries (for testing)."""
        self._entries.clear()

    def _evict_expired(self) -> None:
        now = time.monotonic()
        expired = [k for k, ts in self._entries.items() if now - ts > self.ttl_seconds]
        for k in expired:
            del self._entries[k]


# Global guard instance.
idempotency_guard = IdempotencyGuard()
