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
    description="High-performance backend for PAM - Personal AI Manager",
    version="1.0.0",
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
app.include_router(websocket_router, tags=["websocket"])

@app.get("/")
async def root():
    return {
        "message": "PAM AI Agent Backend",
        "version": "1.0.0",
        "status": "operational",
        "endpoints": {
            "health": "/api/health",
            "chat": "/api/chat/message",
            "actions": "/api/actions/execute",
            "websocket": "/ws/{user_id}"
        }
    }
