# Backend Architecture Context (backend/)

## 🎯 Backend Overview

The Wheels & Wins backend is a modern FastAPI-based Python application designed for high-performance, scalable RV travel and financial management services with AI-powered capabilities through PAM.

## 🏗️ Architecture Patterns

### Microservices Design
- **Service-Oriented Architecture**: Modular, independent services
- **Async Processing**: Full async/await implementation
- **Event-Driven**: Redis-based message queuing with Celery
- **API Gateway**: Centralized request routing and authentication

### Core Technologies
- **FastAPI**: Modern Python web framework with automatic OpenAPI
- **PostgreSQL**: Primary database with advanced features
- **Redis**: Caching and message queue
- **Celery**: Distributed task processing
- **WebSocket**: Real-time communication

## 📁 Directory Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI application entry point
│   ├── api/
│   │   └── v1/              # API version 1 endpoints
│   │       ├── auth.py      # Authentication endpoints
│   │       ├── pam.py       # PAM AI assistant endpoints
│   │       ├── trips.py     # Trip planning endpoints
│   │       ├── expenses.py  # Financial tracking endpoints
│   │       └── users.py     # User management endpoints
│   ├── core/
│   │   ├── config.py        # Application configuration
│   │   ├── security.py      # Security utilities
│   │   ├── database.py      # Database connection and ORM
│   │   ├── logging.py       # Structured logging setup
│   │   └── exceptions.py    # Custom exception handling
│   ├── services/
│   │   ├── pam/             # PAM AI service modules
│   │   ├── auth/            # Authentication services
│   │   ├── external/        # Third-party integrations
│   │   └── data/            # Data processing services
│   ├── models/
│   │   ├── database/        # Database models (SQLAlchemy)
│   │   ├── pydantic/        # Request/response models
│   │   └── enums.py         # Enumeration definitions
│   └── utils/
│       ├── datetime_encoder.py  # JSON serialization utilities
│       ├── validators.py    # Input validation functions
│       └── formatters.py    # Data formatting utilities
├── migrations/              # Database migration files
├── tests/                   # Test suite
├── scripts/                 # Deployment and utility scripts
└── requirements.txt         # Python dependencies
```

## 🚀 FastAPI Application Structure

### Main Application (main.py)
```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import auth, pam, trips, expenses, users
from app.core.config import settings
from app.core.middleware import setup_middleware

app = FastAPI(
    title="Wheels & Wins API",
    description="RV Travel & Financial Management Platform",
    version="2.1.0",
    docs_url="/api/docs" if settings.ENVIRONMENT != "production" else None
)

# Middleware setup
setup_middleware(app)

# API Routes
app.include_router(auth.router, prefix="/api/v1/auth", tags=["authentication"])
app.include_router(pam.router, prefix="/api/v1/pam", tags=["pam-ai"])
app.include_router(trips.router, prefix="/api/v1/trips", tags=["trip-planning"])
app.include_router(expenses.router, prefix="/api/v1/expenses", tags=["financial"])
app.include_router(users.router, prefix="/api/v1/users", tags=["user-management"])
```

### Configuration Management (core/config.py)
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    DATABASE_POOL_SIZE: int = 20
    DATABASE_POOL_MAX_OVERFLOW: int = 30
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    REDIS_CACHE_TTL: int = 3600
    
    # Authentication
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    
    # External APIs
    OPENAI_API_KEY: str
    MAPBOX_TOKEN: str
    STRIPE_SECRET_KEY: str
    
    # Application
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    ALLOWED_HOSTS: list[str] = ["*"]
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
```

## 🤖 PAM AI Service Architecture

### PAM Core Service (services/pam/)
```
pam/
├── enhanced_orchestrator.py    # Main AI orchestration
├── context_manager.py          # Conversation context
├── intelligent_conversation.py # NLP processing
├── tools/                      # PAM tool integrations
│   ├── trip_planner.py         # Trip planning tools
│   ├── expense_analyzer.py     # Financial analysis tools
│   ├── weather_service.py      # Weather integration
│   └── navigation_service.py   # Route optimization
├── mcp/                        # Model Context Protocol
│   ├── models/                 # MCP data models
│   ├── clients/                # MCP client implementations
│   └── integrations/           # External MCP integrations
└── voice/                      # Voice interface
    ├── speech_to_text.py       # STT service
    ├── text_to_speech.py       # TTS service
    └── voice_commands.py       # Voice command processing
```

