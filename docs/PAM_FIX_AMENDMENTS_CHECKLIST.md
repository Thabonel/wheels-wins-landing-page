# PAM Fix Plan - Critical Amendments Checklist

**Created:** November 4, 2025
**Purpose:** Resolve contradictions across PAM_TOOLS_FIX_PLAN.md, PAM_COMPLETE_TOOL_INVENTORY.md, and PAM_CLEANUP_STATUS.md
**Status:** Ready for execution
**Approver Feedback:** "Green-light with amendments"

---

## Amendment 1: Weather Stack - Standardize on OpenMeteo

### Problem
- ❌ Fix Plan budgets time to "integrate OpenWeather API"
- ✅ Cleanup Status already migrated to OpenMeteo (deleted weather_tool.py)
- ⚠️ Contradiction causes confusion

### Solution: Drop OpenWeather, Use OpenMeteo Everywhere

#### PR Checklist - Amendment 1

- [ ] **Remove OpenWeather references from Fix Plan**
  - Delete "Integrate OpenWeather API (2 hours)" from HIGH PRIORITY
  - Update trip tools section to say "already using OpenMeteo"

- [ ] **Delete OpenWeather environment variable**
  ```bash
  # Remove from .env files
  # OPENWEATHER_API_KEY=...  # DELETE THIS LINE
  ```

- [ ] **Verify all weather calls use OpenMeteo**
  ```bash
  # Search for any OpenWeather references
  grep -r "OPENWEATHER\|openweather\|OpenWeather" backend/app/services/pam/

  # Should only find in comments/docs, not code
  ```

- [ ] **Ensure get_weather_forecast uses OpenMeteo path**
  ```python
  # File: backend/app/services/pam/tools/trip/get_weather_forecast.py
  # Should import and use:
  from app.services.pam.tools.openmeteo_weather_tool import get_weather_forecast as openmeteo_weather

  async def get_weather_forecast(user_id: str, location: str, days: int = 7):
      # Use OpenMeteo (FREE, no API key needed)
      return await openmeteo_weather(location=location, days=days)
  ```

- [ ] **Update tool registry to use OpenMeteo**
  ```python
  # File: backend/app/services/pam/core/pam.py
  # Verify weather_advisor tool uses OpenMeteoWeatherTool
  ```

- [ ] **Update orchestrator references**
  ```bash
  # Verify unified_orchestrator.py uses OpenMeteoWeatherTool
  grep "OpenMeteoWeatherTool" backend/app/services/pam/unified_orchestrator.py
  # Should find 2 matches (import + initialization)
  ```

- [ ] **Remove OpenWeather from cost calculations**
  - Update fix plan to reflect $0 cost (not $40/month saved)

- [ ] **Update architecture docs**
  - PAM_SYSTEM_ARCHITECTURE.md should say "OpenMeteo (free)" not "OpenWeather API"

#### Commit Message - Amendment 1
```
fix: standardize weather stack on OpenMeteo (remove OpenWeather)

Resolves contradiction in fix plan:
- Fix plan claimed OpenWeather API needed integration
- Reality: Already migrated to OpenMeteo (Oct 8, 2025)

Changes:
- Remove OPENWEATHER_API_KEY from environment variables
- Update get_weather_forecast to use OpenMeteo exclusively
- Update fix plan to reflect current state
- Update architecture docs (OpenMeteo is FREE, no key needed)

Cost impact: $0/month (OpenMeteo is free)
Breaking changes: None (OpenMeteo already in use)

🤖 Generated with Claude Code
```

---

## Amendment 2: Mapbox - One Abstraction, Many Callers

### Problem
- ✅ Registry shows `mapbox_navigator`/`mapbox_tool` exists
- ❌ Fix Plan says "Mapbox key exists but not integrated"
- ⚠️ Plan suggests adding bespoke HTTP calls in each trip tool

### Solution: Use Existing Mapbox Abstraction via Tool Registry

#### PR Checklist - Amendment 2

- [ ] **Verify mapbox_navigator tool exists and works**
  ```bash
  # Find the tool
  find backend/app/services/pam -name "*mapbox*" -type f

  # Expected: mapbox_tool.py or similar
  ```

