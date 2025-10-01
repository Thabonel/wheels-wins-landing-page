# PAM Cleanup - Deletion Manifest

**Date:** October 1, 2025
**Backup:** backups/pre-simplification-20251001-101310/
**Purpose:** Remove broken hybrid system and duplicate implementations
**Justification:** Simplify to ONE working PAM implementation (Claude Sonnet 4.5 only)

---

## Files to DELETE

### Backend: PAM Hybrid System (18 files)

**Directory:** `backend/app/services/pam_hybrid/` (DELETE ENTIRE DIRECTORY)

```
backend/app/services/pam_hybrid/
├── __init__.py
├── core/
│   ├── __init__.py
│   ├── gateway.py                 # 2,747 lines of hybrid routing logic
│   ├── context_manager.py          # Context management
│   ├── classifier.py               # Rule-based complexity classifier
│   ├── config.py                   # ❌ BROKEN: Crashes on import (line 149)
│   ├── tool_registry.py            # Tool lazy loading system
│   ├── types.py                    # Type definitions
│   ├── circuit_breaker.py          # Circuit breaker pattern
│   ├── orchestrator.py             # Multi-agent orchestration
│   └── router.py                   # Agent routing logic
└── agents/
    ├── __init__.py
    ├── base_agent.py               # Base agent class
    ├── budget_agent.py             # Budget-specific agent
    ├── shop_agent.py               # Shop-specific agent
    ├── community_agent.py          # Community-specific agent
    ├── trip_agent.py               # Trip-specific agent
    └── dashboard_agent.py          # Dashboard-specific agent
```

**Reason:** Never tested end-to-end, config crashes on import, overcomplicated architecture

---

### Backend: Hybrid API Endpoint

**File:** `backend/app/api/v1/pam_hybrid.py`

```python
# Contains:
# - WebSocket endpoint at /api/v1/pam/hybrid/ws/{user_id}
# - REST endpoint at /api/v1/pam/hybrid/chat
# - ❌ BROKEN: JWT validation is TODO (lines 168-169)
```

**Reason:** Part of hybrid system, security holes (no JWT validation)

---

### Backend: Duplicate/Broken PAM API Files

**Files to DELETE:**
1. `backend/app/api/v1/pam_2.py` - Old version, duplicate
2. `backend/app/api/v1/pam_ai_sdk.py` - Unused AI SDK experiment
3. `backend/app/api/v1/pam_websocket_fix.py` - Temporary fix, superseded

**Files to KEEP:**
- `backend/app/api/v1/pam.py` - Current working API (needs review)

---

### Backend: Import References to Remove

**File:** `backend/app/main.py`

**Line to DELETE:**
```python
from app.api.v1 import pam_hybrid
```

**Line to DELETE:**
```python
app.include_router(pam_hybrid.router, prefix="/api/v1/pam/hybrid", tags=["PAM Hybrid"])
```

---

### Frontend: Hybrid Service Implementation

**File:** `src/services/pamHybridService.ts`

```typescript
// Contains:
// - HybridWebSocket class
// - Cost tracking for hybrid routing
// - Health check for hybrid system
```

**Reason:** Part of hybrid system being removed

---

### Frontend: Hybrid WebSocket Hook

**File:** `src/hooks/pam/usePamHybridWebSocket.ts`

**Reason:** Hook for hybrid WebSocket, no longer needed

---

### Frontend: Duplicate PAM Services (9 files)

**Files to REVIEW for deletion:**

1. ✅ **DELETE** `src/services/pamHybridService.ts` - Hybrid system
2. ✅ **DELETE** `src/services/pamAgenticService.ts` - Old agentic experiment
3. ✅ **DELETE** `src/services/pamApiOptimized.ts` - Duplicate optimization attempt
4. ❓ **REVIEW** `src/services/pamService.ts` - May be current service?
5. ❓ **KEEP** `src/services/pamCalendarService.ts` - Calendar-specific, might be useful
6. ❓ **REVIEW** `src/services/pamApiService.ts` - Check if used
7. ❓ **KEEP** `src/services/pamHealthCheck.ts` - Health monitoring
8. ❓ **KEEP** `src/services/pamSavingsService.ts` - Savings tracking (NEW feature)
9. ❓ **KEEP** `src/services/pamConnectionService.ts` - Connection management

**Action:** Investigate which services are actually being used before deleting

---

### Frontend: Hybrid Components

**Files to DELETE:**

1. `src/components/pam/HybridPAM.tsx` - Hybrid PAM component
2. `src/pages/PamHybridTest.tsx` - Hybrid testing page

**Reason:** Components built for hybrid system

---

### Frontend: Duplicate WebSocket Hooks

**Files Found:**
1. `src/hooks/pam/usePamHybridWebSocket.ts` - ✅ DELETE (hybrid system)
2. `src/hooks/pam/usePamWebSocketUnified.ts` - ❓ REVIEW (might be the "one good one")

**Action:** Check which WebSocket hooks exist and keep ONLY the best one

---

## Files to KEEP (Critical - Do NOT Delete!)

### Backend: Working Tools

**Directory:** `backend/app/services/pam/tools/` ✅ KEEP ALL

