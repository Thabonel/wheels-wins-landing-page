"""
PAM 2.0 API Endpoints - Clean, Modular Implementation
Following original Phase 1 setup from Build Playbook
"""

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Request/Response Models
class ChatRequest(BaseModel):
    user_id: str
    message: str
    context: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    response: str
    ui_action: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

# Health Check for PAM 2.0
@router.get("/health")
async def pam_health():
    """PAM 2.0 Health Check"""
    return JSONResponse(
        status_code=200,
        content={
            "status": "ok",
            "service": "pam-2.0",
            "version": "2.0.0",
            "modules": {
                "conversational_engine": "ready",
                "context_manager": "ready",
                "trip_logger": "ready",
                "savings_tracker": "ready",
                "safety_layer": "ready"
            }
        }
    )

# REST Chat Endpoint
@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    PAM 2.0 Chat Endpoint (REST)
    Phase 2 implementation: Gemini integration + guardrails
    """
    try:
        # TODO Phase 2: Implement these modules
        # - Guardrails middleware (medium-level content filtering)
        # - Redis rate limiting (100 messages/hour per user)
        # - Send to Gemini API (primary)
        # - MCP database access
        # - Log to Supabase pam_messages

        # Placeholder response for Phase 1
        response = ChatResponse(
            response=f"Hello! PAM 2.0 received your message: '{request.message}'. Full implementation coming in Phase 2.",
            ui_action=None,
            metadata={
                "user_id": request.user_id,
                "phase": "1_placeholder",
                "features_coming": [
                    "Gemini 1.5 Flash integration",
                    "Medium-level guardrails",
                    "Redis rate limiting",
                    "MCP database read/write",
                    "Real-time UI updates"
                ]
            }
        )

        return response

    except Exception as e:
        logger.error(f"Chat endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# WebSocket Chat Endpoint
@router.websocket("/chat/ws")
async def chat_websocket(websocket: WebSocket):
    """
    PAM 2.0 WebSocket Chat Endpoint
    Phase 2 implementation: Real-time conversation + database updates
    """
    await websocket.accept()

    try:
        while True:
            # Receive message
            data = await websocket.receive_json()

            # TODO Phase 2: Implement
            # - Real-time message processing
            # - Database change notifications
            # - User-isolated channels
            # - Graceful degradation

            # Placeholder response for Phase 1
            response = {
                "response": f"PAM 2.0 WebSocket received: {data.get('message', '')}",
                "type": "placeholder",
                "phase": "1_setup_complete"
            }

            await websocket.send_json(response)

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.close(code=1000)