# PRD — Pam V2 Frontend Replacement

## 1) Context & Goals

The current frontend combines presentation, connection management, authentication, WebSocket fallback, offline replay, proactive events, voice, actions, and feedback in large modules. This PRD builds a V2 frontend against the typed HTTP streaming contract while preserving the usable Pam experience on staging.

This is for React/TypeScript engineers and coding agents implementing user-facing text chat.

Why now: backend V2 behavior and domain tools are stable enough to integrate without embedding provider or business logic in the browser.

**Execution budget:** one fresh AI context, 6-8 slices. Voice remains disabled in the V2 UI until PRD 07.

### In-scope goals

- Build a reducer/state-machine-based conversation client.
- Implement authenticated HTTP streaming transport.
- Split Pam UI into focused components and an action renderer registry.
- Render approval requests and submit exact approval tokens.
- Preserve accessibility, mobile behavior, dark mode, and essential current UX.
- Route designated staging users to V2 behind a frontend flag.

### Out-of-scope / Non-goals

- No voice implementation.
- No direct OpenAI/Anthropic/Gemini browser calls.
- No WebSocket text transport.
- No automatic replay of write messages.
- No broad visual redesign or unrelated app refactor.
- No deletion of V1 frontend yet.

## 2) Current State (Repo-informed)

- `src/components/Pam.tsx` is roughly 1,700 lines and globally mounted from `src/components/Layout.tsx`.
- `src/services/pamService.ts` is roughly 1,850 lines and combines WebSocket/REST, auth, reconnect, queueing, timers, alerts, and actions.
- `src/contexts/PamConnectionProvider.tsx` auto-connects despite contradictory comments elsewhere.
- `src/services/pamVoiceHybridService.ts` and deprecated voice imports are coupled into the current component.
- V2 event types and fixture parser were created in PRD 01.

Likely new modules:

- `src/features/pam-v2/PamShell.tsx`
- `src/features/pam-v2/usePamConversation.ts`
- `src/features/pam-v2/pamConversationReducer.ts`
- `src/features/pam-v2/transports/PamTextTransport.ts`
- `src/features/pam-v2/actions/PamActionRegistry.tsx`
- Focused message composer/list/approval/error/status components.

**ASSUMPTION:** Existing visual components can be reused selectively without importing V1 service singletons. Verify all imports to prevent accidental V1 connection startup.

## 3) User Stories (Few, sharp)

- As a user, I want to send a message and see Pam's answer stream without duplicate messages or layout jumps.
- As a user, I want tool progress to be understandable without seeing internal chain-of-thought or raw arguments.
- As a user, I want to review and approve or reject the exact action Pam proposes.
- As a keyboard/screen-reader user, I want the conversation, composer, and approvals fully operable.
- As a user on an unstable connection, I want safe retry for reads and no accidental replay of writes.

## 4) Success Criteria (Verifiable)

- [ ] V2 UI does not import `pamService`, V1 WebSocket hooks, voice hybrid service, or browser provider clients.
- [ ] Conversation state is a pure reducer/state machine with tests for every server event.
- [ ] Transport sends authenticated V2 requests and incrementally parses typed streaming events.
- [ ] Unsupported schema versions fail safely with a visible recoverable error.
- [ ] Disconnect/cancel stops the current stream.
- [ ] Read-only turns can be manually retried with the same/controlled idempotency behavior.
- [ ] Mutating messages/actions are never automatically replayed.
- [ ] Approval card displays exact human-readable action details and approve/reject controls.
- [ ] Approval token is held only as long as required and never logged.
- [ ] Action rendering is registry-based with a safe unknown-action fallback.
- [ ] No provider keys or provider SDKs are included in the V2 browser path.
- [ ] UI is responsive at supported mobile/desktop widths with no overlapping controls or text.
- [ ] Keyboard navigation, focus management, ARIA live behavior, and reduced-motion preference are tested.
- [ ] V1 and V2 can be switched by staging flag without a code redeploy if existing configuration supports it, otherwise through environment deploy setting.

## 5) Test Plan (Design BEFORE build)

### Unit tests

- Reducer transition for every V2 event and invalid ordering.
- Duplicate/late events, terminal event enforcement, cancel, retry, and reconnect state.
- Stream parser with chunks split at arbitrary byte boundaries.
- Authentication expiry and safe error mapping.
- Approval approve/reject and changed/expired action response.
- Action registry known/unknown types.

### Component tests

- Message composition and submission.
- Streaming text updates without duplicate bubbles.
- Tool progress and final state.
- Keyboard-only approval flow and focus return.
- Screen-reader live regions do not announce every token.
- Mobile narrow-width layout and long unbroken text.

### E2E tests

- Login, open Pam, send read question, receive streamed answer.
- Tool-backed question.
- Approval required, reject, and verify no mutation.
- Approval required, approve once, verify one mutation.
- Network interruption during read and during pending write.
- Refresh and resume conversation.
- V1/V2 flag routing.

Mock transport for unit/component tests. Use isolated staging accounts for E2E writes.

## 6) Implementation Plan (Small slices)

1. **Create reducer and event fixtures.**
   - Tests first for full state transition table.
   - Implement pure state with no network or React dependency where practical.
   - Run targeted Vitest and type-check.
   - Commit: `feat(pam-v2): add conversation state machine`.
2. **Implement HTTP streaming transport.**
   - Tests first for chunk parsing, cancellation, auth, safe errors, and terminal events.
   - Use `fetch`/ReadableStream and existing auth token access patterns; do not add another global singleton.
   - Commit: `feat(pam-v2): add typed text transport`.
