# PRD — Pam V2 Realtime Voice Replacement

## 1) Context & Goals

The current voice implementation maintains two WebSockets, a Claude bridge, custom audio processing, and duplicated reasoning state. This PRD replaces it on staging with browser WebRTC, short-lived credentials, server-side tool control, and the same V2 state/policy used by text.

This is for frontend audio, backend realtime, and security engineers or coding agents.

Why now: text V2 must be stable before adding the higher-complexity voice channel.

**Execution budget:** one or more fresh contexts. Separate backend session creation/sideband work from browser audio/UI work, with a passing commit between them.

### In-scope goals

- Authenticated backend endpoint for short-lived realtime session credentials.
- Browser WebRTC audio and data-channel transport.
- Server-side control/sideband connection for tools, policy, approvals, and state.
- Reuse V2 event/action contracts where possible.
- Interruption, reconnect, mute, permission, and cleanup behavior.
- Remove V2 dependence on the old Claude bridge and custom dual-WebSocket path.

### Out-of-scope / Non-goals

- No wake-word/background always-listening mode initially.
- No browser provider API key.
- No second model that reinterprets another model's completed response.
- No automatic high-risk voice confirmation; sensitive writes require visible/tactile UI approval.
- No deletion of V1 voice until PRD 08.

## 2) Current State (Repo-informed)

- `src/services/pamVoiceHybridService.ts` manages OpenAI and Claude WebSockets, PCM conversion/resampling, playback, and reconnect behavior.
- `backend/app/api/v1/pam_realtime_hybrid.py` creates realtime sessions and exposes a bridge; authentication and implementation/documentation have diverged.
- V1 schema allowed types and voice handler branches disagree.
- PRDs 01-06 provide V2 contracts, runtime, state, tools, approvals, and frontend shell.

Likely V2 modules:

- `backend/app/api/v2/pam_realtime.py`
- `backend/app/services/pam_v2/realtime/`
- `src/features/pam-v2/transports/PamVoiceTransport.ts`
- `src/features/pam-v2/usePamVoice.ts`
- Focused mute/connect/status controls in V2 shell.

**ASSUMPTION:** The selected realtime provider supports browser WebRTC, ephemeral credentials, tool/function calls, and a server-side control connection. Confirm current official API details at implementation time and encapsulate provider event formats in one adapter. Configure the realtime model by environment; do not hardcode it.

## 3) User Stories (Few, sharp)

- As a user, I want to speak naturally and interrupt Pam without waiting for a long response to finish.
- As a user, I want microphone state and connection state to be obvious and controllable.
- As a user, I want voice and text to share the same conversation and capabilities.
- As a user, I want sensitive actions to appear visibly for approval rather than being executed from an ambiguous spoken “yes.”
- As an operator, I want voice failures attributable across browser, provider, sideband, tools, and state.

## 4) Success Criteria (Verifiable)

- [ ] Browser receives only a short-lived credential scoped to one authenticated session.
- [ ] Backend derives user identity from validated auth; path/body user IDs cannot impersonate another user.
- [ ] No long-lived provider key appears in browser code, network responses, or logs.
- [ ] Browser uses WebRTC for media; raw WebSocket is not used for browser audio transport.
- [ ] Tool calls run server-side through the V2 catalog, policy, approval, and state services.
- [ ] Voice and text can resume the same `conversation_id` without duplicate turns.
- [ ] Mute, unmute, disconnect, reconnect, denied permission, device loss, and tab close clean up resources.
- [ ] User interruption stops audio promptly and does not execute abandoned pending tool calls.
- [ ] High-risk/write actions produce a visible approval card; spoken generic confirmation is insufficient.
- [ ] Reconnect does not replay a mutation or duplicate a completed turn.
- [ ] Unsupported browser/device receives a clear text fallback.
- [ ] Audio is not stored by default; any transcript retention follows conversation policy.
- [ ] Old hybrid/bridge code is not imported by V2.

## 5) Test Plan (Design BEFORE build)

### Backend tests

- Auth required; token user mismatch denied.
- Ephemeral credential response redacts provider secrets and expires quickly.
- Session bound to conversation/user/channel.
- Sideband tool call uses canonical executor and approval policy.
- Provider disconnect, timeout, malformed event, and duplicate tool call.

### Frontend unit tests

- Voice state machine: idle, requesting permission, connecting, listening, speaking, interrupted, reconnecting, failed, closed.
- Peer/data channel event parsing.
- Track/peer/context cleanup.
- Permission denial, unsupported browser, device change, and visibility change.
- No approval token or long-lived key logged.

