# Voice System Rationalization Plan

**Created:** January 2026
**Status:** Planning
**Goal:** Simplify voice architecture while preserving the working PAMVoiceHybridService system

---

## Executive Summary

The Wheels & Wins codebase has accumulated **32+ voice-related files** across multiple architectural attempts. Only **ONE system is actively used in production**: the **PAMVoiceHybridService** (OpenAI Realtime + Claude).

This plan preserves the working system and safely deprecates legacy code.

---

## Current Architecture (What's Working)

### Active Voice System: PAMVoiceHybridService

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER SPEAKS                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              OpenAI Realtime WebSocket                           │
│         (Speech Recognition + Text-to-Speech)                    │
│                                                                  │
│  - Handles microphone input                                      │
│  - Transcribes speech to text                                    │
│  - Speaks responses back to user                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                    Transcribed Text
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Claude Bridge WebSocket                             │
│                  (Backend)                                       │
│                                                                  │
│  Endpoint: /api/v1/pam/voice-hybrid/bridge/{user_id}            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Claude Sonnet 4.5                                   │
│         (Reasoning + Tool Execution)                             │
│                                                                  │
│  - All 45 tools available (calendar, budget, trips, etc.)       │
│  - Context-aware responses                                       │
│  - UI actions (reload-calendar, etc.)                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                    Response Text
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              OpenAI Realtime TTS                                 │
│                                                                  │
│  - Speaks Claude's response to user                             │
│  - Natural voice (Marin)                                        │
└─────────────────────────────────────────────────────────────────┘
```

### Files That Power This System (DO NOT REMOVE)

| File | Purpose |
|------|---------|
| `src/services/pamVoiceHybridService.ts` | Core hybrid service |
| `src/components/pam/PAMVoiceHybrid.tsx` | Voice UI component |
| `backend/app/api/v1/pam_realtime_hybrid.py` | Backend WebSocket bridge |

---

## File Categorization

### KEEP - Critical (Active Voice System)

| File | Reason |
|------|--------|
| `src/services/pamVoiceHybridService.ts` | THE working voice service |
| `src/components/pam/PAMVoiceHybrid.tsx` | Voice UI for hybrid system |
| `src/pages/PAMVoiceHybridTest.tsx` | Test page for hybrid system |

### KEEP - Used by Other Features

| File | Used By |
|------|---------|
| `src/hooks/voice/useVoiceInput.ts` | VoiceToggle, accessibility |
| `src/hooks/voice/useTextToSpeech.ts` | SimplePAM, accessibility |
| `src/services/tts/BrowserTTSProvider.ts` | Fallback TTS, accessibility |
| `src/services/tts/NariLabsProvider.ts` | Alternative TTS provider |
| `src/services/ttsCacheService.ts` | TTS performance optimization |
| `src/stores/useVoiceStore.ts` | State management (may be used) |
| `src/utils/ttsQueueManager.ts` | TTS queue (used in Pam.tsx) |
| `src/components/pam/voice/VoiceToggle.tsx` | UI component |
| `src/components/pam/voice/VoiceSettings.tsx` | Settings UI |
| `src/components/pam/voice/MobileVoiceToggle.tsx` | Mobile UI |
| `src/components/pam/voice/ExpenseVoiceCommands.tsx` | Expense voice |
| `src/components/wins/expenses/VoiceExpenseLogger.tsx` | Expense logging |
| `src/lib/voiceService.ts` | Utility (check usage) |

### DEPRECATE - Legacy Voice Orchestrator Pattern

These files were part of an earlier attempt to build a multi-provider voice system. They are NOT used by the production PAMVoiceHybridService.

| File | Status | Notes |
|------|--------|-------|
| `src/services/VoiceOrchestrator.ts` | UNUSED | Never imported in production |
| `src/services/pamVoiceService.ts` | SUPERSEDED | Replaced by pamVoiceHybridService |
| `src/services/pamVoiceTools.ts` | UNUSED | No imports found |
| `src/services/voiceActivityDetection.ts` | UNUSED | OpenAI handles VAD |
| `src/services/voice/ConversationManager.ts` | UNUSED | Legacy state machine |
| `src/services/voice/STTService.ts` | UNUSED | OpenAI handles STT |
| `src/services/voice/VADService.ts` | UNUSED | OpenAI handles VAD |
| `src/services/voice/WebRTCConnectionService.ts` | UNUSED | Legacy WebRTC |
| `src/hooks/useVoice.ts` | BROKEN | References undefined `settings` |
| `src/hooks/useVoiceErrorRecovery.ts` | UNUSED | Legacy pattern |
| `src/hooks/useBrowserSTT.ts` | REDUNDANT | useVoiceInput exists |
| `src/hooks/useTTS.ts` | REDUNDANT | useTextToSpeech exists |
| `src/context/VoiceContext.tsx` | UNUSED | No imports found |
| `src/components/voice/PamVoice.tsx` | LEGACY | Uses broken useVoice hook |
| `src/components/voice/VoiceStatusMonitor.tsx` | LEGACY | Used by PamVoice |
| `src/components/voice/AudioPlayer.tsx` | CHECK | May be legacy |
| `src/components/voice/VoiceInterface.tsx` | LEGACY | Old pattern |
| `src/components/voice/VoiceErrorBoundary.tsx` | CHECK | May be used |
| `src/components/voice/VoicePlaybackControls.tsx` | CHECK | May be legacy |
| `src/components/voice/VoiceRecordButton.tsx` | LEGACY | VoiceToggle exists |
| `src/components/voice/VoiceStatusIndicator.tsx` | CHECK | May be legacy |
| `src/components/voice/TextToSpeechDemo.tsx` | DEMO | Can keep for testing |
| `src/pages/PamVoiceTest.tsx` | LEGACY | Use PAMVoiceHybridTest instead |
| `src/experiments/ai-sdk-poc/hooks/useVoiceAiSdk.ts` | EXPERIMENTAL | POC code |

### KEEP - Test Files

All test files should be kept if their corresponding source file is kept.

---

## Rationalization Phases

### Phase 1: Documentation & Marking (Safe - No Code Removal)

1. Add `@deprecated` JSDoc comments to legacy files
2. Create `DEPRECATED.md` in legacy directories
3. Update imports to show preferred alternatives

**Example deprecation comment:**
```typescript
/**
 * @deprecated Use PAMVoiceHybridService instead.
 * This service was part of the legacy multi-provider voice system.
 * Scheduled for removal in Q2 2026.
 */
