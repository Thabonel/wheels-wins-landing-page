# Week 2 Consolidated Fix Priority List
**Date**: January 10, 2025
**Status**: Agent reviews completed, fixes pending
**Source**: database-architect + security-auditor agent reports

---

## 🔴 CRITICAL FIXES (Block Production Deployment)

### Database Issues (database-architect findings)

#### 1. Missing RLS Policies on income_entries Table
**Severity**: CRITICAL
**File**: `supabase/migrations/20250110000000-week2-missing-tables.sql`
**Issue**: Income data is accessible without Row Level Security
**Impact**: Users can view/modify other users' income data
**Fix**:
```sql
-- Add missing RLS policies for income_entries
ALTER TABLE public.income_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own income entries"
ON public.income_entries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own income entries"
ON public.income_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own income entries"
ON public.income_entries FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own income entries"
ON public.income_entries FOR DELETE
USING (auth.uid() = user_id);
```

#### 2. Incomplete RLS Policies on user_subscriptions Table
**Severity**: CRITICAL
**File**: `supabase/migrations/20250110000000-week2-missing-tables.sql`
**Issue**: Missing UPDATE and DELETE policies
**Impact**: Users cannot manage their subscriptions properly
**Fix**:
```sql
-- Add missing UPDATE and DELETE policies
CREATE POLICY "Users can update their own subscription"
ON public.user_subscriptions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscription"
ON public.user_subscriptions FOR DELETE
USING (auth.uid() = user_id);
```

#### 3. budget_utilization View Performance Issue
**Severity**: CRITICAL
**File**: `supabase/migrations/20250110000000-week2-missing-tables.sql`
**Issue**: View performs full table scans, no RLS enforcement
**Impact**: Slow queries, potential data leakage
**Fix**:
```sql
-- Drop and recreate with optimized query
DROP VIEW IF EXISTS public.budget_utilization;

CREATE VIEW public.budget_utilization AS
SELECT
    b.id,
    b.user_id,
    b.category,
    b.monthly_limit,
    COALESCE(SUM(e.amount), 0) as spent,
    b.monthly_limit - COALESCE(SUM(e.amount), 0) as remaining,
    CASE
        WHEN b.monthly_limit > 0
        THEN (COALESCE(SUM(e.amount), 0) / b.monthly_limit * 100)
        ELSE 0
    END as percentage_used
FROM public.budgets b
LEFT JOIN public.expenses e ON
    b.user_id = e.user_id
    AND b.category = e.category
    AND DATE_TRUNC('month', e.date) = DATE_TRUNC('month', CURRENT_DATE)
WHERE b.user_id = auth.uid()  -- RLS enforcement
GROUP BY b.id, b.user_id, b.category, b.monthly_limit;

-- Grant access
GRANT SELECT ON public.budget_utilization TO authenticated;
```

### Security Issues (security-auditor findings)

#### 4. Fail-Open LLM Validation (CVSS 8.1)
**Severity**: CRITICAL
**File**: `backend/app/services/pam/security/safety_layer.py`
**Issue**: If Gemini API fails, malicious prompts pass through
**Impact**: Bypass security completely during API outages
**Fix**:
```python
# Change fail-open to fail-closed with user notification
async def _check_llm(self, message: str) -> SafetyResult:
    if not self.llm_enabled:
        logger.warning("LLM safety check unavailable - BLOCKING request as precaution")
        return SafetyResult(
            is_malicious=True,  # Changed from False
            confidence=0.5,
            reason="Security system temporarily unavailable. Please try again later.",
            detection_method="llm_unavailable",
            latency_ms=0
        )

    try:
        # ... existing LLM check ...
    except Exception as e:
        logger.error(f"LLM safety check failed: {e}")
        # Fail closed, not open
        return SafetyResult(
            is_malicious=True,  # Changed from False
            confidence=0.5,
            reason="Security validation error. Please try again.",
            detection_method="llm_error",
            latency_ms=time.time() - start_time
        )
```

