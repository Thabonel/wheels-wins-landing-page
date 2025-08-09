
# PAM Backend Architecture

## System Overview

The PAM Backend is a modern, scalable API service built with Python and FastAPI, designed to support a comprehensive personal assistant application for nomadic lifestyles.

## Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │    │    Web App      │    │  Admin Portal   │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │      Load Balancer       │
                    │       (Nginx)            │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │     FastAPI Backend      │
                    │    (Multiple Workers)    │
                    └─────────────┬─────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
┌───────▼───────┐    ┌────────────▼──────────┐    ┌────────▼────────┐
│   Supabase    │    │       Redis           │    │   Celery        │
│   Database    │    │      (Cache)          │    │   Workers       │
└───────────────┘    └───────────────────────┘    └─────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │    External APIs         │
                    │  - OpenAI               │
                    │  - Mapbox               │
                    │  - Weather APIs         │
                    └─────────────────────────┘
```

## Core Components

### 1. FastAPI Application Layer

#### Main Application (`app/main.py`)
- CORS configuration
- Middleware setup
- Router registration
- Exception handling
- Startup/shutdown events

#### API Routers
- **Authentication** (`/api/v1/auth`): User registration, login, JWT management
- **PAM Chat** (`/api/v1/chat`): AI conversation handling
- **Wins** (`/api/v1/wins`): Financial management
- **Wheels** (`/api/v1/wheels`): Travel and maintenance
- **Social** (`/api/v1/social`): Community features
- **Health** (`/api/health`): System monitoring

### 2. Service Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   API Layer                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │
│  │    Auth     │ │    Chat     │ │   Wheels    │ ...  │
│  │  Endpoints  │ │  Endpoints  │ │  Endpoints  │      │
│  └─────────────┘ └─────────────┘ └─────────────┘      │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                Service Layer                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │
│  │ Auth Service│ │PAM Service  │ │Cache Service│ ...  │
│  │             │ │             │ │             │      │
│  └─────────────┘ └─────────────┘ └─────────────┘      │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                Data Layer                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │
│  │  Supabase   │ │    Redis    │ │   OpenAI    │ ...  │
│  │  Database   │ │    Cache    │ │     API     │      │
│  └─────────────┘ └─────────────┘ └─────────────┘      │
└─────────────────────────────────────────────────────────┘
```

### 3. PAM AI System

#### Intelligent Conversation Engine
```python
class IntelligentConversation:
    def __init__(self):
        self.context_manager = ContextManager()
        self.memory_system = MemorySystem()
        self.intent_classifier = IntentClassifier()
        self.response_generator = ResponseGenerator()
    
    async def process_message(self, message: str, user_context: dict):
        # Intent classification
        intent = await self.intent_classifier.classify(message)
        
        # Context retrieval
        context = await self.context_manager.get_context(user_context)
        
        # Memory integration
        memories = await self.memory_system.retrieve_relevant(message)
        
        # Response generation
        response = await self.response_generator.generate(
            message, intent, context, memories
        )
        
        return response
```

#### Node-Based Processing
- **Base Node**: Abstract processing unit
- **Wins Node**: Financial query processing
- **Wheels Node**: Travel-related processing
- **Social Node**: Community interaction processing
- **Context Node**: User context management

### 4. Database Architecture

#### Supabase Schema Design

**Core Tables:**
```sql
-- User profiles and authentication
profiles (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE,
    full_name TEXT,
    preferences JSONB,
    created_at TIMESTAMP
);

-- PAM conversations and messages
conversations (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    title TEXT,
    status conversation_status,
    created_at TIMESTAMP
);

messages (
    id UUID PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id),
    content TEXT,
    role message_role,
    metadata JSONB,
    created_at TIMESTAMP
);

-- Financial data
expenses (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    amount DECIMAL,
    category TEXT,
    description TEXT,
    date DATE,
    location TEXT
);

-- Travel data
maintenance_records (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    task TEXT,
    date DATE,
    mileage INTEGER,
    cost DECIMAL,
    location TEXT
);
```

**Row Level Security (RLS):**
```sql
-- Users can only access their own data
CREATE POLICY user_isolation ON profiles 
FOR ALL USING (auth.uid() = id);

CREATE POLICY user_expenses ON expenses 
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY user_conversations ON conversations 
FOR ALL USING (auth.uid() = user_id);
```

### 5. Caching Strategy

#### Redis Cache Layers
```python
# Cache Configuration
CACHE_CONFIG = {
    "user_profiles": {"ttl": 3600, "key_pattern": "user:{user_id}"},
    "chat_context": {"ttl": 1800, "key_pattern": "context:{user_id}"},
    "expense_summaries": {"ttl": 900, "key_pattern": "expenses:{user_id}:{period}"},
    "maintenance_records": {"ttl": 1800, "key_pattern": "maintenance:{user_id}"},
    "conversation_history": {"ttl": 3600, "key_pattern": "chat_history:{conversation_id}"}
}
```

