# PAM Backend Development Guide

Comprehensive guide for developing, testing, and contributing to the PAM Backend system.

## 🛠️ Development Setup

### Prerequisites

**Required Software**:
- Python 3.11+ (recommended: 3.11.7)
- PostgreSQL 14+ (or Supabase account)
- Redis 6.0+
- Git
- Docker & Docker Compose (optional but recommended)

**Recommended Tools**:
- VS Code with Python extension
- Postman or Insomnia for API testing
- Redis CLI for cache debugging
- pgAdmin or similar for database management

### Local Environment Setup

#### 1. Clone and Setup Repository

```bash
# Clone the repository
git clone <repository-url>
cd pam-backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt  # Development dependencies
```

#### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your configuration
nano .env  # or your preferred editor
```

**Required Environment Variables**:
```bash
# Application
ENVIRONMENT=development
DEBUG=true
SECRET_KEY=your-development-secret-key

# Database (use Supabase or local PostgreSQL)
DATABASE_URL=postgresql://username:password@localhost:5432/pam_backend
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key

# Redis
REDIS_URL=redis://localhost:6379

# External APIs
OPENAI_API_KEY=your-openai-api-key

# Optional: Monitoring
SENTRY_DSN=your-sentry-dsn  # Leave empty for development
```

#### 3. Database Setup

**Option A: Using Supabase (Recommended)**
```bash
# Database is already set up via Supabase
# Ensure SUPABASE_URL and SUPABASE_KEY are configured
```

**Option B: Local PostgreSQL**
```bash
# Create database
createdb pam_backend

# Run migrations (if available)
# alembic upgrade head
```

#### 4. Redis Setup

**Option A: Local Redis**
```bash
# Install and start Redis
# Ubuntu/Debian:
sudo apt-get install redis-server
sudo systemctl start redis-server

# macOS:
brew install redis
brew services start redis
```

**Option B: Docker Redis**
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

#### 5. Start Development Server

```bash
# Run the application
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or with environment variables
DEBUG=true uvicorn app.main:app --reload --log-level debug
```

**Verify Setup**:
- API Documentation: http://localhost:8000/api/docs
- Health Check: http://localhost:8000/api/health
- WebSocket Test: ws://localhost:8000/api/pam/ws?token=test

### Docker Development Setup

**Alternative setup using Docker Compose**:

```bash
# Build and start all services
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Run in background
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

## 🏗️ Project Structure Deep Dive

