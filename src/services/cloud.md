# Frontend Services

## Purpose
API client services and external integrations for communication between frontend and backend/third-party services

## Key Files
- `api.ts` - Base API client with interceptors and error handling
- `auth.ts` - Authentication service using Supabase Auth
- `trips.ts` - Trip planning and route management API
- `expenses.ts` - Financial tracking and budgeting API
- `pam.ts` - PAM AI assistant WebSocket and API communication
- `mapbox.ts` - Mapbox API integration and helpers
- `storage.ts` - File upload and media management

## Architecture
- All services use a centralized API client
- Tanstack Query for caching and state management
- Type-safe API calls with generated TypeScript types
- Automatic retry and error handling
- Request/response interceptors for auth tokens

## Dependencies
- **HTTP Client**: Axios with interceptors
- **State Management**: Tanstack Query
- **Authentication**: Supabase Auth
- **WebSocket**: Native WebSocket API
- **Type Generation**: Supabase CLI generated types

## API Configuration
- Base URL from environment variables
- Automatic token refresh
- Request timeout: 30 seconds
- Retry attempts: 3 with exponential backoff
- CORS handled by backend

## Error Handling
```typescript
// Standard error response format
interface ApiError {
  message: string;
  code: string;
  status: number;
  details?: Record<string, any>;
}
```

## Do NOT
- Make direct API calls without the service layer
- Store sensitive data in localStorage
- Bypass the centralized error handling
- Modify API base configuration per service
- Use synchronous API calls

## Testing
- Mock API responses with MSW (Mock Service Worker)
- Test error scenarios and edge cases
- Verify request/response transformations
- Test WebSocket reconnection logic