# PAM Backend Architecture

Comprehensive guide to the PAM Backend architecture, design patterns, and implementation details.

## 🏗️ Architecture Overview

The PAM Backend follows a layered architecture pattern with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway Layer                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │   FastAPI   │ │  WebSocket  │ │     Health/Metrics     │ │
│  │  REST API   │ │   Manager   │ │      Endpoints         │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                  Middleware Layer                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │  Security   │ │    Rate     │ │      Monitoring        │ │
│  │ Middleware  │ │  Limiting   │ │     Middleware         │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                 PAM AI Orchestration                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │   Intent    │ │    Node     │ │       Context          │ │
│  │ Recognition │ │   Router    │ │      Manager           │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │  Wins Node  │ │ Wheels Node │ │       You Node         │ │
│  │ (Financial) │ │  (Travel)   │ │    (Personal)          │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │  Database   │ │    Cache    │ │      External API      │ │
│  │   Service   │ │   Service   │ │       Services         │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                Infrastructure Layer                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │ PostgreSQL  │ │    Redis    │ │       External         │ │
│  │ (Supabase)  │ │    Cache    │ │       Services         │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Core Components

### FastAPI Application (app/main.py)

The main application entry point with:
- **Lifespan Management**: Startup/shutdown hooks for resource initialization
- **Middleware Stack**: Security, monitoring, rate limiting, CORS
- **Router Registration**: API endpoint organization
- **Global Exception Handling**: Centralized error management

```python
app = FastAPI(
    title="PAM Backend API",
    description="High-performance Personal Assistant Manager Backend",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/api/docs" if settings.ENVIRONMENT != "production" else None
)
```

### API Layer (app/api/)

**Structure**:
```
app/api/
├── v1/                    # API version 1
│   ├── health.py         # Health check endpoints
│   ├── monitoring.py     # Metrics and monitoring
│   ├── pam.py           # PAM AI WebSocket & REST
│   ├── chat.py          # Chat functionality
│   ├── wins.py          # Financial management
│   ├── wheels.py        # Travel & vehicles
│   ├── you.py           # Personal organization
│   ├── social.py        # Social features
│   └── actions.py       # Action endpoints
└── deps.py              # Dependency injection
```

**Key Features**:
- **Dependency Injection**: Centralized dependency management
- **Rate Limiting**: Per-endpoint rate limiting configuration
- **Validation**: Pydantic schema validation
- **Error Handling**: Consistent error response format

### PAM AI Orchestration System

**Multi-Node Architecture**:

1. **Intent Recognition**: Analyzes user input to determine intent
2. **Node Router**: Routes requests to appropriate specialized nodes
3. **Context Manager**: Maintains conversation context and user state
4. **Action Planner**: Generates executable action sequences

**Specialized Nodes**:
- **Wins Node**: Financial management (budgets, expenses, income)
- **Wheels Node**: Travel and vehicle management
- **You Node**: Personal organization (calendar, tasks, food management)
- **Social Node**: Community features and social interactions

### WebSocket Manager (app/services/websocket_manager.py)

Real-time communication system featuring:
- **Connection Management**: Handle WebSocket connections and disconnections
- **Message Routing**: Route messages to appropriate handlers
- **Session Persistence**: Maintain persistent chat sessions
- **Error Recovery**: Automatic reconnection and error handling

### Security Architecture

**Multi-layered Security**:

1. **Authentication Middleware**: JWT token validation
2. **Rate Limiting**: Configurable per-endpoint limits
3. **CORS Protection**: Secure cross-origin requests
4. **Input Validation**: Comprehensive request validation
5. **Security Headers**: Standard security headers

**Security Middleware Stack**:
```python
# Security middleware (applied in order)
app.add_middleware(MonitoringMiddleware)
setup_security_middleware(app)
setup_middleware(app)
```

## 🗄️ Data Layer

### Database Design

**Supabase/PostgreSQL Integration**:
- **Row Level Security (RLS)**: User data isolation
- **Connection Pooling**: Optimized database connections
- **Transaction Management**: ACID compliance
- **Migration System**: Version-controlled schema changes

### Caching Strategy

**Redis Integration**:
- **Session Caching**: User session and context data
- **Response Caching**: API response caching
- **Rate Limit Storage**: Rate limiting counters
- **Background Task Queues**: Async job processing

### Service Layer (app/services/)

**Core Services**:

1. **Database Service**: 
   - Connection pool management
   - Query optimization
   - Transaction handling

2. **Cache Service**:
   - Redis connection management
   - Cache key strategies
   - TTL management

3. **Monitoring Service**:
   - Metrics collection
   - Performance tracking
   - Health checks

4. **Sentry Service**:
   - Error tracking
   - Performance monitoring
   - Custom alerts

## 🔄 Request Flow

