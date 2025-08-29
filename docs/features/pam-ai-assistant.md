# PAM AI Assistant

## Overview
The PAM AI Assistant is the core conversational AI feature of the WHEELS WINS system, providing intelligent assistance through WebSocket-based real-time communication. PAM is designed to help users manage expenses, plan trips, track budgets, navigate the platform efficiently, and now includes location awareness, world-class AI provider orchestration, and enhanced security through isolation architecture.

## Architecture

### WebSocket Communication
PAM uses WebSocket connections for real-time bidirectional communication between the frontend and the PAM backend running on Render.com.

**Connection Flow:**
1. Frontend establishes WebSocket connection to PAM backend
2. Authentication via JWT token in connection URL
3. Context-enriched message exchange
4. Automatic reconnection with exponential backoff

**Backend URL:** `https://pam-backend.onrender.com`  
**WebSocket Endpoint:** `wss://pam-backend.onrender.com/api/v1/pam/ws?token={jwt_token}`

### Context Enrichment System
PAM receives rich contextual information with each message:

```typescript
interface MessageContext {
  region: string;              // User's current region
  current_page: string;        // Current route/page
  location?: {                 // User's current location (new)
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  session_data: {              // Session tracking data
    recent_intents: string[];
    intent_counts: Record<string, number>;
    last_activity: Date;
  };
}
```

## Frontend Components

### Core Components
- **`PamChatController`** - Main orchestrator component
- **`PamMobileChat`** - Mobile chat interface
- **`PamFloatingButton`** - Mobile floating action button
- **`ChatInput`** - Message input with voice support
- **`ChatMessages`** - Message display and rendering
- **`PamHeader`** - Chat header with connection status
- **`QuickReplies`** - Suggested action buttons

### Hooks and Utilities
- **`usePamWebSocketConnection`** - WebSocket connection management
- **`usePamMessageHandler`** - Message processing and UI actions
- **`usePamSession`** - Session tracking and intent history
- **`usePamUIActions`** - Platform navigation and UI control
- **`IntentClassifier`** - User intent recognition

## Message Types

### Outgoing Messages (Frontend → Backend)
```typescript
{
  type: 'chat',
  message: string,
  user_id: string,
  context: {
    region: string,
    current_page: string,
    session_data: SessionData
  }
}
```

### Incoming Messages (Backend → Frontend)
- **`chat_response`** - Text response from PAM
- **`ui_actions`** - Platform navigation/UI commands
- **`action_response`** - Action completion status
- **`error`** - Error messages
- **`connection`** - Connection status updates
- **`wins_update`** - Financial data updates

## Intent Classification

PAM automatically classifies user intents into categories:
- **expense** - Expense tracking and logging
- **budget** - Budget management and insights
- **travel** - Trip planning and vehicle management
- **help** - General assistance requests
- **general** - Conversational interactions

## Backend Integration

### PAM Backend (Render.com)
The PAM backend is a FastAPI application deployed on Render.com that provides:
- WebSocket endpoint for real-time communication
- Context processing and enrichment with location awareness
- World-class AI provider orchestration with intelligent failover
- OpenAI GPT integration with fallback to alternative providers
- Supabase database integration for user data
- Intent-based response routing
- Hardened isolation architecture for enhanced security
- Real-time location context for better recommendations

### Token Verification
The backend validates JWTs using its internal `SECRET_KEY` with the HS256 algorithm.
Tokens issued by Supabase are **not** recognized automatically. Ensure the `sub`
claim matches the `userId` used in the WebSocket path. If using Supabase Auth,
either exchange the Supabase token for a PAM token or extend the backend to
verify Supabase JWTs using the project's public JWKS:

```python
from app.core.auth import verify_supabase_token

payload = verify_supabase_token(supabase_token, settings.SUPABASE_URL)
```

## Enhanced Capabilities (2025 Updates)

### Location Awareness
PAM now includes real-time location awareness capabilities:
- **Geolocation Context**: Receives user's current GPS coordinates
- **Location-Based Recommendations**: Provides context-aware suggestions based on current location
- **Nearby Services**: Recommends campgrounds, fuel stops, and attractions near current position
- **Route Adjustments**: Suggests route changes based on real-time location and conditions

### AI Provider Orchestration
Implemented world-class AI provider orchestration system:
- **Multi-Provider Support**: Integrates with OpenAI, Anthropic, and other leading AI providers
- **Intelligent Failover**: Automatically switches providers if primary is unavailable
- **Performance Optimization**: Routes requests to the best provider for specific tasks
- **Cost Management**: Optimizes provider selection based on cost and performance

