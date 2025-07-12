# WebSocket Architecture for PAM AI Assistant

## Overview
The WHEELS WINS platform uses WebSocket connections for real-time communication between the frontend and the PAM AI backend. This document details the technical implementation, message flow, and debugging procedures.

## Architecture Diagram

```
┌─────────────────┐    WebSocket    ┌─────────────────┐    HTTP/OpenAI    ┌─────────────────┐
│   Frontend      │◄───────────────►│  PAM Backend    │◄─────────────────►│   OpenAI API    │
│                 │                 │   (Render.com)  │                   │                 │
│ • Chat UI       │                 │ • Orchestrator  │                   │ • GPT Models    │
│ • Context Data  │                 │ • Intent Class. │                   │ • NLP Process   │
│ • Session Mgmt  │                 │ • WebSocket Mgr │                   │                 │
└─────────────────┘                 └─────────────────┘                   └─────────────────┘
         │                                   │
         │                                   │ Database
         │                                   ▼
┌─────────────────┐                 ┌─────────────────┐
│   Auth Context  │                 │   Supabase DB   │
│ • User ID       │                 │ • User Data     │
│ • JWT Tokens    │                 │ • Conversations │
│ • Permissions   │                 │ • Analytics     │
└─────────────────┘                 └─────────────────┘
```

## WebSocket Connection Implementation

### Frontend Connection Hook

**File:** `src/hooks/pam/usePamWebSocketConnection.ts`

```typescript
interface WebSocketConnectionConfig {
  userId: string;
  onMessage: (message: any) => void;
  onStatusChange: (isConnected: boolean) => void;
}

export function usePamWebSocketConnection({ 
  userId, 
  onMessage, 
  onStatusChange 
}: WebSocketConnectionConfig) {
  // WebSocket connection logic with auto-reconnection
}
```

### Connection Lifecycle

1. **Initialization**
   ```typescript
   const wsUrl = `${backendUrl.replace("https", "wss")}/ws/${userId}?token=${authToken}`;
   ws.current = new WebSocket(wsUrl);
   ```

2. **Authentication**
   - JWT token passed as URL parameter
   - Token retrieved from localStorage
   - Fallback to 'demo-token' for unauthenticated users

3. **Event Handlers**
   - `onopen`: Connection established, reset reconnection attempts
   - `onmessage`: Parse JSON messages, handle different message types
   - `onclose`: Log disconnection, trigger reconnection if needed
   - `onerror`: Log errors, schedule reconnection

### Reconnection Strategy

```typescript
const scheduleReconnect = useCallback(() => {
  if (reconnectAttempts.current < maxReconnectAttempts) {
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
    // Exponential backoff: 1s, 2s, 4s, max 10s
    setTimeout(() => {
      reconnectAttempts.current++;
      connect();
    }, delay);
  }
}, []);
```

**Parameters:**
- Maximum attempts: 3
- Exponential backoff: 1s → 2s → 4s → 8s (capped at 10s)
- Automatic reset on successful connection

## Message Format Specification

### Outgoing Message Structure

```typescript
interface OutgoingMessage {
  type: 'chat';
  message: string;
  user_id: string;
  context: {
    region: string;           // Current user region
    current_page: string;     // Active route
    session_data: {           // Session tracking
      recent_intents: string[];
      intent_counts: Record<string, number>;
      last_activity: Date;
    };
  };
}
```

### Incoming Message Types

#### Chat Response
```typescript
{
  type: 'chat_response',
  message: string,
  timestamp?: string
}
```

#### UI Actions
```typescript
{
  type: 'ui_actions',
  actions: Array<{
    type: 'navigate' | 'update' | 'create',
    target: string,
    data?: any
  }>
}
```

#### Action Response
```typescript
{
  type: 'action_response',
  status: 'completed' | 'failed',
  action_id?: string,
  result?: any
}
```

#### Error Messages
```typescript
{
  type: 'error',
  message: string,
  code?: string,
  details?: any
}
```

#### Connection Status
```typescript
{
  type: 'connection',
  message: string,
  status: 'connected' | 'disconnected'
}
```

## Context Enrichment System

### Context Data Collection

The frontend automatically enriches each message with contextual information:

```typescript
const context = {
  region: region,                    // From RegionContext
  current_page: pathname,            // From React Router
  session_data: sessionData          // From usePamSession hook
};
```

### Session Data Structure

