# Deprecated Voice Components

**Status:** DEPRECATED
**Scheduled Removal:** Q2 2026

## Why These Components Are Deprecated

These components were part of an earlier voice architecture that used a multi-provider system with complex state management. The production voice system now uses a simpler hybrid approach with **PAMVoiceHybrid**.

## Production Voice Components

For voice functionality, use:

- **Main voice component:** `src/components/pam/PAMVoiceHybrid.tsx`
- **Voice toggle:** `src/components/pam/voice/VoiceToggle.tsx`
- **Voice settings:** `src/components/pam/voice/VoiceSettings.tsx`

## Files in This Directory

| File | Status | Notes |
|------|--------|-------|
| `PamVoice.tsx` | DEPRECATED | Uses broken `useVoice` hook, not functional |
| `VoiceStatusMonitor.tsx` | DEPRECATED | Used only by PamVoice.tsx |
| `AudioPlayer.tsx` | CHECK | May be legacy, verify usage |
| `VoiceInterface.tsx` | DEPRECATED | Old pattern |
| `VoiceErrorBoundary.tsx` | CHECK | May still be useful |
| `VoicePlaybackControls.tsx` | CHECK | May be legacy |
| `VoiceRecordButton.tsx` | DEPRECATED | VoiceToggle exists |
| `VoiceStatusIndicator.tsx` | CHECK | May be legacy |
| `TextToSpeechDemo.tsx` | DEMO | Can keep for testing |

## Migration Guide

```typescript
// OLD (deprecated)
import { PamVoice } from '@/components/voice/PamVoice';
import { useVoice } from '@/hooks/useVoice';

// NEW (use this)
import { PAMVoiceHybrid } from '@/components/pam/PAMVoiceHybrid';
import { pamVoiceHybridService } from '@/services/pamVoiceHybridService';
```

## Do Not Use

Do not use these components in new code. They will be removed after the deprecation period.
