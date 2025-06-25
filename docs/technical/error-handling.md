# Error Handling and Troubleshooting

## Overview
This document outlines the error handling strategies, fallback mechanisms, and troubleshooting procedures for the WHEELS WINS platform, with special focus on the PAM AI assistant and WebSocket communication.

## Error Categories

### 1. WebSocket Connection Errors

#### Connection Failures
**Symptoms:**
- WebSocket connection fails to establish
- Immediate disconnection after connection attempt
- Connection timeouts

**Common Causes:**
- Backend service unavailable (Render.com downtime)
- Network connectivity issues
- CORS policy violations
- Invalid authentication tokens

**Error Handling:**
```typescript
ws.current.onerror = (error) => {
  console.error('❌ PAM WebSocket error:', error);
  updateConnectionStatus(false);
  
  if (reconnectAttempts.current < maxReconnectAttempts) {
    scheduleReconnect();
  }
};
```

**Resolution Steps:**
1. Check backend service status at https://pam-backend.onrender.com/api/health
2. Verify JWT token validity
3. Test network connectivity
4. Review browser console for CORS errors

#### Authentication Errors
**Symptoms:**
- WebSocket connection rejected immediately
- 403 Forbidden responses
- Token validation failures

**Error Handling:**
```typescript
ws.current.onclose = (event) => {
  if (event.code === 1008) { // Policy Violation
    console.error('❌ Authentication failed');
    onMessage({
      type: 'error',
      message: '🔐 Authentication required. Please log in again.'
    });
  }
};
```

**Resolution Steps:**
1. Check JWT token expiration
2. Refresh authentication tokens
3. Verify user permissions
4. Clear localStorage and re-authenticate

### 2. Message Processing Errors

#### JSON Parsing Failures
**Symptoms:**
- Malformed message responses
- Unexpected data structures
- Console parsing errors

**Error Handling:**
```typescript
ws.current.onmessage = (event) => {
  try {
    const message = JSON.parse(event.data);
    onMessage(message);
  } catch (error) {
    console.error('❌ Error parsing PAM WebSocket message:', error);
    // Don't crash the application, log and continue
  }
};
```

#### Backend Processing Errors
**Symptoms:**
- Error message types received
- OpenAI API failures
- Database connection issues

**Error Response Format:**
```typescript
{
  type: 'error',
  message: 'Failed to process your request',
  code: 'OPENAI_API_ERROR',
  details: {
    error_type: 'rate_limit_exceeded',
    retry_after: 60
  }
}
```

### 3. Context Enrichment Errors

#### Missing Context Data
**Symptoms:**
- PAM responses lack contextual awareness
- Generic responses instead of personalized ones
- Session data not persisting

**Debug Commands:**
```typescript
// Verify context payload
console.log('Context being sent:', {
  region: regionContext.region,
  current_page: location.pathname,
  session_data: sessionData
});
```

#### Session Management Issues
**Symptoms:**
- Session data reset unexpectedly
- Intent classification failures
- Lost conversation context

**Resolution:**
```typescript
// Reset session if corrupted
const resetSession = () => {
  sessionStorage.removeItem('pam-session');
  localStorage.removeItem('pam-session');
  window.location.reload();
};
```

## Fallback Mechanisms

### 1. Demo Mode

When WebSocket connection is unavailable, PAM automatically switches to demo mode:

```typescript
const generateDemoResponse = (userMessage: string): string => {
  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes('expense')) {
    return "💰 I'd normally help you track that expense, but I'm in demo mode. Try: 'I spent $25 on fuel' when I'm fully connected!";
  }
  
  if (lowerMessage.includes('budget')) {
    return "📊 In demo mode, I can't access your live budget data. When connected, I can show you detailed budget insights!";
  }
  
  // ... more context-aware responses
};
```

**Demo Mode Features:**
- Context-aware fallback responses
- User education about full functionality
- Graceful degradation of features
- Clear indication of limited capabilities

### 2. Offline Functionality

```typescript
import { useOffline } from "@/context/OfflineContext";

const { isOffline } = useOffline();

if (isOffline) {
  return {
    sender: "pam",
    content: "You're currently offline. PAM will be available when you reconnect.",
    timestamp: new Date(),
  };
}
```

### 3. Error Boundary Implementation