### E2E/manual device matrix

- Chromium desktop and mobile emulation with fake media.
- At least one real supported mobile browser and one desktop browser.
- Start voice, speak/read synthetic phrase, receive response, interrupt, resume.
- Tool-backed read and visible write approval.
- Network transition/reconnect and tab background/foreground.

Default automation uses fake media and mocked provider signaling. Real-provider voice tests are staging-only and cost-capped.

## 6) Implementation Plan (Small slices)

1. **Define realtime provider adapter and session contract.**
   - Tests first for credential/session/event normalization and secret redaction.
   - Keep provider event types out of domain/runtime modules.
   - Commit: `feat(pam-v2): define realtime session adapter`.
2. **Implement authenticated ephemeral session endpoint.**
   - Tests first for auth, identity binding, expiry, rate limiting, and safe upstream errors.
   - Do not accept trusted user identity from request payload.
   - Commit: `feat(pam-v2): issue scoped realtime sessions`.
3. **Implement server-side control connection.**
   - Tests first for tool calls, approval events, state persistence, cancellation, and duplicate calls.
   - Reuse V2 catalog/executor/repository; do not call V1 core.
   - Commit: `feat(pam-v2): connect realtime tools to v2 runtime`.
4. **Implement browser WebRTC transport.**
   - Tests first for state transitions, signaling, data events, cleanup, and failures.
   - Use native browser media/WebRTC APIs; avoid custom PCM/resampling unless a proven browser requirement remains.
   - Commit: `feat(pam-v2): add webrtc voice transport`.
5. **Integrate V2 voice controls and approvals.**
   - Component tests first for microphone, mute, status, interruption, errors, keyboard, and visible approvals.
   - Keep dimensions stable to prevent layout shift.
   - Commit: `feat(pam-v2): integrate realtime voice ui`.
6. **Add reconnect and interruption safeguards.**
   - Tests first for abandoned speech, pending tool call, duplicate events, and network recovery.
   - Do not replay write intent automatically.
   - Commit: `fix(pam-v2): harden voice interruption and reconnect`.
7. **Run automated and real-device staging verification.**
   - Add regressions before fixes.
   - Record browser/version/device, latency, interruptions, reconnects, and failures.
   - Commit: `test(pam-v2): verify realtime voice journeys`.

## 7) Git Workflow Rules (Enforced)

- Backend and frontend voice slices should be separate commits.
- Tests precede implementation.
- After each slice run targeted voice tests and all text approval/policy regressions.
- After slices 3 and 7 run full Pam V2 backend/frontend suites and staging build.
- Do not modify/delete V1 voice files except the smallest V2 routing flag.
- Stop if official provider behavior differs from assumptions; document and adjust the adapter contract first.

## 8) Commands (Repo-specific)

```bash
cd backend && python -m pytest tests/pam_v2/realtime -q
cd backend && python -m pytest tests/pam_v2 -q
npm test -- --run src/features/pam-v2
npm run type-check
npm run test:pam:auto
npm run e2e
npm run quality:check
npm run build:staging
npm run pam:v2:verify-isolation
```

Use Playwright fake-media flags/configuration for deterministic browser tests and document real-device steps in Agent Notes.

## 9) Observability / Logging (If applicable)

Measure session creation success, peer connection time, time to first audio, interruption latency, reconnect count, provider/sideband/tool latency, permission denial, and terminal error code. Correlate with trace/conversation/session IDs.

Do not log raw audio, ephemeral credentials, full transcripts by default, tool arguments, or approval tokens.

## 10) Rollout / Migration Plan (If applicable)

Enable voice for internal staging accounts, then a broader staging cohort. Text remains available as fallback. Keep an independent `PAM_V2_VOICE_ENABLED` kill switch.

Rollback disables V2 voice and leaves V2 text operational. V1 voice remains available only during this PRD and is removed from the rebuild branch in PRD 08 after acceptance.

## 11) Agent Notes (Leave space for recursion)

## Agent Notes — Session Log

- (timestamp) …

## Agent Notes — Decisions

- Decision / rationale / alternatives

## Agent Notes — Open Questions

- …

## Agent Notes — Regression Checklist

- [ ] Session authentication/identity binding
- [ ] Secret redaction
- [ ] Sideband tool policy
- [ ] WebRTC state/cleanup
- [ ] Interruption/reconnect
- [ ] Visible approvals
- [ ] Text/voice shared conversation
- [ ] Automated and real-device staging matrix

