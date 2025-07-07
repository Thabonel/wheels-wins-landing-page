from __future__ import annotations

import re
from typing import Any, Dict, Optional

from langchain_core.runnables import Runnable, RunnableConfig


class PauterRouter(Runnable[str, Dict[str, Any]]):
    """Simple heuristic router for PAM nodes."""

    VALID_NODES = {"wheels", "wins", "social", "memory"}

    def _route(self, text: str) -> Dict[str, Any]:
        text = text.lower()
        if re.search(r"\b(trip|vehicle|route|camp|travel)\b", text):
            return {"target_node": "wheels", "confidence": 0.8}
        if re.search(r"\b(expense|budget|finance|savings|win)\b", text):
            return {"target_node": "wins", "confidence": 0.8}
        if re.search(r"\b(friend|community|social|group)\b", text):
            return {"target_node": "social", "confidence": 0.8}
        return {"target_node": "memory", "confidence": 0.5}

    def invoke(self, input: str, config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
        return self._route(input)

    async def ainvoke(self, input: str, config: Optional[RunnableConfig] = None, **kwargs: Any) -> Dict[str, Any]:
        return self._route(input)


pauter_router = PauterRouter()