### Enhanced Security Architecture
PAM now features hardened isolation architecture:
- **Dedicated Processing Environment**: Isolated PAM processing for enhanced security
- **Request Validation**: Enhanced input validation and sanitization
- **Rate Limiting**: Intelligent rate limiting to prevent abuse
- **Audit Logging**: Comprehensive logging for security monitoring

### Shopping Intelligence
Integration with Digistore24 for e-commerce capabilities:
- **Product Recommendations**: AI-curated product suggestions based on user profile
- **Commission Optimization**: Suggests high-converting affiliate products
- **Category Matching**: Matches products to user interests and travel style
- **Purchase Tracking**: Monitors and learns from purchase patterns

Refresh tokens when expired to maintain the connection.

### WebSocket Message Flow
1. **Connection Establishment**
   - Frontend connects to `wss://pam-backend.onrender.com/api/v1/pam/ws?token={jwt_token}`
   - JWT authentication in URL parameters
   - Automatic reconnection with exponential backoff (max 3 attempts)

2. **Message Processing**
   - Frontend sends context-enriched messages
   - Backend processes through orchestrator
   - AI generates responses with optional UI actions
   - Frontend receives and renders responses

3. **Error Handling**
   - Connection failures trigger automatic reconnection
   - Fallback to demo mode when backend unavailable
   - User-friendly error messages

## Demo Mode

When the WebSocket connection is unavailable, PAM operates in demo mode:
- Provides context-aware demo responses
- Maintains conversation flow
- Indicates reduced functionality to user
- Automatic upgrade when connection restored

### Demo Response Examples
- Expense tracking: "💰 I'd normally help you track that expense, but I'm in demo mode..."
- Budget queries: "📊 In demo mode, I can't access your live budget data..."
- Trip planning: "🚗 I'd love to help plan your trip! In demo mode, I can't access live route data..."

## User Experience

### Mobile Interface
- **Floating Button**: Always-accessible chat trigger
- **Full-Screen Chat**: Immersive mobile conversation experience
- **Quick Actions**: One-tap common tasks
- **Connection Status**: Visual indicators for backend connectivity

### Desktop Integration
- Currently focused on mobile experience
- Excluded from certain routes (home page, profile)

### Quick Actions
- `add_expense`: "I spent $25 on fuel today"
- `check_budget`: "Show my budget status"
- `plan_trip`: "Help me plan a trip"
- `add_groceries`: "Add $50 groceries expense"

## Performance & Reliability

### Connection Management
- Automatic reconnection with exponential backoff
- Maximum 3 reconnection attempts
- Graceful degradation to demo mode
- Connection status monitoring

### Error Boundaries
- WebSocket error handling
- Message parsing error recovery
- Fallback response mechanisms
- User notification for connection issues

## Configuration

### Environment Variables
- `VITE_PAM_BACKEND_URL` - Backend URL (defaults to production)
- JWT tokens stored in localStorage for authentication

### Feature Flags
- Route exclusion list for PAM availability
- Mobile vs desktop interface selection
- Demo mode fallback behavior

## Development & Debugging

### Logging
PAM includes comprehensive logging for debugging:
- WebSocket connection events
- Message send/receive tracking
- Intent classification results
- Error conditions and recovery

### Console Messages
- `🔌` Connection events
- `📤` Outgoing messages
- `📨` Incoming messages  
- `✅` Successful operations
- `❌` Errors and failures
- `🔄` Reconnection attempts

## Future Enhancements

### Planned Features
- Voice input/output integration
- Desktop sidebar implementation
- Enhanced context awareness
- Multi-language support
- Offline functionality improvements

### Technical Improvements
- Message queuing for offline scenarios
- Enhanced error recovery
- Performance monitoring
- A/B testing framework

## Troubleshooting

### Common Issues
1. **WebSocket Connection Failures**
   - Check backend URL configuration
   - Verify JWT token validity
   - Monitor network connectivity

2. **Demo Mode Stuck**
   - Backend deployment status on Render
   - Environment variable configuration
   - CORS settings

3. **Context Not Utilized**
   - Verify context payload structure
   - Check backend orchestrator processing
   - Review session data tracking

### Debug Commands
```javascript
// Check WebSocket connection status
console.log(pamRef.current?.isConnected);

// View recent messages
console.log(pamRef.current?.messages);

// Force reconnection
pamRef.current?.connect();
```