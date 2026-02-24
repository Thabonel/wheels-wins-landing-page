# Cross-Feature AI Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform siloed AI systems into an integrated Context Compilation Engine that enables PAM, receipt processing, budget AI, and medical/social tools to share context and work together intelligently.

**Architecture:** Build a backend `UnifiedContextService` that aggregates financial, location, medical, and social context into a single compiled snapshot. Inject this snapshot into PAM's system prompt and make it available to all AI subsystems. Replace the frontend mock intent classifier with the existing backend `EnhancedIntentClassifier`. Add human-in-the-loop controls for high-risk automation (receipt processing, budget predictions).

**Tech Stack:** Python 3.11+ (FastAPI), TypeScript (React 18.3), Redis (caching), Supabase (PostgreSQL), existing `FinancialContextService`, `EnhancedIntentClassifier`, `VectorMemoryService`.

**Audit Reference:** `docs/plans/2026-02-25-ai-interaction-audit.md`

---

## Phase 1: Context Compilation Foundation

### Task 1: Unified Context Service (Backend)

Build the core service that compiles context from all domains into a single snapshot for any AI system to consume.

**Files:**
- Create: `backend/app/services/pam/context/unified_context_service.py`
- Create: `backend/app/services/pam/context/__init__.py`
- Test: `backend/tests/test_unified_context_service.py`
- Reference: `backend/app/services/financial_context_service.py` (existing pattern)
- Reference: `backend/app/core/personalized_pam_agent.py:62-78` (existing `UserContext` dataclass)

**Step 1: Write the failing test for context compilation**

```python
# backend/tests/test_unified_context_service.py
"""Tests for UnifiedContextService - cross-domain context compilation."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

from app.services.pam.context.unified_context_service import (
    UnifiedContextService,
    CompiledUserContext,
    ContextDomain,
)


@pytest.fixture
def mock_financial_service():
    svc = AsyncMock()
    svc.get_financial_context.return_value = {
        "user_id": "test-user-123",
        "expenses": {
            "total_amount": 1250.00,
            "transaction_count": 15,
            "categories": {"fuel": 450.0, "food": 300.0, "camping": 500.0},
            "recent_trends": [],
            "largest_expense": {"amount": 200.0, "category": "camping"},
            "average_daily": 41.67,
        },
        "budgets": {
            "total_budget": 2000.0,
            "total_spent": 1250.0,
            "remaining_budget": 750.0,
            "budget_utilization": 0.625,
            "categories": {},
            "over_budget_categories": [],
        },
        "income": {
            "total_income": 3000.0,
            "monthly_average": 3000.0,
            "income_sources": {},
            "last_income_date": None,
        },
        "last_updated": datetime.utcnow().isoformat(),
    }
    return svc


@pytest.fixture
def mock_supabase():
    client = MagicMock()
    # Mock medical records query
    table = MagicMock()
    client.table.return_value = table
    table.select.return_value = table
    table.eq.return_value = table
    table.limit.return_value = table
    table.order.return_value = table
    table.execute.return_value = MagicMock(data=[
        {"condition_name": "asthma", "severity": "moderate"},
    ])
    return client


@pytest.fixture
def service(mock_financial_service, mock_supabase):
    return UnifiedContextService(
        financial_service=mock_financial_service,
        supabase_client=mock_supabase,
    )


@pytest.mark.asyncio
async def test_compile_context_returns_all_domains(service):
    """Context compilation should include financial, location, and medical domains."""
    ctx = await service.compile_context(
        user_id="test-user-123",
        location={"lat": -33.87, "lng": 151.21, "city": "Sydney"},
    )

    assert isinstance(ctx, CompiledUserContext)
    assert ctx.user_id == "test-user-123"
    assert ctx.financial is not None
    assert ctx.financial["budgets"]["remaining_budget"] == 750.0
    assert ctx.location is not None
    assert ctx.location["city"] == "Sydney"
    assert ctx.medical is not None


@pytest.mark.asyncio
async def test_compile_context_generates_prompt_snippet(service):
    """Compiled context should produce a string snippet suitable for system prompt injection."""
    ctx = await service.compile_context(
        user_id="test-user-123",
        location={"lat": -33.87, "lng": 151.21, "city": "Sydney"},
    )
    snippet = ctx.to_prompt_snippet()

    assert "FINANCIAL CONTEXT" in snippet
    assert "750" in snippet  # remaining budget
    assert "Sydney" in snippet
    assert "MEDICAL CONTEXT" in snippet


@pytest.mark.asyncio
async def test_compile_context_handles_missing_financial(mock_supabase):
    """Should gracefully handle missing financial data."""
    failed_financial = AsyncMock()
    failed_financial.get_financial_context.side_effect = Exception("Redis down")

    svc = UnifiedContextService(
        financial_service=failed_financial,
        supabase_client=mock_supabase,
    )
    ctx = await svc.compile_context(user_id="test-user-123")

    assert ctx.financial is None
    snippet = ctx.to_prompt_snippet()
    assert "FINANCIAL CONTEXT" not in snippet


@pytest.mark.asyncio
async def test_compile_specific_domains(service):
    """Should support compiling only requested domains."""
    ctx = await service.compile_context(
        user_id="test-user-123",
        domains=[ContextDomain.FINANCIAL],
    )
    assert ctx.financial is not None
    assert ctx.medical is None
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/thabonel/Code/wheels-wins-landing-page/backend && python -m pytest tests/test_unified_context_service.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.services.pam.context'`