### WebSocket Implementation (api/v1/pam.py)
```python
@router.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    token: str = Query(...),
    orchestrator: PamOrchestrator = Depends(get_pam_orchestrator)
):
    # Authenticate WebSocket connection
    user = await verify_websocket_token(token, user_id)
    if not user:
        await websocket.close(code=1008, reason="Authentication failed")
        return
    
    await websocket.accept()
    logger.info(f"PAM WebSocket connected for user {user_id}")
    
    try:
        while True:
            # Receive message from client
            raw_data = await websocket.receive_json()
            
            # Process message through orchestrator
            response = await orchestrator.process_message(
                message=raw_data.get("message"),
                context=raw_data.get("context", {}),
                user_id=user_id
            )
            
            # Send response back to client
            await safe_websocket_send(websocket, response)
            
    except WebSocketDisconnect:
        logger.info(f"PAM WebSocket disconnected for user {user_id}")
    except Exception as e:
        logger.error(f"PAM WebSocket error for user {user_id}: {e}")
        await websocket.close(code=1011, reason="Internal error")
```

### AI Orchestration
- **OpenAI Integration**: GPT-4 for natural language processing
- **Context Management**: Conversation memory and context tracking
- **Tool Integration**: Dynamic tool calling for specialized tasks
- **Voice Processing**: Speech-to-text and text-to-speech capabilities
- **Real-time Streaming**: Streaming responses for better UX

## 🗄️ Database Architecture

### Database Models (models/database/)
```python
class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    trips = relationship("Trip", back_populates="user")
    expenses = relationship("Expense", back_populates="user")
    pam_conversations = relationship("PamConversation", back_populates="user")

class Trip(Base):
    __tablename__ = "trips"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    start_date = Column(Date)
    end_date = Column(Date)
    status = Column(Enum(TripStatus), default=TripStatus.PLANNING)
    
    # JSON fields for complex data
    waypoints = Column(JSON)
    route_data = Column(JSON)
    preferences = Column(JSON)
    
    # Relationships
    user = relationship("User", back_populates="trips")
    expenses = relationship("Expense", back_populates="trip")

class Expense(Base):
    __tablename__ = "expenses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    trip_id = Column(UUID(as_uuid=True), ForeignKey("trips.id"), nullable=True)
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="USD")
    category = Column(Enum(ExpenseCategory), nullable=False)
    description = Column(String, nullable=False)
    date = Column(Date, nullable=False)
    
    # Metadata
    merchant = Column(String)
    location = Column(JSON)  # {lat, lng, address}
    receipt_url = Column(String)
    
    # Relationships
    user = relationship("User", back_populates="expenses")
    trip = relationship("Trip", back_populates="expenses")
```

### Database Features
- **UUID Primary Keys**: Secure, non-sequential identifiers
- **JSON Columns**: Flexible schema for complex data
- **Temporal Data**: Created/updated timestamps on all entities
- **Soft Deletes**: Logical deletion for data recovery
- **Audit Trails**: Change tracking for sensitive operations

## 🔐 Security Implementation

### Authentication & Authorization
```python
from fastapi_users import FastAPIUsers
from fastapi_users.authentication import JWTAuthentication

# JWT Authentication
jwt_authentication = JWTAuthentication(
    secret=settings.SECRET_KEY,
    lifetime_seconds=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    tokenUrl="/api/v1/auth/login",
)

# User manager
user_manager = UserManager(UserDatabase(database))

# FastAPI Users integration
fastapi_users = FastAPIUsers(user_manager, [jwt_authentication])

# Dependencies
current_user = fastapi_users.current_user(active=True, verified=True)
current_superuser = fastapi_users.current_user(active=True, superuser=True)
```

### Security Features
- **JWT Tokens**: Stateless authentication with refresh tokens
- **Password Hashing**: bcrypt with configurable rounds
- **Rate Limiting**: Request throttling by IP and user
- **Input Validation**: Pydantic model validation
- **SQL Injection Prevention**: SQLAlchemy ORM protection
- **CORS Configuration**: Proper cross-origin resource sharing
- **Security Headers**: Comprehensive security header middleware

### Data Protection
```python
from cryptography.fernet import Fernet

class EncryptionService:
    def __init__(self, key: bytes):
        self.cipher = Fernet(key)
    
    def encrypt(self, data: str) -> str:
        return self.cipher.encrypt(data.encode()).decode()
    
    def decrypt(self, encrypted_data: str) -> str:
        return self.cipher.decrypt(encrypted_data.encode()).decode()

# Encrypt sensitive fields
@hybrid_property
def encrypted_ssn(self):
    return self._ssn

@encrypted_ssn.setter
def encrypted_ssn(self, value):
    self._ssn = encryption_service.encrypt(value)
```