- [ ] **Review mapbox_navigator implementation**
  - Check if it has route planning methods
  - Check if it has optimization methods
  - Check error handling
  - Check retry logic

- [ ] **Update trip tools to use Mapbox helper**
  ```python
  # File: backend/app/services/pam/tools/trip/plan_trip.py

  # BEFORE (bespoke HTTP - DON'T DO THIS)
  async with httpx.AsyncClient() as client:
      response = await client.get(f"https://api.mapbox.com/...")

  # AFTER (use registry tool)
  from app.services.pam.tools.mapbox_tool import get_route, optimize_route

  async def plan_trip(user_id: str, origin: str, destination: str):
      # Use shared Mapbox abstraction
      route = await get_route(origin, destination)
      return route
  ```

- [ ] **Add retry logic to Mapbox helper (not per-tool)**
  ```python
  # File: backend/app/services/pam/tools/mapbox_tool.py

  from tenacity import retry, stop_after_attempt, wait_exponential

  @retry(
      stop=stop_after_attempt(3),
      wait=wait_exponential(multiplier=1, min=2, max=10)
  )
  async def get_route(origin: str, destination: str):
      # Single place for retry logic
      pass
  ```

- [ ] **Add rate limiting to Mapbox helper**
  ```python
  # File: backend/app/services/pam/tools/mapbox_tool.py

  from app.core.rate_limiter import rate_limit

  @rate_limit(max_calls=60, period=60)  # Mapbox free tier: 60 req/min
  async def get_route(origin: str, destination: str):
      # Single place for rate limiting
      pass
  ```

- [ ] **Update all trip tools to use helper**
  - plan_trip.py → use get_route()
  - optimize_route.py → use optimize_route()
  - calculate_gas_cost.py → use get_distance()

- [ ] **Update tool registry to expose Mapbox methods**
  ```python
  # File: backend/app/services/pam/core/pam.py
  # Ensure mapbox_navigator is registered and callable
  ```

- [ ] **Remove "integrate Mapbox" from fix plan**
  - Change to "Refactor trip tools to use existing Mapbox abstraction (2 hours)"

#### Commit Message - Amendment 2
```
refactor: use existing mapbox_navigator abstraction in trip tools

Resolves contradiction:
- Fix plan said "Mapbox key exists but not integrated"
- Reality: mapbox_navigator tool already exists in registry

Changes:
- Refactor plan_trip to use mapbox_navigator helper
- Refactor optimize_route to use mapbox_navigator helper
- Add retry logic to Mapbox helper (not per-tool)
- Add rate limiting to Mapbox helper (60 req/min)
- Update fix plan to reflect reality

Pattern: One abstraction, many callers (DRY principle)
Breaking changes: None (internal refactor only)

🤖 Generated with Claude Code
```

---

## Amendment 3: Shop Feature - Decide and Align Code + DB

### Problem
- ❌ Fix Plan says "0% ready, no database tables"
- ✅ Inventory lists 5 shop tools with implementation
- ⚠️ Contradiction about database existence

### Solution: Pick One Path Now

#### Option A: Disable/Remove (RECOMMENDED FOR MVP)

**PR Checklist - Amendment 3A (Disable Shop)**

- [ ] **Comment out shop tools in pam.py registry**
  ```python
  # File: backend/app/services/pam/core/pam.py
  # In _build_tools():

  # Shop tools - DISABLED (not MVP, 0% implementation)
  # {
  #     "name": "search_products",
  #     "description": "Search for RV parts and gear",
  #     ...
  # },
  ```

- [ ] **Add shop tools to archive folder**
  ```bash
  mkdir -p backend/archive/shop_tools
  mv backend/app/services/pam/tools/shop/*.py backend/archive/shop_tools/
  ```

- [ ] **Remove shop imports from pam.py**
  ```python
  # DELETE these lines:
  # from app.services.pam.tools.shop import (
  #     search_products, add_to_cart, get_cart, checkout, track_order
  # )
  ```

- [ ] **Update UI to hide shop features**
  ```typescript
  // File: src/components/pam/PamAssistant.tsx
  // Add feature flag check
  const SHOP_ENABLED = false;  // TODO: Enable when shop tools ready
  ```