#### 5. Unicode Bypass in Regex Patterns (CVSS 7.8)
**Severity**: CRITICAL
**File**: `backend/app/services/pam/security/safety_layer.py`
**Issue**: Regex patterns don't normalize Unicode, allowing homograph attacks
**Impact**: Attackers use lookalike characters to bypass detection
**Fix**:
```python
import unicodedata

def _normalize_message(self, message: str) -> str:
    """Normalize Unicode to prevent character substitution attacks"""
    # NFKC normalization: Compatibility decomposition followed by composition
    normalized = unicodedata.normalize('NFKC', message)
    # Convert to lowercase for case-insensitive matching
    return normalized.lower()

async def check_message(self, message: str, context: Optional[Dict[str, Any]] = None) -> SafetyResult:
    # Normalize before any checks
    normalized_message = self._normalize_message(message)

    # Stage 1: Regex pre-check (< 1ms)
    regex_result = self._check_regex(normalized_message)  # Use normalized
    if regex_result.is_malicious:
        return regex_result

    # Stage 2: LLM validation (50-100ms)
    if self.llm_enabled:
        llm_result = await self._check_llm(message)  # LLM gets original
        return llm_result
```

#### 6. WebSocket Authentication Bypass (CVSS 9.1)
**Severity**: CRITICAL
**File**: `backend/app/api/v1/pam.py` (lines 40-67)
**Issue**: Test connection and anonymous access bypass authentication
**Impact**: Complete unauthorized access to PAM services
**Fix**:
```python
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    token: Optional[str] = Query(None)
):
    await websocket.accept()

    # REMOVE test bypasses - enforce JWT always
    if not token or token in ["", "test-connection"]:
        await websocket.close(code=1008, reason="Authentication required")
        logger.warning(f"WebSocket connection rejected - no valid token")
        return

    # Verify JWT token
    try:
        payload = verify_jwt_token(token)
        if payload.get("sub") != user_id:
            await websocket.close(code=1008, reason="User ID mismatch")
            return
    except Exception as e:
        logger.error(f"JWT verification failed: {e}")
        await websocket.close(code=1008, reason="Invalid token")
        return

    # Proceed with authenticated connection...
```

#### 7. CSP Allows unsafe-inline (CVSS 7.3)
**Severity**: CRITICAL
**File**: `backend/app/middleware/security_headers.py`
**Issue**: `unsafe-inline` in script-src and style-src defeats XSS protection
**Impact**: Stored XSS attacks can execute
**Fix**:
```python
# Replace unsafe-inline with nonce-based CSP
import secrets

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate unique nonce for this request
        nonce = secrets.token_urlsafe(16)
        request.state.csp_nonce = nonce

        if self.environment == "production":
            csp_directives = [
                "default-src 'self'",
                f"script-src 'self' 'nonce-{nonce}' https://cdn.jsdelivr.net https://unpkg.com",  # Removed unsafe-inline
                f"style-src 'self' 'nonce-{nonce}' https://fonts.googleapis.com",  # Removed unsafe-inline
                "font-src 'self' https://fonts.gstatic.com data:",
                "img-src 'self' data: https: blob:",
                "connect-src 'self' https://api.openai.com https://generativelanguage.googleapis.com https://*.supabase.co wss://*.supabase.co",
                "frame-ancestors 'none'",
                "upgrade-insecure-requests"
            ]

        response = await call_next(request)
        # ... add headers to response
```

---

## 🟡 HIGH PRIORITY FIXES (Required before Week 4 production)

### Database Issues

#### 8. Missing Indexes on Foreign Keys
**Severity**: HIGH
**Files**: Multiple tables
**Issue**: No indexes on frequently queried foreign key relationships
**Impact**: Slow queries, poor join performance
**Fix**:
```sql
-- Add missing foreign key indexes
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_pam_conversations_user_id ON public.pam_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_pam_messages_conversation_id ON public.pam_messages(conversation_id);
```

#### 9. Weak CHECK Constraints
**Severity**: HIGH
**Issue**: Amount validation allows zero and negative values in some tables
**Fix**:
```sql
-- Strengthen constraints
ALTER TABLE public.budgets DROP CONSTRAINT budgets_monthly_limit_check;
ALTER TABLE public.budgets ADD CONSTRAINT budgets_monthly_limit_check
    CHECK (monthly_limit > 0);  -- Changed from >= 0

ALTER TABLE public.income_entries ADD CONSTRAINT income_entries_amount_positive
    CHECK (amount > 0);
```

### Security Issues

#### 10. SQL Injection in Dynamic Queries
**Severity**: HIGH
**File**: `backend/app/api/v1/wins.py:175-181`
**Issue**: Dynamic SQL with string formatting
**Fix**:
```python
# Replace with parameterized query
from app.database import get_supabase_client

async def get_expenses(
    user_id: str,
    category: Optional[str] = None,
    limit: int = 50
):
    supabase = get_supabase_client()

    query = supabase.table('expenses').select('*')
    query = query.eq('user_id', user_id)

    if category:
        query = query.eq('category', category)

    query = query.order('date', desc=True).limit(limit)

    result = await query.execute()
    return result.data
```