```

### Phase 2: Redirect Imports (Low Risk)

1. Update any remaining imports of legacy files to use active alternatives
2. Ensure no production code paths use deprecated files
3. Run full test suite to verify

### Phase 3: Move to Deprecated Folder (Medium Risk)

1. Create `/src/deprecated/` directory structure
2. Move legacy files (preserving git history with `git mv`)
3. Update any test imports
4. Verify application still works

**Structure:**
```
src/deprecated/
├── services/
│   ├── VoiceOrchestrator.ts
│   ├── pamVoiceService.ts
│   └── voice/
│       ├── ConversationManager.ts
│       ├── STTService.ts
│       └── ...
├── hooks/
│   ├── useVoice.ts
│   └── useVoiceErrorRecovery.ts
├── context/
│   └── VoiceContext.tsx
└── components/
    └── voice/
        ├── PamVoice.tsx
        └── ...
```

### Phase 4: Removal (After Verification Period)

After 1-2 sprint cycles with no issues:
1. Delete deprecated folder
2. Remove unused test files
3. Clean up any lingering references

---

## Risk Mitigation

### Before Any Changes

1. **Create a backup branch:** `git checkout -b voice-backup-jan-2026`
2. **Document current behavior:** Record a screen capture of voice working
3. **Identify rollback plan:** Know how to revert each change

### Verification Steps

After each phase:
1. Test voice in main Pam.tsx component
2. Test voice in PAMVoiceHybridTest page
3. Verify calendar booking works via voice
4. Verify expense logging works via voice
5. Check mobile voice toggle still works

### Rollback

If issues arise:
```bash
git checkout voice-backup-jan-2026 -- src/services/VoiceOrchestrator.ts
# Or revert entire change
git revert HEAD
```

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Jan 2026 | Keep PAMVoiceHybridService | Only working voice system |
| Jan 2026 | Deprecate VoiceOrchestrator | Never successfully integrated |
| Jan 2026 | Keep useVoiceInput | Used for accessibility |
| Jan 2026 | Keep TTS providers | Fallback and accessibility |

---

## Success Metrics

After rationalization:
- [ ] Voice files reduced from 32+ to ~15
- [ ] No "double voice" bugs
- [ ] Voice response time unchanged
- [ ] All voice features still work
- [ ] Codebase easier to understand

---

## Questions Before Proceeding

1. Are there any other teams/developers working on voice features?
2. Is there a plan to switch away from OpenAI Realtime in the future?
3. Are there cost concerns with OpenAI Realtime that might require fallback?
4. Should we keep NariLabs TTS as a backup option?

---

## Appendix: File Count Summary

| Category | Count |
|----------|-------|
| Critical (Keep) | 3 |
| Used Elsewhere (Keep) | 13 |
| Legacy (Deprecate) | 24 |
| Tests (Keep with source) | 8 |
| **Total** | 48 |
