from typing import Any, Dict, List, Optional, Tuple
from unittest.mock import AsyncMock

import pytest

from app.services.ai.ai_orchestrator import AIOrchestrator
from app.services.ai.provider_interface import (
    AICapability,
    AIMessage,
    AIProviderInterface,
    AIProviderStatus,
    AIResponse,
    ProviderConfig,
)
from app.services.ai.ai_orchestrator import ProviderMetrics


class DummyProvider(AIProviderInterface):
    def __init__(self, name: str, supports_function_calling: bool, should_fail: bool = False):
        config = ProviderConfig(name=name, api_key="test-key", default_model="gpt-test")
        if supports_function_calling:
            config.capabilities.append(AICapability.FUNCTION_CALLING)
        super().__init__(config)
        self.should_fail = should_fail
        self.complete_calls: List[Dict[str, Any]] = []

    async def complete(
        self,
        messages: List[AIMessage],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs,
    ) -> AIResponse:
        self.complete_calls.append(kwargs)
        if self.should_fail:
            raise RuntimeError("failure")
        return AIResponse(
            content="ok",
            model=model or self.config.default_model,
            provider=self.name,
            usage={"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
            latency_ms=1.0,
            finish_reason="stop",
        )

    async def stream(self, *args, **kwargs):
        raise NotImplementedError

    async def health_check(self) -> Tuple[AIProviderStatus, Optional[str]]:
        return AIProviderStatus.HEALTHY, None


@pytest.mark.asyncio
async def test_functions_only_forwarded_to_capable_providers():
    orchestrator = AIOrchestrator()
    capable_provider = DummyProvider("capable", supports_function_calling=True, should_fail=True)
    fallback_provider = DummyProvider("fallback", supports_function_calling=False)

    orchestrator.providers = [capable_provider, fallback_provider]
    orchestrator._initialized = True
    orchestrator.provider_metrics = {
        "capable": ProviderMetrics(
            provider_name="capable",
            success_rate=1.0,
            average_latency_ms=0.0,
            cost_per_token=0.0,
            last_used=0.0,
            consecutive_failures=0,
        ),
        "fallback": ProviderMetrics(
            provider_name="fallback",
            success_rate=1.0,
            average_latency_ms=0.0,
            cost_per_token=0.0,
            last_used=0.0,
            consecutive_failures=0,
        ),
    }

    orchestrator._select_providers = AsyncMock(return_value=[capable_provider, fallback_provider])

    response = await orchestrator.complete(
        messages=[AIMessage(role="user", content="hi")],
        functions=[{"name": "tool", "description": ""}]
    )

    assert response.provider == "fallback"
    assert capable_provider.complete_calls[0]["functions"] == [{"name": "tool", "description": ""}]
    assert "functions" not in fallback_provider.complete_calls[0]
