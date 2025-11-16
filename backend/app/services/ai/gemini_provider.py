"""
Google Gemini Provider (DISABLED - Unreliable API)
Note: Gemini is disabled due to unstable v1beta API.
Use Anthropic (Claude Sonnet 4.5) or OpenAI (GPT-5.1) instead.
"""

import time
from typing import List, Dict, Any, AsyncGenerator, Optional, Tuple
import logging

from .provider_interface import (
    AIProviderInterface, AIMessage, AIResponse, AICapability,
    AIProviderStatus, ProviderConfig
)
from app.config.ai_providers import GEMINI_ENABLED

logger = logging.getLogger(__name__)

try:
    import google.generativeai as genai  # type: ignore
    GEMINI_SDK = True
except Exception:
    genai = None
    GEMINI_SDK = False


class GeminiProvider(AIProviderInterface):
    def __init__(self, config: ProviderConfig):
        # Check if Gemini is disabled in centralized config
        if not GEMINI_ENABLED:
            raise RuntimeError(
                "Gemini provider is disabled. "
                "Use Anthropic (Claude Sonnet 4.5) or OpenAI (GPT-5.1). "
                "See /docs/VERIFIED_AI_MODELS.md"
            )

        if not config.capabilities:
            config.capabilities = [
                AICapability.CHAT,
                AICapability.FAST_RESPONSE,
                # Optionally VISION if enabled later
            ]
        if not config.default_model:
            config.default_model = "models/gemini-1.5-flash-latest"  # Stable v1beta API model

        # Approximate costs (adjust via env/config as needed)
        if config.cost_per_1k_input_tokens == 0.0:
            config.cost_per_1k_input_tokens = 0.0005  # example low cost
        if config.cost_per_1k_output_tokens == 0.0:
            config.cost_per_1k_output_tokens = 0.0015

        config.max_context_window = 1000000  # Gemini 2.5 supports 1M token context
        config.max_tokens_per_request = 8192  # Increased for Gemini 2.5

        super().__init__(config)
        self.client = None

    async def initialize(self) -> bool:
        if not GEMINI_SDK:
            self._status = AIProviderStatus.UNHEALTHY
            return False
        try:
            genai.configure(api_key=self.config.api_key)
            self.client = genai.GenerativeModel(self.config.default_model)
            self._status = AIProviderStatus.HEALTHY
            return True
        except Exception as e:
            logger.error(f"Failed to initialize Gemini provider: {e}")
            self._status = AIProviderStatus.UNHEALTHY
            return False

    async def complete(
        self,
        messages: List[AIMessage],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> AIResponse:
        if not GEMINI_SDK or not self.client:
            raise RuntimeError("Gemini SDK not available or client not initialized")

        start = time.time()
        # Gemini expects a single prompt string; join messages for now.
        # For production, map roles to proper parts.
        prompt = []
        system = None
        for m in messages:
            if m.role == "system":
                system = m.content
            else:
                prompt.append(f"{m.role}: {m.content}")
        full_prompt = (system + "\n\n" if system else "") + "\n".join(prompt)

        try:
            resp = await self.client.generate_content_async(full_prompt)
            text = resp.text if hasattr(resp, 'text') else str(resp)
            latency_ms = (time.time() - start) * 1000
            self.record_success(latency_ms)
            return AIResponse(
                content=text or "",
                model=model or self.config.default_model,
                provider="gemini",
                usage={"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
                latency_ms=latency_ms,
                finish_reason=None,
            )
        except Exception as e:
            self.record_failure(e)
            logger.error(f"Gemini completion error: {e}")
            raise

    async def stream(
        self,
        messages: List[AIMessage],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        # Basic non-stream fallback (could implement proper streaming with SDK support later)
        resp = await self.complete(messages, model, temperature, max_tokens, **kwargs)
        yield resp.content

    async def health_check(self) -> Tuple[AIProviderStatus, Optional[str]]:
        if not GEMINI_SDK:
            return AIProviderStatus.UNHEALTHY, "Gemini SDK not installed"
        try:
            if not self.client:
                await self.initialize()
            # Minimal sanity: no API ping; assume healthy if initialized
            self._status = AIProviderStatus.HEALTHY
            return AIProviderStatus.HEALTHY, "Gemini initialized"
        except Exception as e:
            self._status = AIProviderStatus.UNHEALTHY
            return AIProviderStatus.UNHEALTHY, str(e)

    async def cleanup(self) -> None:
        self.client = None

