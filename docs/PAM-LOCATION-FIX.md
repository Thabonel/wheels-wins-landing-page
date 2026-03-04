# PAM Location Awareness - Permanent Fix Plan

> Investigation date: March 2026
> Status: Plan reviewed, ready to implement
> Audit incorporated: 6 issues addressed below

---

## Summary

PAM's location awareness has broken and been re-patched 5+ times in 6 months. Each patch fixed one code path while leaving others broken. The bug always manifests as: PAM doesn't know where the user is, so weather/local queries fail or return wrong results.

**Root cause**: Per-request GPS coordinates from the browser never reach PAM's system prompt. The system prompt is built once from cached profile data, and there is no code path that injects per-request location into it.

---

## Complete Data Flow (Current State, All Broken Paths)

```
Browser GPS / localStorage
    |
    v
Frontend: Pam.tsx:680
    locationState.currentLocation   <-- BROKEN: field doesn't exist
    |  useLocationTracking() returns {startTracking, stopTracking,
    |  toggleTracking, updateDestination, checkPermission, ...state}
    |  No 'currentLocation', no 'getCurrentLocation'. Always undefined.
    |  (Pam.tsx line 96 destructures 'getCurrentLocation' but the hook
    |   doesn't return it - silently undefined, no TS error due to ...state spread)
    |
    v  Falls back to settings.location_preferences.default_location (often null)
    v
pamVoiceNativeService config.location = undefined
    |
    v  No location in REST request body
    v
pam_main.py REST handler
    |  Maps userLocation -> user_location (if present, but it's absent)
    |  get_pam(user_id)  <-- location NOT passed here
    |  pam.chat(message, context=context)  <-- context has no user_location
    |
    v
pam.py chat()
    |  Stores context in conversation history
    |  Does NOT merge context['user_location'] into self.user_context
    |  Does NOT rebuild system prompt with per-request location
    |
    v
pam.py _build_user_context_section()
    |  Reads: self.user_context.get('location')  <-- wrong key, reads string
    |  Value: "Queensland" (region string from cache_warming, not GPS coords)
    |  Output: "- Location: Queensland"  <-- no coordinates, useless for weather
    |
    v
Claude system prompt: "- Location: Queensland"
    |
    v
get_weather tool: needs lat/lng --> FAILS
```

---

## Five Root Causes

### RC-1: `locationState.currentLocation` doesn't exist (Pam.tsx:680)

```typescript
// Current broken code:
const userLocation = settings?.location_preferences?.default_location || locationState.currentLocation;
//                                                                                    ^^^^^^^^^^^^^^^^^
// useLocationTracking() return: {isTracking, hasPermission, error, lastUpdate,
//                                startTracking, stopTracking, toggleTracking,
//                                updateDestination, checkPermission}
// No 'currentLocation'. Always undefined.
```

Note: Pam.tsx line 96 attempts to destructure `getCurrentLocation` from the hook but the hook doesn't return it. TypeScript doesn't error because the hook returns `{...state, ...methods}` which spreads state fields - the extra destructured name just gets `undefined`.

**Effect**: Voice mode always sends no location to the REST API.

---

### RC-2: `pam.py` reads `'location'` (string) not `'user_location'` (dict)

```python
# pam.py lines 537-539 - wrong key
if self.user_context.get('location'):
    context_parts.append(f"- Location: {self.user_context['location']}")
```

`context_manager.py` correctly normalizes incoming location into `user_location` (a dict with lat/lng/city). But `pam.py` reads the `location` key which cache_warming populates with a region string.

**Effect**: Even if location reaches pam.py, it's output as "- Location: Queensland" with no coordinates.

---

### RC-3: `cache_warming.py` stores region string as `'location'` (lines 364, 396)

```python
# cache_warming.py line 364 (also at line 396 - fallback path)
'location': profile.get('personal_details', {}).get('region') or profile.get('region'),
# Stores: 'location': 'Queensland'   -- just a region name, no lat/lng
```

For RV travelers, the profile region ("Queensland") is their home state, not their current location. They may be parked in Victoria right now. GPS must come from the browser per-request.

**Effect**: The only location in the cached context is a state/region name, never coordinates.

---

### RC-4: `chat()` never merges per-request location into the system prompt