```
backend/app/services/pam/tools/
├── base_tool.py                    # ✅ Base class for all tools
├── create_calendar_event.py        # ✅ Working calendar tool
├── load_user_profile.py            # ✅ User profile tool
├── load_expenses.py                # ✅ Budget tools
├── analyze_budget.py
├── mapbox_tool.py                  # ✅ Trip planning tools
├── weather_tool.py
├── rv_park_search.py
├── ... (14 total tool files)
```

**Reason:** These tools work and will be used in simplified PAM

---

### Backend: Core PAM Structure

**Directory:** `backend/app/services/pam/` ✅ KEEP DIRECTORY

**Reason:** Foundation for new simplified PAM system

---

### Frontend: PAM Components (Selective Keep)

**To KEEP (after review):**
- Main PAM chat component (determine which is current)
- PAM settings/preferences
- PAM voice controls
- Non-hybrid PAM hooks

---

## Deletion Summary

### Total Files to Delete

**Backend:**
- 18 files in `pam_hybrid/` directory
- 1 file `pam_hybrid.py` API endpoint
- 3 duplicate PAM API files
- 2 import lines in `main.py`
- **Total: ~24 files + 2 lines**

**Frontend:**
- 1 file `pamHybridService.ts`
- 1 file `usePamHybridWebSocket.ts`
- 2 component files (HybridPAM.tsx, PamHybridTest.tsx)
- 2-3 duplicate service files (after review)
- **Total: ~7-8 files**

**Grand Total:** ~30-32 files deleted

**Estimated Lines Removed:** ~5,000-7,000 lines of code

---

## Pre-Deletion Checklist

Before executing deletion:

- [x] Full backup created (backups/pre-simplification-20251001-101310/)
- [x] Backup verified (24MB, includes backend/ and src/)
- [ ] Current git branch confirmed (staging)
- [ ] No uncommitted changes that need saving
- [ ] Team notified (solo founder - self-notification ✅)
- [ ] Deletion manifest reviewed and approved

---

## Deletion Commands (DO NOT RUN YET!)

**Step 1: Backend Cleanup**
```bash
# Delete hybrid system
rm -rf backend/app/services/pam_hybrid/

# Delete hybrid API endpoint
rm backend/app/api/v1/pam_hybrid.py

# Delete duplicate PAM APIs
rm backend/app/api/v1/pam_2.py
rm backend/app/api/v1/pam_ai_sdk.py
rm backend/app/api/v1/pam_websocket_fix.py

# Clean pycache
find backend -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
```

**Step 2: Backend Import Cleanup**
```bash
# Remove imports from main.py (manual edit required)
# - Remove: from app.api.v1 import pam_hybrid
# - Remove: app.include_router(pam_hybrid.router, ...)
```

**Step 3: Frontend Cleanup**
```bash
# Delete hybrid service and hook
rm src/services/pamHybridService.ts
rm src/hooks/pam/usePamHybridWebSocket.ts

# Delete hybrid components
rm src/components/pam/HybridPAM.tsx
rm src/pages/PamHybridTest.tsx

# Delete duplicate services (after confirming not used)
rm src/services/pamAgenticService.ts
rm src/services/pamApiOptimized.ts
```

**Step 4: Verify No Broken Imports**
```bash
# Check for broken imports
npm run type-check

# Check for TypeScript errors
cd backend && python -m py_compile app/main.py
```

---

## Post-Deletion Verification

After deletion, verify:

1. **Backend starts:** `cd backend && uvicorn app.main:app --reload`
2. **Frontend builds:** `npm run build`
3. **TypeScript clean:** `npm run type-check`
4. **No broken imports:** Check console for errors
5. **Git status clean:** `git status` shows only intended deletions

---

## Rollback Plan (If Something Goes Wrong)

**Option 1: Restore from backup**
```bash
cp -r backups/pre-simplification-20251001-101310/backend ./backend
cp -r backups/pre-simplification-20251001-101310/src ./src
```

**Option 2: Git revert (if committed)**
```bash
git log --oneline  # Find commit hash
git revert <commit-hash>
```

**Option 3: Selective restore**
```bash
# Restore just one file/directory
cp -r backups/pre-simplification-20251001-101310/backend/app/services/pam_hybrid ./backend/app/services/
```

---

## Approval Required Before Deletion

**Status:** ⏳ Awaiting user approval

**Approved By:** _____________________
**Date:** _____________________

**Once approved, proceed to execute deletion commands above.**

---

## Notes

**Why This Cleanup is Safe:**
1. ✅ Full backup exists (24MB, verified)
2. ✅ Deletion manifest documented
3. ✅ Rollback plan defined
4. ✅ Files to delete are isolated (hybrid system only)
5. ✅ Critical tools are preserved (backend/app/services/pam/tools/)

**Why This Cleanup is Necessary:**
1. Hybrid system never tested end-to-end
2. Config crashes on startup (fatal bug)
3. Over-engineered (2,747 lines for routing that doesn't work)
4. Multiple duplicate implementations causing confusion
5. Need clean foundation for simple, working PAM system

**Expected Outcome:**
- Codebase reduced from 117 PAM files → ~50 files
- Clear single source of truth for PAM logic
- Foundation ready for Day 2 implementation (Core PAM Brain)
