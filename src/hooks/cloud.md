# Frontend Hooks

## Purpose
Custom React hooks for shared logic, state management, and side effects across components

## Key Hooks
- `useAuth.ts` - Authentication state and methods
- `useTrips.ts` - Trip planning data and operations
- `useExpenses.ts` - Financial tracking hooks
- `usePam.ts` - PAM AI assistant interactions
- `useMapbox.ts` - Mapbox map instance management
- `useDebounce.ts` - Debounced values for search/input
- `useLocalStorage.ts` - Persistent local storage with sync
- `useMediaQuery.ts` - Responsive design breakpoints
- `useToast.ts` - Toast notification system
- `useWebSocket.ts` - WebSocket connection management

## Conventions
- All hooks start with "use" prefix
- Return consistent data structure: `{ data, loading, error, refetch }`
- Handle cleanup in useEffect return functions
- Type all return values with TypeScript
- Document hook parameters and return types

## State Management Pattern
```typescript
interface HookReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch?: () => void;
}
```

## Dependencies
- **Core**: React 18 hooks (useState, useEffect, etc.)
- **Data Fetching**: Tanstack Query hooks
- **Routing**: React Router hooks
- **State**: Zustand (for complex state)

## Performance Optimization
- Use useMemo for expensive computations
- Use useCallback for stable function references
- Implement proper dependency arrays
- Avoid unnecessary re-renders

## Do NOT
- Create hooks that directly modify DOM
- Use hooks conditionally (violates Rules of Hooks)
- Forget cleanup functions for subscriptions
- Mix concerns - keep hooks focused
- Return unstable object references

## Testing
- Test with React Testing Library renderHook
- Mock external dependencies
- Test loading, success, and error states
- Verify cleanup functions are called
- Test edge cases and race conditions