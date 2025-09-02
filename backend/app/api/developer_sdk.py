"""
PAM Developer API & SDK Ecosystem
Comprehensive developer platform providing APIs, SDKs, webhooks,
and developer tools for third-party integrations.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Union, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import aiohttp
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
import jwt
import hashlib
import hmac
import base64
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
import uuid

from app.core.config import get_settings
from app.services.database import get_database
from app.core.security import create_api_key, validate_api_key

settings = get_settings()
logger = logging.getLogger(__name__)

class APITier(Enum):
    """API access tiers for developers"""
    FREE = "free"
    BASIC = "basic"
    PRO = "pro"
    ENTERPRISE = "enterprise"

class APIScope(Enum):
    """API scopes and permissions"""
    READ_PROFILE = "read:profile"
    WRITE_PROFILE = "write:profile"
    READ_TRAVEL = "read:travel"
    WRITE_TRAVEL = "write:travel"
    READ_FINANCIAL = "read:financial"
    WRITE_FINANCIAL = "write:financial"
    READ_SOCIAL = "read:social"
    WRITE_SOCIAL = "write:social"
    READ_IOT = "read:iot"
    WRITE_IOT = "write:iot"
    READ_ANALYTICS = "read:analytics"
    WEBHOOKS = "webhooks"
    AI_SERVICES = "ai:services"

class WebhookEvent(Enum):
    """Webhook event types"""
    USER_CREATED = "user.created"
    USER_UPDATED = "user.updated"
    TRIP_STARTED = "trip.started"
    TRIP_COMPLETED = "trip.completed"
    EXPENSE_ADDED = "expense.added"
    DEVICE_CONNECTED = "device.connected"
    DEVICE_ALERT = "device.alert"
    AI_INSIGHT_GENERATED = "ai.insight.generated"

class SDKLanguage(Enum):
    """Supported SDK languages"""
    PYTHON = "python"
    JAVASCRIPT = "javascript"
    JAVA = "java"
    CSHARP = "csharp"
    PHP = "php"
    RUBY = "ruby"
    GO = "go"
    SWIFT = "swift"
    KOTLIN = "kotlin"

@dataclass
class DeveloperApp:
    """Developer application registration"""
    app_id: str
    developer_id: str
    app_name: str
    description: str
    app_type: str  # web, mobile, desktop, service
    api_tier: APITier
    scopes: List[APIScope]
    api_key: str
    webhook_url: Optional[str]
    webhook_secret: Optional[str]
    rate_limits: Dict[str, int]
    created_at: datetime
    last_used: Optional[datetime]
    is_active: bool
    metadata: Dict[str, Any]

@dataclass
class APIRequest:
    """API request logging"""
    request_id: str
    app_id: str
    endpoint: str
    method: str
    timestamp: datetime
    response_time_ms: int
    status_code: int
    request_size: int
    response_size: int
    user_id: Optional[str]
    ip_address: str
    user_agent: str

@dataclass
class WebhookDelivery:
    """Webhook delivery record"""
    delivery_id: str
    app_id: str
    event_type: WebhookEvent
    payload: Dict[str, Any]
    webhook_url: str
    attempts: int
    last_attempt: datetime
    next_retry: Optional[datetime]
    status: str  # pending, delivered, failed, max_retries
    response_code: Optional[int]
    response_body: Optional[str]

class PAMDeveloperSDKSystem:
    """
    Comprehensive developer platform for PAM integrations.
    
    Features:
    - RESTful API with comprehensive endpoints
    - Multiple SDK language support
    - Webhook system for real-time events
    - API key management and authentication
    - Rate limiting and usage analytics
    - Developer documentation and playground
    - Sandbox environment for testing
    - OAuth 2.0 integration support
    - GraphQL API option
    - Real-time WebSocket connections
    """
    
    def __init__(self):
        self.db = get_database()
        self.router = APIRouter(prefix="/api/v1/developer", tags=["developer"])
        
        # Developer apps registry
        self.registered_apps: Dict[str, DeveloperApp] = {}
        
        # Rate limiting
        self.rate_limiters: Dict[str, Dict[str, List[datetime]]] = {}
        
        # Webhook delivery queue
        self.webhook_queue: List[WebhookDelivery] = []
        
        # API documentation
        self.api_docs = {}
        
        # SDK generators
        self.sdk_generators = {
            SDKLanguage.PYTHON: self._generate_python_sdk,
            SDKLanguage.JAVASCRIPT: self._generate_javascript_sdk,
            SDKLanguage.JAVA: self._generate_java_sdk
        }
        
        # Initialize developer system
        asyncio.create_task(self._initialize_developer_system())
        
        # Setup API routes
        self._setup_api_routes()
    
    async def _initialize_developer_system(self):
        """Initialize developer platform"""
        try:
            # Load registered apps
            await self._load_registered_apps()
            
            # Start webhook delivery worker
            asyncio.create_task(self._webhook_delivery_worker())
            
            # Initialize API documentation
            await self._initialize_api_documentation()
            
            logger.info("Developer SDK system initialized")
            
        except Exception as e:
            logger.error(f"Error initializing developer system: {e}")
    
    def _setup_api_routes(self):
        """Setup API routes for developer platform"""
        
        @self.router.post("/register")
        async def register_app(request: Dict[str, Any]) -> Dict[str, Any]:
            """Register new developer application"""
            return await self.register_developer_app(
                developer_id=request["developer_id"],
                app_name=request["app_name"],
                description=request["description"],
                app_type=request["app_type"],
                api_tier=APITier(request.get("api_tier", "free")),
                scopes=[APIScope(s) for s in request.get("scopes", [])],
                webhook_url=request.get("webhook_url")
            )
        
        @self.router.get("/apps/{app_id}")
        async def get_app_info(app_id: str, credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
            """Get developer application information"""
            return await self.get_app_info(app_id, credentials.credentials)
        
        @self.router.post("/apps/{app_id}/regenerate-key")
        async def regenerate_api_key(app_id: str, credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
            """Regenerate API key for application"""
            return await self.regenerate_api_key(app_id, credentials.credentials)
        
        @self.router.get("/apps/{app_id}/usage")
        async def get_usage_analytics(app_id: str, credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
            """Get API usage analytics"""
            return await self.get_usage_analytics(app_id, credentials.credentials)
        
        @self.router.get("/sdk/{language}")
        async def download_sdk(language: str):
            """Download SDK for specified language"""
            return await self.generate_sdk(SDKLanguage(language))
        
        @self.router.get("/docs")
        async def get_api_documentation():
            """Get comprehensive API documentation"""
            return self.api_docs
        
        @self.router.post("/webhook/test")
        async def test_webhook(request: Dict[str, Any]):
            """Test webhook endpoint"""
            return await self.test_webhook_delivery(
                app_id=request["app_id"],
                event_type=WebhookEvent(request["event_type"]),
                test_payload=request.get("payload", {})
            )
        
        # Main API endpoints that developers will use
        self._setup_main_api_endpoints()
    
    def _setup_main_api_endpoints(self):
        """Setup main API endpoints for developer consumption"""
        
        @self.router.get("/user/profile")
        async def get_user_profile(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
            """Get user profile information"""
            app_info = await self._validate_api_request(credentials.credentials, [APIScope.READ_PROFILE])
            # Implementation would fetch user profile
            return {"message": "User profile endpoint", "app": app_info["app_id"]}
        
        @self.router.get("/travel/trips")
        async def get_travel_trips(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
            """Get user's travel trips"""
            app_info = await self._validate_api_request(credentials.credentials, [APIScope.READ_TRAVEL])
            # Implementation would fetch travel data
            return {"message": "Travel trips endpoint", "app": app_info["app_id"]}
        
        @self.router.post("/travel/trips")
        async def create_travel_trip(
            trip_data: Dict[str, Any],
            credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())
        ):
            """Create new travel trip"""
            app_info = await self._validate_api_request(credentials.credentials, [APIScope.WRITE_TRAVEL])
            # Implementation would create travel trip
            return {"message": "Trip created", "app": app_info["app_id"], "trip_id": str(uuid.uuid4())}
        
        @self.router.get("/financial/expenses")
        async def get_expenses(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
            """Get user's expenses"""
            app_info = await self._validate_api_request(credentials.credentials, [APIScope.READ_FINANCIAL])
            return {"message": "Expenses endpoint", "app": app_info["app_id"]}
        
        @self.router.get("/iot/devices")
        async def get_iot_devices(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
            """Get connected IoT devices"""
            app_info = await self._validate_api_request(credentials.credentials, [APIScope.READ_IOT])
            return {"message": "IoT devices endpoint", "app": app_info["app_id"]}
        
        @self.router.post("/ai/analyze")
        async def ai_analysis(
            analysis_request: Dict[str, Any],
            credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())
        ):
            """Request AI analysis"""
            app_info = await self._validate_api_request(credentials.credentials, [APIScope.AI_SERVICES])
            return {"message": "AI analysis endpoint", "app": app_info["app_id"]}
    
    async def register_developer_app(
        self,
        developer_id: str,
        app_name: str,
        description: str,
        app_type: str,
        api_tier: APITier,
        scopes: List[APIScope],
        webhook_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Register a new developer application.
        
        Args:
            developer_id: Developer identifier
            app_name: Application name
            description: Application description
            app_type: Type of application (web, mobile, etc.)
            api_tier: API access tier
            scopes: Requested API scopes
            webhook_url: Optional webhook URL
            
        Returns:
            Registration result with API key
        """
        try:
            # Generate app ID and API key
            app_id = f"app_{datetime.utcnow().strftime('%Y%m%d')}_{uuid.uuid4().hex[:8]}"
            api_key = await create_api_key(app_id, scopes)
            
            # Generate webhook secret if webhook URL provided
            webhook_secret = None
            if webhook_url:
                webhook_secret = hashlib.sha256(f"{app_id}{webhook_url}".encode()).hexdigest()
            
            # Determine rate limits based on tier
            rate_limits = self._get_rate_limits_for_tier(api_tier)
            
            # Create developer app
            developer_app = DeveloperApp(
                app_id=app_id,
                developer_id=developer_id,
                app_name=app_name,
                description=description,
                app_type=app_type,
                api_tier=api_tier,
                scopes=scopes,
                api_key=api_key,
                webhook_url=webhook_url,
                webhook_secret=webhook_secret,
                rate_limits=rate_limits,
                created_at=datetime.utcnow(),
                last_used=None,
                is_active=True,
                metadata={}
            )
            
            # Store application
            await self._store_developer_app(developer_app)
            
            # Add to registry
            self.registered_apps[app_id] = developer_app
            
            return {
                "success": True,
                "app_id": app_id,
                "api_key": api_key,
                "webhook_secret": webhook_secret,
                "rate_limits": rate_limits,
                "scopes": [s.value for s in scopes],
                "tier": api_tier.value,
                "message": "Application registered successfully"
            }
            
        except Exception as e:
            logger.error(f"Error registering developer app: {e}")
            return {"success": False, "error": str(e)}
    
    async def generate_sdk(self, language: SDKLanguage) -> Dict[str, Any]:
        """
        Generate SDK for specified programming language.
        
        Args:
            language: Programming language for SDK
            
        Returns:
            Generated SDK code and documentation
        """
        try:
            if language not in self.sdk_generators:
                return {"error": f"SDK not available for {language.value}"}
            
            # Generate SDK using appropriate generator
            sdk_generator = self.sdk_generators[language]
            sdk_content = await sdk_generator()
            
            return {
                "language": language.value,
                "sdk_version": "1.0.0",
                "generated_at": datetime.utcnow().isoformat(),
                "content": sdk_content,
                "installation_instructions": await self._get_installation_instructions(language),
                "examples": await self._get_sdk_examples(language)
            }
            
        except Exception as e:
            logger.error(f"Error generating SDK: {e}")
            return {"error": str(e)}
    
    async def send_webhook(
        self,
        app_id: str,
        event_type: WebhookEvent,
        payload: Dict[str, Any],
        user_id: Optional[str] = None
    ) -> bool:
        """
        Send webhook to registered application.
        
        Args:
            app_id: Application identifier
            event_type: Type of event
            payload: Event payload data
            user_id: Optional user context
            
        Returns:
            Success status
        """
        try:
            if app_id not in self.registered_apps:
                logger.warning(f"Webhook attempted for unregistered app: {app_id}")
                return False
            
            app = self.registered_apps[app_id]
            
            if not app.webhook_url:
                logger.debug(f"No webhook URL configured for app: {app_id}")
                return False
            
            # Create webhook delivery
            delivery = WebhookDelivery(
                delivery_id=f"delivery_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}",
                app_id=app_id,
                event_type=event_type,
                payload={
                    "event": event_type.value,
                    "data": payload,
                    "timestamp": datetime.utcnow().isoformat(),
                    "user_id": user_id
                },
                webhook_url=app.webhook_url,
                attempts=0,
                last_attempt=datetime.utcnow(),
                next_retry=datetime.utcnow(),
                status="pending",
                response_code=None,
                response_body=None
            )
            
            # Add to delivery queue
            self.webhook_queue.append(delivery)
            
            return True
            
        except Exception as e:
            logger.error(f"Error sending webhook: {e}")
            return False
    
    async def get_usage_analytics(
        self,
        app_id: str,
        api_key: str,
        date_range: Optional[Tuple[datetime, datetime]] = None
    ) -> Dict[str, Any]:
        """
        Get API usage analytics for application.
        
        Args:
            app_id: Application identifier
            api_key: API key for authentication
            date_range: Optional date range for analytics
            
        Returns:
            Usage analytics data
        """
        try:
            # Validate API key
            if not await self._validate_api_key(app_id, api_key):
                raise HTTPException(status_code=401, detail="Invalid API key")
            
            # Set default date range (last 30 days)
            if not date_range:
                end_date = datetime.utcnow()
                start_date = end_date - timedelta(days=30)
                date_range = (start_date, end_date)
            
            # Get usage statistics
            usage_stats = await self._get_app_usage_stats(app_id, date_range)
            
            # Get rate limit status
            rate_limit_status = await self._get_rate_limit_status(app_id)
            
            # Get popular endpoints
            popular_endpoints = await self._get_popular_endpoints(app_id, date_range)
            
            return {
                "app_id": app_id,
                "period": {
                    "start": date_range[0].isoformat(),
                    "end": date_range[1].isoformat()
                },
                "usage_stats": usage_stats,
                "rate_limit_status": rate_limit_status,
                "popular_endpoints": popular_endpoints,
                "generated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting usage analytics: {e}")
            return {"error": str(e)}
    
    async def test_webhook_delivery(
        self,
        app_id: str,
        event_type: WebhookEvent,
        test_payload: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Test webhook delivery for application.
        
        Args:
            app_id: Application identifier
            event_type: Event type to test
            test_payload: Optional test payload
            
        Returns:
            Test delivery result
        """
        try:
            if app_id not in self.registered_apps:
                return {"success": False, "error": "Application not found"}
            
            app = self.registered_apps[app_id]
            
            if not app.webhook_url:
                return {"success": False, "error": "No webhook URL configured"}
            
            # Create test payload
            payload = test_payload or {
                "test": True,
                "event_type": event_type.value,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Attempt delivery
            delivery_result = await self._deliver_webhook(
                app.webhook_url,
                app.webhook_secret,
                event_type,
                payload
            )
            
            return {
                "success": delivery_result["success"],
                "webhook_url": app.webhook_url,
                "response_code": delivery_result.get("response_code"),
                "response_time_ms": delivery_result.get("response_time_ms"),
                "error": delivery_result.get("error"),
                "test_payload": payload
            }
            
        except Exception as e:
            logger.error(f"Error testing webhook delivery: {e}")
            return {"success": False, "error": str(e)}
    
    # Private helper methods
    
    async def _validate_api_request(
        self,
        api_key: str,
        required_scopes: List[APIScope]
    ) -> Dict[str, Any]:
        """Validate API request and check permissions"""
        try:
            # Find app by API key
            app = None
            for registered_app in self.registered_apps.values():
                if registered_app.api_key == api_key:
                    app = registered_app
                    break
            
            if not app or not app.is_active:
                raise HTTPException(status_code=401, detail="Invalid or inactive API key")
            
            # Check scopes
            missing_scopes = []
            for scope in required_scopes:
                if scope not in app.scopes:
                    missing_scopes.append(scope.value)
            
            if missing_scopes:
                raise HTTPException(
                    status_code=403,
                    detail=f"Missing required scopes: {', '.join(missing_scopes)}"
                )
            
            # Check rate limits
            if not await self._check_rate_limit(app):
                raise HTTPException(status_code=429, detail="Rate limit exceeded")
            
            # Update last used
            app.last_used = datetime.utcnow()
            
            return {"app_id": app.app_id, "scopes": [s.value for s in app.scopes]}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error validating API request: {e}")
            raise HTTPException(status_code=500, detail="Internal server error")
    
    async def _generate_python_sdk(self) -> Dict[str, str]:
        """Generate Python SDK"""
        sdk_files = {
            "pam_sdk/__init__.py": '''"""
PAM Python SDK
"""

from .client import PAMClient
from .models import *

__version__ = "1.0.0"
__all__ = ["PAMClient"]
''',
            
            "pam_sdk/client.py": '''"""
PAM API Client
"""

import requests
from typing import Dict, List, Optional, Any
from .models import User, Trip, Expense, Device

class PAMClient:
    def __init__(self, api_key: str, base_url: str = "https://pam-backend.onrender.com/api/v1/developer"):
        self.api_key = api_key
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        })
    
    def get_user_profile(self) -> Dict[str, Any]:
        """Get user profile information"""
        response = self.session.get(f"{self.base_url}/user/profile")
        response.raise_for_status()
        return response.json()
    
    def get_trips(self) -> List[Dict[str, Any]]:
        """Get user's travel trips"""
        response = self.session.get(f"{self.base_url}/travel/trips")
        response.raise_for_status()
        return response.json()
    
    def create_trip(self, trip_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new travel trip"""
        response = self.session.post(f"{self.base_url}/travel/trips", json=trip_data)
        response.raise_for_status()
        return response.json()
    
    def get_expenses(self) -> List[Dict[str, Any]]:
        """Get user's expenses"""
        response = self.session.get(f"{self.base_url}/financial/expenses")
        response.raise_for_status()
        return response.json()
    
    def get_iot_devices(self) -> List[Dict[str, Any]]:
        """Get connected IoT devices"""
        response = self.session.get(f"{self.base_url}/iot/devices")
        response.raise_for_status()
        return response.json()
    
    def ai_analyze(self, analysis_request: Dict[str, Any]) -> Dict[str, Any]:
        """Request AI analysis"""
        response = self.session.post(f"{self.base_url}/ai/analyze", json=analysis_request)
        response.raise_for_status()
        return response.json()
''',
            
            "pam_sdk/models.py": '''"""
PAM SDK Data Models
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional, Any

@dataclass
class User:
    id: str
    email: str
    name: str
    created_at: datetime

@dataclass  
class Trip:
    id: str
    name: str
    start_date: datetime
    end_date: datetime
    destinations: List[str]
    status: str

@dataclass
class Expense:
    id: str
    amount: float
    currency: str
    description: str
    category: str
    date: datetime

@dataclass
class Device:
    id: str
    name: str
    type: str
    status: str
    last_seen: datetime
''',
            
            "setup.py": '''"""
Setup script for PAM Python SDK
"""

from setuptools import setup, find_packages

setup(
    name="pam-sdk",
    version="1.0.0",
    description="Python SDK for PAM API",
    packages=find_packages(),
    install_requires=[
        "requests>=2.25.0",
    ],
    python_requires=">=3.7",
)
'''
        }
        
        return sdk_files
    
    def _get_rate_limits_for_tier(self, tier: APITier) -> Dict[str, int]:
        """Get rate limits based on API tier"""
        rate_limit_configs = {
            APITier.FREE: {
                "requests_per_minute": 60,
                "requests_per_hour": 1000,
                "requests_per_day": 10000
            },
            APITier.BASIC: {
                "requests_per_minute": 300,
                "requests_per_hour": 10000,
                "requests_per_day": 100000
            },
            APITier.PRO: {
                "requests_per_minute": 1000,
                "requests_per_hour": 50000,
                "requests_per_day": 1000000
            },
            APITier.ENTERPRISE: {
                "requests_per_minute": 5000,
                "requests_per_hour": 200000,
                "requests_per_day": 5000000
            }
        }
        
        return rate_limit_configs.get(tier, rate_limit_configs[APITier.FREE])
    
    async def _webhook_delivery_worker(self):
        """Background worker for webhook deliveries"""
        while True:
            try:
                # Process pending webhooks
                pending_webhooks = [w for w in self.webhook_queue if w.status == "pending"]
                
                for webhook in pending_webhooks:
                    if datetime.utcnow() >= webhook.next_retry:
                        await self._attempt_webhook_delivery(webhook)
                
                await asyncio.sleep(5)  # Check every 5 seconds
                
            except Exception as e:
                logger.error(f"Error in webhook delivery worker: {e}")
                await asyncio.sleep(10)
    
    async def _attempt_webhook_delivery(self, webhook: WebhookDelivery):
        """Attempt to deliver a webhook"""
        try:
            app = self.registered_apps.get(webhook.app_id)
            if not app:
                webhook.status = "failed"
                return
            
            result = await self._deliver_webhook(
                webhook.webhook_url,
                app.webhook_secret,
                webhook.event_type,
                webhook.payload
            )
            
            webhook.attempts += 1
            webhook.last_attempt = datetime.utcnow()
            webhook.response_code = result.get("response_code")
            webhook.response_body = result.get("response_body")
            
            if result["success"]:
                webhook.status = "delivered"
            else:
                # Exponential backoff for retries
                if webhook.attempts < 5:
                    retry_delay = min(300, 2 ** webhook.attempts * 60)  # Max 5 minutes
                    webhook.next_retry = datetime.utcnow() + timedelta(seconds=retry_delay)
                else:
                    webhook.status = "max_retries"
            
        except Exception as e:
            logger.error(f"Error attempting webhook delivery: {e}")
            webhook.status = "failed"


# Global developer SDK system instance
developer_sdk_system = PAMDeveloperSDKSystem()

# FastAPI router for developer endpoints
developer_router = developer_sdk_system.router