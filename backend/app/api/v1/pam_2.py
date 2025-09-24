"""
PAM 2.0 API Endpoints - Clean, Modular Implementation
Following original Phase 1 setup from Build Playbook
"""

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
import logging
import asyncio

# Import the ConversationalEngine service
from app.services.pam_2.services.conversational_engine import ConversationalEngine
from app.services.pam_2.core.types import ChatMessage, MessageType, ConversationContext
from datetime import datetime

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
    Phase 2 implementation: Real Gemini integration via ConversationalEngine
    """
    try:
        logger.info(f"PAM 2.0 REST chat request from user {request.user_id}: {request.message[:50]}...")

        # Initialize ConversationalEngine
        engine = ConversationalEngine()

        # Create ChatMessage for the engine
        user_message = ChatMessage(
            user_id=request.user_id,
            type=MessageType.USER,
            content=request.message,
            timestamp=datetime.now()
        )

        # Create context if provided
        context = None
        if request.context:
            context = ConversationContext(
                user_id=request.user_id,
                current_topic=None,
                messages=[],  # For REST, we don't have message history
                context_data=request.context
            )

        # Process message through ConversationalEngine
        service_response = await engine.process_message(
            user_id=request.user_id,
            message=request.message,
            context=context
        )

        if service_response.success:
            response = ChatResponse(
                response=service_response.data.get('response', 'I\'m here to help!'),
                ui_action=service_response.data.get('ui_action'),
                metadata={
                    "user_id": request.user_id,
                    "phase": "2_active",
                    "model_used": service_response.data.get('model_used', 'gemini-1.5-flash'),
                    "timestamp": service_response.data.get('timestamp'),
                    **service_response.metadata
                }
            )
            logger.info(f"✅ PAM 2.0 successful response for user {request.user_id}")
            return response
        else:
            logger.error(f"❌ ConversationalEngine failed for user {request.user_id}")
            raise HTTPException(status_code=500, detail="AI service unavailable")

    except Exception as e:
        logger.error(f"PAM 2.0 chat endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# WebSocket Chat Endpoint
@router.websocket("/chat/ws")
async def chat_websocket(websocket: WebSocket):
    """
    PAM 2.0 WebSocket Chat Endpoint
    Phase 2 implementation: Real-time conversation via ConversationalEngine
    """
    await websocket.accept()
    engine = ConversationalEngine()

    try:
        while True:
            # Receive message
            data = await websocket.receive_json()

            user_id = data.get("user_id")
            message = data.get("message", "")

            if not user_id or not message:
                error_response = {
                    "error": "Missing user_id or message",
                    "type": "error"
                }
                await websocket.send_json(error_response)
                continue

            logger.info(f"PAM 2.0 WebSocket message from user {user_id}: {message[:50]}...")

            try:
                # Process message through ConversationalEngine
                service_response = await engine.process_message(
                    user_id=user_id,
                    message=message,
                    context=None  # WebSocket context management to be implemented
                )

                if service_response.success:
                    response = {
                        "response": service_response.data.get('response', 'I\'m here to help!'),
                        "ui_action": service_response.data.get('ui_action'),
                        "type": "message",
                        "metadata": {
                            "user_id": user_id,
                            "phase": "2_active",
                            "model_used": service_response.data.get('model_used', 'gemini-1.5-flash'),
                            "timestamp": service_response.data.get('timestamp'),
                            **service_response.metadata
                        }
                    }
                    logger.info(f"✅ PAM 2.0 WebSocket successful response for user {user_id}")
                else:
                    logger.error(f"❌ ConversationalEngine failed for user {user_id}")
                    response = {
                        "error": "AI service unavailable",
                        "type": "error"
                    }

                await websocket.send_json(response)

            except Exception as e:
                logger.error(f"Error processing WebSocket message: {e}")
                error_response = {
                    "error": "Failed to process message",
                    "type": "error"
                }
                await websocket.send_json(error_response)

    except WebSocketDisconnect:
        logger.info("PAM 2.0 WebSocket disconnected")
    except Exception as e:
        logger.error(f"PAM 2.0 WebSocket error: {e}")
        await websocket.close(code=1000)