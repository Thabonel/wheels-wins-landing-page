# PAM WebSocket Dedupe: Provider + Hook

Date: 2025-01-12
Target branch: `staging`

## Summary

- Centralize PAM WebSocket lifecycle via `PamConnectionProvider` and `usePamConnection`.
- Migrate production usage to the hook (Pam.tsx, usePamSuggestions).
- Unify backend health checks to derive endpoints from `pamService` config.
- Keep dev/test hook (`usePamWebSocketUnified`) restricted to `src/dev/*`.

## Files (high level)

- `src/contexts/PamConnectionProvider.tsx` (new)
- `src/hooks/usePamConnection.ts` (new)
- `src/components/Pam.tsx` (migrated to hook)
- `src/hooks/usePamSuggestions.ts` (migrated to hook)
- `src/utils/backendHealthCheck.ts` (single config source)
- `src/services/pam/contextManager.ts` (type import fix)
- `src/hooks/pam/usePamMessageOptimization.ts` (type import fix)
- `src/utils/pamMessageUtils.ts` (shared message type)

## Why

- Eliminate duplicate WS clients and drift.
- One connection per app, aligned with auth lifecycle.
- Single source of truth for URL, auth refresh, backoff, ping/pong.

## Expected Behavior

- PAM connection state exposed via context.
- Sending goes through `sendMessage(message, context)` from the hook.
- Dev stress test pages continue to work under `src/dev/*`.

## Rollback

If issues are found, revert the staging commit:

```
git revert 706db657
git push origin staging
```

Emergency reset to previous staging head:

```
git reset --hard 0fd29e5b
git push -f origin staging
```

## Test Notes

- Verify connection status shows Connected on staging.
- Send a few messages and confirm responses.
- Check Suggestions panel loads without errors.
- Optional: run `npm run type-check` and `npm run lint`.

