from __future__ import annotations

import asyncio
import hashlib
import json
import os
import random
from typing import List, Dict, Any, Optional

from pydantic import BaseModel, Field
from openai import AsyncOpenAI

from app.core.config import settings
from app.services.cache import CacheService
from app.core.logging import get_logger


class AIModelConfig(BaseModel):
    """Configuration for the AI model service."""

    model: str = "gpt-4o"
    max_tokens: int = Field(default=4000, le=4000)
    timeout: int = Field(default=30, ge=1)


class AIModelService:
    """Async singleton wrapper around OpenAI with guards."""

    _instance: "AIModelService" | None = None

    def __new__(cls, config: AIModelConfig | None = None):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.config = config or AIModelConfig()
            cls._instance.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY.get_secret_value())
            alt_key = os.getenv("ALT_OPENAI_API_KEY")
            cls._instance.fallback_client = (
                AsyncOpenAI(api_key=alt_key) if alt_key else None
            )
            cls._instance.cache = CacheService()
            cls._instance.logger = get_logger(__name__)
        return cls._instance

    async def _generate_cache_key(self, messages: List[Dict[str, str]]) -> str:
        key_string = json.dumps({"model": self.config.model, "messages": messages}, sort_keys=True)
        return hashlib.sha256(key_string.encode()).hexdigest()

    def _calc_backoff(self, attempt: int, base: float = 1.0, factor: float = 2.0, max_delay: float = 30.0) -> float:
        delay = min(base * (factor ** attempt), max_delay)
        jitter = random.uniform(0, delay / 2)
        return delay + jitter

    async def chat_completion(self, messages: List[Dict[str, str]], **kwargs: Any) -> Any:
        """Generate a chat completion with token and latency guards."""

        max_tokens = min(int(kwargs.get("max_tokens", self.config.max_tokens)), self.config.max_tokens)

        cache_key = await self._generate_cache_key(messages)
        cached = await self.cache.get(cache_key)
        if cached:
            self.logger.info("AIModelService cache hit")
            return cached

        attempt = 0
        last_error: Optional[Exception] = None
        while attempt < 3:
            try:
                result = await asyncio.wait_for(
                    self.client.chat.completions.create(
                        model=self.config.model,
                        messages=messages,
                        max_tokens=max_tokens,
                        **{k: v for k, v in kwargs.items() if k != "max_tokens"},
                    ),
                    timeout=self.config.timeout,
                )
                await self.cache.set(cache_key, result)
                return result
            except asyncio.TimeoutError as exc:
                last_error = TimeoutError(f"AI model request exceeded {self.config.timeout}s")
            except Exception as exc:
                last_error = exc

            delay = self._calc_backoff(attempt)
            self.logger.warning(f"AI call failed, retrying in {delay:.2f}s (attempt {attempt + 1})")
            await asyncio.sleep(delay)
            attempt += 1

        # Fallback if retries exhausted
        if self.fallback_client:
            try:
                self.logger.info("Trying fallback AI service")
                result = await asyncio.wait_for(
                    self.fallback_client.chat.completions.create(
                        model=self.config.model,
                        messages=messages,
                        max_tokens=max_tokens,
                        **{k: v for k, v in kwargs.items() if k != "max_tokens"},
                    ),
                    timeout=self.config.timeout,
                )
                await self.cache.set(cache_key, result)
                return result
            except Exception as exc:  # pragma: no cover - best effort
                last_error = exc

        self.logger.error(f"AIModelService failed after retries: {last_error}")
        raise last_error or RuntimeError("Unknown AI service error")


# Global singleton instance
ai_model_service = AIModelService()


async def get_ai_model_service() -> AIModelService:
    return ai_model_service
