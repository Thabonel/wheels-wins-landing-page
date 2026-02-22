# Phase 3 PRD: Auth Provider Abstraction

## Goal

Abstract authentication behind an `AuthProvider` interface so the backend can validate JWTs from any provider (Supabase, Auth0, Firebase, custom) without code changes to the application layer.

**Scope**: Backend only. Frontend auth abstraction is deferred to Phase 4.

## Current State

### Backend Auth is 80% Abstracted

The backend has a solid foundation in `backend/app/core/unified_auth.py`:

**What works well:**
- `UnifiedUser` class - provider-neutral user representation
  - Fields: `user_id`, `email`, `is_admin`, `token_type`
  - Clean interface for application code
- `verify_any_token()` - tries 3 verification methods:
  1. `verify_supabase_token()` - Supabase JWT validation
  2. `verify_local_jwt()` - local JWT fallback
  3. `verify_admin_token()` - admin service token validation
- `get_current_user_unified()` - FastAPI dependency for auth
- `require_admin()` - admin gate dependency

**Supabase coupling points:**

1. **Direct Supabase imports:**
   ```python
   from app.database.supabase_client import get_supabase_service, get_supabase_client
   ```

2. **UnifiedUser.get_supabase_client():**
   - Returns Supabase client based on admin status
   - Wrong abstraction - violates provider neutrality
   - Should be replaced with repository access

3. **JWT verification:**
   - Likely uses Supabase JWKS endpoint for public key fetching
   - JWKS URL derived from `SUPABASE_URL`

4. **Environment variables:**
   - `SUPABASE_URL` - used to construct JWKS URL
   - `SUPABASE_SERVICE_ROLE_KEY` - used for admin operations

### Frontend Auth (Out of Scope for Phase 3)

Frontend is tightly coupled to Supabase:
- `src/context/AuthContext.tsx` - wraps Supabase auth
- `src/context/authSessionManager.ts` - session management
- `src/integrations/supabase/client.ts` - Supabase client initialization
- `src/services/api.ts` - uses `supabase.auth.getSession()`

Frontend abstraction deferred to Phase 4.

## Target State

### Backend Architecture

**1. AuthProvider Interface:**
```python
class AuthProvider(ABC):
    """Abstract interface for authentication providers."""

    @abstractmethod
    async def verify_token(self, token: str) -> AuthResult:
        """Verify a JWT token and return user info."""
        pass

    @abstractmethod
    async def get_user(self, user_id: str) -> UserInfo:
        """Fetch user information by user_id."""
        pass

    @abstractmethod
    async def refresh_token(self, refresh_token: str) -> TokenPair:
        """Refresh an access token."""
        pass

    @abstractmethod
    def get_jwks_url(self) -> str:
        """Return the JWKS URL for token verification."""
        pass
```

**2. Provider Implementations:**
- `SupabaseAuthProvider(AuthProvider)` - current Supabase implementation
- `GenericJWTAuthProvider(AuthProvider)` - JWKS-based validation for any provider
- Future: `Auth0Provider`, `FirebaseProvider`, etc.

**3. Unified Auth Layer:**
- `unified_auth.py` uses `AuthProvider` interface instead of direct Supabase calls
- `verify_any_token()` delegates to configured provider chain
- `UnifiedUser.get_supabase_client()` removed - replaced with repository access

**4. Configuration:**
- `AUTH_PROVIDER=supabase|jwt|auth0` - select provider
- `AUTH_JWKS_URL` - JWKS endpoint URL (optional, provider-specific default)
- Backward compatible: defaults to Supabase

## Tasks

### 1. Create Auth Provider Package

**File:** `backend/app/core/auth/__init__.py`
```python
from .provider import AuthProvider, AuthResult, UserInfo, TokenPair
from .supabase_provider import SupabaseAuthProvider
from .jwt_provider import GenericJWTAuthProvider
from .factory import get_auth_provider
```

**File:** `backend/app/core/auth/provider.py`
- Define `AuthProvider` abstract base class
- Define data classes: `AuthResult`, `UserInfo`, `TokenPair`
- Document expected behavior for each method

**File:** `backend/app/core/auth/supabase_provider.py`
- Extract `verify_supabase_token()` from `unified_auth.py`
- Implement `AuthProvider` interface
- Use existing Supabase client initialization

**File:** `backend/app/core/auth/jwt_provider.py`
- Extract `verify_local_jwt()` from `unified_auth.py`
- Implement generic JWKS-based JWT validation
- Support any provider with a JWKS endpoint

**File:** `backend/app/core/auth/factory.py`
- Provider factory based on `AUTH_PROVIDER` env var
- Return configured provider chain
- Default: Supabase (backward compatible)

### 2. Refactor unified_auth.py

**Remove Supabase coupling:**
- Replace direct Supabase imports with provider interface
- `verify_any_token()` delegates to provider chain from factory
- Keep `UnifiedUser` class but remove `get_supabase_client()` method
- Keep `get_current_user_unified()` and `require_admin()` dependencies

**Provider chain logic:**
```python
async def verify_any_token(token: str) -> UnifiedUser:
    providers = get_auth_provider()  # Returns chain from factory

    for provider in providers:
        try:
            result = await provider.verify_token(token)
            return UnifiedUser(
                user_id=result.user_id,
                email=result.email,
                is_admin=result.is_admin,
                token_type=result.token_type
            )
        except AuthenticationError:
            continue

    raise AuthenticationError("All token verification methods failed")
```

### 3. Make JWKS URL Configurable

**Current state:**
- JWKS URL hardcoded or derived from `SUPABASE_URL`
- Example: `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`

**New environment variable:**
- `AUTH_JWKS_URL` (optional)
- Defaults to Supabase URL construction if not provided
- Used by `GenericJWTAuthProvider`