- [ ] **Add "coming soon" message**
  ```typescript
  if (message.includes("shop") || message.includes("buy")) {
      return "Shop feature coming soon! For now, check our partner stores at [link]";
  }
  ```

- [ ] **Update architecture docs**
  - Remove shop tools from "47 tools" count
  - New count: 42 tools (47 - 5 shop tools)
  - Mark shop as "Phase 2" feature

**Commit Message - Amendment 3A**
```
feat: disable shop tools (not MVP ready)

Decision: Remove shop from MVP scope
- Shop tools are 100% mock (no Stripe, no DB, no products)
- Building full e-commerce: 3 weeks + ongoing maintenance
- MVP focus: Budget + Trip + Social features

Changes:
- Move shop tools to /archive/shop_tools/
- Comment out shop tool registrations in pam.py
- Add "coming soon" message in UI
- Update architecture: 42 tools (was 47)

Alternative considered: Affiliate links (may implement Phase 2)
Breaking changes: Shop queries will return "coming soon" message

🤖 Generated with Claude Code
```

---

#### Option B: Commit to Stripe + Full E-Commerce

**PR Checklist - Amendment 3B (Build Shop - IF CHOSEN)**

- [ ] **Create database schema**
  ```sql
  -- File: docs/sql-fixes/shop_tables.sql

  CREATE TABLE products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      category TEXT NOT NULL,
      image_url TEXT,
      stock_quantity INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE carts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE cart_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      cart_id UUID REFERENCES carts(id) ON DELETE CASCADE,
      product_id UUID REFERENCES products(id),
      quantity INTEGER NOT NULL DEFAULT 1,
      added_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id),
      total_amount DECIMAL(10,2) NOT NULL,
      status TEXT DEFAULT 'pending',
      stripe_payment_intent_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

- [ ] **Integrate Stripe**
  ```python
  # File: backend/app/services/payment/stripe_service.py

  import stripe
  from app.core.config import settings

  stripe.api_key = settings.STRIPE_SECRET_KEY

  async def create_payment_intent(amount: int, currency: str = "usd"):
      intent = stripe.PaymentIntent.create(
          amount=amount,
          currency=currency
      )
      return intent
  ```

- [ ] **Implement real shop tools**
  - search_products → query products table
  - add_to_cart → insert cart_items
  - checkout → create Stripe payment intent
  - track_order → query orders table

- [ ] **Add product admin panel**
  - Create/edit/delete products
  - Manage inventory
  - View orders

- [ ] **Update fix plan timeline**
  - Add "Week 5-7: Shop Implementation" section
  - Estimate 3 weeks full-time work

**Commit Message - Amendment 3B**
```
feat: implement full e-commerce shop system

Decision: Include shop in MVP (3-week build)

Changes:
- Add database schema (products, carts, orders)
- Integrate Stripe payment processing
- Implement real shop tools (5 tools)
- Add product admin panel
- Update architecture: 47 tools operational

Timeline: 3 weeks (Weeks 5-7)
Cost: Stripe fees (2.9% + $0.30 per transaction)
Breaking changes: None (new feature)

