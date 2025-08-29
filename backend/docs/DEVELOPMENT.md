
# PAM Backend Development Guide

## Getting Started

This guide covers setting up the development environment, coding standards, testing procedures, and contribution guidelines for the PAM Backend project.

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Project Structure](#project-structure)
3. [Coding Standards](#coding-standards)
4. [Development Workflow](#development-workflow)
5. [Testing](#testing)
6. [Debugging](#debugging)
7. [Database Development](#database-development)
8. [API Development](#api-development)
9. [Contributing](#contributing)

## Development Environment Setup

### Prerequisites

- **Python 3.11+** (recommended: use pyenv for version management)
- **Docker & Docker Compose** (for services)
- **Git**
- **VS Code** or **PyCharm** (recommended IDEs)

### Local Setup

1. **Clone the repository:**
```bash
git clone https://github.com/your-org/pam-backend.git
cd pam-backend
```

2. **Create virtual environment:**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies:**
```bash
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

4. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your development configuration
```

5. **Start development services:**
```bash
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d
```

6. **Run database migrations:**
```bash
python scripts/migrate_database.py
```

7. **Seed development data:**
```bash
python scripts/seed_database.py
```

8. **Start the development server:**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### VS Code Setup

**Recommended Extensions:**
- Python Extension Pack
- Pylance
- Python Docstring Generator
- GitLens
- Docker
- REST Client

**VS Code Settings** (`.vscode/settings.json`):
```json
{
    "python.defaultInterpreterPath": "./venv/bin/python",
    "python.linting.enabled": true,
    "python.linting.pylintEnabled": false,
    "python.linting.flake8Enabled": true,
    "python.linting.mypyEnabled": true,
    "python.formatting.provider": "black",
    "python.formatting.blackArgs": ["--line-length", "100"],
    "python.sortImports.args": ["--profile", "black"],
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
        "source.organizeImports": true
    },
    "files.exclude": {
        "**/__pycache__": true,
        "**/*.pyc": true
    }
}
```

### PyCharm Setup

**Configuration:**
1. Set Python interpreter to `./venv/bin/python`
2. Enable Django support (for better template handling)
3. Configure code style: Black, line length 100
4. Enable type checking with mypy

## Project Structure

```
backend/
├── app/                          # Main application code
│   ├── __init__.py
│   ├── main.py                   # FastAPI application entry point
│   ├── api/                      # API routes and endpoints
│   │   ├── __init__.py
│   │   └── v1/                   # API version 1
│   │       ├── __init__.py
│   │       ├── auth.py           # Authentication endpoints
│   │       ├── chat.py           # PAM chat endpoints
│   │       ├── wheels.py         # Travel management endpoints
│   │       ├── wins.py           # Financial management endpoints
│   │       └── social.py         # Social features endpoints
│   ├── core/                     # Core application logic
│   │   ├── __init__.py
│   │   ├── config.py             # Configuration management
│   │   ├── logging.py            # Logging configuration
│   │   ├── security.py           # Security utilities
│   │   └── orchestrator.py       # Main business logic orchestration
│   ├── models/                   # Data models and schemas
│   │   ├── __init__.py
│   │   ├── domain/               # Domain models
│   │   └── schemas/              # Pydantic schemas
│   ├── services/                 # Business logic services
│   │   ├── __init__.py
│   │   ├── auth_service.py       # Authentication service
│   │   ├── cache_service.py      # Caching service
│   │   ├── database_service.py   # Database operations
│   │   └── pam/                  # PAM AI services
│   ├── database/                 # Database connection and utilities
│   │   ├── __init__.py
│   │   └── supabase_client.py    # Supabase client
│   └── workers/                  # Background task workers
│       ├── __init__.py
│       ├── celery.py             # Celery configuration
│       └── tasks/                # Celery tasks
├── tests/                        # Test suite
│   ├── __init__.py
│   ├── conftest.py               # Test configuration and fixtures
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests
│   └── api/                      # API endpoint tests
├── scripts/                      # Development and deployment scripts
├── docs/                         # Documentation
├── requirements.txt              # Production dependencies
├── requirements-dev.txt          # Development dependencies
├── pytest.ini                   # Pytest configuration
├── pyproject.toml               # Project configuration
└── docker-compose.yml           # Docker services
```

## Coding Standards

### Python Style Guide

We follow **PEP 8** with some modifications:

- **Line length**: 100 characters (not 79)
- **Formatter**: Black
- **Import sorting**: isort with Black profile
- **Type hints**: Required for all functions and methods
- **Docstrings**: Google style for all public functions

### Code Formatting

**Install pre-commit hooks:**
```bash
pip install pre-commit
pre-commit install
```

**Format code manually:**
```bash
# Format with Black
black --line-length 100 app/

# Sort imports
isort --profile black app/

# Lint with flake8
flake8 app/

# Type checking with mypy
mypy app/
```

### Code Quality Tools

**Configuration files:**

**pyproject.toml:**
```toml
[tool.black]
line-length = 100
target-version = ['py311']
include = '\.pyi?$'
extend-exclude = '''
/(
  # directories
  \.eggs
  | \.git
  | \.hg
  | \.mypy_cache
  | \.tox
  | \.venv
  | build
  | dist
)/
'''

[tool.isort]
profile = "black"
multi_line_output = 3
line_length = 100
known_first_party = ["app"]

[tool.mypy]
python_version = "3.11"
check_untyped_defs = true
disallow_any_generics = true
disallow_incomplete_defs = true
disallow_untyped_defs = true
no_implicit_optional = true
warn_redundant_casts = true
warn_unused_ignores = true
```

**flake8 configuration (.flake8):**
```ini
[flake8]
max-line-length = 100
extend-ignore = E203, W503, E501
exclude = 
    .git,
    __pycache__,
    .venv,
    .eggs,
    *.egg,
    build,
    dist
```

### Naming Conventions

- **Functions and variables**: `snake_case`
- **Classes**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Private methods**: `_leading_underscore`
- **Files and modules**: `snake_case`

### Documentation Standards

**Function docstrings:**
```python
def process_chat_message(message: str, user_id: str, context: dict) -> ChatResponse:
    """Process a chat message through the PAM AI system.
    
    Args:
        message: The user's input message
        user_id: Unique identifier for the user
        context: Additional context information for processing
        
    Returns:
        ChatResponse containing the AI response and metadata
        
    Raises:
        ValidationError: If the message is invalid
        ServiceError: If the AI service is unavailable
        
    Example:
        >>> response = process_chat_message("Hello", "user-123", {})
        >>> print(response.content)
        "Hello! How can I help you today?"
    """
    pass
```

**Class docstrings:**
```python
class ChatService:
    """Service for handling PAM AI chat interactions.
    
    This service manages conversation flow, context preservation,
    and integration with the OpenAI API.
    
    Attributes:
        openai_client: Client for OpenAI API interactions
        context_manager: Manages conversation context
        memory_system: Handles conversation memory
    """
    pass
```

## Development Workflow

### Git Workflow

We use **Git Flow** branching strategy:

- **main**: Production-ready code
- **develop**: Integration branch for features
- **feature/**: Feature development branches
- **hotfix/**: Critical bug fixes
- **release/**: Release preparation branches

**Branch naming:**
```bash
feature/pam-chat-improvements
bugfix/authentication-error
hotfix/critical-security-fix
release/v1.2.0
```

**Commit message format:**
```
type(scope): short description

Longer description if needed

- Bullet points for details
- Reference issue numbers: #123

Co-authored-by: Name <email@example.com>
```

**Commit types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test additions/modifications
- `chore`: Build/config changes

### Development Process

1. **Create feature branch:**
```bash
git checkout develop
git pull origin develop
git checkout -b feature/new-feature-name
```

2. **Develop with TDD:**
```bash
# Write failing test first
pytest tests/test_new_feature.py::test_specific_function -v

# Implement feature
# code, code, code...

# Run tests until they pass
pytest tests/test_new_feature.py -v

# Run full test suite
pytest
```

3. **Code quality checks:**
```bash
# Format code
black --line-length 100 app/
isort --profile black app/

# Run linting
flake8 app/
mypy app/

# Run tests with coverage
pytest --cov=app tests/
```

4. **Create pull request:**
```bash
git add .
git commit -m "feat(chat): add conversation context preservation"
git push origin feature/new-feature-name
# Create PR on GitHub/GitLab
```

### Local Development Commands

**Makefile** for common tasks:
```makefile
.PHONY: install dev test lint format clean

install:
	pip install -r requirements.txt -r requirements-dev.txt

dev:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

test:
	pytest --cov=app tests/ -v

lint:
	flake8 app/
	mypy app/

format:
	black --line-length 100 app/
	isort --profile black app/

clean:
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +

docker-dev:
	docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d

docker-logs:
	docker-compose logs -f backend

seed-db:
	python scripts/seed_database.py

health-check:
	python scripts/health_check.py
```

## Testing

### Test Structure

```
tests/
├── conftest.py                   # Test configuration and fixtures
├── unit/                         # Unit tests (isolated components)
│   ├── test_services/
│   ├── test_models/
│   └── test_utils/
├── integration/                  # Integration tests (database, external APIs)
│   ├── test_database_integration.py
│   ├── test_openai_integration.py
│   └── test_supabase_integration.py
└── api/                         # API endpoint tests (full request/response)
    ├── test_auth_endpoints.py
    ├── test_chat_endpoints.py
    └── test_wheels_endpoints.py
```

### Writing Tests

**Unit test example:**
```python
import pytest
from unittest.mock import AsyncMock, patch
from app.services.chat_service import ChatService
from app.models.schemas.pam import ChatRequest

class TestChatService:
    @pytest.fixture
    def chat_service(self):
        return ChatService()
    
    @pytest.fixture
    def sample_chat_request(self):
        return ChatRequest(
            message="Hello PAM",
            user_id="test-user-123",
            context={}
        )
    
    @patch('app.services.chat_service.openai_client')
    async def test_process_message_success(self, mock_openai, chat_service, sample_chat_request):
        # Arrange
        mock_openai.chat.completions.create.return_value = AsyncMock()
        mock_openai.chat.completions.create.return_value.choices = [
            AsyncMock(message=AsyncMock(content="Hello! How can I help?"))
        ]
        
        # Act
        response = await chat_service.process_message(sample_chat_request)
        
        # Assert
        assert response.content == "Hello! How can I help?"
        assert response.user_id == "test-user-123"
        mock_openai.chat.completions.create.assert_called_once()
```

**Integration test example:**
```python
import pytest
from httpx import AsyncClient
from app.main import app

class TestChatIntegration:
    async def test_chat_endpoint_full_flow(self, test_client: AsyncClient, auth_headers):
        # Test complete chat flow including database operations
        chat_request = {
            "message": "Show me my recent expenses",
            "user_id": "test-user-123"
        }
        
        response = await test_client.post(
            "/api/v1/chat",
            json=chat_request,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert "conversation_id" in data
        assert data["user_id"] == "test-user-123"
```

### Test Fixtures

**conftest.py:**
```python
import pytest
import asyncio
from httpx import AsyncClient
from app.main import app
from app.database.supabase_client import get_supabase_client

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
async def test_client():
    """Create test client for API testing."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest.fixture
def sample_user_data():
    """Sample user data for testing."""
    return {
        "id": "test-user-123",
        "email": "test@example.com",
        "full_name": "Test User",
        "preferences": {"theme": "dark"}
    }

@pytest.fixture
def auth_headers(sample_user_data):
    """Authentication headers for API testing."""
    # Mock JWT token for testing
    token = "test-jwt-token"
    return {"Authorization": f"Bearer {token}"}
```

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app tests/

# Run specific test file
pytest tests/unit/test_chat_service.py -v

# Run specific test
pytest tests/unit/test_chat_service.py::TestChatService::test_process_message_success -v

# Run tests with specific markers
pytest -m "unit" -v
pytest -m "integration" -v

# Generate HTML coverage report
pytest --cov=app --cov-report=html tests/
open htmlcov/index.html
```

### Test Markers

**pytest.ini:**
```ini
[tool:pytest]
markers =
    unit: Unit tests
    integration: Integration tests
    api: API endpoint tests
    slow: Slow running tests
    external: Tests requiring external services

testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = 
    --strict-markers
    --disable-warnings
    --tb=short
    --cov-fail-under=80
```

## Debugging

### Local Debugging

**VS Code Debug Configuration** (`.vscode/launch.json`):
```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "FastAPI Development Server",
            "type": "python",
            "request": "launch",
            "program": "${workspaceFolder}/venv/bin/uvicorn",
            "args": [
                "app.main:app",
                "--reload",
                "--host", "0.0.0.0",
                "--port", "8000"
            ],
            "console": "integratedTerminal",
            "envFile": "${workspaceFolder}/.env",
            "cwd": "${workspaceFolder}"
        },
        {
            "name": "Run Tests",
            "type": "python",
            "request": "launch",
            "module": "pytest",
            "args": ["tests/", "-v"],
            "console": "integratedTerminal",
            "envFile": "${workspaceFolder}/.env"
        }
    ]
}
```

### Docker Debugging

```bash
# Development with debugger
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d

# Connect debugger to port 5678
# VS Code: Add remote debugging configuration
```

**Remote debugging configuration:**
```json
{
    "name": "Remote Debug (Docker)",
    "type": "python",
    "request": "attach",
    "host": "localhost",
    "port": 5678,
    "pathMappings": [
        {
            "localRoot": "${workspaceFolder}",
            "remoteRoot": "/app"
        }
    ]
}
```

### Logging for Development

**Enhanced logging during development:**
```python
import logging
from app.core.logging import get_logger

# Get logger for current module
logger = get_logger(__name__)

async def debug_function():
    logger.debug("Starting function execution")
    
    try:
        result = await some_operation()
        logger.info(f"Operation completed successfully: {result}")
        return result
    except Exception as e:
        logger.error(f"Operation failed: {e}", exc_info=True)
        raise
```

## Database Development

### Schema Changes

1. **Create migration script:**
```python
# scripts/migrations/001_add_user_preferences.py
async def upgrade(client):
    """Add preferences column to profiles table."""
    await client.rpc('exec_sql', {
        'sql': 'ALTER TABLE profiles ADD COLUMN preferences JSONB DEFAULT \'{}\';'
    }).execute()

async def downgrade(client):
    """Remove preferences column from profiles table."""
    await client.rpc('exec_sql', {
        'sql': 'ALTER TABLE profiles DROP COLUMN preferences;'
    }).execute()
```

2. **Run migrations:**
```bash
python scripts/run_migrations.py
```

### Database Testing

```python
import pytest
from app.database.supabase_client import get_supabase_client

@pytest.fixture
async def clean_database():
    """Clean database before and after tests."""
    client = get_supabase_client()
    
    # Clean up before test
    await client.table('test_data').delete().neq('id', '').execute()
    
    yield client
    
    # Clean up after test
    await client.table('test_data').delete().neq('id', '').execute()
```

## API Development

### Adding New Endpoints

1. **Define Pydantic models:**
```python
# app/models/schemas/new_feature.py
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class NewFeatureRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    
class NewFeatureResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    created_at: datetime
```

2. **Create service layer:**
```python
# app/services/new_feature_service.py
from typing import List
from app.models.schemas.new_feature import NewFeatureRequest, NewFeatureResponse

class NewFeatureService:
    async def create_feature(self, request: NewFeatureRequest) -> NewFeatureResponse:
        # Implementation here
        pass
    
    async def list_features(self, user_id: str) -> List[NewFeatureResponse]:
        # Implementation here
        pass
```

3. **Add API endpoints:**
```python
# app/api/v1/new_feature.py
from fastapi import APIRouter, Depends, HTTPException
from app.services.new_feature_service import NewFeatureService
from app.models.schemas.new_feature import NewFeatureRequest, NewFeatureResponse

router = APIRouter(prefix="/new-feature", tags=["new-feature"])

@router.post("/", response_model=NewFeatureResponse, status_code=201)
async def create_feature(
    request: NewFeatureRequest,
    service: NewFeatureService = Depends()
):
    """Create a new feature."""
    try:
        return await service.create_feature(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
```

4. **Add tests:**
```python
# tests/api/test_new_feature_endpoints.py
import pytest
from httpx import AsyncClient

class TestNewFeatureEndpoints:
    async def test_create_feature_success(self, test_client: AsyncClient):
        request_data = {
            "name": "Test Feature",
            "description": "A test feature"
        }
        
        response = await test_client.post("/api/v1/new-feature/", json=request_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Feature"
```

### API Documentation

FastAPI automatically generates OpenAPI documentation. Access it at:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI JSON**: `http://localhost:8000/openapi.json`

## Contributing

### Code Review Process

1. **Create feature branch** from `develop`
2. **Implement feature** with tests
3. **Run quality checks** (lint, format, test)
4. **Create pull request** with detailed description
5. **Address review feedback**
6. **Merge after approval**

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] All tests pass locally

## Code Quality
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated

## Screenshots (if applicable)

## Additional Notes
```

### Development Best Practices

1. **Write tests first** (TDD approach)
2. **Keep functions small** and focused
3. **Use type hints** everywhere
4. **Document complex logic** with comments
5. **Follow SOLID principles**
6. **Avoid deep nesting** (max 3 levels)
7. **Use dependency injection**
8. **Handle errors gracefully**
9. **Log important events**
10. **Keep security in mind**

This development guide should help new contributors get up to speed quickly and maintain high code quality standards throughout the project.
