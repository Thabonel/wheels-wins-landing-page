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
from app.api.demo import router as demo_router
from app.database.supabase_client import init_supabase

# Setup logging
logger = setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Starting PAM - Personal AI Manager for Grey Nomads...")
    init_supabase()
    logger.info("✅ PAM Backend fully operational - Ready to assist travellers!")
    yield
    # Shutdown
    logger.info("👋 PAM Backend shutting down...")

app = FastAPI(
    title="PAM - Personal AI Manager",
    description="The most advanced AI travel companion for Grey Nomads, Snowbirds, and Full-Time Travellers. PAM helps you plan trips, manage money, earn income, and connect with community - all while you explore the world.",
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

# Include all routers
app.include_router(health_router, prefix="/api/health", tags=["health"])
app.include_router(chat_router, prefix="/api/chat", tags=["chat"])
app.include_router(actions_router, prefix="/api/actions", tags=["actions"])
app.include_router(wins_router, prefix="/api/wins", tags=["wins"])
app.include_router(wheels_router, prefix="/api/wheels", tags=["wheels"])
app.include_router(social_router, prefix="/api/social", tags=["social"])
app.include_router(you_router, prefix="/api/you", tags=["you"])
app.include_router(demo_router, prefix="/api/demo", tags=["demo"])
# WebSocket router now uses /ws prefix to match frontend URL
app.include_router(websocket_router, prefix="/ws", tags=["websocket"])

@app.get("/")
async def root():
    return {
        "message": "🤖 PAM - Your Personal AI Manager is Ready!",
        "tagline": "The Ultimate AI Travel Companion for Grey Nomads",
        "version": "2.0.0",
        "status": "🟢 Fully Operational",
        "description": "PAM is an intelligent AI assistant specifically designed for Grey Nomads, Snowbirds, and Full-Time Travellers. She thinks, plans, and adapts to help you explore the world while managing your finances and connecting with community.",
        # ... rest unchanged ...
    }

@app.get("/api/status")
async def detailed_status():
    # ... unchanged status endpoint ...
    return { /* existing status dict */ }

@app.get("/api/pam/greeting")
async def pam_greeting():
    # ... unchanged greeting endpoint ...
    return { /* existing greeting dict */ }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