### Application Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application entry point
│   │
│   ├── api/                    # API layer
│   │   ├── __init__.py
│   │   ├── deps.py            # Dependency injection
│   │   └── v1/                # API version 1
│   │       ├── __init__.py
│   │       ├── health.py      # Health check endpoints
│   │       ├── monitoring.py  # Monitoring endpoints
│   │       ├── chat.py        # Basic chat endpoints
│   │       ├── pam.py         # PAM AI WebSocket & REST
│   │       ├── wins.py        # Financial management
│   │       ├── wheels.py      # Travel & vehicles
│   │       ├── you.py         # Personal organization
│   │       ├── social.py      # Social features
│   │       └── actions.py     # Action endpoints
│   │
│   ├── core/                  # Core functionality
│   │   ├── __init__.py
│   │   ├── config.py          # Configuration management
│   │   ├── security.py        # Authentication & authorization
│   │   ├── middleware.py      # Custom middleware
│   │   ├── security_middleware.py  # Security middleware
│   │   ├── monitoring_middleware.py # Monitoring middleware
│   │   ├── database_pool.py   # Database connection pooling
│   │   └── logging.py         # Logging configuration
│   │
│   ├── models/                # Data models
│   │   ├── __init__.py
│   │   ├── domain/            # Domain models
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── pam.py
│   │   │   ├── wins.py
│   │   │   ├── wheels.py
│   │   │   └── social.py
│   │   └── schemas/           # API schemas (Pydantic)
│   │       ├── __init__.py
│   │       ├── common.py
│   │       ├── auth.py
│   │       ├── pam.py
│   │       ├── wins.py
│   │       ├── wheels.py
│   │       └── social.py
│   │
│   ├── services/              # Business logic services
│   │   ├── __init__.py
│   │   ├── cache_service.py   # Redis caching service
│   │   ├── database.py        # Database service
│   │   ├── monitoring_service.py # Metrics and monitoring
│   │   ├── sentry_service.py  # Error tracking
│   │   ├── websocket_manager.py # WebSocket management
│   │   ├── pam/              # PAM AI services
│   │   │   ├── __init__.py
│   │   │   ├── orchestrator.py
│   │   │   └── nodes/
│   │   │       ├── __init__.py
│   │   │       ├── base_node.py
│   │   │       ├── wins_node.py
│   │   │       ├── wheels_node.py
│   │   │       ├── you_node.py
│   │   │       └── social_node.py
│   │   └── analytics/         # Analytics services
│   │       └── __init__.py
│   │
│   └── workers/               # Background tasks
│       ├── __init__.py
│       ├── celery.py         # Celery configuration
│       └── tasks/            # Celery tasks
│           ├── __init__.py
│           ├── analytics_tasks.py
│           ├── cleanup_tasks.py
│           ├── email_tasks.py
│           └── maintenance_tasks.py
```

### Code Organization Principles

1. **Separation of Concerns**: Each module has a single responsibility
2. **Dependency Injection**: Services are injected rather than imported
3. **Async First**: All I/O operations are async
4. **Type Hints**: Full type annotation for better IDE support
5. **Error Handling**: Comprehensive error handling and logging

## 🧪 Testing Guide

### Test Structure

```
tests/
├── conftest.py              # Pytest configuration and fixtures
├── unit/                    # Unit tests (fast, isolated)
│   ├── test_models.py
│   ├── test_services.py
│   ├── test_utils.py
│   └── test_pam_nodes.py
├── integration/             # Integration tests (with real services)
│   ├── test_database_integration.py
│   ├── test_redis_integration.py
│   └── test_external_apis.py
├── api/                     # API endpoint tests
│   ├── test_health_endpoints.py
│   ├── test_pam_endpoints.py
│   ├── test_wins_endpoints.py
│   └── test_websocket.py
└── performance/             # Performance and load tests
    ├── test_load.py
    └── test_websocket_load.py
```

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html --cov-report=term

# Run specific test categories
pytest tests/unit/           # Fast unit tests
pytest tests/integration/    # Integration tests
pytest tests/api/           # API tests

# Run specific test file
pytest tests/unit/test_pam_nodes.py

# Run with verbose output
pytest -v

# Run tests matching pattern
pytest -k "test_pam" -v
```

### Test Configuration

**pytest.ini**:
```ini
[tool:pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = 
    --strict-markers
    --disable-warnings
    --tb=short
markers =
    unit: Unit tests
    integration: Integration tests
    api: API tests
    slow: Slow tests
    websocket: WebSocket tests
```

### Writing Tests

**Unit Test Example**:
```python
# tests/unit/test_pam_nodes.py
import pytest
from app.services.pam.nodes.wins_node import WinsNode

class TestWinsNode:
    @pytest.fixture
    def wins_node(self):
        return WinsNode()
    
    async def test_process_budget_intent(self, wins_node):
        context = {"user_id": "test-user", "intent": "create_budget"}
        message = "Create a budget for groceries"
        
        result = await wins_node.process(message, context)
        
        assert result.intent == "create_budget"
        assert "budget" in result.content.lower()
        assert len(result.actions) > 0
```

**API Test Example**:
```python
# tests/api/test_pam_endpoints.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

class TestPamEndpoints:
    def test_chat_endpoint(self):
        response = client.post(
            "/api/pam/chat",
            json={
                "message": "Help me with my budget",
                "context": {"user_id": "test-user"}
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert "actions" in data
```

### Test Fixtures

