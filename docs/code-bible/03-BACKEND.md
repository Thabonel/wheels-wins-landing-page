# 03 - Backend Documentation

**Purpose:** Python/FastAPI backend development reference.

---

## Technology Stack

| Component | Version | Purpose |
|-----------|---------|---------|
| Python | 3.11+ | Runtime |
| FastAPI | Latest | Web framework |
| Uvicorn | Latest | ASGI server |
| Pydantic | v2 | Data validation |
| Supabase | Latest | Database client |
| Redis | Latest | Caching |
| Celery | Latest | Background tasks |

---

## Project Structure

```
backend/
+-- app/
|   +-- main.py              # Application entry point
|   +-- __init__.py
|   +-- api/
|   |   +-- v1/              # API version 1
|   |   |   +-- __init__.py
|   |   |   +-- pam.py       # PAM endpoints (legacy WebSocket)
|   |   |   +-- pam_simple.py # PAM Simple endpoints
|   |   |   +-- pam_tools.py  # Tool execution endpoints
|   |   |   +-- wins.py       # Financial endpoints
|   |   |   +-- wheels.py     # Trip planning endpoints
|   |   |   +-- social.py     # Social endpoints
|   |   |   +-- auth.py       # Authentication
|   |   |   +-- health.py     # Health checks
|   |   |   +-- profiles.py   # User profiles
|   |   |   +-- tts.py        # Text-to-speech
|   |   |   +-- voice.py      # Voice processing
|   |   |   +-- admin/        # Admin endpoints
|   |   +-- deps.py           # Dependency injection
|   +-- core/
|   |   +-- config.py         # Configuration settings
|   |   +-- logging.py        # Logging configuration
|   |   +-- middleware.py     # Custom middleware
|   |   +-- cors_settings.py  # CORS configuration
|   |   +-- database_pool.py  # Database pooling
|   |   +-- websocket_manager.py # WebSocket handling
|   +-- services/
|   |   +-- pam/              # PAM AI services
|   |   +-- ai/               # AI provider services
|   |   +-- tts/              # TTS services
|   |   +-- voice/            # Voice processing
|   |   +-- cache_service.py  # Redis caching
|   +-- models/               # Pydantic models
|   +-- middleware/           # HTTP middleware
|   +-- config/               # Configuration modules
|   +-- workers/              # Celery workers
+-- tests/                    # Test files
+-- requirements.txt          # Dependencies
+-- requirements-core.txt     # Core dependencies
+-- Dockerfile               # Container config
```

---

## Main Application (main.py)

### Application Initialization

```python
from fastapi import FastAPI
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting PAM Backend...")

    # Initialize services
    sentry_service.initialize()
    await cache_service.initialize()
    await production_monitor.start_monitoring()

    # Initialize PAM components
    orchestrator = await get_enhanced_orchestrator()
    tool_registry = await initialize_tool_registry()

    yield

    # Shutdown
    await cache_service.close()
    await production_monitor.stop_monitoring()

app = FastAPI(
    title="PAM Backend API",
    version="2.0.0",
    lifespan=lifespan
)
```

### Middleware Stack

```python
# Order matters - first added = last executed

# 1. Error handling (catches all errors)
app.add_middleware(ServerErrorMiddleware, handler=server_error_handler)

# 2. CORS (must be early)
app.add_middleware(CORSMiddleware, **cors_config)

# 3. Security headers
app.add_middleware(SecurityHeadersMiddleware, environment=environment)

# 4. Rate limiting
app.add_middleware(RateLimitMiddleware, redis_url=redis_url)

# 5. Monitoring
app.add_middleware(MonitoringMiddleware, monitor=production_monitor)

# 6. Custom middleware
setup_middleware(app)
app.add_middleware(GuardrailsMiddleware)
```

### Router Registration

```python
# Health (no prefix for /health)
app.include_router(health.router, prefix="", tags=["Health"])

# API v1 routes
app.include_router(wins.router, prefix="/api", tags=["Wins"])
app.include_router(wheels.router, prefix="/api", tags=["Wheels"])
app.include_router(social.router, prefix="/api", tags=["Social"])
app.include_router(pam.router, prefix="/api/v1/pam", tags=["PAM"])
app.include_router(pam_tools.router, prefix="/api/v1", tags=["PAM Tools"])
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(profiles.router, prefix="/api/v1", tags=["Profiles"])
app.include_router(tts.router, prefix="/api/v1/tts", tags=["Text-to-Speech"])
app.include_router(voice.router, prefix="/api/v1", tags=["Voice"])
```

---

## API Endpoint Patterns

### Standard REST Endpoint

