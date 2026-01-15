# Deprecated Voice Hooks

**Status:** DEPRECATED
**Scheduled Removal:** Q2 2026

## Why These Hooks Are Deprecated

These hooks were part of an earlier voice architecture. The production voice system uses the **PAMVoiceHybridService** which manages its own state internally.

## Deprecated Hooks

| File | Status | Notes |
|------|--------|-------|
| `useVoice.ts` | BROKEN | References undefined `settings` variable |
| `useVoiceErrorRecovery.ts` | UNUSED | Legacy error recovery pattern |
| `useBrowserSTT.ts` | REDUNDANT | `useVoiceInput` exists in `/hooks/voice/` |
| `useTTS.ts` | REDUNDANT | `useTextToSpeech` exists in `/hooks/voice/` |

## Active Voice Hooks (Use These Instead)

The following hooks in `src/hooks/voice/` are actively used:

- `useVoiceInput.ts` - Voice input functionality
- `useTextToSpeech.ts` - Text-to-speech functionality

## Migration Guide

```typescript
// OLD (deprecated)
import { useVoice } from '@/hooks/useVoice';
import { useVoiceErrorRecovery } from '@/hooks/useVoiceErrorRecovery';

// NEW (use these)
import { useVoiceInput } from '@/hooks/voice/useVoiceInput';
import { useTextToSpeech } from '@/hooks/voice/useTextToSpeech';

// Or for full hybrid voice service
import { pamVoiceHybridService } from '@/services/pamVoiceHybridService';
```

## Do Not Import

Do not import deprecated voice hooks in new code. They will be removed after the deprecation period.
