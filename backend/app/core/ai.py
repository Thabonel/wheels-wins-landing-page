"""
AI Client Module

Provides a unified AI client interface for PAM tools that need
direct AI generation (like meal planning).

This module wraps the Anthropic client to provide a simpler interface
for tools that don't need the full PAM orchestration.
"""

import os
import logging
from typing import Optional

from anthropic import AsyncAnthropic

logger = logging.getLogger(__name__)


class AIClient:
    """
    Simple AI client wrapper for tool-level AI generation.

    Provides async text generation using Claude without the full
    PAM orchestration overhead.
    """

    def __init__(self):
        api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("ANTHROPIC-WHEELS-KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable not set")

        self._client = AsyncAnthropic(api_key=api_key)

        # Use the configured model
        try:
            from app.config.ai_providers import ANTHROPIC_MODEL
            self._model = ANTHROPIC_MODEL
        except ImportError:
            self._model = "claude-sonnet-4-5-20250929"

        logger.info(f"AIClient initialized with model: {self._model}")

    async def generate_text(
        self,
        prompt: str,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        system_prompt: Optional[str] = None
    ) -> str:
        """
        Generate text using Claude.

        Args:
            prompt: The user prompt to send
            max_tokens: Maximum tokens in response
            temperature: Creativity level (0-1)
            system_prompt: Optional system prompt

        Returns:
            Generated text response
        """
        try:
            messages = [{"role": "user", "content": prompt}]

            kwargs = {
                "model": self._model,
                "max_tokens": max_tokens,
                "messages": messages,
                "temperature": temperature,
            }

            if system_prompt:
                kwargs["system"] = system_prompt

            response = await self._client.messages.create(**kwargs)

            # Extract text from response
            if response.content and len(response.content) > 0:
                return response.content[0].text

            return ""

        except Exception as e:
            logger.error(f"AI generation error: {e}")
            raise


# Singleton instance
_ai_client: Optional[AIClient] = None


def get_ai_client() -> AIClient:
    """
    Get the shared AI client instance.

    Returns:
        AIClient instance
    """
    global _ai_client
    if _ai_client is None:
        _ai_client = AIClient()
    return _ai_client