## 🚀 Performance Optimization

### Caching Strategy (services/cache_manager.py)
```python
class CacheManager:
    def __init__(self):
        self.redis = redis.Redis.from_url(settings.REDIS_URL)
        self.memory_cache = {}
    
    async def get_or_set(self, key: str, fetcher: Callable, ttl: int = 3600):
        # Try memory cache first
        if key in self.memory_cache:
            return self.memory_cache[key]
        
        # Try Redis cache
        cached = await self.redis.get(key)
        if cached:
            value = json.loads(cached)
            self.memory_cache[key] = value
            return value
        
        # Fetch and cache
        value = await fetcher()
        await self.redis.setex(key, ttl, json.dumps(value, cls=DateTimeEncoder))
        self.memory_cache[key] = value
        return value
```

### Database Optimization
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Indexed queries and eager loading
- **Read Replicas**: Separate read/write database instances
- **Pagination**: Cursor-based pagination for large datasets

### Background Processing (Celery)
```python
from celery import Celery

celery_app = Celery(
    "wheels_wins",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks"]
)

@celery_app.task
async def process_expense_import(user_id: str, file_data: bytes):
    """Process bank statement import in background"""
    try:
        expenses = await parse_bank_statement(file_data)
        for expense in expenses:
            await create_expense(user_id, expense)
        return {"status": "success", "count": len(expenses)}
    except Exception as e:
        logger.error(f"Expense import failed for user {user_id}: {e}")
        return {"status": "error", "message": str(e)}

@celery_app.task
async def optimize_trip_route(trip_id: str):
    """Optimize trip route using AI in background"""
    trip = await get_trip(trip_id)
    optimized_route = await ai_route_optimizer.optimize(trip.waypoints)
    await update_trip_route(trip_id, optimized_route)
    return {"status": "success", "route": optimized_route}
```

## 📊 Monitoring & Logging

### Structured Logging (core/logging.py)
```python
import structlog
from app.core.config import settings

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()
```

### Health Monitoring
```python
@router.get("/health")
async def health_check():
    """Comprehensive health check endpoint"""
    checks = {
        "database": await check_database_health(),
        "redis": await check_redis_health(),
        "external_apis": await check_external_apis(),
        "memory_usage": get_memory_usage(),
        "disk_usage": get_disk_usage(),
    }
    
    overall_status = "healthy" if all(checks.values()) else "degraded"
    
    return {
        "status": overall_status,
        "timestamp": datetime.utcnow().isoformat(),
        "version": "2.1.0",
        "checks": checks
    }
```

## 🧪 Testing Strategy

### Test Structure
```
tests/
├── unit/               # Unit tests for individual components
│   ├── test_services/  # Service layer tests
│   ├── test_models/    # Model validation tests
│   └── test_utils/     # Utility function tests
├── integration/        # Integration tests
│   ├── test_api/       # API endpoint tests
│   ├── test_database/  # Database operation tests
│   └── test_external/  # External service tests
├── load/              # Performance and load tests
│   ├── test_api_load.py
│   └── test_websocket_load.py
└── conftest.py        # Pytest configuration and fixtures
```

### Testing Tools
- **pytest**: Test runner and fixtures
- **pytest-asyncio**: Async test support
- **httpx**: Async HTTP client for API testing
- **factory_boy**: Test data generation
- **pytest-benchmark**: Performance benchmarking

## 🚀 Deployment Architecture

### Production Deployment (Render)
```yaml
# render.yaml
services:
  - type: web
    name: pam-backend
    env: python
    buildCommand: "pip install -r requirements.txt"
    startCommand: "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
    
  - type: worker
    name: pam-celery-worker
    env: python
    buildCommand: "pip install -r requirements.txt"
    startCommand: "celery -A app.celery worker --loglevel=info"
    
  - type: worker
    name: pam-celery-beat
    env: python
    buildCommand: "pip install -r requirements.txt"
    startCommand: "celery -A app.celery beat --loglevel=info"
    
  - type: redis
    name: pam-redis
    plan: starter
```

### Environment Configuration
- **Development**: Local development with hot reloading
- **Staging**: Full production simulation
- **Production**: Optimized for performance and reliability

---

**Backend Architecture Version**: 2.1  
**Last Updated**: January 31, 2025  
**Python Version**: 3.11+  
**API Endpoints**: 100+ endpoints  
**Test Coverage**: 90%+