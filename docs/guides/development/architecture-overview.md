
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
│   └── [feature]/      # Feature-specific components
├── hooks/              # Custom React hooks
├── context/            # React context providers
├── pages/              # Route components
├── lib/                # Utility functions
└── types/              # TypeScript type definitions
```

### Design Patterns

#### Component Composition
```typescript
// Compound component pattern
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>

// Hook composition
const useFeature = () => {
  const auth = useAuth();
  const data = useQuery(...);
  const mutation = useMutation(...);
  
  return { auth, data, mutation };
};
```

#### Context for State Management
```typescript
const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // Auth logic
  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
```

## Backend Architecture (FastAPI + Python)

### Layer Structure
```
pam-backend/
├── app/
│   ├── api/            # API route handlers
│   ├── core/           # Core functionality
│   │   ├── config.py   # Configuration
│   │   ├── security.py # Auth & security
│   │   └── logging.py  # Logging setup
│   ├── database/       # Database connections
│   ├── models/         # Data models
│   ├── services/       # Business logic
│   └── utils/          # Utility functions
```

### Design Patterns

#### Dependency Injection
```python
# FastAPI dependency injection
def get_db():
    return database_connection

def get_current_user(token: str = Depends(oauth2_scheme)):
    # Validate token and return user
    return user

@app.post("/api/protected")
async def protected_route(
    db: Database = Depends(get_db),
    user: User = Depends(get_current_user)
):
    # Route logic with injected dependencies
```

#### Service Layer Pattern
```python
class UserService:
    def __init__(self, db: Database):
        self.db = db
    
    async def create_user(self, user_data: UserCreate) -> User:
        # Business logic for user creation
        
    async def get_user(self, user_id: str) -> User:
        # Business logic for user retrieval
```

## Database Architecture (Supabase/PostgreSQL)

### Schema Design
```sql
-- Core entities
users (profiles)
├── auth (Supabase Auth)
├── user_settings
├── user_knowledge
└── user_sessions

-- Content & Social
posts
├── comments
├── likes
└── content_moderation

-- Financial
budgets
├── budget_categories
├── expenses
└── income_tracking

-- System
system_settings
├── audit_logs
└── api_logs
```

### Security Model
- Row Level Security (RLS) for all tables
- Role-based access control
- API key authentication
- JWT token validation

## API Design

### RESTful Conventions
```
GET    /api/users           # List users
GET    /api/users/{id}      # Get user
POST   /api/users           # Create user
PUT    /api/users/{id}      # Update user
DELETE /api/users/{id}      # Delete user
```

### Error Handling
```python
# Consistent error responses
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {...}
  }
}
```

## External Integrations

### OpenAI Integration
- Chat completions for AI responses
- Embeddings for knowledge search
- Rate limiting and error handling
- Token usage monitoring

### Supabase Integration
- Authentication & user management
- Real-time subscriptions
- File storage
- Database queries with RLS

### Third-party Services
- **Stripe**: Payment processing
- **Twilio**: SMS notifications
- **SendGrid**: Email delivery
- **Sentry**: Error monitoring

## Security Architecture

### Authentication Flow
```
1. User login → Supabase Auth
2. JWT token generation
3. Token validation on API requests
4. RLS policy enforcement
5. Audit logging
```

### Security Layers
- HTTPS everywhere
- JWT token authentication
- Row Level Security (RLS)
- Input validation & sanitization
- Rate limiting
- CORS configuration
- SQL injection protection

## Performance Considerations

### Frontend Optimization
- Code splitting with React.lazy()
- Component memoization
- Virtual scrolling for large lists
- Image optimization
- Bundle size monitoring

### Backend Optimization
- Database connection pooling
- Query optimization
- Caching strategies
- Async/await patterns
- Background task processing

### Caching Strategy
```
Browser Cache → CDN → Application Cache → Database
```

## Monitoring & Observability

### Logging
- Structured JSON logging
- Request/response logging
- Error tracking
- Performance metrics

### Monitoring Tools
- Health check endpoints
- Application metrics
- Database performance
- API response times
- Error rates and alerting

## Deployment Architecture

### Development
```
Local Development → Git → GitHub → Continuous Integration
```

### Production
```
GitHub → Render.com (Backend) → Vercel (Frontend) → CDN
```

### Infrastructure
- Container-based deployment
- Environment variable management
- Secrets management
- Database migrations
- Zero-downtime deployments

## Scalability Considerations

### Horizontal Scaling
- Stateless API design
- Database read replicas
- CDN for static assets
- Load balancing
- Microservices potential

### Vertical Scaling
- Database optimization
- Connection pooling
- Caching layers
- Background processing
- Resource monitoring

This architecture supports the current needs while providing a foundation for future growth and feature expansion.
