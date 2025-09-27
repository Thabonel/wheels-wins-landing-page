# ADR: PAM WebSocket Architecture - Single Implementation Strategy

**Date**: September 20, 2025
**Status**: ✅ **Accepted and Implemented**
**Decision Makers**: Technical Team
**Impact**: Critical Architecture Change

---

## Context and Problem

During the PAM backend/frontend analysis (September 2025), we discovered **4 different competing WebSocket implementations** that were causing:

- ❌ **Multiple connection conflicts**
- ❌ **Inconsistent error handling**
- ❌ **Maintenance nightmare**
- ❌ **Developer confusion**
- ❌ **Resource waste** from duplicate functionality

### Found Implementations (Before Cleanup):
1. **`pamService.ts`** - ✅ **ACTIVE** (used by main PAM component)
2. **`usePamWebSocketUnified.ts`** - ❌ Dev/test only
3. **`PamUIController.ts`** - ❌ Imported but unused
4. **`PAMConnectionManager.ts`** - ❌ Advanced but unused
5. **`usePamUIActions.ts`** - ❌ Unused hook chain
6. **`usePamMessageHandler.ts`** - ❌ Unused hook chain

## Decision

**We adopt a SINGLE PRIMARY WEBSOCKET IMPLEMENTATION strategy** for PAM:

### ✅ **Primary Implementation: `pamService.ts`**
- **Used by**: `Pam.tsx` (main production component)
- **Used by**: `usePamSuggestions.ts`
- **Features**: Connection management, status updates, message handling
- **Status**: **Production Ready & Actively Used**

### ❌ **Removed Implementations**:
- **`PamUIController.ts`** - DELETED (imported but never used)
- **`PAMConnectionManager.ts`** - DELETED (advanced but unused)
- **`usePamUIActions.ts`** - DELETED (unused hook)
- **`usePamMessageHandler.ts`** - DELETED (unused hook)

### 🧪 **Dev/Test Implementations Kept**:
- **`usePamWebSocketUnified.ts`** - **KEPT** for testing in `/dev/` directory only
- **`PamSimplified.tsx`** - **KEPT** for API testing pages only

## Implementation Guidelines

### 🚫 **STRICTLY FORBIDDEN**:

1. **Creating new WebSocket implementations** without explicit architectural review
2. **Duplicating connection logic** - always extend `pamService.ts`
3. **Multiple active connections** per user session
4. **Bypassing the primary service** for production features

### ✅ **REQUIRED for New WebSocket Features**:

1. **Extend `pamService.ts`** rather than creating new services
2. **Add feature flags** for experimental functionality
3. **Document in this ADR** any new WebSocket-related code
4. **Get architectural approval** for alternative implementations

### 🎯 **Primary Implementation Location**:
```
src/services/pamService.ts        # ✅ SINGLE SOURCE OF TRUTH
src/components/Pam.tsx           # ✅ Primary UI component
src/hooks/usePamSuggestions.ts   # ✅ Uses pamService.ts
```

### 🧪 **Test/Dev Implementations** (Limited Use):
```
src/dev/                         # ✅ Dev testing only
src/hooks/pam/usePamWebSocketUnified.ts  # ✅ Test infrastructure only
src/components/PamSimplified.tsx         # ✅ API testing only
```

## Architectural Benefits

### ✅ **Before → After Improvements**:
- **4 WebSocket implementations** → **1 primary + 1 test**
- **Competing connections** → **Single connection per user**
- **Inconsistent APIs** → **Unified service interface**
- **Maintenance burden** → **Clear ownership**
- **Developer confusion** → **Single source of truth**

### 🎯 **Performance Benefits**:
- **Reduced bundle size** from eliminated duplicates
- **Lower memory usage** from single connection
- **Consistent connection state** across components
- **Simplified debugging** and monitoring

## Implementation Details

### Current Architecture (Post-Cleanup):
```typescript
// ✅ PRODUCTION ARCHITECTURE
Layout.tsx
  └── Pam.tsx (mode="floating")
      └── pamService.ts
          └── WebSocket connection to backend
              └── Simple Gemini Service (with profile integration)

// 🧪 TEST ARCHITECTURE (Isolated)
/dev/ test pages
  └── usePamWebSocketUnified.ts
      └── Test WebSocket connections
```

### Connection Flow:
```
User Action → Pam.tsx → pamService.ts → Backend WebSocket → Simple Gemini Service → Response
```

### Error Handling:
- **Centralized** in `pamService.ts`
- **Consistent** error messages and recovery
- **Unified** retry logic and fallbacks

## Migration and Compliance

### ✅ **Completed Migrations**:
- Removed unused `PamUIController.ts` import from `Pam.tsx`
- Deleted `PAMConnectionManager.ts` (was unused advanced system)
- Deleted `usePamUIActions.ts` and `usePamMessageHandler.ts` hook chain
- Updated architectural documentation

### 🔒 **Compliance Requirements**:
1. **All production PAM features** MUST use `pamService.ts`
2. **No new WebSocket services** without architectural review
3. **Test implementations** must be clearly marked and isolated
4. **Documentation updates** required for any WebSocket changes

## Future Considerations

### 🚀 **Planned Enhancements** (Extend, Don't Replace):
- **Rate limiting** → Add to `pamService.ts`
- **Connection pooling** → Extend `pamService.ts`
- **Advanced error recovery** → Enhance `pamService.ts`
- **Admin monitoring** → Add events to `pamService.ts`

### 🚨 **Red Flags** (Require Architectural Review):
- New files with "WebSocket" in the name
- New hooks starting with "usePam...WebSocket"
- Alternative connection managers
- Bypass of `pamService.ts` for production features

## Success Metrics

### 📊 **Metrics to Track**:
- **Connection reliability**: Should improve with single implementation
- **Developer velocity**: Faster PAM feature development
- **Bundle size**: Reduction from removed duplicates
- **Bug reports**: Fewer WebSocket-related issues

### 🎯 **Target Outcomes**:
- **Zero duplicate WebSocket implementations** in production
- **Single connection per user** across all PAM features
- **Consistent error handling** and user experience
- **Clear development path** for new PAM features

---

## Summary

This ADR establishes **`pamService.ts` as the single source of truth** for all production PAM WebSocket functionality, while maintaining isolated test implementations for development. This decision eliminates technical debt, improves maintainability, and provides a clear path for future PAM development.

**Key Message**: "One PAM WebSocket Service to Rule Them All" 🔗

---

**Document Version**: 1.0
**Last Updated**: September 20, 2025
**Next Review**: October 20, 2025