**Component-Level Error Boundaries:**
```tsx
class PamErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('PAM Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-red-800 font-semibold">PAM is temporarily unavailable</h3>
          <p className="text-red-600">Please refresh the page to try again.</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## Reconnection Strategies

### Exponential Backoff

```typescript
const scheduleReconnect = useCallback(() => {
  if (reconnectAttempts.current < maxReconnectAttempts) {
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
    console.log(`🔄 Scheduling PAM reconnect in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
    
    reconnectTimeout.current = setTimeout(() => {
      reconnectAttempts.current++;
      connect();
    }, delay);
  } else {
    console.error('❌ Max PAM reconnect attempts reached');
    // Show user notification
  }
}, []);
```

**Reconnection Parameters:**
- Maximum attempts: 3
- Delay progression: 1s → 2s → 4s → 8s (capped at 10s)
- Reset attempts on successful connection
- User notification after max attempts reached

### Manual Reconnection

```typescript
const forceReconnect = useCallback(() => {
  if (reconnectTimeout.current) {
    clearTimeout(reconnectTimeout.current);
  }
  reconnectAttempts.current = 0;
  connect();
}, [connect]);
```

## User Experience During Errors

### Status Indicators

```tsx
const ConnectionStatus = ({ isConnected }: { isConnected: boolean }) => (
  <div className={`flex items-center gap-2 ${isConnected ? 'text-green-600' : 'text-yellow-600'}`}>
    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
    <span className="text-sm">
      {isConnected ? 'PAM Connected' : 'PAM Demo Mode'}
    </span>
  </div>
);
```

### Error Messages

User-friendly error messages with actionable guidance:

```typescript
const errorMessages = {
  CONNECTION_FAILED: {
    title: "Connection Issue",
    message: "PAM is having trouble connecting. Trying to reconnect...",
    action: "We'll keep trying automatically, or you can refresh the page."
  },
  
  AUTHENTICATION_FAILED: {
    title: "Authentication Required",
    message: "Please log in to use PAM's full features.",
    action: "Click here to log in again."
  },
  
  RATE_LIMITED: {
    title: "Too Many Requests",
    message: "PAM needs a moment to catch up.",
    action: "Please wait a moment before sending another message."
  }
};
```

## Debugging Tools

### Console Logging

Comprehensive logging for debugging:

```typescript
const debugLog = (level: 'info' | 'warn' | 'error', message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const emoji = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️';
  
  console[level](`${emoji} [PAM ${timestamp}] ${message}`, data || '');
  
  // Optional: Send to analytics
  if (level === 'error') {
    analytics.track('pam_error', { message, data });
  }
};
```

### Development Mode Features

```typescript
// Enable verbose debugging
if (import.meta.env.DEV) {
  window.pamDebug = {
    connection: ws.current,
    messages: messages,
    forceReconnect,
    simulateError: () => ws.current?.close(1006, 'Simulated error'),
    clearSession: () => sessionStorage.clear()
  };
}
```

### Health Check Monitoring

```typescript
const healthCheck = async () => {
  try {
    const response = await fetch('https://pam-backend.onrender.com/api/health');
    const health = await response.json();
    
    console.log('🏥 Backend health:', health);
    return health.status === 'healthy';
  } catch (error) {
    console.error('🏥 Health check failed:', error);
    return false;
  }
};
```

## Monitoring and Analytics

### Error Tracking

```typescript
const trackError = (error: Error, context: string) => {
  // Log to console
  console.error(`❌ [${context}] ${error.message}`, error);
  
  // Send to analytics (if available)
  if (typeof analytics !== 'undefined') {
    analytics.track('error_occurred', {
      error_message: error.message,
      error_context: context,
      stack_trace: error.stack,
      user_id: user?.id,
      timestamp: new Date().toISOString()
    });
  }
};
```

### Performance Monitoring

```typescript
const performanceMetrics = {
  connection_time: 0,
  message_count: 0,
  error_count: 0,
  reconnection_count: 0
};

// Track connection performance
const startTime = performance.now();
ws.current.onopen = () => {
  performanceMetrics.connection_time = performance.now() - startTime;
  console.log(`⚡ Connection established in ${performanceMetrics.connection_time}ms`);
};
```

## Recovery Procedures

### Automatic Recovery

1. **Connection Loss**: Automatic reconnection with exponential backoff
2. **Authentication Failure**: Prompt user to re-authenticate
3. **Rate Limiting**: Automatic retry after delay
4. **Parsing Errors**: Log error but continue operation

### Manual Recovery

1. **Force Refresh**: `window.location.reload()`
2. **Clear Storage**: Reset localStorage and sessionStorage
3. **Re-authentication**: Redirect to login page
4. **Backend Restart**: Contact support for backend issues

### Support Procedures

When users report issues:

1. **Collect Debug Information**
   ```javascript
   // Have user run in console
   console.log({
     connected: window.pamDebug?.connection?.readyState,
     messages: window.pamDebug?.messages?.length,
     errors: localStorage.getItem('pam-errors'),
     userAgent: navigator.userAgent
   });
   ```

2. **Check Backend Status**
   - Verify Render.com service status
   - Check health endpoint responses
   - Review backend logs

3. **Guide User Through Recovery**
   - Clear browser cache and storage
   - Disable browser extensions
   - Try incognito/private browsing mode