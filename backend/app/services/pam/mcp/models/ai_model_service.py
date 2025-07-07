from __future__ import annotations

import asyncio
from typing import List, Dict, Any

from pydantic import BaseModel, Field
from openai import AsyncOpenAI

from app.core.config import settings


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
            cls._instance.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        return cls._instance

    async def chat_completion(self, messages: List[Dict[str, str]], **kwargs: Any) -> Any:
        """Generate a chat completion with token and latency guards."""

        max_tokens = min(int(kwargs.get("max_tokens", self.config.max_tokens)), self.config.max_tokens)

        try:
            return await asyncio.wait_for(
                self.client.chat.completions.create(
                    model=self.config.model,
                    messages=messages,
                    max_tokens=max_tokens,
                    **{k: v for k, v in kwargs.items() if k != "max_tokens"},
                ),
                timeout=self.config.timeout,
            )
        except asyncio.TimeoutError as exc:
            raise TimeoutError(f"AI model request exceeded {self.config.timeout}s") from exc


# Global singleton instance
ai_model_service = AIModelService()


async def get_ai_model_service() -> AIModelService:
    return ai_model_service