**Common Fixtures** (conftest.py):
```python
import pytest
import asyncio
from unittest.mock import AsyncMock

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
async def mock_database():
    """Mock database service."""
    return AsyncMock()

@pytest.fixture
async def mock_cache():
    """Mock cache service."""
    return AsyncMock()

@pytest.fixture
def test_user():
    """Test user data."""
    return {
        "id": "test-user-id",
        "email": "test@example.com",
        "name": "Test User"
    }
```

## 🔧 Development Workflow

### Code Style and Formatting

**Required Tools**:
```bash
# Install development tools
pip install black isort pylint mypy pre-commit
```

**Code Formatting**:
```bash
# Format code with Black
black app/ tests/

# Sort imports with isort
isort app/ tests/

# Run linting
pylint app/

# Type checking
mypy app/
```

**Pre-commit Setup**:
```bash
# Install pre-commit hooks
pre-commit install

# Run manually
pre-commit run --all-files
```

**.pre-commit-config.yaml**:
```yaml
repos:
  - repo: https://github.com/psf/black
    rev: 23.1.0
    hooks:
      - id: black
  - repo: https://github.com/pycqa/isort
    rev: 5.12.0
    hooks:
      - id: isort
  - repo: https://github.com/pycqa/pylint
    rev: v2.17.0
    hooks:
      - id: pylint
```

### Adding New Features

#### 1. Create Feature Branch
```bash
git checkout -b feature/new-feature-name
```

#### 2. Add Data Models

**Domain Model** (app/models/domain/):
```python
# app/models/domain/new_feature.py
from dataclasses import dataclass
from typing import Optional
from datetime import datetime

@dataclass
class NewFeature:
    id: str
    name: str
    description: Optional[str] = None
    created_at: datetime = datetime.utcnow()
```

**API Schema** (app/models/schemas/):
```python
# app/models/schemas/new_feature.py
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class NewFeatureCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)

class NewFeatureResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True
```

#### 3. Implement Service Logic

```python
# app/services/new_feature_service.py
from typing import List, Optional
from app.models.domain.new_feature import NewFeature
from app.models.schemas.new_feature import NewFeatureCreate

class NewFeatureService:
    def __init__(self, db_service, cache_service):
        self.db = db_service
        self.cache = cache_service
    
    async def create_feature(self, data: NewFeatureCreate, user_id: str) -> NewFeature:
        # Implementation here
        pass
    
    async def get_features(self, user_id: str) -> List[NewFeature]:
        # Implementation here
        pass
```

#### 4. Add API Endpoints

```python
# app/api/v1/new_feature.py
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.models.schemas.new_feature import NewFeatureCreate, NewFeatureResponse
from app.api.deps import get_current_user, get_new_feature_service

router = APIRouter()

@router.post("/features", response_model=NewFeatureResponse)
async def create_feature(
    data: NewFeatureCreate,
    current_user = Depends(get_current_user),
    service = Depends(get_new_feature_service)
):
    try:
        feature = await service.create_feature(data, current_user.id)
        return NewFeatureResponse.from_orm(feature)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/features", response_model=List[NewFeatureResponse])
async def get_features(
    current_user = Depends(get_current_user),
    service = Depends(get_new_feature_service)
):
    features = await service.get_features(current_user.id)
    return [NewFeatureResponse.from_orm(f) for f in features]
```

#### 5. Register Router

```python
# app/main.py
from app.api.v1 import new_feature

app.include_router(new_feature.router, prefix="/api", tags=["New Feature"])
```

#### 6. Write Tests

```python
# tests/unit/test_new_feature_service.py
import pytest
from app.services.new_feature_service import NewFeatureService

class TestNewFeatureService:
    @pytest.fixture
    def service(self, mock_database, mock_cache):
        return NewFeatureService(mock_database, mock_cache)
    
    async def test_create_feature(self, service):
        # Test implementation
        pass
```

### Database Migrations

**Using Alembic** (if configured):
```bash
# Create new migration
alembic revision --autogenerate -m "Add new feature table"

# Apply migrations
alembic upgrade head

# Downgrade migration
alembic downgrade -1
```

