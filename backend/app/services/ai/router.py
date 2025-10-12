import math
import os
from dataclasses import dataclass
from typing import Optional, List, Dict, Any, Tuple

from .provider_interface import (
    AIMessage, AIResponse, AICapability, ProviderConfig, AIProviderInterface, AIProviderStatus
)
from .anthropic_provider import AnthropicProvider

try:
    from .gemini_provider import GeminiProvider  # optional provider
    GEMINI_AVAILABLE = True
except Exception:
    GEMINI_AVAILABLE = False


@dataclass
class RouteRequest:
    user_id: str
    messages: List[AIMessage]
    needs_tools: bool = False
    long_context: bool = False
    streaming: bool = False
    priority: str = "normal"  # normal | high


@dataclass
class RouteDecision:
    provider: str
    model: str
    reason: str
    estimated_cost_usd: float
    capabilities: List[str]
    fallback_chain: List[str]


class ModelRouter:
    """Simple, auditable router selecting a model by price and capability."""

    def __init__(self):
        self.providers: Dict[str, AIProviderInterface] = {}
        self._initialize_providers()
        # Simple in-memory metrics
        self.metrics = {
            "recommendations": {},  # provider -> count
            "executions": {},       # provider -> count
            "est_cost_usd": {},     # provider -> float
            "latency_ms": {},       # provider -> list[float]
            "last_decisions": []    # ring buffer of recent decisions
        }
        self._last_decisions_max = 50

    def _initialize_providers(self):
        # Anthropic (Claude)
        anth_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("ANTHROPIC-WHEELS-KEY")
        if anth_key:
            anth_cfg = ProviderConfig(
                name="anthropic",
                api_key=anth_key,
                default_model=os.getenv("ANTHROPIC_DEFAULT_MODEL", "claude-3-5-sonnet-20241022"),
            )
            self.providers["anthropic"] = AnthropicProvider(anth_cfg)

        # Gemini (optional)
        if GEMINI_AVAILABLE:
            gem_key = os.getenv("GEMINI_API_KEY")
            if gem_key:
                try:
                    gem_cfg = ProviderConfig(
                        name="gemini",
                        api_key=gem_key,
                        default_model=os.getenv("GEMINI_DEFAULT_MODEL", "gemini-1.5-flash"),
                    )
                    self.providers["gemini"] = GeminiProvider(gem_cfg)
                except Exception:
                    pass

        # OpenAI could be added similarly later

    @staticmethod
    def _estimate_tokens(messages: List[AIMessage]) -> int:
        # Very rough heuristic: 4 chars per token
        total_chars = sum(len(m.content) for m in messages)
        return max(1, math.ceil(total_chars / 4))

    def _get_price(self, provider: AIProviderInterface) -> Tuple[float, float]:
        return (
            provider.config.cost_per_1k_input_tokens,
            provider.config.cost_per_1k_output_tokens,
        )

    def _supports(self, p: AIProviderInterface, cap: AICapability) -> bool:
        return p.supports(cap)

    def recommend(self, req: RouteRequest) -> RouteDecision:
        tokens = self._estimate_tokens(req.messages)

        # Gather candidates
        candidates: List[Tuple[str, AIProviderInterface, float]] = []
        for name, provider in self.providers.items():
            if provider.status == AIProviderStatus.UNHEALTHY:
                continue

            # Capability gates
            if req.needs_tools and not self._supports(provider, AICapability.FUNCTION_CALLING):
                continue
            if req.long_context and not self._supports(provider, AICapability.LONG_CONTEXT):
                continue

            in_cost, out_cost = self._get_price(provider)
            # Assume 60/40 input/output split for estimate
            est = ((tokens * 0.6) / 1000.0) * in_cost + ((tokens * 0.4) / 1000.0) * out_cost
            candidates.append((name, provider, est))

        # If no candidates, fall back to any available provider
        if not candidates and self.providers:
            name, provider = next(iter(self.providers.items()))
            return RouteDecision(
                provider=name,
                model=provider.config.default_model,
                reason="No capable provider matched constraints; using first available",
                estimated_cost_usd=0.0,
                capabilities=[c.value for c in provider.capabilities],
                fallback_chain=[n for n in self.providers.keys() if n != name],
            )

        # Prefer cheapest for simple cases; prefer Claude for tools/complex
        if req.needs_tools or req.long_context or req.priority == "high":
            # Choose the most capable (Claude) if present
            if "anthropic" in self.providers:
                p = self.providers["anthropic"]
                in_cost, out_cost = self._get_price(p)
                est = ((tokens * 0.6) / 1000.0) * in_cost + ((tokens * 0.4) / 1000.0) * out_cost
                return RouteDecision(
                    provider="anthropic",
                    model=p.config.default_model,
                    reason="Complex/task with tools or long context → Claude",
                    estimated_cost_usd=est,
                    capabilities=[c.value for c in p.capabilities],
                    fallback_chain=[n for n, _p, _ in candidates if n != "anthropic"],
                )

        # Simple case: choose cheapest estimated
        name, provider, est = sorted(candidates, key=lambda t: t[2])[0]
        decision = RouteDecision(
            provider=name,
            model=provider.config.default_model,
            reason="Simple task → cheapest capable model",
            estimated_cost_usd=est,
            capabilities=[c.value for c in provider.capabilities],
            fallback_chain=[n for n, _p, _ in candidates if n != name],
        )
        # Record recommendation
        self._record_recommendation(decision)
        return decision

    async def complete(self, req: RouteRequest, temperature: float = 0.7, max_tokens: Optional[int] = None) -> AIResponse:
        decision = self.recommend(req)
        provider = self.providers.get(decision.provider)
        if not provider:
            # Fallback to any provider
            provider = next(iter(self.providers.values()))
        # Initialize lazily
        if provider.status == AIProviderStatus.UNKNOWN:
            await provider.initialize()
        try:
            resp = await provider.complete(
                messages=req.messages,
                model=decision.model,
                temperature=temperature,
                max_tokens=max_tokens,
                enable_tools=req.needs_tools,
            )
            self._record_execution(resp.provider, resp.model, resp.latency_ms, decision.estimated_cost_usd)
            return resp
        except Exception:
            # Fallback chain
            for name in decision.fallback_chain:
                fb = self.providers.get(name)
                if not fb:
                    continue
                if fb.status == AIProviderStatus.UNKNOWN:
                    await fb.initialize()
                try:
                    resp = await fb.complete(
                        messages=req.messages,
                        model=fb.config.default_model,
                        temperature=temperature,
                        max_tokens=max_tokens,
                        enable_tools=req.needs_tools,
                    )
                    self._record_execution(resp.provider, resp.model, resp.latency_ms, decision.estimated_cost_usd)
                    return resp
                except Exception:
                    continue
            raise

    # --- Metrics helpers ---
    def _record_recommendation(self, decision: RouteDecision):
        prov = decision.provider
        self.metrics["recommendations"][prov] = self.metrics["recommendations"].get(prov, 0) + 1
        self.metrics["est_cost_usd"][prov] = self.metrics["est_cost_usd"].get(prov, 0.0) + float(decision.estimated_cost_usd or 0.0)
        self.metrics["last_decisions"].append({
            "provider": decision.provider,
            "model": decision.model,
            "reason": decision.reason,
            "estimated_cost_usd": decision.estimated_cost_usd,
        })
        if len(self.metrics["last_decisions"]) > self._last_decisions_max:
            self.metrics["last_decisions"] = self.metrics["last_decisions"][ -self._last_decisions_max: ]

    def _record_execution(self, provider: str, model: str, latency_ms: float, est_cost_usd: float):
        self.metrics["executions"][provider] = self.metrics["executions"].get(provider, 0) + 1
        self.metrics.setdefault("latency_ms", {})
        self.metrics["latency_ms"].setdefault(provider, []).append(float(latency_ms or 0.0))

    def get_metrics(self) -> Dict[str, Any]:
        # Compute simple aggregates for latency
        latency_summary: Dict[str, Dict[str, float]] = {}
        for prov, samples in self.metrics.get("latency_ms", {}).items():
            if samples:
                latency_summary[prov] = {
                    "count": len(samples),
                    "avg_ms": sum(samples) / len(samples),
                    "p95_ms": sorted(samples)[max(0, int(0.95 * len(samples)) - 1)],
                }
            else:
                latency_summary[prov] = {"count": 0, "avg_ms": 0.0, "p95_ms": 0.0}
        # Provider statuses
        statuses = {name: prov.status.value for name, prov in self.providers.items()}

        return {
            "providers": list(self.providers.keys()),
            "statuses": statuses,
            "recommendations": self.metrics.get("recommendations", {}),
            "executions": self.metrics.get("executions", {}),
            "estimated_cost_usd": self.metrics.get("est_cost_usd", {}),
            "latency_ms": latency_summary,
            "last_decisions": self.metrics.get("last_decisions", []),
        }
