"""
PAM 2.0 API Layer
================

Clean API layer providing REST and WebSocket endpoints for PAM 2.0.
Built with FastAPI for high performance and automatic documentation.

Components:
- routes.py - REST API endpoints
- websocket.py - WebSocket handlers for real-time communication
- models.py - Pydantic request/response models
- main.py - FastAPI application setup
"""

from .models import (
    ChatRequest, ChatResponse, HealthResponse,
    TripAnalysisRequest, TripAnalysisResponse,
    FinancialAnalysisRequest, FinancialAnalysisResponse,
    SafetyCheckRequest, SafetyCheckResponse
)

from .routes import router as api_router
from .websocket import websocket_endpoint, websocket_manager
from .main import app, create_app

__all__ = [
    # Request/Response models
    "ChatRequest",
    "ChatResponse",
    "HealthResponse",
    "TripAnalysisRequest",
    "TripAnalysisResponse",
    "FinancialAnalysisRequest",
    "FinancialAnalysisResponse",
    "SafetyCheckRequest",
    "SafetyCheckResponse",

    # API components
    "api_router",
    "websocket_endpoint",
    "websocket_manager",

    # Application
    "app",
    "create_app"
]