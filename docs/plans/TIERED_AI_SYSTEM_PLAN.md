# Plan: Tiered AI System with DeepSeek for Free Users

## Goal
Reduce AI costs by 95% for free-tier users by routing them to DeepSeek V3 while preserving premium Claude Sonnet 4.5 for paid subscribers.

## Cost Analysis

### Current Costs (Claude Sonnet 4.5 for all users)
| Metric | Value |
|--------|-------|
| Input tokens | $3.00/1M |
| Output tokens | $15.00/1M |
| Average query | ~2,000 tokens in + 500 out |
| **Cost per query** | **~$0.0135** |

### Proposed Free Tier Costs (DeepSeek V3)
| Metric | Value |
|--------|-------|
| Input tokens | $0.27/1M |
| Output tokens | $1.10/1M |
| Cache hits | 90% discount ($0.027/1M) |
| Average query | ~2,000 tokens in + 500 out |
| **Cost per query** | **~$0.0011** |
| **Savings** | **92% reduction** |

### Monthly Cost Projection
| Scenario | Current (Claude-only) | Tiered System |
|----------|----------------------|---------------|
| 1,000 free users @ 50 queries | $675 | $55 |
| 500 paid users @ 100 queries | $675 | $675 |
| **Total** | **$1,350** | **$730** |
| **Savings** | - | **$620/month (46%)** |

---

## Current Architecture Summary

### Provider System
```
backend/app/services/ai/
├── provider_interface.py   # Base class: AIProviderInterface
├── ai_orchestrator.py      # Multi-provider failover/selection
├── anthropic_provider.py   # Claude Sonnet 4.5 (PRIMARY)
├── openai_provider.py      # GPT-5.1 (SECONDARY)
└── gemini_provider.py      # DISABLED
```

### Key Components
1. **AIProviderInterface**: Abstract base with `complete()`, `stream()`, `health_check()`
2. **AIOrchestrator**: Strategy-based provider selection (PRIORITY, COST, LATENCY)
3. **QuotaManager**: Tracks `subscription_tier` per user in `user_usage_quotas` table
4. **MODEL_PRICING**: Per-model cost tracking in `quota_manager.py`

### Current Provider Selection Flow
```
User Message → PAM WebSocket → AIOrchestrator.complete()
                                    ↓
                         Select provider by strategy (PRIORITY)
                                    ↓
                         Try Anthropic → Fallback to OpenAI
                                    ↓
                         Return AIResponse
```

---

## Proposed Architecture

### New Flow: Subscription-Aware Routing
```
User Message → PAM WebSocket → Get user subscription_tier
                                    ↓
                         ┌─────────┴─────────┐
                         │                   │
                    free/trial            paid/admin
                         │                   │
                    DeepSeek V3        Claude Sonnet 4.5
                         │                   │
                         └─────────┬─────────┘
                                    ↓
                              AIResponse
```

### Tier-to-Provider Mapping
| Subscription Tier | Primary Provider | Fallback |
|-------------------|------------------|----------|
| `free` | DeepSeek V3 | OpenAI GPT-5.1 Instant |
| `trial` | DeepSeek V3 | OpenAI GPT-5.1 Instant |
| `monthly` | Claude Sonnet 4.5 | OpenAI GPT-5.1 |
| `annual` | Claude Sonnet 4.5 | OpenAI GPT-5.1 |
| `admin` | Claude Sonnet 4.5 | All providers |

---

## Implementation Steps

### Step 1: Create DeepSeek Provider

**File:** `backend/app/services/ai/deepseek_provider.py`