```python
from fastapi import APIRouter, Depends, HTTPException
from app.api.deps import verify_supabase_jwt_token

router = APIRouter()

@router.get("/expenses/{user_id}")
async def get_expenses(
    user_id: str,
    current_user: dict = Depends(verify_supabase_jwt_token)
):
    """Get user expenses with authentication"""
    # Verify user owns the data
    if current_user.get('sub') != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    # Query Supabase
    response = supabase.from_('expenses').select('*').eq('user_id', user_id).execute()

    return {"expenses": response.data}
```

### WebSocket Endpoint

```python
from fastapi import WebSocket, WebSocketDisconnect

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    token: str = Query(...)
):
    """PAM chat WebSocket endpoint"""
    # Validate token
    try:
        user = await verify_token(token)
        if user['sub'] != user_id:
            await websocket.close(code=4003)
            return
    except Exception:
        await websocket.close(code=4001)
        return

    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_json()
            message = data.get('message', '')

            # Process through PAM
            response = await pam.chat(message, context=data.get('context', {}))

            await websocket.send_json({
                "type": "chat_response",
                "response": response
            })
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {user_id}")
```

### Background Task Endpoint

```python
from fastapi import BackgroundTasks

@router.post("/process")
async def process_data(
    data: ProcessRequest,
    background_tasks: BackgroundTasks
):
    """Queue background processing"""
    background_tasks.add_task(process_in_background, data)
    return {"status": "queued"}
```

---

## PAM Services

### Core PAM Brain

```python
# backend/app/services/pam/core/pam.py

class PAM:
    """The AI brain of Wheels & Wins"""

    def __init__(self, user_id: str):
        self.user_id = user_id
        self.client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        self.model = "claude-sonnet-4-5-20250929"
        self.conversation_history = []
        self.max_history = 20
        self.system_prompt = self._build_system_prompt()

    async def chat(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None,
        stream: bool = False
    ) -> str:
        """Process user message and return response"""
        # Add user message to history
        self._add_message("user", message)

        # Build messages for API
        messages = self._format_messages()

        # Get tools from registry
        tools = await self._get_available_tools()

        # Call Claude API
        response = await self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            system=self.system_prompt,
            messages=messages,
            tools=tools
        )

        # Handle tool calls if present
        if response.stop_reason == "tool_use":
            response = await self._handle_tool_calls(response)

        # Extract and save response
        assistant_message = self._extract_text(response)
        self._add_message("assistant", assistant_message)

        return assistant_message
```

### Tool Registry

```python
# backend/app/services/pam/tools/tool_registry.py

class ToolRegistry:
    """Registry for PAM action tools"""

    def __init__(self):
        self.tools = {}
        self.tool_definitions = {}
        self.is_initialized = False

    def register_tool(self, name: str, func: Callable, definition: dict):
        """Register a tool with its Claude function definition"""
        self.tools[name] = func
        self.tool_definitions[name] = ToolDefinition(**definition)

    async def execute_tool(self, name: str, args: dict, user_id: str) -> dict:
        """Execute a registered tool"""
        if name not in self.tools:
            return {"error": f"Unknown tool: {name}"}

        try:
            result = await self.tools[name](user_id=user_id, **args)
            return {"success": True, "data": result}
        except Exception as e:
            return {"error": str(e)}

    def get_tool_definitions(self) -> List[dict]:
        """Get Claude-compatible tool definitions"""
        return [
            {
                "name": name,
                "description": defn.description,
                "input_schema": defn.input_schema
            }
            for name, defn in self.tool_definitions.items()
            if defn.enabled
        ]
```

### Tool Implementation Example

```python
# backend/app/services/pam/tools/budget/create_expense.py

async def create_expense(
    user_id: str,
    amount: float,
    category: str,
    description: str = "",
    date: str = None
) -> Dict[str, Any]:
    """Create a new expense record"""
    try:
        expense_data = {
            "user_id": user_id,
            "amount": amount,
            "category": category,
            "description": description,
            "date": date or datetime.now().isoformat()
        }

        # Insert via Supabase
        response = supabase.from_('expenses').insert(expense_data).execute()

        if response.data:
            return {
                "success": True,
                "expense": response.data[0],
                "message": f"Added ${amount} expense for {category}"
            }
        else:
            return {"success": False, "error": "Failed to create expense"}

    except Exception as e:
        logger.error(f"Error creating expense: {e}")
        return {"success": False, "error": str(e)}
```

---

## AI Provider Configuration

### Model Configuration