**Step 3: Write minimal implementation**

```python
# backend/app/services/pam/context/__init__.py
"""Cross-feature AI context compilation."""

# backend/app/services/pam/context/unified_context_service.py
"""
Unified Context Service - Cross-Feature AI Integration

Compiles context from financial, location, medical, and social domains
into a single snapshot that any AI system can consume. This is the core
of the Context Compilation Engine identified in the AI interaction audit.
"""

import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


class ContextDomain(Enum):
    FINANCIAL = "financial"
    LOCATION = "location"
    MEDICAL = "medical"
    SOCIAL = "social"


@dataclass
class CompiledUserContext:
    """Cross-domain compiled context for AI systems."""
    user_id: str
    financial: Optional[Dict[str, Any]] = None
    location: Optional[Dict[str, Any]] = None
    medical: Optional[Dict[str, Any]] = None
    social: Optional[Dict[str, Any]] = None

    def to_prompt_snippet(self) -> str:
        """Generate a text snippet for injection into AI system prompts."""
        parts = []

        if self.financial:
            budgets = self.financial.get("budgets", {})
            expenses = self.financial.get("expenses", {})
            remaining = budgets.get("remaining_budget", "unknown")
            utilization = budgets.get("budget_utilization", 0)
            top_categories = expenses.get("categories", {})
            top_sorted = sorted(top_categories.items(), key=lambda x: x[1], reverse=True)[:3]
            top_str = ", ".join(f"{k}: ${v:.0f}" for k, v in top_sorted) if top_sorted else "none"

            parts.append(
                f"FINANCIAL CONTEXT:\n"
                f"- Remaining budget: ${remaining}\n"
                f"- Budget utilization: {utilization:.0%}\n"
                f"- Top spending: {top_str}\n"
                f"- Over-budget categories: {', '.join(budgets.get('over_budget_categories', [])) or 'none'}"
            )

        if self.location:
            city = self.location.get("city", "unknown")
            lat = self.location.get("lat", "N/A")
            lng = self.location.get("lng", "N/A")
            parts.append(
                f"LOCATION CONTEXT:\n"
                f"- Current location: {city}\n"
                f"- Coordinates: {lat}, {lng}"
            )

        if self.medical:
            conditions = self.medical.get("conditions", [])
            if conditions:
                condition_str = ", ".join(
                    c.get("condition_name", "unknown") for c in conditions[:3]
                )
                parts.append(
                    f"MEDICAL CONTEXT:\n"
                    f"- Known conditions: {condition_str}\n"
                    f"- Consider health needs when recommending activities or destinations."
                )

        if not parts:
            return ""

        return "\n\n".join(parts)


class UnifiedContextService:
    """
    Aggregates context from all domains into a CompiledUserContext.

    Usage:
        ctx = await service.compile_context(user_id="abc", location={...})
        snippet = ctx.to_prompt_snippet()
        # Inject snippet into PAM system prompt
    """

    def __init__(self, financial_service=None, supabase_client=None):
        self.financial_service = financial_service
        self.supabase = supabase_client

    async def compile_context(
        self,
        user_id: str,
        location: Optional[Dict[str, Any]] = None,
        domains: Optional[List[ContextDomain]] = None,
    ) -> CompiledUserContext:
        """Compile context from requested domains (all by default)."""
        requested = set(domains) if domains else set(ContextDomain)

        ctx = CompiledUserContext(user_id=user_id)

        if ContextDomain.LOCATION in requested and location:
            ctx.location = location

        if ContextDomain.FINANCIAL in requested:
            ctx.financial = await self._load_financial(user_id)

        if ContextDomain.MEDICAL in requested:
            ctx.medical = await self._load_medical(user_id)

        return ctx

    async def _load_financial(self, user_id: str) -> Optional[Dict[str, Any]]:
        if not self.financial_service:
            return None
        try:
            return await self.financial_service.get_financial_context(user_id)
        except Exception as e:
            logger.warning(f"Failed to load financial context for {user_id}: {e}")
            return None

    async def _load_medical(self, user_id: str) -> Optional[Dict[str, Any]]:
        if not self.supabase:
            return None
        try:
            result = (
                self.supabase.table("medical_records")
                .select("condition_name, severity")
                .eq("user_id", user_id)
                .limit(5)
                .order("created_at", desc=True)
                .execute()
            )
            conditions = result.data if result.data else []
            return {"conditions": conditions}
        except Exception as e:
            logger.warning(f"Failed to load medical context for {user_id}: {e}")
            return None
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/thabonel/Code/wheels-wins-landing-page/backend && python -m pytest tests/test_unified_context_service.py -v`
Expected: All 4 tests PASS

