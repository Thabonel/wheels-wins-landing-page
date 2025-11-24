# PAM Voice, Personalization, and Staging Fixes — Technical Summary (Nov 15, 2025)

## Overview
- Goal: Restore natural, reliable voice; ensure PAM personalizes from user profile via Redis and speaks the user’s language in voice mode; harden staging.
- Outcomes:
  - Fixed voice output clicks and improved smoothness (client).
  - Synced mic UI state across components (client; pending push for part of it).
  - Voice mode now honors user profile language via cached profile (server; pushed to staging).
  - Profile cache invalidates on updates to avoid stale personalization (server; pushed to staging).
  - Identified staging issues causing “AI service unavailable” and TTS failures; provided remediation plan.

## Changes Shipped to Staging

### 1) Voice Bridge Uses Profile Language (server)
- Problem: `pam_realtime_hybrid.py` called `get_pam(user_id)` without language, defaulting to English; voice mode could ignore profile language.
- Fix: Derive language from per‑message context or Redis cached profile, then call `get_pam(user_id, user_language=lang)`.
- Files:
  - backend/app/api/v1/pam_realtime_hybrid.py:279
- Behavior:
  - If frontend supplies `context.language`, use it; else pull from cached profile (`get_cached_user_context(user_id).language`); fallback to `"en"`.
- Commit: e9ca5265

### 2) Profile Cache Invalidation on Update (server)
- Problem: Redis profile/preferences could remain stale until TTL.
- Fix: After profile update/create/delete, invalidate Redis keys to force fresh warm on next use.
- Files:
  - backend/app/api/v1/profiles.py:1
- Behavior:
  - Invalidates `user_profile:{user_id}` and `user_preferences:{user_id}` (and `all` on delete) after changes.
- Commit: e9ca5265

## Client-Side Voice Improvements

### 3) Eliminate Clicks; Smooth Streaming TTS (client; already pushed earlier)
- Problems: Audible clicks at chunk boundaries, pops on interrupt, subtle rate mismatches.
- Fixes:
  - Add 200 ms jitter buffer; 10 ms cross‑fades at chunk joins.
  - Fade‑out on interrupt to avoid pops.
  - Resample mic to 24 kHz PCM16 for OpenAI Realtime; capture at 48 kHz.
  - Single AudioContext for playback; silent gain chain to avoid loopback.
  - Default voice `"marin"`, `temperature: 0.65` passed to session.
- Files:
  - src/services/pamVoiceHybridService.ts:1
- Commit: 41bcc1ed

### 4) Mic UI State Sync (client; implemented locally, pending push)
- Problems: Mic button remains visually “on” after stopping voice; small search‑bar mic remains active.
- Fixes:
  - Dispatch global `pam-voice:stop-all` event on stop.
  - VoiceToggle and MobileVoiceToggle listen and abort recognition; useVoiceInput also listens.
  - Hard reset status on stop in hybrid component.
- Files (local):
  - src/components/pam/PAMVoiceHybrid.tsx:1
  - src/components/pam/voice/VoiceToggle.tsx:1
  - src/components/pam/voice/MobileVoiceToggle.tsx:1
  - src/hooks/voice/useVoiceInput.ts:1
- Status: Type‑check OK; not pushed by request (verify locally first).

## Investigations and Findings

### A) Mapbox Token Error (frontend)
- Symptoms: “Mapbox token not configured…” on Wheels page.
- Findings:
  - Token resolution order: `VITE_MAPBOX_PUBLIC_TOKEN_MAIN` → `VITE_MAPBOX_PUBLIC_TOKEN` → `VITE_MAPBOX_TOKEN` (see src/utils/mapboxConfig.ts:1).
  - Ensure a `pk.*` token is present in `.env.local` and Vite is restarted; verify via MapboxDebug component and console logs.
- Action: Documented steps; no code changes needed.

### B) Personalized Profile Context & Language (server)
- Baseline: `get_pam(user_id, user_language)` pulls cached user context via Redis; lazy-warms or DB fallback on miss (backend/app/services/pam/core/pam.py:1466; backend/app/services/pam/cache_warming.py:1).
- Gap: Voice hybrid bridge did not pass language; frontend did not send live `context` (optional).
- Fix: Voice bridge language pass‑through (see Shipped to Staging #1). Frontend per‑turn context remains optional; cached profile ensures baseline personalization.

### C) Staging Errors Observed
- Text chat 500 NameError:
  - Log: `NameError: name 'use_case' is not defined` in `/api/v1/pam/chat` (pam_main).
  - Root: Variable referenced in some branches without initialization.
  - Remediation: Initialize `use_case = None` near the start of chat_endpoint; or refactor guard conditions.
- TTS failures in voice fallback chain:
  - Edge TTS 403 (readaloud WS token): Use alternative voice or refresh configuration; consider disabling Edge tier if not needed in staging.
  - Supabase TTS 406 “Insufficient credits”: Top up credits or disable this tier for staging.
  - Enhanced TTS returns `TTSEngine("text_fallback")` which is not a valid enum, causing additional error noise; recovery path should map to `TTSEngine.DISABLED` when returning text.

## Operational Guidance

### Redis / Personalization
- Ensure Redis is active and reachable (REDIS_URL set). On login, expect:
  - “✅ Cache warmed for user …” and keys:
    - `user_profile:{user_id}`, `user_preferences:{user_id}`, `user_context:{user_id}`, `user_conversations:{user_id}`
- On profile change:
  - Cache invalidation triggers; next call re-warms fresh data.

### Voice Pipeline
- OpenAI Realtime session configuration uses input/output pcm16, model voice defaults; resampling on client ensures clean input.
- Mic stop now emits global “stop all” so embedded mics (search bar, etc.) visually and functionally stop.

## Next Actions
- Server (recommended)
  - Initialize `use_case = None` in backend/app/api/v1/pam_main.py:2351 chat endpoint to fix NameError.
  - TTS recovery: Map text fallback to `TTSEngine.DISABLED` in enhanced_tts_service to avoid invalid enum errors; decide whether to disable Edge/Supabase tiers on staging.
  - Tool Registry: Staging shows only 4 tools registered; audit orchestrator/registry init to load full toolset.

- Client (optional, after local verification)
  - Push mic UI sync changes once you confirm behavior locally.

## Verifications Performed
- Type-check (frontend): `npm run type-check` — OK.
- Staging push: voice language + cache invalidation (commit e9ca5265) — OK.
- Logs: Confirmed hybrid voice service now reads language via cache/context; observed staging TTS and chat errors for separate remediation.

## Commits
- 41bcc1ed — fix(voice): eliminate clicks via jitter buffer + crossfades; resample mic; fade‑out; nicer defaults.
- e9ca5265 — fix(voice): use profile language in hybrid bridge via cached context; fix(cache): invalidate profile/prefs on updates.

## File References
- src/services/pamVoiceHybridService.ts:1
- src/components/pam/PAMVoiceHybrid.tsx:1
- src/components/pam/voice/VoiceToggle.tsx:1
- src/components/pam/voice/MobileVoiceToggle.tsx:1
- src/hooks/voice/useVoiceInput.ts:1
- backend/app/api/v1/pam_realtime_hybrid.py:279
- backend/app/api/v1/profiles.py:1
- backend/app/services/pam/core/pam.py:1466
- backend/app/services/pam/cache_warming.py:1
- src/utils/mapboxConfig.ts:1

---
If you want, I can implement the chat NameError guard, adjust the TTS fallback enum handling, and expand the Tool Registry initialization next, then push to staging.
