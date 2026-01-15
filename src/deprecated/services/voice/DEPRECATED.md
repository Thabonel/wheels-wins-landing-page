# Deprecated Voice Services

**Status:** DEPRECATED
**Scheduled Removal:** Q2 2026

## Why These Files Are Deprecated

These services were part of an earlier attempt to build a multi-provider voice system with WebRTC, VAD (Voice Activity Detection), and separate STT (Speech-to-Text) components. This architecture was superseded by the simpler and more effective **PAMVoiceHybridService**.

## Production Voice System

The production voice system uses:

- **Frontend:** `src/services/pamVoiceHybridService.ts`
- **Component:** `src/components/pam/PAMVoiceHybrid.tsx`
- **Backend:** `backend/app/api/v1/pam_realtime_hybrid.py`

This system uses OpenAI Realtime for voice I/O (speech recognition + text-to-speech) and routes the transcribed text to Claude for reasoning and tool execution.

## Files in This Directory

| File | Status | Notes |
|------|--------|-------|
| `ConversationManager.ts` | UNUSED | Legacy state machine, not imported anywhere |
| `STTService.ts` | UNUSED | OpenAI Realtime handles STT |
| `VADService.ts` | UNUSED | OpenAI Realtime handles VAD |
| `WebRTCConnectionService.ts` | UNUSED | Legacy WebRTC approach |

## Migration Guide

If you need voice functionality, use:

```typescript
// For voice hybrid service
import { pamVoiceHybridService } from '@/services/pamVoiceHybridService';

// For voice UI component
import { PAMVoiceHybrid } from '@/components/pam/PAMVoiceHybrid';
```

## Do Not Import

Do not import any files from this directory in new code. These files will be removed after the deprecation period.