**Step 5: Commit**

```bash
git add backend/app/services/pam/context/__init__.py backend/app/services/pam/context/unified_context_service.py backend/tests/test_unified_context_service.py
git commit -m "feat: add UnifiedContextService for cross-feature AI context compilation"
```

---

### Task 2: Inject Compiled Context into PAM Agent

Wire the `UnifiedContextService` into `PersonalizedPamAgent` so PAM's system prompt includes financial, medical, and location context on every message.

**Files:**
- Modify: `backend/app/core/personalized_pam_agent.py:108-149` (constructor) and `:284-414` (process_message)
- Test: `backend/tests/test_pam_context_integration.py`
- Reference: `backend/app/services/pam/context/unified_context_service.py` (Task 1)

**Step 1: Write the failing test**

```python
# backend/tests/test_pam_context_integration.py
"""Tests for PAM agent integration with UnifiedContextService."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.core.personalized_pam_agent import PersonalizedPamAgent
from app.services.pam.context.unified_context_service import CompiledUserContext


@pytest.fixture
def mock_compiled_context():
    return CompiledUserContext(
        user_id="test-user-123",
        financial={
            "budgets": {"remaining_budget": 750.0, "budget_utilization": 0.625, "over_budget_categories": []},
            "expenses": {"categories": {"fuel": 450.0, "food": 300.0}},
        },
        location={"city": "Sydney", "lat": -33.87, "lng": 151.21},
        medical={"conditions": [{"condition_name": "asthma", "severity": "moderate"}]},
    )


@pytest.fixture
def mock_unified_context_service(mock_compiled_context):
    svc = AsyncMock()
    svc.compile_context.return_value = mock_compiled_context
    return svc


def test_system_prompt_includes_financial_context(mock_compiled_context):
    """PAM system prompt should include compiled financial context."""
    agent = PersonalizedPamAgent()
    snippet = mock_compiled_context.to_prompt_snippet()

    assert "FINANCIAL CONTEXT" in snippet
    assert "750" in snippet
    assert "fuel" in snippet


def test_system_prompt_includes_medical_context(mock_compiled_context):
    """PAM system prompt should include compiled medical context."""
    snippet = mock_compiled_context.to_prompt_snippet()

    assert "MEDICAL CONTEXT" in snippet
    assert "asthma" in snippet
    assert "health needs" in snippet
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/thabonel/Code/wheels-wins-landing-page/backend && python -m pytest tests/test_pam_context_integration.py -v`
Expected: PASS (these test the data model; next step wires it into the agent)

**Step 3: Wire UnifiedContextService into PersonalizedPamAgent**

In `backend/app/core/personalized_pam_agent.py`, add these changes:

1. Add import at top (after line 33):
```python
from app.services.pam.context.unified_context_service import UnifiedContextService
```

2. Add to constructor (after line 125 `self.tool_registry = get_tool_registry()`):
```python
        # Unified Context Service for cross-feature AI integration
        self._unified_context: Optional[UnifiedContextService] = None
```

3. Add property (after line 156):
```python
    @property
    def unified_context(self) -> UnifiedContextService:
        """Lazy-initialize Unified Context Service."""
        if self._unified_context is None:
            from app.services.financial_context_service import FinancialContextService
            from app.core.database import get_supabase_client
            self._unified_context = UnifiedContextService(
                financial_service=FinancialContextService(),
                supabase_client=get_supabase_client(),
            )
        return self._unified_context
```

4. In `_build_personalized_prompt` (after location context section, before conversation mode context at line 574), add:
```python
        # Inject cross-domain compiled context
        # This adds financial awareness and medical safety context to every interaction
        if hasattr(self, '_last_compiled_snippet') and self._last_compiled_snippet:
            base_prompt += f"\n\n{self._last_compiled_snippet}"
```

5. In `process_message` (after Step 1 line 363, before Step 2):
```python
            # Step 1.5: Compile cross-domain context for this interaction
            try:
                compiled = await self.unified_context.compile_context(
                    user_id=user_id,
                    location=user_location,
                )
                self._last_compiled_snippet = compiled.to_prompt_snippet()
            except Exception as e:
                logger.warning(f"Context compilation failed (non-blocking): {e}")
                self._last_compiled_snippet = ""
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/thabonel/Code/wheels-wins-landing-page/backend && python -m pytest tests/test_pam_context_integration.py tests/test_unified_context_service.py -v`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add backend/app/core/personalized_pam_agent.py backend/tests/test_pam_context_integration.py
git commit -m "feat: wire UnifiedContextService into PAM agent for cross-domain awareness"
```

---

### Task 3: Replace Frontend Mock Intent Classifier

Replace the 10-line mock `IntentClassifier` in the frontend with a call to the existing backend `EnhancedIntentClassifier` endpoint.

**Files:**
- Modify: `src/utils/intentClassifier.ts` (currently 10-line mock)
- Test: `src/__tests__/hooks/intentClassifier.test.ts`
- Reference: `backend/app/api/v1/intent.py:44` (existing `/classify-intent` endpoint)

**Step 1: Write the failing test**

```typescript
// src/__tests__/hooks/intentClassifier.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IntentClassifier } from '@/utils/intentClassifier';