### REST API Request Flow

```
1. Request → Security Middleware
2. Security Middleware → Rate Limiting
3. Rate Limiting → Monitoring Middleware
4. Monitoring Middleware → API Endpoint
5. API Endpoint → PAM Orchestrator (if AI request)
6. PAM Orchestrator → Specialized Node
7. Specialized Node → Database/External APIs
8. Response ← Chain reverses
```

### WebSocket Request Flow

```
1. WebSocket Connection → Authentication
2. Authentication → Connection Manager
3. Message Received → Message Handler
4. Message Handler → PAM Orchestrator
5. PAM Orchestrator → Specialized Node
6. Specialized Node → Database/External APIs
7. Response → WebSocket Send
8. UI Actions → Frontend Updates
```

## 📊 Monitoring & Observability

### Metrics Collection

**Prometheus Integration**:
- Request duration histograms
- Request rate counters
- Error rate tracking
- System resource metrics

**Custom Metrics**:
- PAM node performance
- WebSocket connection counts
- Cache hit rates
- Database query performance

### Logging Strategy

**Structured Logging**:
```python
logger = setup_logging()
logger.info("PAM request processed", extra={
    "user_id": user_id,
    "intent": intent,
    "processing_time_ms": duration,
    "node_used": node_name
})
```

**Log Levels**:
- **DEBUG**: Development debugging
- **INFO**: General information
- **WARNING**: Potential issues
- **ERROR**: Error conditions
- **CRITICAL**: System failures

### Error Tracking

**Sentry Integration**:
- Automatic error capture
- Performance transaction tracking
- Custom context and tags
- Real-time alerting

## 🚀 Performance Optimizations

### Connection Management

**Database Connection Pooling**:
```python
DATABASE_POOL_SIZE: int = 20
DATABASE_MAX_OVERFLOW: int = 30
```

**Redis Connection Pooling**:
```python
redis_pool = redis.ConnectionPool(
    connection_class=redis.Connection,
    max_connections=50
)
```

### Caching Strategy

**Multi-level Caching**:
1. **Application Cache**: In-memory caching for hot data
2. **Redis Cache**: Distributed caching for session data
3. **Database Cache**: Query result caching

### Async Processing

**Non-blocking Operations**:
- Async database operations
- Async HTTP client requests
- Background task processing
- WebSocket async handlers

## 🧪 Testing Architecture

### Test Structure

```
tests/
├── unit/                 # Unit tests
│   ├── test_pam_nodes.py
│   ├── test_services.py
│   └── test_utils.py
├── integration/          # Integration tests
│   ├── test_database.py
│   ├── test_redis.py
│   └── test_api_flow.py
├── api/                  # API tests
│   ├── test_endpoints.py
│   ├── test_websocket.py
│   └── test_auth.py
└── conftest.py          # Test configuration
```

### Testing Strategy

**Test Types**:
1. **Unit Tests**: Individual component testing
2. **Integration Tests**: Service integration testing
3. **API Tests**: Endpoint functionality testing
4. **WebSocket Tests**: Real-time communication testing
5. **Performance Tests**: Load and stress testing

## 🔧 Configuration Management

### Environment-based Configuration

**Settings Management** (app/core/config.py):
```python
class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    VERSION: str = "2.0.0"
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    
    # Database
    DATABASE_URL: str
    DATABASE_POOL_SIZE: int = 20
    
    # External APIs
    OPENAI_API_KEY: str
    SUPABASE_URL: str
    SUPABASE_KEY: str
```

### Feature Flags

**Dynamic Configuration**:
- Feature toggles for new functionality
- A/B testing support
- Gradual rollout capabilities

## 🚀 Deployment Architecture

### Container Strategy

**Docker Configuration**:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Production Considerations

**Scaling Strategy**:
1. **Horizontal Scaling**: Multiple application instances
2. **Load Balancing**: Distribute traffic across instances
3. **Database Scaling**: Read replicas and connection pooling
4. **Cache Scaling**: Redis clustering

**Health Checks**:
- Application health endpoints
- Database connectivity checks
- External service availability
- Resource utilization monitoring

## 🔮 Future Architecture Considerations

### Microservices Evolution

**Potential Service Split**:
- Authentication Service
- PAM AI Service
- Financial Service (Wins)
- Travel Service (Wheels)
- Personal Service (You)
- Social Service

### Event-Driven Architecture

**Future Enhancements**:
- Event sourcing for audit trails
- CQRS for read/write separation
- Message queuing for async processing
- Real-time event streaming

### AI/ML Integration

**Advanced AI Features**:
- Model serving infrastructure
- Feature stores for ML
- A/B testing for AI models
- Real-time model inference

---

*This architecture document reflects the current state of PAM Backend v2.0.0 and provides guidance for future development and scaling.*