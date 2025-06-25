
# Architecture Overview

This document provides a high-level overview of the PAM system architecture, design patterns, and technology stack.

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   External      │
│   (React)       │◄──►│   (FastAPI)     │◄──►│   Services      │
│                 │    │                 │    │                 │
│ • Components    │    │ • API Routes    │    │ • OpenAI        │
│ • Hooks         │    │ • Auth Layer    │    │ • Supabase      │
│ • Context       │    │ • Business      │    │ • Stripe        │
│ • Utils         │    │   Logic         │    │ • Twilio        │
│ • PAM AI        │    │ • WebSocket     │    │ • Mapbox        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Frontend Architecture (React + TypeScript)

### Layer Structure
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Shadcn/ui base components
│   ├── admin/          # Admin-specific components
│   ├── auth/           # Authentication components
│   ├── pam/            # PAM AI assistant components
│   ├── wheels/         # Travel & vehicle management
│   ├── wins/           # Financial management
│   ├── social/         # Community features
│   └── you/            # Personal organization
├── hooks/              # Custom React hooks
│   ├── pam/            # PAM-specific hooks
│   └── [feature]/      # Feature-specific hooks
├── context/            # React context providers
├── pages/              # Route components
├── lib/                # Utility functions
└── types/              # TypeScript type definitions
```

### Design Patterns

#### PAM AI Assistant Architecture
```typescript
// Modular WebSocket connection management
const usePamWebSocketConnection = () => {
  // Connection state, retries, error handling
};

// UI action execution
const usePamUIActions = () => {
  // Navigate, highlight, form filling
};

// Message processing
const usePamMessageHandler = () => {
  // Chat responses, error handling, fallbacks
};

// Main orchestrator
const usePamWebSocket = () => {
  // Combines all PAM functionality
};
```

#### Component Composition
```typescript
// Compound component pattern
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>

// PAM integration pattern
<PamChatController>
  <PamMobileChat />
  <PamFloatingButton />
</PamChatController>
```

#### Hook Composition
```typescript
const useFeature = () => {
  const auth = useAuth();
  const data = useQuery(...);
  const mutation = useMutation(...);
  const pam = usePamWebSocket();
  
  return { auth, data, mutation, pam };
};
```

## Backend Architecture (FastAPI + Python)

### Layer Structure
```
app/
├── api/            # API route handlers
│   ├── chat.py     # PAM chat endpoint
│   ├── wheels.py   # Travel management
│   ├── wins.py     # Financial management
│   ├── social.py   # Community features
│   ├── you.py      # Personal organization
│   └── demo.py     # Demo scenarios
├── core/           # Core functionality
│   ├── config.py   # Configuration
│   ├── security.py # Auth & security
│   ├── orchestrator.py # PAM routing
│   └── websocket_manager.py # Real-time communication
├── nodes/          # AI specialist nodes
│   ├── wheels_node.py   # Travel AI
│   ├── wins_node.py     # Financial AI
│   ├── social_node.py   # Community AI
│   └── you_node.py      # Personal AI
├── database/       # Database connections
└── utils/          # Utility functions
```

### PAM AI Node Architecture
```python
# Specialist AI nodes for different domains
class WheelsNode:
    async def plan_trip(self, user_id: str, trip_data: dict) -> dict
    async def log_fuel_purchase(self, user_id: str, fuel_data: dict) -> dict
    async def check_maintenance_schedule(self, user_id: str) -> dict

class WinsNode:
    async def track_expense(self, user_id: str, expense_data: dict) -> dict
    async def analyze_budget(self, user_id: str) -> dict
    async def find_income_opportunities(self, user_id: str) -> dict
