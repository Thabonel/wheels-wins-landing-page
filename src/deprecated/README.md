# Deprecated Code

This directory contains deprecated code scheduled for removal in **Q2 2026**.

## Why This Code Is Deprecated

The voice system underwent a major architectural change. The original multi-provider architecture was replaced with **PAMVoiceHybridService** (OpenAI Realtime + Claude).

## Do NOT Import From This Directory

All files in this directory are deprecated and should not be used in new code.

## Production Voice System

Use these instead:

| Need | Use |
|------|-----|
| Voice hybrid service | `@/services/pamVoiceHybridService` |
| Text-to-speech | `@/hooks/voice/useTextToSpeech` |
| Voice input | `@/hooks/voice/useVoiceInput` |
| Voice state | `@/stores/useVoiceStore` |
| Wake word | `@/services/wakeWordService` |

## Directory Structure

```
deprecated/
├── services/
│   ├── VoiceOrchestrator.ts     # Legacy orchestrator
│   ├── pamVoiceService.ts       # Legacy voice service
│   ├── voiceActivityDetection.ts # VAD (still imported by Pam.tsx for UI)
│   └── voice/
│       ├── ConversationManager.ts
│       ├── STTService.ts
│       ├── VADService.ts
│       └── WebRTCConnectionService.ts
├── hooks/
│   ├── useVoice.ts              # Broken - undefined references
│   └── useVoiceErrorRecovery.ts
├── components/
│   └── voice/
│       ├── PamVoice.tsx
│       └── VoiceStatusMonitor.tsx
└── context/
    └── VoiceContext.tsx
```

## Migration Guide

See `VOICE_RATIONALIZATION_PLAN.md` in the project root.
