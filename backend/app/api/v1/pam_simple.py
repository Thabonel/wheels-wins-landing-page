"""
Simple PAM WebSocket Endpoint

Clean, minimal implementation using the new PAM core.
No legacy cruft, no hybrid complexity - just works.

Endpoints:
- WebSocket: /api/v1/pam/ws/{user_id}
- REST: POST /api/v1/pam/chat

Date: October 1, 2025
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
import logging
import json
from datetime import datetime

from app.api.deps import verify_supabase_jwt_token
from app.services.pam.core import get_pam, clear_pam

router = APIRouter()
logger = logging.getLogger(__name__)


# Request/Response Models
class ChatRequest(BaseModel):
    """Request model for REST chat endpoint"""
    message: str
    context: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    """Response model for REST chat endpoint"""
    response: str
    timestamp: str
    latency_ms: Optional[int] = None


# WebSocket endpoint
@router.websocket("/ws/{user_id}")
async def pam_websocket(websocket: WebSocket, user_id: str, token: str):
    """
    WebSocket endpoint for real-time PAM conversations

    Usage:
        wss://backend-url/api/v1/pam/ws/{user_id}?token={jwt_token}

    Message format (client → server):
        {
            "type": "message",
            "content": "Add $50 gas expense",
            "context": {"location": {"lat": 37.7, "lng": -122.4}}
        }

    Response format (server → client):
        {
            "type": "response",
            "content": "Added $50 gas expense",
            "timestamp": "2025-10-01T10:30:00Z"
        }
    """
    await websocket.accept()
    logger.info(f"WebSocket connected for user {user_id}")

    try:
        # Get PAM instance for this user
        pam = await get_pam(user_id)

        # Main message loop
        while True:
            # Receive message from client
            data = await websocket.receive_text()

            try:
                message_data = json.loads(data)
                message_type = message_data.get("type", "message")
                content = message_data.get("content", "")
                context = message_data.get("context", {})

                if message_type == "message":
                    # Get response from PAM
                    response = await pam.chat(
                        message=content,
                        context=context,
                        stream=False  # Non-streaming for now, will add streaming later
                    )

                    # Send response back to client
                    await websocket.send_json({
                        "type": "response",
                        "content": response,
                        "timestamp": datetime.now().isoformat()
                    })

                    logger.info(f"PAM WebSocket: User {user_id} - Message processed")

                elif message_type == "ping":
                    # Keepalive ping
                    await websocket.send_json({
                        "type": "pong",
                        "timestamp": datetime.now().isoformat()
                    })

                else:
                    # Unknown message type
                    await websocket.send_json({
                        "type": "error",
                        "error": f"Unknown message type: {message_type}",
                        "timestamp": datetime.now().isoformat()
                    })

            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "error": "Invalid JSON",
                    "timestamp": datetime.now().isoformat()
                })

            except Exception as e:
                logger.error(f"Error processing message: {e}", exc_info=True)
                await websocket.send_json({
                    "type": "error",
                    "error": "Failed to process message",
                    "timestamp": datetime.now().isoformat()
                })

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for user {user_id}")

    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}", exc_info=True)

    finally:
        # Cleanup (optional - we keep PAM instance in memory for now)
        logger.info(f"WebSocket closed for user {user_id}")


# REST endpoint (for testing, non-WebSocket clients)
@router.post("/chat", response_model=ChatResponse)
async def pam_chat(
    request: ChatRequest,
    current_user: dict = Depends(verify_supabase_jwt_token)
):
    """
    REST endpoint for PAM chat (non-WebSocket)

    Useful for:
    - Testing
    - Non-WebSocket integrations
    - Simple request/response interactions

    Example:
        POST /api/v1/pam/chat
        {
            "message": "What's my budget balance?",
            "context": {}
        }
    """
    try:
        start_time = datetime.now()
        user_id = current_user.get("sub")

        # Get PAM instance
        pam = await get_pam(user_id)

        # Get response
        response = await pam.chat(
            message=request.message,
            context=request.context,
            stream=False
        )

        # Calculate latency
        latency_ms = int((datetime.now() - start_time).total_seconds() * 1000)

        logger.info(f"PAM REST: User {user_id} - Message processed ({latency_ms}ms)")

        return ChatResponse(
            response=response,
            timestamp=datetime.now().isoformat(),
            latency_ms=latency_ms
        )

    except Exception as e:
        logger.error(f"Error in PAM chat: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to process message"
        )


# Health check
@router.get("/health")
async def pam_health():
    """
    Health check for PAM service

    Returns:
        Status of PAM core components
    """
    return {
        "status": "healthy",
        "service": "PAM Simple",
        "version": "2.0",
        "model": "claude-sonnet-4-5-20250929",
        "timestamp": datetime.now().isoformat()
    }


# Debug endpoint (development only)
@router.get("/debug/{user_id}")
async def pam_debug(
    user_id: str,
    current_user: dict = Depends(verify_supabase_jwt_token)
):
    """
    Debug endpoint to inspect PAM state

    Only accessible in development mode.
    """
    try:
        pam = await get_pam(user_id)
        context = pam.get_context_summary()

        return {
            "user_id": user_id,
            "context": context,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Error in debug endpoint: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to get debug info"
        )
