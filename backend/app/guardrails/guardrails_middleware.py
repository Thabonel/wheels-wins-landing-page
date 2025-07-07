import re
import time
import yaml
from pathlib import Path
from collections import defaultdict, deque

from fastapi import Request
from starlette.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.services.pam.mcp.controllers.pauter_router import PauterRouter


class GuardrailsLLM:
    """Simple guardrails wrapper for PauterRouter."""

    def __init__(self, config_path: Path):
        with open(config_path, "r") as f:
            cfg = yaml.safe_load(f)

        self.profanity = set(cfg.get("profanity", {}).get("blocked", []))
        self.allowed_tools = set(cfg.get("tool_scoping", {}).get("allowed_tools", []))
        rl = cfg.get("rate_limit", {}).get("user_qps", {})
        self.limit = rl.get("limit", 3)
        self.window = rl.get("window_sec", 1)
        self.user_history = defaultdict(deque)
        self.router = PauterRouter()

    def _check_rate(self, user_id: str) -> bool:
        now = time.time()
        history = self.user_history[user_id]
        while history and history[0] <= now - self.window:
            history.popleft()
        if len(history) >= self.limit:
            return False
        history.append(now)
        return True

    def _contains_profanity(self, text: str) -> bool:
        lower = text.lower()
        return any(w in lower for w in self.profanity)

    def _contains_pii(self, text: str) -> bool:
        email = re.compile(r"[^\s]+@[^\s]+\.[^\s]+")
        phone = re.compile(r"\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b")
        return bool(email.search(text) or phone.search(text))

    async def invoke(self, text: str, user_id: str) -> dict:
        if not self._check_rate(user_id):
            raise ValueError("Rate limit exceeded")
        if self._contains_profanity(text):
            raise ValueError("Profanity detected")
        if self._contains_pii(text):
            raise ValueError("PII detected")
        result = await self.router.ainvoke(text)
        if result.get("target_node") not in self.allowed_tools:
            raise ValueError("Tool access denied")
        return result


class GuardrailsMiddleware(BaseHTTPMiddleware):
    """Middleware that applies GuardrailsLLM to PAM requests."""

    def __init__(self, app):
        super().__init__(app)
        config_path = Path(__file__).parent / "pam_guardrails.yaml"
        self.guard = GuardrailsLLM(config_path)

    async def dispatch(self, request: Request, call_next):
        if request.url.path.startswith("/api/pam") and request.method == "POST":
            body = await request.json()
            text = body.get("message") or body.get("content") or ""
            user_id = body.get("user_id") or request.headers.get("X-User", "anonymous")
            try:
                await self.guard.invoke(text, user_id)
            except ValueError as e:
                return JSONResponse(status_code=400, content={"error": str(e)})
        return await call_next(request)