```python
# backend/app/config/model_config.py

MODEL_REGISTRY = {
    "claude-sonnet-4-5-20250929": ModelConfig(
        name="Claude Sonnet 4.5",
        provider="anthropic",
        model_id="claude-sonnet-4-5-20250929",
        cost_per_1m_input=3.0,
        cost_per_1m_output=15.0,
        max_tokens=200000,
        supports_tools=True,
        supports_streaming=True,
        description="Primary PAM AI brain - best for reasoning and tools"
    ),
    "gemini-3.0-flash": ModelConfig(
        name="Gemini 3.0 Flash",
        provider="google",
        model_id="gemini-3.0-flash",
        cost_per_1m_input=0.10,
        cost_per_1m_output=0.40,
        max_tokens=1000000,
        supports_tools=True,
        supports_streaming=True,
        description="Fallback - fast responses (Dec 16, 2025)"
    ),
}

# Fallback chain
PRIMARY_MODEL = "claude-sonnet-4-5-20250929"
FALLBACK_MODEL = "gemini-3.0-flash"
```

### Provider Implementation

```python
# backend/app/services/ai/anthropic_provider.py

class AnthropicProvider:
    """Claude API provider with function calling"""

    async def complete(
        self,
        messages: List[AIMessage],
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        tools: List[dict] = None,
        **kwargs
    ) -> AIResponse:
        # Validate model is Anthropic-compatible
        model = self._validate_anthropic_model(model)

        # Convert messages to Anthropic format
        anthropic_messages = self._convert_messages(messages)

        # Convert tools from OpenAI to Claude format if needed
        if tools:
            tools = self._convert_openai_to_claude_format(tools)

        # Make API call
        response = await self.client.messages.create(
            model=model,
            messages=anthropic_messages,
            max_tokens=max_tokens,
            temperature=temperature,
            tools=tools
        )

        return self._parse_response(response)
```

---

## Caching with Redis

```python
# backend/app/services/cache_service.py

class CacheService:
    """Redis caching service"""

    async def initialize(self):
        self.redis = await aioredis.from_url(
            os.getenv("REDIS_URL", "redis://localhost:6379")
        )

    async def get(self, key: str) -> Optional[str]:
        return await self.redis.get(key)

    async def set(self, key: str, value: str, ttl: int = 3600):
        await self.redis.set(key, value, ex=ttl)

    async def get_user_profile(self, user_id: str) -> Optional[dict]:
        """Get cached user profile"""
        data = await self.get(f"user_profile:{user_id}")
        return json.loads(data) if data else None

    async def cache_user_profile(self, user_id: str, profile: dict, ttl: int = 300):
        """Cache user profile for 5 minutes"""
        await self.set(f"user_profile:{user_id}", json.dumps(profile), ttl)

cache_service = CacheService()
```

---

## Authentication

### JWT Verification

```python
# backend/app/api/deps.py

from fastapi import Depends, HTTPException, Request
from supabase import create_client

async def verify_supabase_jwt_token(request: Request) -> dict:
    """Verify Supabase JWT token from Authorization header"""
    auth_header = request.headers.get("Authorization")

    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")

    token = auth_header.split(" ")[1]

    try:
        # Verify with Supabase
        supabase = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )

        user = supabase.auth.get_user(token)

        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")

        return {"sub": user.user.id, "email": user.user.email}

    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")
```

---

## Background Tasks (Celery)

```python
# backend/app/workers/celery.py

from celery import Celery

celery_app = Celery(
    "pam",
    broker=os.getenv("REDIS_URL"),
    backend=os.getenv("REDIS_URL")
)

@celery_app.task
def process_analytics(user_id: str):
    """Background analytics processing"""
    # Process user analytics
    pass

@celery_app.task
def send_notification(user_id: str, message: str):
    """Send push notification"""
    # Send notification
    pass
```

---

## Testing

### Unit Tests

```python
# backend/tests/test_pam.py

import pytest
from app.services.pam.core.pam import PAM

@pytest.mark.asyncio
async def test_pam_chat():
    pam = PAM(user_id="test-user")

    response = await pam.chat("Hello PAM!")

    assert response is not None
    assert len(response) > 0

@pytest.mark.asyncio
async def test_tool_execution():
    from app.services.pam.tools.budget.create_expense import create_expense

    result = await create_expense(
        user_id="test-user",
        amount=50.0,
        category="fuel",
        description="Test expense"
    )

    assert result["success"] == True
```

### API Tests

```python
# backend/tests/test_api.py

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_unauthorized_access():
    response = client.get("/api/v1/wins/expenses/test-user")
    assert response.status_code == 401
```

---

## Running the Backend

### Development

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt

# Start server
uvicorn app.main:app --reload --port 8000
```

### Production

```bash
# With Docker
docker build -t pam-backend .
docker run -p 8000:8000 pam-backend

# Or directly
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Environment Variables

```bash
# Required
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
ANTHROPIC_API_KEY=sk-ant-xxx
SECRET_KEY=xxx

# Optional
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-xxx
GEMINI_API_KEY=xxx
NODE_ENV=production
DEBUG=false
```