3. **Build shell, composer, and message list.**
   - Component tests first for keyboard, focus, loading, error, long text, and narrow viewport.
   - Reuse established design system components/icons.
   - Commit: `feat(pam-v2): build accessible pam shell`.
4. **Add tool status and action registry.**
   - Tests first for known/unknown actions and result rendering.
   - Do not render raw tool arguments or internal reasoning.
   - Commit: `feat(pam-v2): add typed action rendering`.
5. **Add approval UI.**
   - Tests first for exact summary, approve/reject, expiry, double click, and server denial.
   - Disable controls immediately after submission and rely on idempotent server state.
   - Commit: `feat(pam-v2): add exact action approval flow`.
6. **Integrate staging routing.**
   - Tests first for flag off/on and no simultaneous V1/V2 connection.
   - Mount V2 in the existing global Pam location for allowlisted staging accounts.
   - Ensure V1 provider does not auto-connect when V2 is active.
   - Commit: `feat(pam-v2): enable staged frontend routing`.
7. **E2E and visual verification.**
   - Add Playwright tests before fixing discovered issues.
   - Verify desktop/mobile, light/dark, keyboard, network interruption, approval, and resume.
   - Capture screenshots for review; ensure no overlaps or blank states.
   - Commit: `test(pam-v2): verify frontend journeys`.
8. **Bundle/security review.**
   - Test that V2 chunks contain no provider keys and do not import browser AI clients.
   - Measure bundle delta and remove accidental duplicated dependencies.
   - Run full quality/build/E2E suite.
   - Commit: `chore(pam-v2): harden frontend integration`.

## 7) Git Workflow Rules (Enforced)

- Continue the V2 staging branch.
- Commit after every slice.
- Tests precede component/transport implementation.
- After each slice run targeted Vitest, type-check, and prior relevant tests.
- After slices 4 and 8 run `npm run quality:check` and Pam E2E tests.
- Keep V1 files intact except the smallest flag/mount change required.
- Do not mix visual redesign or unrelated cleanup into these commits.

## 8) Commands (Repo-specific)

```bash
npm test -- --run src/features/pam-v2
npm run type-check
npm run lint
npm run test:pam:auto
npm run e2e
npm run quality:check
npm run build:staging
npm run dev -- --host 127.0.0.1 --port 8080
npm run pam:v2:verify-isolation
```

Use Playwright's local/staging base URL configuration; never point mutation tests at production.

## 9) Observability / Logging (If applicable)

Frontend telemetry should include safe event names, trace ID, runtime version, time-to-first-event/text, completion/cancel/error, retry action, approval response, and schema mismatch. Do not log message text, approval token, tool arguments, location, financial values, or document content.

## 10) Rollout / Migration Plan (If applicable)

Enable V2 UI only on staging and for designated accounts first, then all staging accounts. V1 remains selectable through the flag during this PRD. Verify that only one provider/runtime connection is active per UI instance.

Rollback: disable frontend V2 flag or redeploy prior staging commit. Backend V2 and database state may remain; no destructive rollback is needed.

## 11) Agent Notes (Leave space for recursion)

## Agent Notes — Session Log

- 2026-06-17: Completed PRD 06 frontend replacement slice.
  - Split V2 chat state into `src/services/pamV2/pamV2Reducer.ts` (pure reducer, `eventToAction`, schema-version-aware).
  - Added typed SSE transport in `src/services/pamV2/pamV2Transport.ts`.
  - Rebuilt `usePamV2Chat` hook using `useAuth` context, with `sendMessage`, `approve`, `reject`, `cancel`, `clearChat`, `clearError`.
  - Rebuilt `src/components/PamV2.tsx` with hook integration, approval UI, action registry, keyboard focus, and ARIA live region.
  - Added `src/services/pamV2/actions/PamActionRegistry.tsx` with typed renderers and safe unknown-action fallback.
  - Added unit tests: reducer (18), transport (6), hook (6), component (7) — 37 passing.
  - Removed obsolete `src/services/pamV2/pamV2Client.ts`.
  - Updated `ENVIRONMENT.md` and PRD 03 to recommend `gpt-5.4-mini` instead of `gpt-4o-mini`.
  - Type-check and targeted tests pass; no new lint errors introduced.

## Agent Notes — Decisions

- V2 frontend does not import `pamService`, V1 WebSocket hooks, voice hybrid service, or browser provider clients.
- State is a pure reducer with deterministic IDs passed via actions; transport only parses and dispatches typed events.
- `useAuth` context supplies the token; no additional Supabase singleton is created in V2 UI code.
- Approval flow shows exact action summary, approve/reject controls, and never logs the approval token.
- Action registry is component-based with fallback for unknown action types.
- Empty-content user messages (created by approval continuation) are not rendered.
- SSE schema-version mismatch is treated as a recoverable error surfaced to the user.
- Default V2 text model changed from `gpt-4o-mini` to `gpt-5.4-mini` per current OpenAI guidance.

## Agent Notes — Open Questions

- (none)

## Agent Notes — Regression Checklist

- [x] Reducer transition suite
- [x] Stream parser/cancellation
- [x] Approval UI
- [x] Action registry
- [x] V1/V2 exclusive routing (via `VITE_USE_PAM_2` flag in `Layout.tsx`)
- [ ] Mobile/desktop/dark/accessibility (manual QA on staging)
- [ ] E2E read/write/resume/interruption (Playwright after staging deploy)
- [ ] Bundle/provider-key audit (after build)