🤖 Generated with Claude Code
```

---

**DECISION REQUIRED:** Choose Option A or Option B before proceeding

**Recommendation:** Option A (disable shop) - focus MVP on core value (budget + trip planning)

---

## Amendment 4: Tests - Block "Production Ready" Until Week 3

### Problem
- ❌ Fix Plan says "zero tests"
- ✅ Cleanup Status says "production ready"
- ⚠️ Cannot ship without tests

### Solution: Enforce Test Gate Before Beta Launch

#### PR Checklist - Amendment 4

- [ ] **Update all "production ready" claims**
  ```markdown
  # BEFORE
  Status: ✅ Production Ready

  # AFTER
  Status: 🟡 Code Complete - Tests Required (Week 3)
  ```

- [ ] **Add CI test gate**
  ```yaml
  # File: .github/workflows/ci.yml

  test:
    runs-on: ubuntu-latest
    steps:
      - name: Run backend tests
        run: pytest backend/app/services/pam/ --cov --cov-fail-under=80

      - name: Enforce coverage threshold
        run: |
          if [ $(coverage report | grep TOTAL | awk '{print $4}' | sed 's/%//') -lt 80 ]; then
            echo "Coverage below 80% threshold"
            exit 1
          fi
  ```

- [ ] **Create test suite structure**
  ```bash
  mkdir -p backend/tests/tools/budget
  mkdir -p backend/tests/tools/trip
  mkdir -p backend/tests/tools/social
  mkdir -p backend/tests/tools/profile
  mkdir -p backend/tests/core
  mkdir -p backend/tests/integration
  ```

- [ ] **Write example test template**
  ```python
  # File: backend/tests/tools/test_template.py

  import pytest
  from app.services.pam.tools.budget import create_expense

  @pytest.mark.asyncio
  async def test_create_expense_success():
      """Test successful expense creation"""
      result = await create_expense(
          user_id="test-user",
          amount=50.00,
          category="fuel"
      )
      assert result["success"] is True
      assert "expense_id" in result

  @pytest.mark.asyncio
  async def test_create_expense_validation_error():
      """Test input validation"""
      result = await create_expense(
          user_id="test-user",
          amount=-50.00,  # Invalid negative amount
          category="fuel"
      )
      assert result["success"] is False
      assert "error" in result
  ```

- [ ] **Set Week 3 milestone in fix plan**
  - Week 3: Write comprehensive test suite
  - Target: 80%+ coverage
  - CI enforces coverage threshold
  - Beta launch blocked until tests pass

- [ ] **Update launch criteria**
  ```markdown
  ## Beta Launch Criteria (MUST PASS ALL)
  - [ ] 80%+ test coverage
  - [ ] All CI checks passing
  - [ ] Manual QA on staging
  - [ ] Security audit complete
  - [ ] Performance benchmarks met
  ```

- [ ] **Remove "production ready" from docs until tests exist**
  - PAM_CLEANUP_STATUS.md: Change to "Code Complete (Tests Pending)"
  - PAM_SYSTEM_ARCHITECTURE.md: Add "Testing in Progress" badge

#### Commit Message - Amendment 4
```
chore: enforce test coverage gate before production

Resolves contradiction:
- Cannot claim "production ready" with 0% test coverage
- Beta launch now blocked until Week 3 test suite complete

Changes:
- Add CI test coverage gate (80% minimum)
- Create test suite structure
- Update all "production ready" claims to "code complete"
- Set Week 3 milestone: comprehensive test suite
- Add launch criteria checklist

Launch criteria:
- 80%+ coverage (enforced by CI)
- All tests passing
- Manual QA complete
- Security audit complete

Breaking changes: None (internal process)

