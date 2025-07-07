from __future__ import annotations

import re
from typing import Any, Dict, Optional

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

    def _route(self, text: str) -> Dict[str, Any]:
        text = text.lower()
        for node, pattern in self._PATTERNS.items():
            matches = pattern.findall(text)
            if matches:
                confidence = min(1.0, 0.6 + 0.1 * len(matches))
                return {"target_node": node, "confidence": confidence}
        return {"target_node": "memory", "confidence": 0.4}

    def invoke(self, input: str, config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
        return self._route(input)

    async def ainvoke(self, input: str, config: Optional[RunnableConfig] = None, **kwargs: Any) -> Dict[str, Any]:
        return self._route(input)


pauter_router = PauterRouter()