**Provider-specific defaults:**
- SupabaseAuthProvider: `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`
- Auth0Provider: `https://{domain}/.well-known/jwks.json`
- FirebaseProvider: `https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`

### 4. Remove UnifiedUser.get_supabase_client()

**Why this is wrong:**
- Returns Supabase-specific client - violates provider neutrality
- Leaks provider implementation into application code
- Should be replaced with repository access

**Migration steps:**
1. Find all callers of `UnifiedUser.get_supabase_client()`
2. Replace with repository pattern (from Phase 1)
3. Example:
   ```python
   # Before
   user = get_current_user_unified(...)
   client = user.get_supabase_client()
   data = client.from_('trips').select('*').execute()

   # After
   user = get_current_user_unified(...)
   trips = await trip_repository.find_by_user(user.user_id)
   ```

**Files to update:**
- Search for `.get_supabase_client()` calls
- Update all PAM tool implementations that use this method
- Update all API endpoints that use this method

### 5. Update FastAPI Dependencies

**File:** `backend/app/core/unified_auth.py`

**Ensure these dependencies use provider interface:**
- `get_current_user_unified()` - already abstracted, just use provider chain
- `require_admin()` - already abstracted, no changes needed

**No breaking changes:**
- Dependencies still return `UnifiedUser`
- Application code remains unchanged

### 6. Add Provider Configuration

**Environment variables:**
```bash
# Provider selection
AUTH_PROVIDER=supabase  # Options: supabase, jwt, auth0

# Optional JWKS URL override
AUTH_JWKS_URL=https://your-provider.com/.well-known/jwks.json

# Existing Supabase variables (still needed for SupabaseAuthProvider)
SUPABASE_URL=https://kycoklimpzkyrecbjecn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Backward compatibility:**
- Default `AUTH_PROVIDER=supabase`
- If `AUTH_PROVIDER` not set, use Supabase
- All existing deployments continue working without changes

### 7. Update Documentation

**File:** `backend/docs/architecture.md`
- Document auth provider architecture
- Explain provider chain
- Show how to add new providers

**File:** `backend/docs/auth-providers.md` (new)
- Guide for implementing custom auth providers
- Examples: Supabase, Auth0, Firebase
- JWKS endpoint discovery

**File:** `CLAUDE.md`
- Update auth section with provider abstraction details
- Document new environment variables

## Verification

### Unit Tests

**File:** `backend/tests/core/auth/test_providers.py`
- Test each provider implementation
- Mock JWKS responses
- Verify token validation logic

**File:** `backend/tests/core/auth/test_factory.py`
- Test provider factory
- Verify correct provider returned based on config

### Integration Tests

**File:** `backend/tests/integration/test_auth_flow.py`
- Test complete auth flow with each provider
- Verify FastAPI dependencies work correctly
- Test admin vs non-admin paths

### Manual Testing

1. **Test with Supabase (current provider):**
   - Set `AUTH_PROVIDER=supabase`
   - Verify all existing auth flows work
   - No behavior changes expected

2. **Test with Generic JWT:**
   - Set `AUTH_PROVIDER=jwt`
   - Set `AUTH_JWKS_URL` to test JWKS endpoint
   - Verify JWT validation works

3. **Test provider chain:**
   - Configure multiple providers
   - Verify fallback behavior
   - Test with invalid tokens

### Success Criteria

- All existing auth flows work unchanged
- Can switch `AUTH_PROVIDER` env var without code changes
- Generic JWT provider can validate tokens from any JWKS endpoint
- Zero regression in auth behavior
- 100% test coverage for new auth provider code

## Rollback

**Simple environment variable change:**
```bash
AUTH_PROVIDER=supabase
```

**No database changes:**
- This phase only refactors application code
- No migrations needed
- No RLS policy changes

**No data loss:**
- User sessions continue working
- No token invalidation
- Existing JWTs remain valid

## Dependencies

**Requires Phase 1:**
- Repository pattern needed to replace `get_supabase_client()` calls
- Cannot complete Task 4 without repositories in place

**Enables Phase 4:**
- Frontend auth abstraction can follow same pattern
- Provider interface established on backend

## Timeline

**Estimated effort:** 2-3 days

**Task breakdown:**
- Day 1: Tasks 1-2 (create provider package, refactor unified_auth)
- Day 2: Tasks 3-5 (configuration, remove Supabase client, update dependencies)
- Day 3: Tasks 6-7 + verification (add config, documentation, testing)

## Risks

**Risk 1: Breaking existing auth flows**
- Mitigation: Default to Supabase provider, maintain backward compatibility
- Rollback: Set `AUTH_PROVIDER=supabase`

**Risk 2: Performance regression from provider chain**
- Mitigation: Benchmark before/after, optimize if needed
- Most deployments use single provider anyway

**Risk 3: JWKS caching issues**
- Mitigation: Implement proper JWKS caching with TTL
- Use PyJWT or similar library with built-in caching

## Open Questions

1. **Should we support multiple simultaneous providers?**
   - Answer: Yes, provider chain supports fallback
   - Example: Supabase primary, generic JWT fallback

2. **How to handle admin users with non-Supabase providers?**
   - Answer: Admin status determined by JWT claims
   - Each provider implements its own admin detection logic

3. **What about social auth (Google, GitHub, etc.)?**
   - Answer: Out of scope for Phase 3
   - Social auth handled by auth provider (Supabase, Auth0, etc.)
   - We only validate the resulting JWT

## Success Metrics

- Zero regressions in existing auth flows
- Can switch auth providers via environment variable
- Code reduction: Remove Supabase coupling from application layer
- Test coverage: 100% for new auth provider code
- Documentation: Complete guide for adding new providers