```python
# pam.py - FUNDAMENTAL GAP
async def chat(self, message: str, context: Optional[Dict[str, Any]] = None, stream: bool = False):
    # context may contain user_location from the REST request
    # but chat() only stores context in conversation_history
    # self.system_prompt is built ONCE in PAM.__init__ from self.user_context
    # It is never rebuilt with per-request GPS data
```

Even if pam_main.py correctly maps `userLocation -> user_location` in the context dict and passes it to `chat()`, that location never enters the system prompt that Claude sees.

**Effect**: This is the fundamental architectural gap. All other fixes are pointless without this one.

---

### RC-5: `profiles` table has no `current_latitude`/`current_longitude` columns

`pamLocationContext.ts` line 39 queries these non-existent columns, always gets null. Less critical because profile coordinates are wrong source for RV users (they move constantly). Real-time GPS from browser is the correct source.

---

## Regression History (Pattern)

The same bug has been patched in at least 5 commits. The pattern: each patch fixed one code path, a new orchestrator or refactor added a 6th path that bypassed the patch, no end-to-end test caught the regression before shipping.

---

## Fix Plan (4 Slices)

### Slice 1: Fix `pam.py` - Inject per-request location into system prompt

**File**: `backend/app/services/pam/core/pam.py`

**Change 1a** - Add a helper method that merges location and rebuilds the prompt **only if location changed** (addresses audit issue #1 - avoids rebuilding 40 times per session):

```python
def _merge_request_location(self, context: dict) -> None:
    """
    Merge per-request GPS location from REST context into the system prompt.
    CRITICAL: This is the ONLY place where per-request location enters the system
    prompt. The system prompt is otherwise built once at __init__ from cached profile
    data which has no real-time GPS. Do not remove this merge.

    Only rebuilds system_prompt if location actually changed, to avoid unnecessary
    string concatenation on every message.
    """
    req_loc = context.get('user_location') or context.get('location')
    if not isinstance(req_loc, dict):
        return
    if not (req_loc.get('lat') or req_loc.get('city')):
        return
    # Only rebuild if location has changed (avoids rebuilding on every message)
    existing = self.user_context.get('user_location') or {}
    if (req_loc.get('lat') == existing.get('lat') and
            req_loc.get('lng') == existing.get('lng') and
            req_loc.get('city') == existing.get('city')):
        return
    self.user_context = {**self.user_context, 'user_location': req_loc}
    self.system_prompt = self._build_system_prompt()
```

**Change 1b** - Call at the top of `chat()`:

```python
async def chat(self, message: str, context=None, stream=False):
    if context:
        self._merge_request_location(context)
    # ... rest of existing chat() code unchanged
```

**Change 1c** - Fix `_build_user_context_section()` to read `user_location` dict properly (addresses RC-2). Replace lines 537-539:

```python
loc = self.user_context.get('user_location') or {}
if isinstance(loc, dict) and (loc.get('lat') or loc.get('city')):
    parts = []
    if loc.get('city'):
        parts.append(loc['city'])
    if loc.get('country'):
        parts.append(loc['country'])
    lat = loc.get('lat') or loc.get('latitude')
    lng = loc.get('lng') or loc.get('longitude')
    if lat and lng:
        parts.append(f"({lat:.4f}, {lng:.4f})")
    context_parts.append(f"- Location: {', '.join(parts)}")
elif self.user_context.get('location'):
    # Fallback: region string from cache (e.g., "Queensland")
    # This path is preserved so rollback of Slice 1 doesn't break existing behavior
    context_parts.append(f"- Location: {self.user_context['location']}")
```

**Rollback note**: The `elif` branch preserves the old behavior. If Slice 1 is reverted, PAM returns to "- Location: Queensland" output - bad but not worse than current.

---

### Slice 2: Fix `Pam.tsx` - Get real GPS for voice mode

**File**: `src/components/Pam.tsx`

**Discovery**: `getCurrentLocation` is destructured at line 96 but `useLocationTracking()` does NOT return it (confirmed: hook return is `{...state, startTracking, stopTracking, toggleTracking, updateDestination, checkPermission}`). The destructured value is silently `undefined`.

`startContinuousVoiceMode` is defined as `async` at line 627 - `await` is valid here.

**Latency concern** (audit issue #2): `getPamLocationContext` tries GPS before localStorage cache, adding up to 5 seconds if no GPS lock. For voice mode startup, this is noticeable. Use localStorage fast path first.

**Change** - Replace line 680 with a fast-path-first approach:

```typescript
// Import at top of file (if not already imported):
// import { getPamLocationContext } from '@/utils/pamLocationContext';

// Replace line 680:
// Before:
// const userLocation = settings?.location_preferences?.default_location || locationState.currentLocation;

// After - fast path: check localStorage cache first (written by useGeolocation hook)
let userLocation: typeof settings.location_preferences.default_location | null =
  settings?.location_preferences?.default_location || null;

if (!userLocation && user?.id) {
  // Try localStorage cache first (< 5 min old) to avoid GPS API latency on voice startup
  const cached = localStorage.getItem('lastKnownLocation');
  const parsedCache = cached ? JSON.parse(cached) : null;
  const isRecent = parsedCache && (Date.now() - parsedCache.timestamp < 300_000);
  if (isRecent && parsedCache.location) {
    userLocation = {
      latitude: parsedCache.location.lat,
      longitude: parsedCache.location.lng,
      city: parsedCache.location.city,
      state: parsedCache.location.state
    };
  } else {
    // Cache stale or missing - call GPS (up to 5 second wait)
    userLocation = await getPamLocationContext(user.id);
  }
}
```

**Also fix line 693**: `region: userLocation.state` uses `.state` which doesn't exist on `LocationContext` (it has `.region`). Change to `region: userLocation.region ?? userLocation.state`.

---

### Slice 3: Document intent in `cache_warming.py` (documentation-only slice)

**File**: `backend/app/services/pam/cache_warming.py`

**Audit clarification**: This slice is documentation/comment only - it does not change any behavior. `user_location: None` is equivalent to not having the key (`.get('user_location')` returns `None` in both cases). Include it for future developer clarity, not as a functional fix.

At lines 364 and 396 (two paths: cached and fallback), add `user_location: None` and a comment:

```python
# Before (line 364):
'location': profile.get('personal_details', {}).get('region') or profile.get('region'),

# After (line 364):
# Do NOT store GPS coordinates here. Profile 'region' is the user's home state,
# not their current location (they travel in an RV). Real-time GPS is injected
# per-request in pam.py chat() via _merge_request_location(). This prevents
# "Queensland" from appearing as current location when the user is parked in Victoria.
'location': profile.get('personal_details', {}).get('region') or profile.get('region'),
'user_location': None,  # Explicit null - real-time GPS comes from per-request context
```

Apply the same comment+key at line 396.

---

### Slice 4: Regression tests - unit + integration

**File**: `backend/tests/test_pam_location.py` (new)

The audit correctly identified that unit tests on `pam.py` alone don't catch the "6th code path bypasses the patch" regression pattern. This slice includes both unit tests (catch the logic) and an integration test (catches bypass scenarios).

```python
"""
Regression tests for PAM location awareness.
These tests catch the recurring bug where per-request GPS coordinates
do not reach PAM's system prompt.

Bug history: broke and was re-patched 5+ times (Aug 2025 - Feb 2026).
Do not remove these tests.
"""
import pytest
from unittest.mock import patch, MagicMock
from app.services.pam.core.pam import PAM


def make_pam(user_context=None):
    return PAM(user_id="test-user", user_language="en", user_context=user_context or {})


# --- Unit tests (pam.py logic) ---

def test_merge_request_location_updates_system_prompt():
    """RC-4: per-request GPS must reach the system prompt via _merge_request_location."""
    pam = make_pam()
    pam._merge_request_location({
        "user_location": {
            "lat": -33.8688, "lng": 151.2093,
            "city": "Sydney", "country": "Australia"
        }
    })
    # Test city name (meaningful), not coordinate string format (brittle)
    assert "Sydney" in pam.system_prompt
    assert "Australia" in pam.system_prompt

def test_merge_request_location_skips_rebuild_when_unchanged():
    """Performance: system prompt not rebuilt when location hasn't changed."""
    pam = make_pam()
    loc = {"lat": -33.8688, "lng": 151.2093, "city": "Sydney", "country": "Australia"}
    pam._merge_request_location({"user_location": loc})
    original_prompt = pam.system_prompt
    pam._merge_request_location({"user_location": loc})  # Same location
    assert pam.system_prompt is original_prompt  # Same object - not rebuilt

def test_location_section_reads_user_location_dict():
    """RC-2: _build_user_context_section must read 'user_location' dict, not 'location' string."""
    pam = make_pam({"user_location": {"lat": -27.47, "lng": 153.03, "city": "Brisbane", "country": "Australia"}})
    section = pam._build_user_context_section()
    assert "Brisbane" in section
    assert "Australia" in section

def test_location_fallback_to_region_string():
    """Backward compat: region string in 'location' key still works as fallback."""
    pam = make_pam({"location": "Queensland"})
    section = pam._build_user_context_section()
    assert "Queensland" in section

def test_no_crash_when_location_missing():
    """No location should not crash or produce garbage output."""
    pam = make_pam({})
    section = pam._build_user_context_section()
    assert "Location" not in section

def test_no_crash_when_user_location_is_none():
    """Explicit None from cache_warming (Slice 3) handled gracefully."""
    pam = make_pam({"user_location": None, "location": "Victoria"})
    section = pam._build_user_context_section()
    assert "Victoria" in section

def test_no_crash_when_user_location_is_empty_dict():
    """Empty dict (e.g., missing lat and city) falls through to region string."""
    pam = make_pam({"user_location": {}, "location": "New South Wales"})
    section = pam._build_user_context_section()
    assert "New South Wales" in section


# --- Integration test (catches 6th-code-path bypass) ---

@pytest.mark.asyncio
async def test_chat_merges_location_before_calling_claude():
    """
    Full path: chat() receives context with user_location, merges it,
    then calls Claude with a system prompt that includes GPS coordinates.
    This test catches the bypass pattern where a new code path skips _merge_request_location.
    """
    pam = make_pam()

    mock_response = MagicMock()
    mock_response.content = [MagicMock(type="text", text="The weather in Sydney is sunny.")]
    mock_response.stop_reason = "end_turn"
    mock_response.usage = MagicMock(
        input_tokens=100, output_tokens=50,
        cache_creation_input_tokens=0, cache_read_input_tokens=0
    )

    captured_system = []

    async def mock_create(**kwargs):
        captured_system.append(kwargs.get('system', []))
        return mock_response

    with patch.object(pam.client.messages, 'create', side_effect=mock_create):
        await pam.chat(
            message="What's the weather?",
            context={
                "user_location": {
                    "lat": -33.8688, "lng": 151.2093,
                    "city": "Sydney", "country": "Australia"
                }
            }
        )

    assert captured_system, "Claude was never called"
    system_text = str(captured_system[0])
    assert "Sydney" in system_text, (
        "Location 'Sydney' missing from system prompt passed to Claude. "
        "This means _merge_request_location() is not being called in chat(), "
        "or _build_user_context_section() is not reading 'user_location' dict correctly."
    )
```

---

## Verification Steps (Post-Implementation)

1. `npm run type-check` - TypeScript must pass
2. `cd backend && python -m pytest tests/test_pam_location.py -v` - all 8 tests pass
3. **Manual smoke test**:
   - Start dev server (`npm run dev`, backend at port 8000)
   - Open PAM, allow GPS when prompted
   - Ask "what's the weather here?" - PAM should name the correct city, not ask "where are you?"
4. **Log verification**:
   - Backend logs should show: `📍 REST API: User location received: {'lat': ..., 'lng': ..., 'city': '...'}`
   - System prompt preview log should include the city name

---

## Rollback Plan

If this fix introduces a new issue:
- Slice 1 `elif` branch preserves the old "- Location: Queensland" fallback - PAM still works, just without GPS
- Slice 2 reads from localStorage which may be empty on first load - voice mode falls back to no location (same as current broken state, not worse)
- Slice 3 is comment-only - trivially reversible
- Slice 4 is test-only - no production impact

---

## Out of Scope

- Adding `current_latitude`/`current_longitude` to `profiles` table - profile stores home region, wrong source for RV users
- Refactoring all 5 orchestrators to share a location handler - targeted fix is sufficient
- Changing `pamLocationContext.ts` profile query - it gracefully falls back to GPS anyway

---

## Files Changed

| File | Lines | What Changes |
|------|-------|------|
| `backend/app/services/pam/core/pam.py` | 537-539, chat() start | Add `_merge_request_location()` with change-detection, call in `chat()`, fix `_build_user_context_section()` |
| `src/components/Pam.tsx` | 680, 693 | Use localStorage fast path then `getPamLocationContext()`; fix `.state` -> `.region` |
| `backend/app/services/pam/cache_warming.py` | 364, 396 | Comment + `user_location: None` (documentation only, no behavior change) |
| `backend/tests/test_pam_location.py` | new | 7 unit tests + 1 integration test covering all failure modes and bypass pattern |