#### Cache Invalidation Strategy
- **Write-through**: Update cache on data modification
- **TTL-based**: Automatic expiration for time-sensitive data
- **Event-driven**: Invalidate on specific user actions

### 6. Background Processing

#### Celery Task Queue
```python
# Task Categories
CELERY_ROUTES = {
    'analytics.*': {'queue': 'analytics'},
    'notifications.*': {'queue': 'notifications'},
    'maintenance.*': {'queue': 'maintenance'},
    'cleanup.*': {'queue': 'cleanup'}
}

# Scheduled Tasks
CELERY_BEAT_SCHEDULE = {
    'daily-analytics': {
        'task': 'analytics.generate_daily_reports',
        'schedule': crontab(hour=2, minute=0),
    },
    'maintenance-reminders': {
        'task': 'maintenance.check_due_tasks',
        'schedule': crontab(hour=8, minute=0),
    }
}
```

### 7. Security Architecture

#### Authentication Flow
```
1. User Login → JWT Token Generation
2. Token Validation → Request Processing
3. Authorization Check → Resource Access
4. Response → Token Refresh (if needed)
```

#### Security Layers
- **API Rate Limiting**: Prevent abuse
- **Input Validation**: Pydantic models
- **SQL Injection Prevention**: Parameterized queries
- **CORS Configuration**: Cross-origin restrictions
- **HTTPS Enforcement**: SSL/TLS encryption

### 8. Monitoring and Observability

#### Health Check System
```python
class HealthChecker:
    async def check_database(self) -> HealthStatus:
        # Database connectivity and query performance
        
    async def check_redis(self) -> HealthStatus:
        # Cache availability and response time
        
    async def check_external_apis(self) -> HealthStatus:
        # OpenAI, Mapbox API status
        
    async def check_system_resources(self) -> HealthStatus:
        # CPU, memory, disk usage
```

#### Logging Strategy
- **Structured Logging**: JSON format for easy parsing
- **Log Levels**: DEBUG, INFO, WARNING, ERROR, CRITICAL
- **Context Preservation**: User ID, request ID tracking
- **Performance Metrics**: Response times, query counts

### 9. Scalability Considerations

#### Horizontal Scaling
- **Stateless Services**: No server-side session storage
- **Database Connection Pooling**: Efficient resource usage
- **Load Balancing**: Multiple FastAPI workers
- **Caching**: Reduce database load

#### Performance Optimization
- **Database Indexing**: Optimized query performance
- **Query Optimization**: Efficient data retrieval
- **Async Processing**: Non-blocking operations
- **CDN Integration**: Static asset delivery

### 10. Data Flow Patterns

#### Chat Message Processing
```
User Message → Intent Classification → Context Retrieval → 
Memory Integration → Response Generation → Action Execution → 
Response Delivery → Context Update → Memory Storage
```

#### Financial Data Processing
```
Expense Input → Validation → Category Classification → 
Budget Impact Calculation → Database Storage → 
Cache Update → Analytics Update → Notification Trigger
```

## Technology Stack

### Core Technologies
- **Python 3.11+**: Primary programming language
- **FastAPI**: Web framework and API development
- **Pydantic**: Data validation and serialization
- **SQLAlchemy**: Database ORM (if needed)
- **Alembic**: Database migrations

### Data Storage
- **Supabase**: Primary database (PostgreSQL)
- **Redis**: Caching and session storage
- **S3-compatible**: File storage (images, documents)

### External Integrations
- **OpenAI API**: GPT models for conversation
- **Mapbox API**: Maps and geocoding
- **Weather APIs**: Location-based weather data
- **Email Services**: Notifications and alerts

### Infrastructure
- **Docker**: Containerization
- **Nginx**: Reverse proxy and load balancing
- **Celery**: Background task processing
- **Redis**: Message broker for Celery

## Development Patterns

### Dependency Injection
```python
# Service registration
container = Container()
container.wire(modules=[__name__])

# Service usage
@inject
async def chat_endpoint(
    request: ChatRequest,
    chat_service: ChatService = Depends(Provide[Container.chat_service])
):
    return await chat_service.process_message(request)
```

### Error Handling
```python
# Custom exception handling
class PAMException(Exception):
    def __init__(self, message: str, code: str, status_code: int = 400):
        self.message = message
        self.code = code
        self.status_code = status_code

@app.exception_handler(PAMException)
async def pam_exception_handler(request: Request, exc: PAMException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message
            }
        }
    )
```

### Testing Strategy
- **Unit Tests**: Individual component testing
- **Integration Tests**: Database and API testing
- **End-to-End Tests**: Complete workflow testing
- **Performance Tests**: Load and stress testing

This architecture provides a solid foundation for the PAM application, ensuring scalability, maintainability, and performance while supporting the complex requirements of a personal assistant system.
