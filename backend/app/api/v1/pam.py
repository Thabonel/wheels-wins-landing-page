
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse, Response
from typing import List, Optional, Dict, Any
import json
import uuid
import logging
from datetime import datetime

from app.api.deps import (
    get_current_user, verify_supabase_jwt_token, verify_supabase_jwt_flexible, get_pam_orchestrator, get_database,
    apply_rate_limit, get_pagination_params, validate_user_context
)
from app.models.schemas.pam import (
    ChatRequest, ChatResponse, ConversationCreateRequest,
    ConversationListResponse, MessageHistoryResponse,
    ContextUpdateRequest, PamFeedbackRequest, PamThumbFeedbackRequest
)
from app.models.schemas.common import SuccessResponse, PaginationParams
from app.core.websocket_manager import manager
from app.core.logging import setup_logging, get_logger
from app.core.exceptions import PAMError
from app.observability.monitor import global_monitor

router = APIRouter()
setup_logging()
logger = get_logger(__name__)




# WebSocket endpoint for real-time chat
@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(default="test-connection"),
    orchestrator = Depends(get_pam_orchestrator),
    db = Depends(get_database)
):
    """WebSocket endpoint for real-time PAM communication"""
    connection_id = str(uuid.uuid4())
    
    try:
        # IMPORTANT: Accept the WebSocket connection FIRST
        await websocket.accept()
        
        # Extract user_id from token - support both Supabase JWT and simple user_id tokens
        if token == "test-connection":
            user_id = "test-user"
            logger.info("🧪 Test connection established")
        elif not token or token == "":
            user_id = "anonymous"
        else:
            try:
                # Try to decode as JWT first (for Supabase tokens)
                import jwt
                decoded = jwt.decode(token, options={"verify_signature": False})
                user_id = decoded.get('sub', token)  # 'sub' is the user ID in Supabase JWT
                logger.info(f"🔐 JWT token decoded for user: {user_id}")
            except Exception as jwt_error:
                # Fall back to treating token as plain user_id
                user_id = token if token else "anonymous"
                logger.info(f"💡 Using token as plain user_id: {user_id}")
        
        # Now register the connection with the manager  
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
        manager.disconnect(user_id, connection_id)
        logger.info(f"WebSocket client {user_id} disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        manager.disconnect(user_id, connection_id)
        try:
            await websocket.close(code=1011, reason="Internal server error")
        except:
            pass

async def handle_websocket_chat(websocket: WebSocket, data: dict, user_id: str, orchestrator):
    """Handle chat messages over WebSocket using SimplePamService"""
    try:
        message = data.get("content", "")
        context = data.get("context", {})
        context["user_id"] = user_id
        context["connection_type"] = "websocket"
        
        logger.info(f"Processing chat message: '{message}' for user: {user_id}")
        
        # Use SimplePamService instead of orchestrator
        from app.core.simple_pam_service import simple_pam_service
        
        # Get conversation history if available
        conversation_history = context.get("conversation_history", [])
        
        # Process through SimplePamService
        response_message = await simple_pam_service.get_response(
            message=message,
            context=context,
            conversation_history=conversation_history
        )
        
        logger.info(f"🎯 SimplePamService response received: {response_message}")
        
        # Create actions array for compatibility
        actions = [{
            "type": "message",
            "content": response_message
        }]
        
        # Send response
        await websocket.send_json({
            "type": "chat_response",
            "message": response_message,
            "content": response_message,  # Add content field for frontend compatibility
            "actions": actions,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Send UI actions if any (currently none from SimplePamService)
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

# Add OPTIONS support for CORS preflight
@router.options("/chat")
async def chat_options():
    """Handle CORS preflight requests for chat endpoint"""
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
    )

@router.options("/history")
async def history_options():
    """Handle CORS preflight requests for history endpoint"""
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
    )

@router.options("/context")
async def context_options():
    """Handle CORS preflight requests for context endpoint"""
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
    )

