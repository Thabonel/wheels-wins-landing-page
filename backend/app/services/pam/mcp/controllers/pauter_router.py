from __future__ import annotations

import re
from typing import Any, Dict, Optional, Deque
from collections import deque

from langchain_core.runnables import Runnable, RunnableConfig

__all__ = ["PauterRouter", "pauter_router"]


class PauterRouter(Runnable[str, Dict[str, Any]]):
    """Simple heuristic router for PAM nodes with confidence scores."""

    VALID_NODES = {"wheels", "wins", "social", "memory", "shop"}
    _PATTERNS = {
        "wheels": re.compile(r"\b(trip|vehicle|route|camp|travel)\b"),
        "wins": re.compile(r"\b(expense|budget|finance|savings|win)\b"),
        "social": re.compile(r"\b(friend|community|social|group)\b"),
        "shop": re.compile(r"\b(shop|purchase|buy|product)\b"),
    }

    def __init__(self, feedback_window: int = 5) -> None:
        self.feedback_window = feedback_window
        self.feedback_scores: Dict[str, Deque[float]] = {
            node: deque(maxlen=feedback_window) for node in self.VALID_NODES
        }

    def update_feedback(self, node: str, rating: float) -> None:
        """Record a rating for a node."""
        if node in self.feedback_scores:
            self.feedback_scores[node].append(rating)

    def _feedback_weight(self, node: str) -> float:
        scores = self.feedback_scores.get(node)
        if scores:
            avg = sum(scores) / len(scores)
            return max(0.5, min(1.5, avg / 3.0))
        return 1.0

    def _route(self, text: str) -> Dict[str, Any]:
        text = text.lower()
        for node, pattern in self._PATTERNS.items():
            matches = pattern.findall(text)
            if matches:
                base = min(1.0, 0.6 + 0.1 * len(matches))
                confidence = min(1.0, base * self._feedback_weight(node))
                return {"target_node": node, "confidence": confidence}
        return {
            "target_node": "memory",
            "confidence": min(1.0, 0.4 * self._feedback_weight("memory")),
        }

    def invoke(self, input: str, config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
        return self._route(input)

    async def ainvoke(self, input: str, config: Optional[RunnableConfig] = None, **kwargs: Any) -> Dict[str, Any]:
        return self._route(input)


pauter_router = PauterRouter()