```

## PAM AI Assistant System

### Real-time Communication
```
WebSocket Connection Flow:
1. Frontend connects to wss://pam-backend.onrender.com
2. Authentication via JWT token
3. Message routing through orchestrator
4. Specialist node processing
5. Real-time UI actions and responses
```

### Fallback & Offline Functionality
```typescript
// Graceful degradation
const PamChat = () => {
  const { isConnected, sendMessage } = usePamWebSocket();
  
  // Always functional, even when disconnected
  const handleMessage = (message: string) => {
    if (isConnected) {
      sendMessage(message); // Live PAM
    } else {
      generateDemoResponse(message); // Fallback mode
    }
  };
};
```

### PAM Capabilities by Domain

#### WHEELS (Travel & Vehicles)
- Trip planning with route optimization
- Fuel consumption tracking
- Vehicle maintenance scheduling
- Weather integration
- RV/Caravan storage organization
- Safety checklists

#### WINS (Financial Management)
- Expense tracking and categorization
- Budget management with alerts
- Income opportunity discovery
- Hustle performance tracking
- Financial analytics and insights

#### SOCIAL (Community)
- Group recommendations
- Marketplace integration
- Social feed management
- Community insights
- Peer connections

#### YOU (Personal Organization)
- Calendar and event management
- Profile optimization
- Personalized dashboard
- Travel timeline planning
- Maintenance reminders

## Database Architecture (Supabase/PostgreSQL)

### Schema Design
```sql
-- Core entities
users (profiles)
├── auth (Supabase Auth)
├── user_settings
├── user_knowledge
├── user_sessions
└── pam_interactions

-- Travel & Vehicles (Wheels)
trips
├── trip_waypoints
├── fuel_logs
├── vehicle_maintenance
└── rv_storage_items

-- Financial (Wins)
expenses
├── expense_categories
├── budgets
├── income_records
└── hustle_ideas

-- Community (Social)
social_groups
├── group_posts
├── marketplace_items
└── hustle_board

-- Personal (You)
calendar_events
├── maintenance_reminders
├── travel_timeline
└── personal_insights
```

## External Integrations

### Mapping & Travel
- **Mapbox GL JS**: Interactive maps and routing
- **Directions API**: Route calculations and optimization
- **Geocoding**: Address to coordinates conversion
- **Weather APIs**: Route and destination weather

### AI & Communication
- **OpenAI**: Chat completions and embeddings
- **WebSocket**: Real-time PAM communication
- **Intent Classification**: Message routing to appropriate nodes

### Authentication & Data
- **Supabase**: Authentication, database, real-time subscriptions
- **Row Level Security**: Data privacy and access control

## Performance Optimizations

### Frontend Performance
```typescript
// Code splitting for large components
const WheelsPage = lazy(() => import('./pages/Wheels'));
const PAMChat = lazy(() => import('./components/pam/PamMobileChat'));

// Memoized expensive calculations
const useBudgetCalculations = useMemo(() => {
  return calculateBudgetInsights(expenses, budgets);
}, [expenses, budgets]);

// Virtual scrolling for large datasets
const VirtualizedExpenseList = ({ expenses }) => {
  // Handle thousands of expense records efficiently
};
```

### WebSocket Optimization
```typescript
// Connection pooling and retry logic
const usePamWebSocketConnection = () => {
  const [connectionState, setConnectionState] = useState('connecting');
  const [retryCount, setRetryCount] = useState(0);
  
  // Exponential backoff for reconnection
  // Message queuing during disconnection
  // Automatic cleanup on unmount
};
```

### Caching Strategy
```
Browser Cache → Service Worker → Application State → Supabase Cache → Database
```

## Security Architecture

### Multi-layer Security
```
1. Frontend: Input validation, XSS protection
2. WebSocket: JWT token validation, rate limiting
3. API: Authentication middleware, request validation
4. Database: Row Level Security (RLS), audit logging
5. Infrastructure: HTTPS, CORS, environment isolation
```

### PAM Security
- Message content filtering
- User context isolation
- Rate limiting per user
- Audit logging of all interactions
- Secure WebSocket connections

## Deployment & Scalability

### Current Architecture
```
Frontend (Vercel) ←→ Backend (Render.com) ←→ Database (Supabase)
                ↕
        WebSocket Connection
                ↕
         PAM AI Nodes
```

### Scaling Considerations
- Horizontal scaling of AI nodes
- WebSocket connection load balancing
- Database read replicas for analytics
- CDN for static assets and maps
- Background job processing for heavy AI tasks

## Development Guidelines

### Component Organization
- Keep components under 200 lines
- Extract hooks for complex logic
- Use compound components for flexibility
- Implement progressive enhancement

### PAM Integration
- Always provide fallback functionality
- Handle connection states gracefully
- Log interactions for debugging
- Test both connected and offline modes

### Code Quality
- TypeScript strict mode
- Comprehensive error boundaries
- Unit tests for critical paths
- E2E tests for user journeys

This architecture supports the current PAM system while providing a foundation for future AI enhancements and feature expansion.
