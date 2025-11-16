# Verified AI Models - November 2025

**Last Updated:** November 16, 2025
**Status:** ✅ PRODUCTION VERIFIED
**Purpose:** Single source of truth for AI model IDs used in PAM

---

## ✅ PRODUCTION MODELS (Use These)

### Primary: Anthropic Claude Sonnet 4.5
```
Model ID: claude-sonnet-4-5-20250929
```

**Released:** End of September 2025
**Best For:**
- Advanced coding and software development
- Multi-step agentic tasks
- Tool usage and function calling
- Computer/system interaction
- Long-context conversations (200K tokens)

**Costs:**
- Input: $3 per 1M tokens
- Output: $15 per 1M tokens

**API:**
```python
from anthropic import AsyncAnthropic

client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
response = await client.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=4096,
    messages=[{"role": "user", "content": "Hello"}]
)
```

---

### Secondary: OpenAI GPT-5.1 Instant
```
Model ID: gpt-5.1-instant
```

**Released:** Mid-November 2025
**Best For:**
- Fast, everyday conversations
- Quick queries and responses
- Real-time chat interactions
- Low-latency requirements

**Costs:**
- Input: $1.25 per 1M tokens
- Output: $10 per 1M tokens

**API:**
```python
from openai import AsyncOpenAI

client = AsyncOpenAI(api_key=OPENAI_API_KEY)
response = await client.chat.completions.create(
    model="gpt-5.1-instant",
    max_completion_tokens=4096,  # Note: NOT max_tokens!
    messages=[{"role": "user", "content": "Hello"}]
)
```

**⚠️ CRITICAL:** GPT-5.1 uses `max_completion_tokens` parameter, NOT `max_tokens`

---

### Complex Tasks: OpenAI GPT-5.1 Thinking
```
Model ID: gpt-5.1-thinking
```

**Released:** Mid-November 2025
**Best For:**
- Complex reasoning problems
- Math and calculations
- Code debugging and analysis
- Problems requiring deep thinking

**Costs:**
- Input: $1.25 per 1M tokens
- Output: $10 per 1M tokens

**Usage Note:** Takes longer to respond (deliberate thinking process)

---

## ❌ DEPRECATED MODELS (Never Use)

### Old Claude 3.5 Versions
```
❌ claude-3-5-sonnet-20241022  (Will return 404)
❌ claude-3-5-sonnet-20240620  (Outdated)
❌ claude-3-5-haiku-20241022   (Use Claude 4.5 instead)
```

**Why Deprecated:** Claude Sonnet 4.5 is superior in every way

---

### Old GPT-4 Versions
```
❌ gpt-4o                (Replaced by GPT-5.1)
❌ gpt-4o-mini           (Replaced by GPT-5.1)
❌ gpt-4-turbo           (Outdated)
❌ gpt-3.5-turbo         (Very outdated)
```

**Why Deprecated:** GPT-5.1 variants are faster and more capable

---

### Gemini Models
```
❌ gemini-1.5-flash-latest  (Unstable API)
❌ gemini-1.5-pro-latest    (Unreliable)
❌ gemini-2.0-flash-exp     (Experimental)
```

**Why Deprecated:** API instability (v1beta issues), unreliable fallback

---

## 🔧 Implementation Guide

### 1. Centralized Configuration
**File:** `backend/app/config/ai_providers.py`

```python
"""
Single Source of Truth for AI Provider Configuration
DO NOT change these without verification!
"""

# PRIMARY PROVIDER (90% of traffic)
ANTHROPIC_MODEL = "claude-sonnet-4-5-20250929"
ANTHROPIC_MAX_TOKENS = 4096
ANTHROPIC_TEMPERATURE = 0.7

# SECONDARY PROVIDER (10% of traffic)
OPENAI_MODEL = "gpt-5.1-instant"
OPENAI_MAX_COMPLETION_TOKENS = 4096  # Note: NOT max_tokens!
OPENAI_TEMPERATURE = 0.7

# FALLBACK ORDER
PROVIDER_PRIORITY = ["anthropic", "openai"]

# DISABLE TERTIARY
GEMINI_ENABLED = False
```

---

### 2. Provider Implementation

**Anthropic Provider:**
```python
# backend/app/services/ai/anthropic_provider.py
config.default_model = "claude-sonnet-4-5-20250929"
```

**OpenAI Provider:**
```python
# backend/app/services/ai/openai_provider.py
config.default_model = "gpt-5.1-instant"

# CRITICAL: Use correct parameter name
response = await client.chat.completions.create(
    model="gpt-5.1-instant",
    max_completion_tokens=4096,  # NOT max_tokens!
    messages=messages
)
```

---

## 🚨 Troubleshooting

### If You Get 404 Errors:

1. **Check Model ID Spelling:**
   ```
   ✅ claude-sonnet-4-5-20250929  (Correct)
   ❌ claude-3-5-sonnet-20241022  (Old version)
   ```

2. **Verify API Key Has Access:**
   - Anthropic: Check account tier supports Claude 4.5
   - OpenAI: Check account has GPT-5.1 access

3. **Check API Parameter Names:**
   ```python
   # OpenAI - WRONG
   max_tokens=4096  ❌

   # OpenAI - CORRECT
   max_completion_tokens=4096  ✅
   ```

---

## 📋 Pre-Deployment Checklist

Before deploying PAM to staging or production:

- [ ] All config files use `claude-sonnet-4-5-20250929`
- [ ] All config files use `gpt-5.1-instant` (NOT gpt-4*)
- [ ] OpenAI calls use `max_completion_tokens` (NOT `max_tokens`)
- [ ] Anthropic calls use `max_tokens` (correct)
- [ ] No references to deprecated models in code
- [ ] Environment variables set correctly
- [ ] Test message returns AI response (not 404)

---

## 📊 Cost Comparison

| Model | Input ($/1M) | Output ($/1M) | Best Use Case |
|-------|--------------|---------------|---------------|
| Claude Sonnet 4.5 | $3 | $15 | Agentic tasks, coding |
| GPT-5.1 Instant | $1.25 | $10 | Fast chat, quick queries |
| GPT-5.1 Thinking | $1.25 | $10 | Complex reasoning |

**Recommended Split:**
- 90% Claude Sonnet 4.5 (primary AI brain)
- 10% GPT-5.1 Instant (fallback)

---

## 🔄 Update History

| Date | Change | Reason |
|------|--------|--------|
| Nov 16, 2025 | Initial creation | Consolidate model knowledge |
| Nov 16, 2025 | Set Claude 4.5 as primary | Released Sept 2025 |
| Nov 16, 2025 | Add GPT-5.1 variants | Released Nov 2025 |
| Nov 16, 2025 | Deprecate Claude 3.5 | Replaced by 4.5 |
| Nov 16, 2025 | Deprecate GPT-4* | Replaced by GPT-5.1 |

---

**Next Review:** December 2025 or when new models released

**Questions?** See `PAM_SYSTEM_ARCHITECTURE.md` for full AI provider details