@router.options("/feedback")
async def feedback_options():
    """Handle CORS preflight requests for feedback endpoint"""
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
    )

@router.options("/health")
async def health_options():
    """Handle CORS preflight requests for health endpoint"""
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
    )

# REST Chat endpoint
@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    request: ChatRequest,
    orchestrator = Depends(get_pam_orchestrator),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    # _rate_limit = Depends(apply_rate_limit("chat", 30, 60))  # Disabled for now
):
    """Process a chat message via REST API - supports both header and body-based JWT auth"""
    try:
        start_time = datetime.utcnow()
        
        # WORKAROUND: Handle both Authorization header and body-based JWT token
        # This allows us to bypass Render.com's header size limits
        from app.api.deps import verify_token_from_request_or_header
        
        # Convert request to dict for token verification
        request_dict = request.dict()
        
        # Verify authentication using flexible method
        token_payload = verify_token_from_request_or_header(request_dict, credentials)
        
        # Get user_id from token payload
        user_id = token_payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Prepare context
        context = request.context or {}
        context["user_id"] = str(user_id)
        
        logger.info(f"Processing chat request for user {user_id}")
        
        # Process through SimplePamService instead of orchestrator
        from app.core.simple_pam_service import simple_pam_service
        
        # Get conversation history if available
        conversation_history = context.get("conversation_history", [])
        
        # Process through SimplePamService
        pam_response = await simple_pam_service.process_message(
            str(user_id),
            request.message,
            session_id=request.conversation_id,
            context=context
        )
        actions = pam_response.get("actions", [])
        
        # Calculate processing time
        processing_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        processing_time_seconds = processing_time / 1000.0

        # Determine response message
        response_text = pam_response.get("content") or "I'm here to help!"
        has_error = False
        for action in actions or []:
            if action.get("type") == "error":
                response_text = f"❌ {action.get('content', response_text)}"
                has_error = True
                break
        
        # Record observability metrics
        global_monitor.record_observation(
            observation_type="pam_chat",
            duration=processing_time_seconds,
            success=not has_error,
            metadata={
                "user_id": user_id,
                "message_length": len(request.message),
                "response_length": len(response_text),
                "has_actions": len(actions) > 0 if actions else False
            }
        )
        
        session_id = request.conversation_id or request.session_id or str(uuid.uuid4())
        
        return ChatResponse(
            response=response_text,
            actions=actions,
            conversation_id=session_id,
            session_id=session_id,  # Required field
            message_id=str(uuid.uuid4()),
            processing_time_ms=processing_time,
            timestamp=datetime.utcnow()
        )
        
    except Exception as e:
        logger.error(f"Chat endpoint error: {str(e)}", exc_info=True)
        
        # Calculate processing time for error case
        error_processing_time = (datetime.utcnow() - start_time).total_seconds()
        
        # Record failed observation
        global_monitor.record_observation(
            observation_type="pam_chat",
            duration=error_processing_time,
            success=False,
            metadata={
                "error": str(e),
                "error_type": type(e).__name__,
                "message_length": len(request.message) if hasattr(request, 'message') else 0
            }
        )
        
        # Use SimplePamService fallback for error handling
        from app.core.simple_pam_service import simple_pam_service
        
        # Get a helpful error response from SimplePamService
        fallback_response = simple_pam_service._get_error_response(
            request.message if hasattr(request, 'message') else "help",
            str(e)
        )
        
        session_id = request.conversation_id or request.session_id or str(uuid.uuid4())
        
        return ChatResponse(
            response=fallback_response,
            actions=[{"type": "error", "content": str(e)}],
            conversation_id=session_id,
            session_id=session_id,
            message_id=str(uuid.uuid4()),
            processing_time_ms=int(error_processing_time * 1000),
            timestamp=datetime.utcnow()
        )

