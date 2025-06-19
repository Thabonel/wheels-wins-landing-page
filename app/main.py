from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from app.core.config import settings
from app.core.logging import setup_logging
from app.api.health import router as health_router
from app.api.chat import router as chat_router
from app.api.websocket import router as websocket_router
from app.api.actions import router as actions_router
from app.api.wins import router as wins_router
from app.api.wheels import router as wheels_router
from app.api.social import router as social_router
from app.api.you import router as you_router
from app.database.supabase_client import init_supabase

# Setup logging
logger = setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting PAM Backend...")
    init_supabase()
    logger.info("PAM Backend started successfully")
    yield
    # Shutdown
    logger.info("Shutting down PAM Backend...")

app = FastAPI(
    title="PAM AI Agent Backend",
    description="High-performance backend for PAM - Personal AI Manager for Grey Nomads",
    version="2.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health_router, prefix="/api/health", tags=["health"])
app.include_router(chat_router, prefix="/api/chat", tags=["chat"])
app.include_router(actions_router, prefix="/api/actions", tags=["actions"])
app.include_router(wins_router, prefix="/api/wins", tags=["wins"])
app.include_router(wheels_router, prefix="/api/wheels", tags=["wheels"])
app.include_router(social_router, prefix="/api/social", tags=["social"])
app.include_router(you_router, prefix="/api/you", tags=["you"])
app.include_router(websocket_router, tags=["websocket"])

@app.get("/")
async def root():
    return {
        "message": "PAM AI Agent Backend - Your Intelligent Travel Companion",
        "version": "2.0.0",
        "status": "operational",
        "description": "AI-powered assistant for Grey Nomads, Snowbirds, and Full-Time Travellers",
        "capabilities": [
            "Trip planning and route optimization",
            "Vehicle maintenance tracking", 
            "Budget management and expense tracking",
            "Income generation and hustle recommendations",
            "Community interaction and marketplace",
            "Personal dashboard and calendar management",
            "Real-time conversational AI"
        ],
        "endpoints": {
            "health": "/api/health",
            "chat": "/api/chat/message",
            "actions": "/api/actions/execute",
            "wins": {
                "expenses": "/api/wins/expenses",
                "budgets": "/api/wins/budgets",
                "income": "/api/wins/income",
                "tips": "/api/wins/tips"
            },
            "wheels": {
                "trip_planning": "/api/wheels/plan-trip",
                "fuel_log": "/api/wheels/fuel-log", 
                "maintenance": "/api/wheels/maintenance",
                "weather": "/api/wheels/weather"
            },
            "social": {
                "hustles": "/api/social/hustles/recommended",
                "groups": "/api/social/groups/join",
                "marketplace": "/api/social/marketplace/create",
                "feed": "/api/social/feed/post"
            },
            "you": {
                "calendar": "/api/you/calendar/events",
                "profile": "/api/you/profile", 
                "dashboard": "/api/you/dashboard",
                "timeline": "/api/you/timeline"
            },
            "websocket": "/ws/{user_id}"
        },
        "features": {
            "natural_language_processing": True,
            "real_time_ui_control": True,
            "multi_domain_intelligence": True,
            "personalized_recommendations": True,
            "community_integration": True,
            "vehicle_management": True,
            "budget_optimization": True,
            "income_generation": True
        }
    }

@app.get("/api/status")
async def status():
    """Detailed status endpoint"""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "nodes": {
            "wins": "operational",
            "wheels": "operational", 
            "social": "operational",
            "you": "operational"
        },
        "services": {
            "orchestrator": "active",
            "websocket": "active",
            "memory": "active",
            "ui_controller": "active"
        },
        "database": "connected",
        "ai_services": "operational"
    }