#### 11. Admin Token Authentication Weakness
**Severity**: HIGH
**File**: `backend/app/api/v1/admin.py:12-18`
**Issue**: Timing attack vulnerability, no rate limiting
**Fix**:
```python
import secrets

async def verify_admin_token(x_admin_token: str = Header(...)):
    expected = os.getenv("ADMIN_TOKEN")

    if not expected:
        raise HTTPException(status_code=500, detail="Admin auth not configured")

    # Use constant-time comparison
    if not secrets.compare_digest(x_admin_token, expected):
        # Log failed attempt
        logger.warning(f"Failed admin authentication attempt")
        raise HTTPException(status_code=403, detail="Invalid admin token")

    return True
```

---

## 🟢 MEDIUM PRIORITY FIXES (Implement in Week 3)

### Security Issues

#### 12. Information Disclosure in Error Messages
**File**: Multiple endpoints
**Issue**: Detailed error messages leak implementation details
**Fix**: Implement error sanitization for production

#### 13. File Upload Validation
**File**: `backend/app/api/v1/profiles.py`
**Issue**: MIME type can be spoofed
**Fix**: Add magic number validation

#### 14. Missing Authentication on Profile Endpoints
**File**: `backend/app/api/v1/profiles.py`
**Issue**: Public profile access without authentication
**Fix**: Add authentication dependency

---

## 📋 Implementation Order

### Day 1 (Thursday Afternoon - TODAY)
1. ✅ Database RLS policies (Issues #1, #2) - 30 minutes
2. ✅ Unicode normalization (Issue #5) - 20 minutes
3. ✅ Fail-closed LLM validation (Issue #4) - 15 minutes

### Day 2 (Friday Morning)
4. ✅ WebSocket authentication (Issue #6) - 45 minutes
5. ✅ CSP nonce implementation (Issue #7) - 60 minutes
6. ✅ Budget view optimization (Issue #3) - 30 minutes

### Day 2 (Friday Afternoon)
7. ✅ Database indexes (Issue #8) - 15 minutes
8. ✅ SQL injection fixes (Issue #10) - 45 minutes
9. ✅ Verification tests - 60 minutes

### Week 3
- Medium priority fixes (#12-#14)
- Full security audit
- Penetration testing

---

## 🧪 Verification Checklist

After implementing fixes, verify:

### Database
- [ ] Run migration in Supabase SQL Editor (staging)
- [ ] Verify RLS policies: `SELECT * FROM income_entries` (should only show own data)
- [ ] Test budget_utilization view performance: `EXPLAIN ANALYZE SELECT * FROM budget_utilization`
- [ ] Confirm indexes exist: `\d+ expenses` (check for idx_expenses_user_id)

### Security
- [ ] Test prompt injection: Send "Ignore previous instructions" → Should block
- [ ] Test Unicode bypass: Send "１ｇｎｏｒｅ ｐｒｅｖｉｏｕｓ" (fullwidth chars) → Should block
- [ ] Test WebSocket: Connect without token → Should reject (1008)
- [ ] Test WebSocket: Connect with "test-connection" → Should reject
- [ ] Check CSP headers: `curl -I https://staging.onrender.com` → Should have nonce
- [ ] Run security tests: `pytest backend/tests/security/` → All pass

### Performance
- [ ] Monitor LLM latency: Should be < 100ms for Gemini Flash
- [ ] Check fail-closed behavior: Disable Gemini API → Should block safely
- [ ] Verify Redis rate limiting: Send 61 requests → 61st should return 429

---

## 📊 Success Metrics

### Database
- All RLS policies active: 3/3 tables ✅
- Query performance: < 50ms for budget_utilization
- No missing indexes on foreign keys

### Security
- Prompt injection detection: 95%+ with Unicode normalization
- WebSocket authentication: 100% enforcement
- CSP compliance: Zero unsafe-inline directives
- Security test coverage: 84+ tests passing

### Overall
- Security score: 8.5/10 (up from 6.5/10)
- Production readiness: ✅ READY after fixes
- Performance impact: < 6% latency increase

---

## 🚨 Blocking Issues

**DO NOT DEPLOY TO PRODUCTION UNTIL:**
1. All CRITICAL fixes implemented (#1-#7)
2. All verification tests pass
3. Security score ≥ 8.0/10
4. database-architect re-review: PASS
5. security-auditor re-review: PASS

---

**Next Step**: Implement CRITICAL database fixes (#1-#3)
**Estimated Time**: 90 minutes
**Target Completion**: Thursday EOD