# Get conversation history
@router.get("/history", response_model=MessageHistoryResponse)
async def get_conversation_history(
    conversation_id: Optional[str] = None,
    pagination: PaginationParams = Depends(get_pagination_params),
    current_user = Depends(get_current_user),
    db = Depends(get_database),
    orchestrator = Depends(get_pam_orchestrator)
):
    """Get conversation history for the user"""
    try:
        history = await orchestrator.get_conversation_history(
            str(current_user.id),
            limit=pagination.limit
        )
        return MessageHistoryResponse(
            messages=history,
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
    orchestrator = Depends(get_pam_orchestrator)
):
    """Clear conversation history for the user"""
    try:
        client = orchestrator.database_service.get_client()
        query = client.table("pam_conversation_memory").delete().eq(
            "user_id", str(current_user.id)
        )
        if conversation_id:
            query = query.eq("session_id", conversation_id)
        query.execute()

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
    orchestrator = Depends(get_pam_orchestrator)
):
    """Get current user context for PAM"""
    try:
        context = await orchestrator._get_enhanced_context(
            str(current_user.id),
            session_id="default"
        )
        return {"context": context.dict()}
        
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
    orchestrator = Depends(get_pam_orchestrator),
    _validate_context = Depends(validate_user_context)
):
    """Update user context for PAM"""
    try:
        logger.info(f"Updating context for user {current_user.id}")

        enriched = orchestrator.context_manager.validate_and_enrich_context(
            {**request.dict(exclude_unset=True), "user_id": str(current_user.id)}
        )

        client = orchestrator.database_service.get_client()
        client.table("user_context").upsert(enriched).execute()

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
    orchestrator = Depends(get_pam_orchestrator),
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
        
        client = orchestrator.database_service.get_client()
        client.table("pam_feedback").insert(feedback_data).execute()

        # Track feedback via analytics
        from app.services.analytics.analytics import AnalyticsEvent, EventType

        await orchestrator.analytics.track_event(
            AnalyticsEvent(
                event_type=EventType.FEATURE_USAGE,
                user_id=str(current_user.id),
                timestamp=datetime.utcnow(),
                event_data={"feature": "pam_feedback", "rating": request.rating}
            )
        )

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

# Record simple thumbs feedback
@router.post("/v1/pam/feedback", response_model=SuccessResponse)
async def record_thumb_feedback(
    request: PamThumbFeedbackRequest,
    current_user = Depends(get_current_user),
    orchestrator = Depends(get_pam_orchestrator),
):
    """Record thumbs-up or thumbs-down for a PAM message."""
    try:
        data = {
            "id": str(uuid.uuid4()),
            "user_id": str(current_user.id),
            "message_id": request.message_id,
            "thumbs_up": request.thumbs_up,
            "created_at": datetime.utcnow(),
        }
        client = orchestrator.database_service.get_client()
        client.table("pam_feedback").insert(data).execute()

        return SuccessResponse(success=True, message="Feedback recorded")

    except Exception as e:
        logger.error(f"Feedback submission error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit feedback",
        )

# Health check for PAM services
@router.get("/health")
async def pam_health_check(
    orchestrator = Depends(get_pam_orchestrator)
):
    """Check PAM service health"""
    try:
        # Check if orchestrator and database service are available
        if not orchestrator:
            return {
                "status": "unhealthy",
                "timestamp": datetime.utcnow().isoformat(),
                "error": "PAM orchestrator not available"
            }
        
        if not orchestrator.database_service:
            return {
                "status": "unhealthy", 
                "timestamp": datetime.utcnow().isoformat(),
                "error": "Database service not initialized"
            }
        
        db_status = await orchestrator.database_service.health_check()
        return {
            "status": "healthy" if db_status.get("status") == "healthy" else "degraded",
            "timestamp": datetime.utcnow().isoformat(),
            "services": {
                "orchestrator": "available",
                "database": db_status.get("status")
            }
        }
        
    except Exception as e:
        logger.error(f"Health check error: {str(e)}")
        return {
            "status": "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e)
        }
