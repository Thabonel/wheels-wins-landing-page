# PAM Model Usage Reference

Last Updated: 2025-11-15

Purpose: Clear mapping of which AI models are used for typing chat, voice input (STT), and voice output (TTS), based on current code.

---

## Summary

- Conversation brain (typing and voice): Anthropic Claude (Sonnet)
  - Default: `claude-sonnet-4-5-20250929`
  - Hot‑swapped via env; has fallbacks (Haiku, Gemini, GPT‑4o)
- Voice input/output (Hybrid mode): OpenAI Realtime for STT + TTS
  - Model: `gpt-4o-realtime-preview`
  - Audio: PCM16, 24 kHz
- Legacy/Non‑hybrid STT: OpenAI Whisper `whisper-1` (fallback to Browser Web Speech)
- Legacy/Non‑hybrid TTS: Enhanced TTS service with 4‑tier fallback (Edge → Coqui → System → Supabase)

---

## Typing Chat (Text ↔ AI)

- Primary brain: Claude Sonnet.
  - Gets PAM (Claude) and generates response:
    - backend/app/api/v1/pam_main.py:1462
    - backend/app/api/v1/pam_main.py:1467
  - Response metadata labels model:
    - backend/app/api/v1/pam_main.py:1476

- Model configuration (hot‑swappable, with fallbacks):
  - backend/app/config/model_config.py:1
  - backend/app/config/model_config.py:112

- PAM core uses AsyncAnthropic and pulls model from config:
  - backend/app/services/pam/core/pam.py:58
  - backend/app/services/pam/core/pam.py:94

---

## Voice (Hybrid Mode: Realtime + Claude)

Architecture: OpenAI Realtime handles voice I/O; Claude handles reasoning.

- Session creation (OpenAI Realtime):
  - Model: `gpt-4o-realtime-preview`
  - Modalities: text, audio; PCM16 in/out
  - backend/app/api/v1/pam_realtime_hybrid.py:104, :106, :115, :196

- Frontend hybrid service (mic streaming, resampling, WS):
  - src/services/pamVoiceHybridService.ts:24 (resampler), :158 (service), :290 (Realtime WS setup), :465 (send assistant text for TTS)

- Bridge to Claude (reasoning):
  - Receives transcripts, calls PAM (Claude), returns text
  - backend/app/api/v1/pam_realtime_hybrid.py:278

- Result flow:
  1. User speaks → OpenAI Realtime transcribes
  2. Transcript → backend bridge → PAM (Claude)
  3. Claude text → sent back → OpenAI Realtime speaks

---

## Voice (Non‑Hybrid / Legacy Paths)

### Speech‑to‑Text (STT)

- STT Manager invoked when backend receives audio (non‑hybrid):
  - backend/app/api/v1/pam_main.py:980

- Whisper engine (cloud):
  - Model: `whisper-1`
  - backend/app/services/stt/multi_engine_stt.py:134

- Browser Web Speech API (UI/auxiliary):
  - Hook: src/hooks/voice/useVoiceInput.ts:39
  - Toggle UI: src/components/pam/voice/VoiceToggle.tsx:1

### Text‑to‑Speech (TTS)

- Public TTS endpoint (non‑hybrid):
  - backend/app/api/v1/pam_main.py:3412, :3495

- Enhanced TTS service (4‑tier fallback):
  - Order: Edge → Coqui → System → Supabase
  - backend/app/services/tts/enhanced_tts_service.py:716, :741, :753, :769, :780, :787, :792

---

## Configuration Notes

- Primary Claude model and fallbacks are controlled by env:
  - `PAM_PRIMARY_MODEL`, `PAM_FALLBACK_MODEL_1..3`
  - backend/app/config/model_config.py:24

- Hybrid voice defaults:
  - Realtime model: `gpt-4o-realtime-preview`
  - Voice: set on session creation; client default configured in service

---

## Quick Truth Table

- Typing chat brain → Claude Sonnet
- Voice hybrid STT/TTS → OpenAI Realtime
- Non‑hybrid STT → Whisper `whisper-1` (with browser fallback)
- Non‑hybrid TTS → Edge → Coqui → System → Supabase

---

## Verification Pointers

- Brain callsite (typing): backend/app/api/v1/pam_main.py:1462–1477
- Realtime session/bridge: backend/app/api/v1/pam_realtime_hybrid.py:104–196, :278–333
- Frontend hybrid service: src/services/pamVoiceHybridService.ts:158–520
- Whisper engine: backend/app/services/stt/multi_engine_stt.py:134
- Enhanced TTS chain: backend/app/services/tts/enhanced_tts_service.py:716–801

---

Notes: The current typing failure reported in staging is due to a variable initialization bug (NameError on `use_case`) in the chat handler, not a model mismatch.