🤖 Generated with Claude Code
```

---

## Amendment 5: Transition/Life Tools - Keep or Archive

### Problem
- ❌ Fix Plan says "not in architecture, likely delete"
- ✅ Inventory counts 10 tools (~1,600 lines)
- ⚠️ Limbo state causes drift

### Solution: Make Explicit Decision Now

#### Option A: Archive Transition Tools (RECOMMENDED)

**PR Checklist - Amendment 5A (Archive)**

- [ ] **Move to archive folder**
  ```bash
  mkdir -p backend/archive/transition_tools
  mv backend/app/services/pam/tools/transition/*.py backend/archive/transition_tools/
  ```

- [ ] **Remove from imports**
  ```bash
  # Verify not imported
  grep -r "from.*transition\|import.*transition" backend/app/services/pam/core/pam.py

  # Should return nothing
  ```

- [ ] **Add README.md to archive**
  ```markdown
  # Archived: Transition/Life Tools

  **Archived:** November 4, 2025
  **Reason:** Not in official PAM architecture
  **Files:** 10 tools (~1,600 lines)

  These tools help with life transitions (moving, downsizing).
  Not core to RV travel use case.

  May be revived as separate product/feature in future.
  ```

- [ ] **Update architecture docs**
  - Remove transition tools from tool count
  - Document as "archived feature"

**Commit Message - Amendment 5A**
```
chore: archive transition tools (out of scope)

Decision: Move transition tools to archive
- 10 tools for life transitions (moving, downsizing)
- Not in official PAM architecture
- Not core to RV travel use case (~1,600 lines)

Changes:
- Move /tools/transition/ to /archive/transition_tools/
- Add README explaining archive
- Update architecture docs
- Remove from tool count

Future: May become separate product/feature
Breaking changes: None (tools not registered)

🤖 Generated with Claude Code
```

---

#### Option B: Keep and Bless Transition Tools

**PR Checklist - Amendment 5B (Keep - IF CHOSEN)**

- [ ] **Add to official architecture**
  ```markdown
  # File: docs/PAM_SYSTEM_ARCHITECTURE.md

  ## 8. Transition Tools (10 tools)

  Help users with life transitions (moving, downsizing, RV lifestyle)

  1. analyze_room_progress
  2. downsizing_decision_help
  3. storage_recommendation
  4. donation_value_estimator
  5. moving_cost_calculator
  6. timeline_planner
  7. packing_list_generator
  8. utility_transfer_helper
  9. address_change_tracker
  10. final_walkthrough_checklist
  ```

- [ ] **Register in pam.py**
  ```python
  # File: backend/app/services/pam/core/pam.py

  from app.services.pam.tools.transition import (
      analyze_room_progress,
      downsizing_decision_help,
      # ... all 10 tools
  )

  # Add to _build_tools()
  ```

- [ ] **Write tests**
  - Add to Week 3 test suite
  - Target: 80%+ coverage

- [ ] **Update tool count**
  - New official count: 52 tools (42 + 10 transition)

**Commit Message - Amendment 5B**
```
feat: add transition tools to official architecture

Decision: Bless transition tools as official feature
- 10 tools for life transitions (moving to RV lifestyle)
- Unique value prop for new RV buyers
- ~1,600 lines of code

Changes:
- Add to official architecture (52 total tools)
- Register in pam.py core
- Add to Week 3 test suite
- Update documentation

Market fit: Helps users transition INTO RV lifestyle
Breaking changes: None (new feature)

🤖 Generated with Claude Code
```

---

**DECISION REQUIRED:** Choose Option A (archive) or Option B (keep)

**Recommendation:** Option A (archive) - focus MVP on core RV travel features

---

## Amendment 6: Code Deletion - Proceed with Phase 1

### Approval
✅ **GREEN LIGHT** - Execute exactly as written in PAM_TOOLS_FIX_PLAN.md

### PR Checklist - Amendment 6

- [ ] **Verify pam_2 is unused**
  ```bash
  grep -r "from app.services.pam_2\|import.*pam_2" /backend/app/api
  # Expected: No results
  ```

- [ ] **Verify MCP is unused**
  ```bash
  grep -r "from app.services.pam.mcp\|import.*mcp" /backend/app
  # Expected: No results (except in docs)
  ```

- [ ] **Delete pam_2 system**
  ```bash
  rm -rf /backend/app/services/pam_2
  # Removes: 27 files, ~2,000 lines
  ```

- [ ] **Delete MCP system**
  ```bash
  rm -rf /backend/app/services/pam/mcp
  # Removes: 14 files, ~1,200 lines
  ```

- [ ] **Delete transition tools** (if archiving per Amendment 5)
  ```bash
  mv backend/app/services/pam/tools/transition backend/archive/transition_tools
  # Moves: 10 files, ~500 lines
  ```

- [ ] **Delete unverified standalone tools**
  ```bash
  # Verify these are unused first
  grep -r "load_user_profile\|load_financial_context\|load_social_context\|load_recent_memory" /backend/app

  # If no results, delete:
  rm backend/app/services/pam/tools/load_user_profile.py
  rm backend/app/services/pam/tools/load_financial_context.py
  rm backend/app/services/pam/tools/load_social_context.py
  rm backend/app/services/pam/tools/load_recent_memory.py
  # Removes: ~200 lines
  ```

- [ ] **Verify no syntax errors**
  ```bash
  python3 -m py_compile backend/app/services/pam/core/pam.py
  find backend/app/services/pam/tools -name "*.py" -exec python3 -m py_compile {} \;
  ```

- [ ] **Run quality checks**
  ```bash
  npm run quality:check:full
  npm run type-check
  npm test
  ```

- [ ] **Commit Phase 1 cleanup**
  ```bash
  git add -A
  git commit -m "chore: Phase 1 cleanup - remove deprecated systems

  Deleted deprecated systems (40% code reduction):
  - pam_2 system: 27 files (~2,000 lines)
  - MCP system: 14 files (~1,200 lines)
  - Transition tools: 10 files (~500 lines)
  - Unverified loaders: 4 files (~200 lines)

  Total removed: ~3,900 lines (40% reduction)

  Verification:
  - All syntax checks passed
  - No imports broken
  - Quality checks green
  - Zero functional impact

  🤖 Generated with Claude Code"
  ```

**Impact:** ~3,900 lines deleted (40% code reduction)
**Risk:** Low (verified unused before deletion)
**Status:** ✅ Ready to execute

---

## Amendment 7: Registry vs Direct Imports - Single Source of Truth

### Problem
- 🟡 Currently: ~55 direct imports in pam.py AND tool registry
- ⚠️ Risk: Skew between "what exists" and "what's registered"

### Solution: Enforce Registry-First Pattern

#### PR Checklist - Amendment 7

- [ ] **Choose pattern: Registry-first**
  - Tools are registered in _build_tools()
  - Tools are called via _execute_tools()
  - Direct imports only for helper functions

- [ ] **Audit current imports in pam.py**
  ```bash
  grep "^from app.services.pam.tools" backend/app/services/pam/core/pam.py | wc -l
  # Count direct imports
  ```

- [ ] **Refactor to registry pattern**
  ```python
  # File: backend/app/services/pam/core/pam.py

  # BEFORE (direct import + manual call)
  from app.services.pam.tools.budget import create_expense

  async def handle_create_expense(user_id, params):
      return await create_expense(user_id, **params)

  # AFTER (registry pattern)
  async def _execute_tools(self, tool_calls: list) -> list:
      """Execute tools via registry (single source of truth)"""
      results = []
      for tool_call in tool_calls:
          tool_name = tool_call["name"]

          # Import dynamically from registry
          module_path = TOOL_REGISTRY[tool_name]["module"]
          function_name = TOOL_REGISTRY[tool_name]["function"]

          module = importlib.import_module(module_path)
          tool_func = getattr(module, function_name)

          result = await tool_func(self.user_id, **tool_call["input"])
          results.append(result)

      return results
  ```

- [ ] **Create TOOL_REGISTRY mapping**
  ```python
  # File: backend/app/services/pam/core/tool_registry.py

  TOOL_REGISTRY = {
      "create_expense": {
          "module": "app.services.pam.tools.budget.create_expense",
          "function": "create_expense",
          "category": "budget"
      },
      "plan_trip": {
          "module": "app.services.pam.tools.trip.plan_trip",
          "function": "plan_trip",
          "category": "trip"
      },
      # ... all 42+ tools
  }
  ```

- [ ] **Remove direct imports from pam.py**
  - Keep only registry imports
  - Remove individual tool imports

- [ ] **Add validation**
  ```python
  def validate_registry():
      """Ensure all registered tools have valid module paths"""
      for tool_name, config in TOOL_REGISTRY.items():
          module_path = config["module"]
          function_name = config["function"]

          try:
              module = importlib.import_module(module_path)
              func = getattr(module, function_name)
              assert callable(func)
          except Exception as e:
              raise ValueError(f"Invalid registry entry: {tool_name} - {e}")
  ```

- [ ] **Update fix plan**
  - Add "Refactor to registry-first pattern (1 day)" to Week 2

#### Commit Message - Amendment 7
```
refactor: enforce registry-first pattern for tool invocation

Problem: Skew between direct imports and tool registry
Solution: Single source of truth (registry)

Changes:
- Create TOOL_REGISTRY mapping (all 42+ tools)
- Refactor _execute_tools() to use registry dynamically
- Remove direct tool imports from pam.py
- Add registry validation on startup
- Prevent drift between "exists" and "registered"

Benefits:
- Single source of truth
- Easier to add/remove tools
- No import skew
- Validates on startup

Breaking changes: None (internal refactor)

🤖 Generated with Claude Code
```

---

## Amendment 8: Middlewares - Centralize Utilities

### Problem
- 🟡 Fix Plan suggests per-tool implementation
- ⚠️ Risk: Code duplication, inconsistent behavior

### Solution: Implement as Shared Middlewares/Utilities

#### PR Checklist - Amendment 8

- [ ] **Create shared middleware module**
  ```bash
  mkdir -p backend/app/core/middleware
  touch backend/app/core/middleware/__init__.py
  touch backend/app/core/middleware/cache.py
  touch backend/app/core/middleware/rate_limiter.py
  touch backend/app/core/middleware/retry.py
  touch backend/app/core/middleware/validation.py
  ```

- [ ] **Implement @cache decorator**
  ```python
  # File: backend/app/core/middleware/cache.py

  from functools import wraps
  from app.core.redis import redis_client
  import json

  def cache(ttl: int = 300):
      """Cache function result in Redis

      Args:
          ttl: Time to live in seconds (default: 5 minutes)
      """
      def decorator(func):
          @wraps(func)
          async def wrapper(*args, **kwargs):
              # Generate cache key from function name + args
              cache_key = f"cache:{func.__name__}:{json.dumps(args)}:{json.dumps(kwargs)}"

              # Try cache first
              cached = await redis_client.get(cache_key)
              if cached:
                  return json.loads(cached)

              # Call function
              result = await func(*args, **kwargs)

              # Cache result
              await redis_client.setex(cache_key, ttl, json.dumps(result))

              return result
          return wrapper
      return decorator
  ```

- [ ] **Implement @rate_limit decorator**
  ```python
  # File: backend/app/core/middleware/rate_limiter.py

  from functools import wraps
  from app.core.redis import redis_client
  from datetime import datetime

  def rate_limit(max_calls: int, period: int):
      """Rate limit function calls per user

      Args:
          max_calls: Maximum calls allowed
          period: Time period in seconds
      """
      def decorator(func):
          @wraps(func)
          async def wrapper(user_id: str, *args, **kwargs):
              # Rate limit key
              rate_key = f"rate_limit:{func.__name__}:{user_id}:{datetime.utcnow().strftime('%Y%m%d%H%M')}"

              # Increment counter
              count = await redis_client.incr(rate_key)
              if count == 1:
                  await redis_client.expire(rate_key, period)

              # Check limit
              if count > max_calls:
                  raise ValueError(f"Rate limit exceeded: {max_calls} calls per {period}s")

              return await func(user_id, *args, **kwargs)
          return wrapper
      return decorator
  ```

- [ ] **Implement @retry decorator**
  ```python
  # File: backend/app/core/middleware/retry.py

  from tenacity import retry, stop_after_attempt, wait_exponential

  def retry_on_failure(max_attempts: int = 3, min_wait: int = 1, max_wait: int = 10):
      """Retry function on failure with exponential backoff

      Args:
          max_attempts: Maximum retry attempts (default: 3)
          min_wait: Minimum wait time in seconds (default: 1)
          max_wait: Maximum wait time in seconds (default: 10)
      """
      return retry(
          stop=stop_after_attempt(max_attempts),
          wait=wait_exponential(multiplier=1, min=min_wait, max=max_wait),
          reraise=True
      )
  ```

- [ ] **Create validation models module**
  ```python
  # File: backend/app/core/middleware/validation.py

  from pydantic import BaseModel, validator
  from typing import Optional

  class ExpenseInput(BaseModel):
      """Validate expense creation input"""
      amount: float
      category: str
      description: Optional[str] = None

      @validator('amount')
      def amount_must_be_positive(cls, v):
          if v <= 0:
              raise ValueError('Amount must be positive')
          return v

      @validator('category')
      def category_must_be_valid(cls, v):
          valid = ['fuel', 'food', 'camping', 'maintenance', 'entertainment']
          if v not in valid:
              raise ValueError(f'Invalid category. Must be one of: {valid}')
          return v

  # ... more validation models
  ```

- [ ] **Apply middlewares to tools via registry**
  ```python
  # File: backend/app/services/pam/core/tool_registry.py

  from app.core.middleware.cache import cache
  from app.core.middleware.rate_limiter import rate_limit
  from app.core.middleware.retry import retry_on_failure

  TOOL_REGISTRY = {
      "get_weather_forecast": {
          "module": "app.services.pam.tools.trip.get_weather_forecast",
          "function": "get_weather_forecast",
          "middlewares": [
              cache(ttl=1800),  # Cache weather for 30min
              retry_on_failure(max_attempts=3)  # Retry on API failure
          ]
      },
      "create_post": {
          "module": "app.services.pam.tools.social.create_post",
          "function": "create_post",
          "middlewares": [
              rate_limit(max_calls=10, period=60)  # Max 10 posts/min
          ]
      },
      # ... all tools with appropriate middlewares
  }
  ```

- [ ] **Update _execute_tools to apply middlewares**
  ```python
  async def _execute_tools(self, tool_calls: list) -> list:
      for tool_call in tool_calls:
          tool_config = TOOL_REGISTRY[tool_call["name"]]

          # Load function
          module = importlib.import_module(tool_config["module"])
          func = getattr(module, tool_config["function"])

          # Apply middlewares (decorator pattern)
          for middleware in tool_config.get("middlewares", []):
              func = middleware(func)

          # Execute with middlewares applied
          result = await func(self.user_id, **tool_call["input"])
  ```

- [ ] **Update fix plan**
  - Change "Add caching per tool" → "Apply @cache middleware via registry"
  - Change "Add rate limiting per tool" → "Apply @rate_limit middleware via registry"
  - Emphasize: ONE implementation, ALL tools benefit

#### Commit Message - Amendment 8
```
feat: centralize utilities as shared middlewares

Problem: Per-tool implementation causes duplication
Solution: Shared middlewares applied via registry

Middlewares created:
- @cache(ttl=X) - Redis caching with TTL
- @rate_limit(max_calls=X, period=Y) - Per-user rate limiting
- @retry_on_failure(max_attempts=X) - Exponential backoff
- Pydantic validation models - Input validation

Usage:
- Applied via TOOL_REGISTRY (not per-tool code)
- One implementation, all tools benefit
- Consistent behavior across all tools
- Easy to add/modify rules

Example:
  "get_weather_forecast": {
      "middlewares": [cache(1800), retry_on_failure(3)]
  }

Benefits:
- No code duplication
- Uniform behavior
- Easy to maintain
- Registry-driven configuration

Breaking changes: None (internal improvement)

🤖 Generated with Claude Code
```

---

## Execution Order

Execute amendments in this order:

1. **Amendment 1** - Weather stack (OpenMeteo standardization)
2. **Amendment 6** - Code deletion (Phase 1 cleanup)
3. **Amendment 3** - Shop feature decision
4. **Amendment 5** - Transition tools decision
5. **Amendment 2** - Mapbox abstraction
6. **Amendment 7** - Registry-first pattern
7. **Amendment 8** - Centralized middlewares
8. **Amendment 4** - Test coverage gate

---

## Final Validation Checklist

Before declaring "ready for beta":

- [ ] All 8 amendments implemented
- [ ] Phase 1 cleanup complete (~3,900 lines deleted)
- [ ] Weather stack uses OpenMeteo exclusively
- [ ] Mapbox abstraction used via registry
- [ ] Shop feature decision implemented
- [ ] Transition tools archived or blessed
- [ ] Registry-first pattern enforced
- [ ] Middlewares centralized
- [ ] 80%+ test coverage achieved
- [ ] All CI checks green
- [ ] Manual QA on staging complete
- [ ] Architecture docs match reality
- [ ] No contradictions across docs

---

## Commit History (After All Amendments)

Expected commit sequence:

```
1. fix: standardize weather stack on OpenMeteo
2. chore: Phase 1 cleanup - remove deprecated systems
3. feat: disable shop tools (not MVP ready)
4. chore: archive transition tools (out of scope)
5. refactor: use existing mapbox_navigator in trip tools
6. refactor: enforce registry-first pattern
7. feat: centralize utilities as shared middlewares
8. chore: enforce test coverage gate before production
9. docs: update all docs to match implementation
10. test: add comprehensive test suite (80%+ coverage)
```

---

**Status:** Ready for execution
**Approver:** User approved with amendments
**Execution Time:** ~2 weeks (Weeks 1-2 of original plan)
**Result:** Consistent, executable plan with zero contradictions

🤖 Generated with Claude Code
