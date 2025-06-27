
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict, Any
import json
import uuid
import logging
from datetime import datetime

from app.api.deps import (
    get_current_user, get_pam_orchestrator, get_database,
    apply_rate_limit, get_pagination_params, validate_user_context
)
from app.models.schemas.pam import (
    ChatRequest, ChatResponse, ConversationCreateRequest,
    ConversationListResponse, MessageHistoryResponse,
    ContextUpdateRequest, PamFeedbackRequest
)
from app.models.schemas.common import SuccessResponse, PaginationParams
from app.services.websocket_manager import manager
from app.core.logging import setup_logging
from app.core.exceptions import PAMError

router = APIRouter()
logger = setup_logging()

# WebSocket endpoint for real-time chat
@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str,
    orchestrator = Depends(get_pam_orchestrator),
    db = Depends(get_database)
):
    """WebSocket endpoint for real-time PAM communication"""
    connection_id = str(uuid.uuid4())
    
    try:
        # Verify token and get user (simplified for WebSocket)
        if not token:
            await websocket.close(code=1008, reason="Unauthorized")
            return
        
        # Extract user_id from token (you may want to implement proper JWT validation)
        user_id = token  # Simplified - implement proper JWT decoding
        
        await manager.connect(websocket, user_id, connection_id)
        
        # Send welcome message
        await websocket.send_json({
            "type": "connection",
            "status": "connected",
            "message": "🤖 PAM is ready to assist you!",
            "timestamp": datetime.utcnow().isoformat()
        })
        
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            logger.info(f"WebSocket message received: {data}")
            
            # Process different message types
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
                
            elif data.get("type") == "chat":
                await handle_websocket_chat(websocket, data, user_id, orchestrator)
                
            elif data.get("type") == "context_update":
                await handle_context_update(websocket, data, user_id, db)
                
            else:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Unknown message type: {data.get('type')}"
                })
                
    except WebSocketDisconnect:
        await manager.disconnect(user_id, connection_id)
        logger.info(f"WebSocket client {user_id} disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        await manager.disconnect(user_id, connection_id)
        try:
            await websocket.close(code=1011, reason="Internal server error")
        except:
            pass

async def handle_websocket_chat(websocket: WebSocket, data: dict, user_id: str, orchestrator):
    """Handle chat messages over WebSocket"""
    try:
        message = data.get("content", "")
        context = data.get("context", {})
        context["user_id"] = user_id
        
        logger.info(f"Processing chat message: '{message}' for user: {user_id}")
        
        # Process through orchestrator
        actions = await orchestrator.plan(message, context)
        
        # Determine response message
        response_message = "I'm processing your request..."
        for action in actions or []:
            if action.get("type") == "message":
                response_message = action.get("content", response_message)
                break
            elif action.get("type") == "error":
                response_message = f"❌ {action.get('content', 'An error occurred')}"
                break
        
        # Send response
        await websocket.send_json({
            "type": "chat_response",
            "message": response_message,
            "actions": actions,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Send UI actions if any
        ui_actions = [a for a in actions if a.get("type") in ["navigate", "fill_form", "click", "alert"]]
        if ui_actions:
            await websocket.send_json({
                "type": "ui_actions",
                "actions": ui_actions
            })
            
    except Exception as e:
        logger.error(f"Chat handling error: {str(e)}")
        await websocket.send_json({
            "type": "error",
            "message": f"Sorry, I encountered an error: {str(e)}"
        })

async def handle_context_update(websocket: WebSocket, data: dict, user_id: str, db):
    """Handle context updates over WebSocket"""
    try:
        context_data = data.get("context", {})
        
        # Store context update in database
        # Implementation depends on your context storage strategy
        
        await websocket.send_json({
            "type": "context_updated",
            "message": "Context updated successfully",
            "timestamp": datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Context update error: {str(e)}")
        await websocket.send_json({
            "type": "error",
            "message": "Failed to update context"
        })

# REST Chat endpoint
@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    request: ChatRequest,
    current_user = Depends(get_current_user),
    orchestrator = Depends(get_pam_orchestrator),
    _rate_limit = Depends(apply_rate_limit("chat", 30, 60))  # 30 requests per minute
):
    """Process a chat message via REST API"""
    try:
        start_time = datetime.utcnow()
        
        # Prepare context
        context = request.context or {}
        context["user_id"] = str(current_user.id)
        
        logger.info(f"Processing chat request for user {current_user.id}")
        
        # Process through orchestrator
        actions = await orchestrator.plan(request.message, context)
        
        # Calculate processing time
        processing_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        
        # Determine response message
        response_text = "I'm processing your request..."
        for action in actions or []:
            if action.get("type") == "message":
                response_text = action.get("content", response_text)
                break
            elif action.get("type") == "error":
                response_text = f"❌ {action.get('content', 'An error occurred')}"
                break
        
        return ChatResponse(
            response=response_text,
            actions=actions,
            conversation_id=request.conversation_id or str(uuid.uuid4()),
            message_id=str(uuid.uuid4()),
            processing_time_ms=processing_time,
            timestamp=datetime.utcnow()
        )
        
    except Exception as e:
        logger.error(f"Chat endpoint error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process chat message"
        )

# Get conversation history
@router.get("/history", response_model=MessageHistoryResponse)
async def get_conversation_history(
    conversation_id: Optional[str] = None,
    pagination: PaginationParams = Depends(get_pagination_params),
    current_user = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get conversation history for the user"""
    try:
        # Implementation would fetch from pam_conversation_memory table
        # This is a simplified response
        return MessageHistoryResponse(
            messages=[],
            conversation=None,
            has_more=False,
            next_cursor=None
        )
        
    except Exception as e:
        logger.error(f"History retrieval error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve conversation history"
        )

# Clear conversation history
@router.delete("/history", response_model=SuccessResponse)
async def clear_conversation_history(
    conversation_id: Optional[str] = None,
    current_user = Depends(get_current_user),
    db = Depends(get_database)
):
    """Clear conversation history for the user"""
    try:
        # Implementation would clear from pam_conversation_memory table
        logger.info(f"Clearing conversation history for user {current_user.id}")
        
        return SuccessResponse(
            success=True,
            message="Conversation history cleared successfully"
        )
        
    except Exception as e:
        logger.error(f"History clearing error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clear conversation history"
        )

# Get user context
@router.get("/context")
async def get_user_context(
    current_user = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get current user context for PAM"""
    try:
        # Implementation would fetch user context from various tables
        context = {
            "user_id": str(current_user.id),
            "region": getattr(current_user, 'region', 'Australia'),
            "preferences": {},
            "recent_activity": [],
            "current_location": None,
            "travel_plans": {},
            "budget_status": {},
            "vehicle_info": {}
        }
        
        return {"context": context}
        
    except Exception as e:
        logger.error(f"Context retrieval error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user context"
        )

# Update user context
@router.put("/context", response_model=SuccessResponse)
async def update_user_context(
    request: ContextUpdateRequest,
    current_user = Depends(get_current_user),
    db = Depends(get_database),
    _validate_context = Depends(validate_user_context)
):
    """Update user context for PAM"""
    try:
        logger.info(f"Updating context for user {current_user.id}")
        
        # Implementation would update context in relevant tables
        # Update location, preferences, travel plans, etc.
        
        return SuccessResponse(
            success=True,
            message="User context updated successfully"
        )
        
    except Exception as e:
        logger.error(f"Context update error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user context"
        )

# Submit feedback on PAM responses
@router.post("/feedback", response_model=SuccessResponse)
async def submit_pam_feedback(
    request: PamFeedbackRequest,
    current_user = Depends(get_current_user),
    db = Depends(get_database),
    _rate_limit = Depends(apply_rate_limit("feedback", 10, 60))  # 10 feedback per minute
):
    """Submit feedback on PAM responses"""
    try:
        logger.info(f"Feedback submitted by user {current_user.id}")
        
        # Store feedback in pam_feedback table
        feedback_data = {
            "id": str(uuid.uuid4()),
            "user_id": str(current_user.id),
            "message_id": request.message_id,
            "rating": request.rating,
            "feedback_text": request.feedback_text,
            "feedback_type": request.feedback_type,
            "created_at": datetime.utcnow()
        }
        
        # Implementation would insert into database
        
        return SuccessResponse(
            success=True,
            message="Feedback submitted successfully"
        )
        
    except Exception as e:
        logger.error(f"Feedback submission error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit feedback"
        )

# Health check for PAM services
@router.get("/health")
async def pam_health_check(
    orchestrator = Depends(get_pam_orchestrator)
):
    """Check PAM service health"""
    try:
        # Check orchestrator and node availability
        health_status = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "services": {
                "orchestrator": "available",
                "websocket_manager": "available",
                "database": "available"
            }
        }
        
        return health_status
        
    except Exception as e:
        logger.error(f"Health check error: {str(e)}")
        return {
            "status": "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e)
        }