**Direct SQL** (for Supabase):
```sql
-- Create new table with RLS
CREATE TABLE new_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE new_features ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can manage own features" ON new_features
    FOR ALL USING (auth.uid() = user_id);
```

## 🐛 Debugging Guide

### Logging and Debug Mode

**Enable Debug Logging**:
```bash
export LOG_LEVEL=DEBUG
export DEBUG=true
uvicorn app.main:app --reload --log-level debug
```

**Structured Logging**:
```python
from app.core.logging import setup_logging

logger = setup_logging()

# Log with context
logger.info("Processing request", extra={
    "user_id": user_id,
    "endpoint": "/api/pam/chat",
    "processing_time": 150
})
```

### Database Debugging

**Enable SQL Logging**:
```python
# In development environment
import logging
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
```

**Direct Database Access**:
```bash
# Using Supabase CLI (if available)
supabase db connect

# Or using psql
psql "postgresql://user:pass@host:port/database"
```

### Redis Debugging

**Redis CLI**:
```bash
# Connect to Redis
redis-cli

# Check keys
redis-cli KEYS "*"

# Monitor commands
redis-cli MONITOR

# Check memory usage
redis-cli INFO memory
```

### WebSocket Debugging

**WebSocket Testing**:
```javascript
// Browser console test
const ws = new WebSocket('ws://localhost:8000/api/pam/ws?token=test');
ws.onmessage = (event) => console.log('Received:', JSON.parse(event.data));
ws.send(JSON.stringify({type: 'chat', content: 'Hello PAM'}));
```

### Performance Debugging

**Profile API Endpoints**:
```python
import cProfile
import pstats
from fastapi import Request

@app.middleware("http")
async def profile_middleware(request: Request, call_next):
    pr = cProfile.Profile()
    pr.enable()
    response = await call_next(request)
    pr.disable()
    
    # Analyze results
    stats = pstats.Stats(pr)
    stats.sort_stats('cumulative')
    stats.print_stats(10)
    
    return response
```

## 📚 Best Practices

### Code Quality

1. **Type Hints**: Always use type hints
2. **Docstrings**: Document all public functions and classes
3. **Error Handling**: Use specific exceptions
4. **Async/Await**: Use async for all I/O operations
5. **Dependency Injection**: Avoid global state

### Security

1. **Input Validation**: Validate all inputs with Pydantic
2. **SQL Injection**: Use parameterized queries
3. **Authentication**: Always verify JWT tokens
4. **Rate Limiting**: Implement appropriate rate limits
5. **Logging**: Never log sensitive information

### Performance

1. **Database**: Use connection pooling
2. **Caching**: Cache expensive operations
3. **Async**: Use async for I/O bound operations
4. **Pagination**: Implement pagination for large datasets
5. **Monitoring**: Monitor performance metrics

### Testing

1. **Coverage**: Aim for >80% test coverage
2. **Unit Tests**: Test business logic in isolation
3. **Integration Tests**: Test service interactions
4. **API Tests**: Test endpoint functionality
5. **Mocking**: Mock external dependencies

## 🚀 Deployment Preparation

### Environment Setup

**Production Environment Variables**:
```bash
ENVIRONMENT=production
DEBUG=false
SECRET_KEY=secure-production-key
SENTRY_DSN=your-production-sentry-dsn
```

### Docker Build

```bash
# Build production image
docker build -t pam-backend:latest .

# Test production image locally
docker run -p 8000:8000 --env-file .env.prod pam-backend:latest
```

### Health Checks

**Verify all services**:
```bash
# Check application health
curl http://localhost:8000/api/health/detailed

# Check database connectivity
curl http://localhost:8000/api/health/database

# Check Redis connectivity
curl http://localhost:8000/api/health/cache
```

---

*This development guide provides comprehensive information for contributing to PAM Backend v2.0.0. For additional questions, please refer to the API documentation or create an issue.*