```typescript
interface SessionData {
  recent_intents: string[];          // Last 10 classified intents
  intent_counts: Record<string, number>; // Intent frequency tracking
  last_activity: Date;               // Last user interaction
  session_start: Date;               // Session initialization
}
```

### Context Usage in Backend

The backend orchestrator receives and processes context to:
- Provide location-aware responses
- Maintain conversation continuity
- Route to appropriate specialized nodes
- Track user interaction patterns

## Error Handling & Fallbacks

### Connection Error Scenarios

1. **Network Connectivity Issues**
   - Browser offline
   - DNS resolution failures
   - Firewall blocking WebSocket connections

2. **Backend Unavailability**
   - Render.com service down
   - PAM backend deployment issues
   - Resource exhaustion (CPU/memory limits)

3. **Authentication Failures**
   - Invalid JWT tokens
   - Token expiration
   - Authorization denied

### Fallback Mechanisms

#### Demo Mode Activation
When WebSocket connection fails, PAM automatically switches to demo mode:

```typescript
const generateDemoResponse = (userMessage: string): string => {
  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes('expense')) {
    return "💰 I'd normally help you track that expense, but I'm in demo mode...";
  }
  // Additional context-aware demo responses
};
```

#### Error User Interface
- Connection status indicators
- User-friendly error messages
- Retry mechanisms
- Graceful degradation

## Performance Monitoring

### Connection Metrics

```typescript
// Performance tracking
const connectionMetrics = {
  connect_time: performance.now(),
  reconnect_attempts: 0,
  message_count: 0,
  error_count: 0
};
```

### Logging Strategy

**Console Log Patterns:**
- `🔌` Connection lifecycle events
- `📤` Outgoing message transmission
- `📨` Incoming message reception
- `✅` Successful operations
- `❌` Error conditions
- `🔄` Reconnection attempts

## Debugging Procedures

### Connection Debugging

1. **Check WebSocket Status**
   ```javascript
   // In browser console
   console.log(window.pamConnection?.readyState);
   // 0: CONNECTING, 1: OPEN, 2: CLOSING, 3: CLOSED
   ```

2. **Verify Backend Availability**
   ```bash
   curl https://pam-backend.onrender.com/api/health
   ```

3. **Test WebSocket Endpoint**
   ```javascript
   const testWs = new WebSocket('wss://pam-backend.onrender.com/api/v1/pam/ws?token=demo-token');
   testWs.onopen = () => console.log('Test connection successful');
   testWs.onerror = (error) => console.error('Test connection failed:', error);
   ```

### Message Flow Debugging

1. **Enable Verbose Logging**
   ```typescript
   localStorage.setItem('pam-debug', 'true');
   ```

2. **Monitor Message Queue**
   ```javascript
   // Check message history
   console.log(pamInstance.messages);
   ```

3. **Verify Context Payload**
   ```javascript
   // Inspect outgoing context
   console.log('Context payload:', {
     region: regionContext.region,
     current_page: location.pathname,
     session_data: sessionData
   });
   ```

### Backend Debugging

1. **Check Render Logs**
   - Access Render.com dashboard
   - View PAM backend service logs
   - Monitor WebSocket connection events

2. **Health Check Verification**
   ```bash
   # Basic health check
   curl https://pam-backend.onrender.com/api/health
   
   # Detailed health check
   curl https://pam-backend.onrender.com/api/health/detailed
   ```

## Environment Configuration

### Frontend Environment Variables

```bash
VITE_PAM_BACKEND_URL=https://pam-backend.onrender.com
```

### Backend Environment Variables (Render.com)

```bash
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://...supabase.co
SUPABASE_KEY=<token>
JWT_SECRET=your-jwt-secret
ENVIRONMENT=production
```

## Security Considerations

### Authentication
- JWT tokens for user identification
- Token validation on connection
- Automatic token refresh handling

### Data Privacy
- Context data encryption in transit
- Minimal data exposure in logs
- User consent for conversation storage

### Rate Limiting
- Connection frequency limits
- Message rate limiting
- Resource usage monitoring

## Deployment Considerations

### Backend Deployment (Render.com)
- Auto-deployment from GitHub
- Health check endpoints
- Resource scaling based on usage

### Frontend Integration
- WebSocket URL configuration
- Fallback URL handling
- Environment-specific settings

## Future Improvements

### Planned Enhancements
- Message queuing for offline scenarios
- Binary message support for file transfers
- Multiple WebSocket connection pooling
- Real-time collaboration features

### Performance Optimizations
- Connection pooling
- Message compression
- Intelligent reconnection strategies
- Caching mechanisms