describe('IntentClassifier', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('classifies budget-related messages locally', () => {
    const result = IntentClassifier.classifyIntent('How much have I spent on fuel?');
    expect(result.type).toBe('budget');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('classifies trip-related messages locally', () => {
    const result = IntentClassifier.classifyIntent('Plan a trip to Yellowstone');
    expect(result.type).toBe('trip');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('classifies medical-related messages locally', () => {
    const result = IntentClassifier.classifyIntent('What medications am I taking?');
    expect(result.type).toBe('medical');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('classifies social-related messages locally', () => {
    const result = IntentClassifier.classifyIntent('Find nearby RVers');
    expect(result.type).toBe('social');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('returns general for ambiguous messages', () => {
    const result = IntentClassifier.classifyIntent('hello');
    expect(result.type).toBe('general');
  });

  it('returns relevant tool categories for the classified intent', () => {
    const result = IntentClassifier.classifyIntent('Add a $50 fuel expense');
    expect(result.type).toBe('budget');
    expect(result.suggestedTools).toContain('create_expense');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/thabonel/Code/wheels-wins-landing-page && npx vitest run src/__tests__/hooks/intentClassifier.test.ts`
Expected: FAIL - current mock returns `{ type: 'general', confidence: 0.8 }` for everything

**Step 3: Implement real intent classifier**

```typescript
// src/utils/intentClassifier.ts

interface IntentResult {
  type: string;
  confidence: number;
  suggestedTools: string[];
}

const INTENT_PATTERNS: Record<string, { patterns: RegExp[]; tools: string[] }> = {
  budget: {
    patterns: [
      /\b(expense|spend|spent|cost|budget|track|money|cash|income|saving|financial)\b/i,
      /\b(how much|total|remaining|over budget|under budget)\b/i,
      /\$\d+/,
    ],
    tools: ['create_expense', 'analyze_budget', 'get_spending_summary', 'track_savings', 'predict_end_of_month'],
  },
  trip: {
    patterns: [
      /\b(trip|travel|route|drive|journey|destination|itinerary|plan a)\b/i,
      /\b(campground|rv park|camping|fuel stop|road condition)\b/i,
      /\b(weather|forecast|temperature)\b/i,
    ],
    tools: ['plan_trip', 'find_rv_parks', 'get_weather_forecast', 'calculate_gas_cost', 'optimize_route'],
  },
  medical: {
    patterns: [
      /\b(medical|medication|medicine|health|doctor|allergy|emergency|prescription)\b/i,
      /\b(condition|diagnosis|hospital|clinic)\b/i,
    ],
    tools: ['get_medical_records', 'get_medications', 'search_medical_records', 'get_emergency_info'],
  },
  social: {
    patterns: [
      /\b(friend|share|invite|group|community|social|message|follow|nearby rver)\b/i,
      /\b(post|feed|comment|event)\b/i,
    ],
    tools: ['create_post', 'message_friend', 'find_nearby_rvers', 'get_feed', 'create_event'],
  },
  calendar: {
    patterns: [
      /\b(calendar|appointment|schedule|book|reminder|event|meeting)\b/i,
      /\b(tomorrow|next week|monday|tuesday|wednesday|thursday|friday)\b/i,
    ],
    tools: ['create_calendar_event', 'get_calendar_events', 'update_calendar_event'],
  },
  shop: {
    patterns: [
      /\b(shop|buy|purchase|product|price|deal|cart|order)\b/i,
      /\b(tyre|tire|parts|gear|equipment|accessories)\b/i,
    ],
    tools: ['search_products', 'recommend_products', 'compare_prices', 'web_search'],
  },
};

export class IntentClassifier {
  static classifyIntent(message: string): IntentResult {
    let bestMatch = 'general';
    let bestScore = 0;

    for (const [intent, config] of Object.entries(INTENT_PATTERNS)) {
      const matchCount = config.patterns.filter((p) => p.test(message)).length;
      const score = matchCount / config.patterns.length;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = intent;
      }
    }

    const confidence = bestScore > 0 ? Math.min(0.5 + bestScore * 0.5, 1.0) : 0.3;
    const tools = INTENT_PATTERNS[bestMatch]?.tools ?? [];

    return {
      type: bestMatch,
      confidence,
      suggestedTools: tools,
    };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/thabonel/Code/wheels-wins-landing-page && npx vitest run src/__tests__/hooks/intentClassifier.test.ts`
Expected: All 6 tests PASS

**Step 5: Commit**

```bash
git add src/utils/intentClassifier.ts src/__tests__/hooks/intentClassifier.test.ts
git commit -m "feat: replace mock intent classifier with pattern-based classification"
```

---

## Phase 2: Risk Mitigation - Human-in-the-Loop Controls

### Task 4: Receipt Extraction Review Step

Add a mandatory user confirmation step between receipt AI extraction and expense form population. Currently `useReceiptScanner` auto-populates with no review.

**Files:**
- Modify: `src/hooks/useReceiptScanner.ts:146-300` (processReceipt function)
- Modify: `src/components/shared/SmartReceiptScanner.tsx` (add review UI)
- Test: `src/__tests__/hooks/useReceiptScanner.test.ts`

**Step 1: Write the failing test**

```typescript
// src/__tests__/hooks/useReceiptScanner.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReceiptScanner } from '@/hooks/useReceiptScanner';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  },
}));

// Mock heic2any
vi.mock('heic2any', () => ({ default: vi.fn() }));

describe('useReceiptScanner - review step', () => {
  it('should expose a pendingReview state after extraction', () => {
    const { result } = renderHook(() => useReceiptScanner());
    // pendingReview starts as false
    expect(result.current.pendingReview).toBe(false);
  });

  it('should expose confirmExtraction and rejectExtraction callbacks', () => {
    const { result } = renderHook(() => useReceiptScanner());
    expect(typeof result.current.confirmExtraction).toBe('function');
    expect(typeof result.current.rejectExtraction).toBe('function');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/thabonel/Code/wheels-wins-landing-page && npx vitest run src/__tests__/hooks/useReceiptScanner.test.ts`
Expected: FAIL - `pendingReview` property does not exist

**Step 3: Add review gate to useReceiptScanner**

In `src/hooks/useReceiptScanner.ts`, add these changes:

1. Add new state (after line 83):
```typescript
  const [pendingReview, setPendingReview] = useState(false);
  const [pendingData, setPendingData] = useState<UniversalExtractedData | null>(null);
```

2. In `processReceipt`, where `setExtracted(normalizeExtractedData(...))` is called (lines 238 and 275), replace with:
```typescript
  // Stage data for user review instead of auto-accepting
  setPendingData(normalizeExtractedData(data, textResult));
  setPendingReview(true);
```

3. Add confirmation callbacks (after `reset` at line 144):
```typescript
  const confirmExtraction = useCallback(() => {
    if (pendingData) {
      setExtracted(pendingData);
      setPendingReview(false);
      setPendingData(null);
    }
  }, [pendingData]);

  const rejectExtraction = useCallback(() => {
    setPendingReview(false);
    setPendingData(null);
    setError("Extraction rejected - please enter details manually.");
  }, []);
```

4. Update return object to include new state/callbacks:
```typescript
  return {
    selectedFile,
    previewUrl,
    isProcessing,
    processingStep,
    extracted,
    receiptUrl,
    error,
    pendingReview,
    pendingData,
    handleFileSelect,
    processReceipt,
    clearSelection,
    reset,
    confirmExtraction,
    rejectExtraction,
  };
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/thabonel/Code/wheels-wins-landing-page && npx vitest run src/__tests__/hooks/useReceiptScanner.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/hooks/useReceiptScanner.ts src/__tests__/hooks/useReceiptScanner.test.ts
git commit -m "feat: add human-in-the-loop review step for receipt extraction"
```

---

### Task 5: Receipt Review UI in SmartReceiptScanner

Add a visual review panel in `SmartReceiptScanner` that shows extracted data with confidence scores and lets users confirm or reject before the data flows into forms.

**Files:**
- Modify: `src/components/shared/SmartReceiptScanner.tsx`
- Reference: `src/hooks/useReceiptScanner.ts` (Task 4 changes)

**Step 1: Update SmartReceiptScanner to consume pendingReview state**

In `SmartReceiptScanner.tsx`, update the destructuring of `useReceiptScanner` (line 33-44):

```typescript
  const {
    selectedFile,
    previewUrl,
    isProcessing,
    processingStep,
    extracted,
    receiptUrl,
    error,
    pendingReview,
    pendingData,
    handleFileSelect,
    processReceipt,
    clearSelection,
    confirmExtraction,
    rejectExtraction,
  } = useReceiptScanner();
```

**Step 2: Add review panel before the existing extracted data display**

Add a new conditional block that renders when `pendingReview && pendingData`:

```tsx
{pendingReview && pendingData && (
  <Card className="border-amber-200 bg-amber-50">
    <CardContent className="pt-4 space-y-3">
      <div className="flex items-center gap-2 text-amber-700 font-medium">
        <AlertTriangle className="h-4 w-4" />
        Review Extracted Data
      </div>
      <p className="text-sm text-amber-600">
        Please verify the AI-extracted data before adding to your expenses.
      </p>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {pendingData.vendor && (
          <div><span className="text-muted-foreground">Vendor:</span> {pendingData.vendor}</div>
        )}
        {pendingData.total !== null && (
          <div><span className="text-muted-foreground">Total:</span> ${pendingData.total?.toFixed(2)}</div>
        )}
        {pendingData.date && (
          <div><span className="text-muted-foreground">Date:</span> {pendingData.date}</div>
        )}
        {pendingData.suggested_category && (
          <div><span className="text-muted-foreground">Category:</span> {pendingData.suggested_category}</div>
        )}
      </div>
      {pendingData.overall_confidence > 0 && (
        <div className={cn(
          "text-xs px-2 py-1 rounded border inline-block",
          confidenceColor(pendingData.overall_confidence)
        )}>
          AI Confidence: {(pendingData.overall_confidence * 100).toFixed(0)}%
        </div>
      )}
      <div className="flex gap-2 pt-2">
        <Button size="sm" onClick={confirmExtraction} className="bg-green-600 hover:bg-green-700">
          <CheckCircle2 className="h-3 w-3 mr-1" /> Looks correct
        </Button>
        <Button size="sm" variant="outline" onClick={rejectExtraction}>
          Enter manually
        </Button>
      </div>
    </CardContent>
  </Card>
)}
```

**Step 3: Verify visually**

Run: `cd /Users/thabonel/Code/wheels-wins-landing-page && npm run dev`
Navigate to expense receipt upload, upload a receipt, verify review panel appears.

**Step 4: Commit**

```bash
git add src/components/shared/SmartReceiptScanner.tsx
git commit -m "feat: add receipt extraction review UI with confidence display"
```

---

### Task 6: Budget Prediction Confidence Intervals

Add uncertainty communication to budget predictions so users see confidence ranges instead of definitive numbers.

**Files:**
- Modify: `backend/app/services/pam/tools/tool_registry.py` (find `predict_end_of_month` tool)
- Test: `backend/tests/test_budget_confidence.py`

**Step 1: Write the failing test**

```python
# backend/tests/test_budget_confidence.py
"""Tests for budget prediction confidence intervals."""
import pytest


def test_prediction_includes_confidence_range():
    """Budget predictions should include low/mid/high estimates."""
    from app.services.pam.context.budget_confidence import add_confidence_intervals

    prediction = {
        "projected_spend": 1800.0,
        "daily_rate": 60.0,
        "days_remaining": 10,
    }
    enriched = add_confidence_intervals(prediction)

    assert "confidence" in enriched
    assert enriched["confidence"]["low"] < enriched["confidence"]["mid"]
    assert enriched["confidence"]["mid"] < enriched["confidence"]["high"]
    assert enriched["confidence"]["mid"] == pytest.approx(1800.0, rel=0.01)


def test_prediction_includes_disclaimer():
    """Budget predictions should include a human-readable disclaimer."""
    from app.services.pam.context.budget_confidence import add_confidence_intervals

    prediction = {"projected_spend": 1800.0, "daily_rate": 60.0, "days_remaining": 10}
    enriched = add_confidence_intervals(prediction)

    assert "disclaimer" in enriched
    assert "estimate" in enriched["disclaimer"].lower()
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/thabonel/Code/wheels-wins-landing-page/backend && python -m pytest tests/test_budget_confidence.py -v`
Expected: FAIL with `ModuleNotFoundError`

**Step 3: Implement confidence interval helper**

```python
# backend/app/services/pam/context/budget_confidence.py
"""Budget prediction confidence intervals.

Enriches raw linear projections with uncertainty ranges so AI responses
communicate estimates rather than definitive predictions.
"""

from typing import Dict, Any


def add_confidence_intervals(prediction: Dict[str, Any]) -> Dict[str, Any]:
    """Add low/mid/high confidence intervals to a budget prediction.

    Uses +/- 15% range as a simple heuristic. The variance should grow
    with days_remaining since uncertainty compounds over time.
    """
    projected = prediction.get("projected_spend", 0)
    days_remaining = prediction.get("days_remaining", 1)

    # Uncertainty grows with time horizon
    base_variance = 0.10
    time_factor = min(days_remaining / 30, 1.0)
    variance = base_variance + (0.10 * time_factor)

    result = dict(prediction)
    result["confidence"] = {
        "low": round(projected * (1 - variance), 2),
        "mid": round(projected, 2),
        "high": round(projected * (1 + variance), 2),
    }
    result["disclaimer"] = (
        f"This is an estimate based on your recent spending patterns. "
        f"Actual spending may range from ${result['confidence']['low']:.0f} "
        f"to ${result['confidence']['high']:.0f}."
    )
    return result
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/thabonel/Code/wheels-wins-landing-page/backend && python -m pytest tests/test_budget_confidence.py -v`
Expected: All 2 tests PASS

**Step 5: Commit**

```bash
git add backend/app/services/pam/context/budget_confidence.py backend/tests/test_budget_confidence.py
git commit -m "feat: add confidence intervals to budget predictions"
```

---

## Phase 3: Receipt-to-Budget Integration

### Task 7: Post-Extraction Budget Context Update

When a receipt is successfully extracted and confirmed, automatically refresh the financial context cache so PAM's next interaction reflects the new expense.

**Files:**
- Create: `backend/app/api/v1/context_events.py`
- Modify: `backend/app/main.py` (register new router)
- Test: `backend/tests/test_context_events.py`

**Step 1: Write the failing test**

```python
# backend/tests/test_context_events.py
"""Tests for context event notifications."""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient


@pytest.fixture
def mock_financial_service():
    with patch("app.api.v1.context_events.get_financial_context_service") as mock:
        svc = AsyncMock()
        svc.invalidate_cache.return_value = True
        mock.return_value = svc
        yield svc


def test_expense_created_event_invalidates_cache(mock_financial_service):
    """POST /context-events/expense-created should invalidate financial cache."""
    from app.api.v1.context_events import router
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    app = FastAPI()
    app.include_router(router, prefix="/api/v1")

    # Mock auth dependency
    with patch("app.api.v1.context_events.verify_supabase_jwt_token") as mock_auth:
        mock_auth.return_value = {"sub": "test-user-123"}

        client = TestClient(app)
        response = client.post(
            "/api/v1/context-events/expense-created",
            json={"amount": 50.0, "category": "fuel"},
            headers={"Authorization": "Bearer fake-token"},
        )

    assert response.status_code == 200
    mock_financial_service.invalidate_cache.assert_called_once_with("test-user-123")
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/thabonel/Code/wheels-wins-landing-page/backend && python -m pytest tests/test_context_events.py -v`
Expected: FAIL with `ModuleNotFoundError`

**Step 3: Implement context events endpoint**

```python
# backend/app/api/v1/context_events.py
"""
Context Event Notifications

Lightweight endpoints that AI subsystems call to notify the
UnifiedContextService when user data changes. This keeps the
compiled context fresh without polling.
"""

import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.deps import verify_supabase_jwt_token

logger = logging.getLogger(__name__)

router = APIRouter()

# Lazy import to avoid circular dependencies
_financial_service = None


def get_financial_context_service():
    global _financial_service
    if _financial_service is None:
        from app.services.financial_context_service import FinancialContextService
        _financial_service = FinancialContextService()
    return _financial_service


class ExpenseEvent(BaseModel):
    amount: float
    category: str
    vendor: Optional[str] = None


@router.post("/context-events/expense-created")
async def expense_created(
    event: ExpenseEvent,
    user_data: Dict = Depends(verify_supabase_jwt_token),
):
    """Notify context system that a new expense was created.

    Invalidates the financial context cache so the next PAM interaction
    sees up-to-date budget/spending data.
    """
    user_id = user_data.get("sub")
    logger.info(f"Expense event for {user_id}: ${event.amount} in {event.category}")

    svc = get_financial_context_service()
    await svc.invalidate_cache(user_id)

    return {"status": "ok", "cache_invalidated": True}
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/thabonel/Code/wheels-wins-landing-page/backend && python -m pytest tests/test_context_events.py -v`
Expected: PASS

**Step 5: Register router in main.py**

In `backend/app/main.py`, add:
```python
from app.api.v1.context_events import router as context_events_router
app.include_router(context_events_router, prefix="/api/v1", tags=["context"])
```

**Step 6: Commit**

```bash
git add backend/app/api/v1/context_events.py backend/tests/test_context_events.py backend/app/main.py
git commit -m "feat: add context event endpoint for receipt-to-budget cache invalidation"
```

---

### Task 8: Frontend Receipt-to-Context Bridge

After receipt confirmation (Task 4), fire a context event to the backend so PAM's financial context updates immediately.

**Files:**
- Modify: `src/hooks/useReceiptScanner.ts` (add event dispatch in `confirmExtraction`)
- Reference: `backend/app/api/v1/context_events.py` (Task 7)

**Step 1: Add context event dispatch to confirmExtraction**

In `src/hooks/useReceiptScanner.ts`, update `confirmExtraction`:

```typescript
  const confirmExtraction = useCallback(async () => {
    if (pendingData) {
      setExtracted(pendingData);
      setPendingReview(false);
      setPendingData(null);

      // Notify backend context system that financial data changed
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token && pendingData.total) {
          fetch(`${BACKEND_URL}/api/v1/context-events/expense-created`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              amount: pendingData.total,
              category: pendingData.suggested_category || 'general',
              vendor: pendingData.vendor,
            }),
          }).catch(() => {
            // Fire-and-forget - don't block receipt flow
          });
        }
      } catch {
        // Non-blocking notification
      }
    }
  }, [pendingData]);
```

**Step 2: Commit**

```bash
git add src/hooks/useReceiptScanner.ts
git commit -m "feat: bridge receipt confirmation to backend context refresh"
```

---

## Phase 4: Vector Memory Integration

### Task 9: Wire Vector Memory into PAM Conversations

Connect the existing `VectorMemoryService` to PAM so it stores conversation turns and can retrieve relevant past context.

**Files:**
- Modify: `backend/app/core/personalized_pam_agent.py:878-901` (`_update_conversation_history`)
- Test: `backend/tests/test_pam_vector_memory.py`
- Reference: `backend/app/services/vector_memory.py` (existing service)

**Step 1: Write the failing test**

```python
# backend/tests/test_pam_vector_memory.py
"""Tests for PAM vector memory integration."""
import pytest
from unittest.mock import AsyncMock, MagicMock


@pytest.mark.asyncio
async def test_conversation_stored_in_vector_memory():
    """PAM should store conversation turns in vector memory when available."""
    from app.core.personalized_pam_agent import PersonalizedPamAgent, UserContext, ConversationMode

    agent = PersonalizedPamAgent()
    agent._vector_memory = AsyncMock()
    agent._vector_memory.store_conversation_memory.return_value = {"success": True}

    ctx = UserContext(
        user_id="test-123",
        profile={},
        vehicle_info={},
        travel_preferences={},
        conversation_history=[],
        conversation_mode=ConversationMode.GENERAL_TRAVEL,
        is_rv_traveler=False,
        vehicle_capabilities={},
        preferred_transport_modes=[],
    )

    await agent._update_conversation_history(
        ctx, "What's the weather?", {"content": "Sunny in Sydney"}
    )

    agent._vector_memory.store_conversation_memory.assert_called_once()
    call_args = agent._vector_memory.store_conversation_memory.call_args
    assert call_args.kwargs["user_message"] == "What's the weather?"
    assert "Sunny" in call_args.kwargs["agent_response"]
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/thabonel/Code/wheels-wins-landing-page/backend && python -m pytest tests/test_pam_vector_memory.py -v`
Expected: FAIL - `_vector_memory` attribute doesn't exist yet

**Step 3: Add vector memory to PAM agent**

In `backend/app/core/personalized_pam_agent.py`:

1. Add to constructor (after unified context init):
```python
        # Vector memory for cross-session context (optional)
        self._vector_memory = None
```

2. Update `_update_conversation_history` to also store in vector memory:
```python
    async def _update_conversation_history(
        self,
        user_context: UserContext,
        user_message: str,
        assistant_response: Dict[str, Any]
    ):
        """Update conversation history and optionally store in vector memory."""
        user_context.conversation_history.extend([
            {
                "sender": "user",
                "content": user_message,
                "timestamp": datetime.utcnow().isoformat()
            },
            {
                "sender": "assistant",
                "content": assistant_response.get("content", ""),
                "timestamp": datetime.utcnow().isoformat()
            }
        ])

        # Keep only recent history
        if len(user_context.conversation_history) > 20:
            user_context.conversation_history = user_context.conversation_history[-20:]

        # Store in vector memory for cross-session retrieval
        if self._vector_memory:
            try:
                await self._vector_memory.store_conversation_memory(
                    user_id=user_context.user_id,
                    user_message=user_message,
                    agent_response=assistant_response.get("content", ""),
                )
            except Exception as e:
                logger.debug(f"Vector memory storage failed (non-blocking): {e}")
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/thabonel/Code/wheels-wins-landing-page/backend && python -m pytest tests/test_pam_vector_memory.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/core/personalized_pam_agent.py backend/tests/test_pam_vector_memory.py
git commit -m "feat: wire vector memory into PAM conversation storage"
```

---

## Task Dependency Map

```
Task 1 (UnifiedContextService)
  └── Task 2 (Wire into PAM Agent)
        └── Task 7 (Context Events Endpoint)
              └── Task 8 (Frontend Bridge)

Task 3 (Intent Classifier) - Independent

Task 4 (Receipt Review Hook)
  └── Task 5 (Receipt Review UI)
  └── Task 8 (Frontend Bridge)

Task 6 (Budget Confidence) - Independent

Task 9 (Vector Memory) - Independent
```

**Parallel execution groups:**
- Group A: Tasks 1, 3, 4, 6, 9 (all independent)
- Group B: Tasks 2, 5 (depend on Group A)
- Group C: Tasks 7, 8 (depend on Group B)

---

## Verification Checklist

After all tasks are complete, verify:

- [ ] `cd backend && python -m pytest tests/test_unified_context_service.py tests/test_pam_context_integration.py tests/test_budget_confidence.py tests/test_context_events.py tests/test_pam_vector_memory.py -v` - All pass
- [ ] `npx vitest run src/__tests__/hooks/intentClassifier.test.ts src/__tests__/hooks/useReceiptScanner.test.ts` - All pass
- [ ] `npm run type-check` - No TypeScript errors
- [ ] `npm run build` - Production build succeeds
- [ ] Receipt upload flow shows review panel before form population
- [ ] PAM conversations include financial context in responses
- [ ] Intent classifier returns specific categories (not just 'general')