```python
"""
DeepSeek V3 Provider - Cost-effective AI for free tier users
API Docs: https://api-docs.deepseek.com/
"""

from .provider_interface import (
    AIProviderInterface, AIMessage, AIResponse, AICapability,
    AIProviderStatus, ProviderConfig
)

class DeepSeekProvider(AIProviderInterface):
    """DeepSeek V3 provider - OpenAI-compatible API"""

    BASE_URL = "https://api.deepseek.com/v1"

    def __init__(self, config: ProviderConfig):
        if not config.capabilities:
            config.capabilities = [
                AICapability.CHAT,
                AICapability.STREAMING,
                AICapability.FUNCTION_CALLING,  # DeepSeek V3 supports tools
                AICapability.LONG_CONTEXT,      # 64K context window
            ]
        if not config.default_model:
            config.default_model = "deepseek-chat"

        # DeepSeek pricing (per 1M tokens)
        config.cost_per_1k_input_tokens = 0.00027   # $0.27/1M
        config.cost_per_1k_output_tokens = 0.0011   # $1.10/1M
        config.max_context_window = 65536           # 64K tokens
        config.max_tokens_per_request = 8192

        super().__init__(config)
        self.client = None

    async def initialize(self) -> bool:
        # Use OpenAI SDK with custom base_url
        from openai import AsyncOpenAI
        self.client = AsyncOpenAI(
            api_key=self.config.api_key,
            base_url=self.BASE_URL
        )
        self._status = AIProviderStatus.HEALTHY
        return True

    async def complete(self, messages, model=None, temperature=0.7, max_tokens=None, **kwargs):
        # Implementation follows OpenAI pattern
        ...
```

### Step 2: Update AI Provider Config

**File:** `backend/app/config/ai_providers.py`

Add DeepSeek configuration:
```python
# =============================================================================
# FREE TIER PROVIDER (DeepSeek V3)
# =============================================================================

DEEPSEEK_MODEL = "deepseek-chat"
DEEPSEEK_MAX_TOKENS = 8192
DEEPSEEK_TEMPERATURE = 0.7

# Costs (per 1M tokens) - 50x cheaper than Claude!
DEEPSEEK_INPUT_COST = 0.27    # $0.27 per 1M input tokens
DEEPSEEK_OUTPUT_COST = 1.10   # $1.10 per 1M output tokens

# Cache discount (90% off for prefix cache hits)
DEEPSEEK_CACHE_INPUT_COST = 0.027  # $0.027 per 1M cached input

# Provider priority by tier
PROVIDER_PRIORITY_FREE = ["deepseek", "openai"]
PROVIDER_PRIORITY_PAID = ["anthropic", "openai"]
```

### Step 3: Add Tier-Based Provider Selection

**File:** `backend/app/services/ai/ai_orchestrator.py`

Add method to get provider priority based on subscription tier:
```python
from app.services.usage.quota_manager import check_user_quota

async def get_providers_for_tier(self, user_id: str) -> List[AIProviderInterface]:
    """Select providers based on user subscription tier"""
    try:
        quota = await check_user_quota(user_id)
        tier = quota.subscription_tier
    except ValueError:
        tier = "free"  # Default to free if no quota record

    if tier in ("monthly", "annual", "admin"):
        # Paid users get Claude Sonnet 4.5 primary
        priority = ["anthropic", "openai", "deepseek"]
    else:
        # Free/trial users get DeepSeek primary
        priority = ["deepseek", "openai"]

    # Return providers in priority order
    return [p for name in priority for p in self.providers if p.name == name]
```

### Step 4: Update Complete Method

Modify `ai_orchestrator.complete()` to accept `user_id` for tier-based routing:
```python
async def complete(
    self,
    messages: List[AIMessage],
    user_id: Optional[str] = None,  # NEW: For tier-based routing
    ...
) -> AIResponse:
    if user_id:
        providers_to_try = await self.get_providers_for_tier(user_id)
    else:
        providers_to_try = await self._select_providers(...)
```

### Step 5: Update PAM WebSocket Handler

**File:** `backend/app/api/v1/pam_main.py`

Pass user_id to orchestrator:
```python
# In websocket handler
response = await ai_orchestrator.complete(
    messages=messages,
    user_id=user_id,  # NEW: Enable tier-based routing
    functions=tool_definitions,
    ...
)
```

### Step 6: Add DeepSeek to Model Pricing

**File:** `backend/app/services/usage/quota_manager.py`

```python
MODEL_PRICING = {
    # Existing models...
    "deepseek-chat": {
        "input": 0.00027,   # $0.27/1M input tokens
        "output": 0.0011    # $1.10/1M output tokens
    },
    "deepseek-reasoner": {
        "input": 0.00055,   # $0.55/1M input tokens
        "output": 0.00219   # $2.19/1M output tokens
    },
}
```

### Step 7: Add Environment Variable

