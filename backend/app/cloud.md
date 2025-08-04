# Backend Application

## Purpose
FastAPI backend providing REST APIs, WebSocket connections, and AI integrations for the Wheels & Wins platform

## Structure
- `main.py` - FastAPI application entry point with middleware
- `api/` - API route handlers organized by version
- `core/` - Core configuration, security, and settings
- `models/` - SQLAlchemy database models
- `schemas/` - Pydantic models for request/response
- `services/` - Business logic and external integrations
- `workers/` - Background task processors (Celery)
- `utils/` - Shared utility functions

## Key Files
- `core/config.py` - Environment configuration with Pydantic
- `core/security.py` - JWT auth and password hashing
- `core/database.py` - Database connection and session management
- `api/v1/endpoints/` - Version 1 API endpoints
- `services/tts/` - Text-to-speech service implementations
- `services/pam.py` - PAM AI assistant logic

## Architecture Patterns
- **Dependency Injection** - FastAPI's DI system for database sessions
- **Repository Pattern** - Data access layer abstraction
- **Service Layer** - Business logic separated from routes
- **Schema Validation** - Pydantic for input/output validation
- **Async/Await** - Asynchronous request handling

## Dependencies
- **Framework**: FastAPI, Uvicorn
- **Database**: SQLAlchemy, Alembic, asyncpg
- **Validation**: Pydantic V2
- **Authentication**: python-jose[cryptography], passlib
- **AI/ML**: OpenAI, edge-tts, TTS
- **Caching**: Redis, redis-py
- **Tasks**: Celery, Redis as broker
- **Testing**: Pytest, pytest-asyncio

## API Standards
- RESTful design with proper HTTP methods
- Version prefix: `/api/v1/`
- JSON request/response format
- JWT Bearer token authentication
- Standardized error responses
- OpenAPI documentation at `/docs`

## Do NOT
- Mix business logic in route handlers
- Use synchronous DB operations in async routes
- Store secrets in code - use environment variables
- Skip input validation with Pydantic schemas
- Create circular imports between modules
- Bypass the service layer for complex operations

## Environment Variables
```bash
DATABASE_URL=postgresql+asyncpg://user:pass@host/db
REDIS_URL=redis://localhost:6379
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
OPENAI_API_KEY=your-api-key
TTS_PRIMARY_ENGINE=edge
SUPABASE_SERVICE_ROLE_KEY=your-key
```

## Testing
- Unit tests for services and utilities
- Integration tests for API endpoints
- Fixtures for database and authentication
- Mock external services (OpenAI, TTS)
- Test async functions with pytest-asyncio