**File:** `backend/.env`
```bash
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx
```

**File:** `backend/app/core/infra_config.py`
```python
DEEPSEEK_API_KEY: SecretStr = Field(
    default="",
    description="DeepSeek API key for free tier AI"
)
```

---

## Files to Create/Modify

| Action | File | Description |
|--------|------|-------------|
| CREATE | `backend/app/services/ai/deepseek_provider.py` | DeepSeek V3 provider |
| MODIFY | `backend/app/config/ai_providers.py` | Add DeepSeek config |
| MODIFY | `backend/app/services/ai/ai_orchestrator.py` | Tier-based routing |
| MODIFY | `backend/app/services/usage/quota_manager.py` | DeepSeek pricing |
| MODIFY | `backend/app/core/infra_config.py` | DEEPSEEK_API_KEY |
| MODIFY | `backend/app/api/v1/pam_main.py` | Pass user_id to orchestrator |

---

## DeepSeek V3 Capabilities

### Supported Features
- Chat completions (OpenAI-compatible API)
- Streaming responses
- Function calling (tools)
- 64K context window
- JSON mode
- Prefix caching (90% cost reduction on repeated prompts)

### Limitations vs Claude Sonnet 4.5
- No vision/image support (Claude has this)
- Slightly lower reasoning quality on complex tasks
- No native MCP tool support (but function calling works)

### API Compatibility
DeepSeek uses OpenAI-compatible API format, so we can use the `openai` Python SDK with a custom `base_url`. This simplifies implementation significantly.

---

## Verification Plan

1. **Unit Test**: Create `test_deepseek_provider.py`
   - Test basic completion
   - Test streaming
   - Test function calling
   - Test error handling

2. **Integration Test**:
   - Create free-tier user
   - Send PAM message
   - Verify DeepSeek was used (check logs/quota)

3. **A/B Comparison**:
   - Same prompt to Claude and DeepSeek
   - Compare response quality
   - Compare latency

4. **Cost Verification**:
   - Check `pam_usage_logs` for DeepSeek queries
   - Verify cost calculation accuracy

---

## Rollout Strategy

### Phase 1: Shadow Mode (Week 1)
- Deploy DeepSeek provider
- Run in parallel with Claude for 10% of free users
- Compare response quality and latency
- No cost savings yet (both providers run)

### Phase 2: Limited Rollout (Week 2)
- Route 50% of free-tier traffic to DeepSeek
- Monitor user feedback
- Monitor error rates

### Phase 3: Full Rollout (Week 3)
- Route all free-tier traffic to DeepSeek
- Monitor cost reduction
- Keep Claude as fallback for failures

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| DeepSeek quality issues | Automatic fallback to OpenAI/Claude |
| API downtime | Circuit breaker + fallback providers |
| Rate limiting | Implement retry with exponential backoff |
| User complaints | Easy toggle to Claude via admin |

---

## Open Questions

1. **Cache Warming**: Should we pre-warm DeepSeek cache with common prompts?
2. **Premium Features**: Should some PAM tools (trip planning, complex reasoning) always use Claude?
3. **User Visibility**: Should users see which AI model answered their query?
4. **Upgrade Path**: Show "Upgrade for better AI responses" when DeepSeek is used?

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Cost reduction (free tier) | >90% |
| Response quality (DeepSeek vs Claude) | >85% user satisfaction |
| Latency (DeepSeek) | <2s average |
| Error rate | <1% |
| Fallback rate | <5% |

---

## Timeline

| Step | Duration | Dependencies |
|------|----------|--------------|
| Create DeepSeek provider | 2 hours | None |
| Add tier-based routing | 1 hour | Step 1 |
| Update configs | 30 min | Step 2 |
| Testing | 2 hours | All above |
| Staging deployment | 1 hour | Tests pass |
| Production rollout | Gradual over 2 weeks | Staging verified |

**Estimated Total Implementation Time: 1 day**

---

## References

- [DeepSeek API Documentation](https://api-docs.deepseek.com/)
- [DeepSeek V3 Pricing](https://api-docs.deepseek.com/quick_start/pricing)
- [OpenAI SDK Compatibility](https://api-docs.deepseek.com/api/create-chat-completion)
