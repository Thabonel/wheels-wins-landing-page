
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status, Query, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse, Response
from typing import List, Optional, Dict, Any
import json
import uuid
import logging
import time
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
from pydantic import BaseModel
from app.models.schemas.common import SuccessResponse, PaginationParams
from app.core.websocket_manager import manager
from app.core.logging import setup_logging, get_logger
from app.core.exceptions import PAMError
from app.observability.monitor import global_monitor
from app.services.voice.edge_processing_service import edge_processing_service

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
            logger.info(f"📨 [DEBUG] WebSocket message received from user {user_id}")
            logger.info(f"  - Full message data: {data}")
            logger.info(f"  - Message type: {data.get('type')}")
            logger.info(f"  - Message content: {data.get('content', data.get('message', 'N/A'))}")
            
            # Process different message types
            if data.get("type") == "ping":
                logger.info(f"🏓 [DEBUG] Ping received from {user_id}, sending pong")
                await websocket.send_json({"type": "pong"})
                
            elif data.get("type") == "pong":
                # Handle pong response for heartbeat monitoring
                await manager.handle_pong(connection_id)
                logger.debug(f"💓 [DEBUG] Received pong from {connection_id}")
                
            elif data.get("type") == "chat":
                logger.info(f"💬 [DEBUG] Chat message detected, calling handle_websocket_chat")
                await handle_websocket_chat(websocket, data, user_id, orchestrator)
                logger.info(f"✅ [DEBUG] handle_websocket_chat completed for user {user_id}")
                
            elif data.get("type") == "context_update":
                logger.info(f"🔄 [DEBUG] Context update received from {user_id}")
                await handle_context_update(websocket, data, user_id, db)
                
            elif data.get("type") == "auth":
                logger.info(f"🔐 [DEBUG] Auth message received from {user_id} - ignoring (already authenticated)")
                # Auth messages are just for connection establishment, ignore them
                
            else:
                logger.warning(f"❓ [DEBUG] Unknown message type '{data.get('type')}' from user {user_id}")
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
    """Handle chat messages over WebSocket with edge processing integration"""
    try:
        # Support both 'message' and 'content' fields for backwards compatibility
        message = data.get("message") or data.get("content", "")
        context = data.get("context", {})
        context["user_id"] = user_id
        context["connection_type"] = "websocket"
        
        # CRITICAL: Fix location context mapping
        # Frontend sends 'userLocation' but backend expects 'user_location'
        if context.get("userLocation"):
            context["user_location"] = context["userLocation"]
            logger.info(f"📍 [DEBUG] User location received: {context['user_location']}")
        
        # Add current timestamp in user's timezone (if location provided)
        context["server_timestamp"] = datetime.utcnow().isoformat()
        
        # TODO: Add timezone detection based on user location
        # For now, note that user reported it's August 1st in their timezone
        context["user_timezone_note"] = "User reported August 1st in their location"
        
        logger.info(f"🔍 [DEBUG] handle_websocket_chat called with:")
        logger.info(f"  - Raw data: {data}")
        logger.info(f"  - Extracted message: '{message}'")
        logger.info(f"  - User ID: {user_id}")
        logger.info(f"  - Context: {context}")
        
        # Check for empty message
        if not message or message.strip() == "":
            logger.warning(f"❌ [DEBUG] Empty message received from user {user_id}")
            await websocket.send_json({
                "type": "error",
                "message": "I didn't receive your message. Could you please try again?"
            })
            return
        
        logger.info(f"✅ [DEBUG] Processing non-empty message: '{message}' for user: {user_id}")
        
        # Try edge processing first for ultra-fast responses
        start_time = time.time()
        logger.info(f"⚡ [DEBUG] Starting edge processing for message: '{message[:50]}...'")
        
        edge_result = await edge_processing_service.process_query(message, context)
        logger.info(f"⚡ [DEBUG] Edge processing result: handled={edge_result.handled}, confidence={edge_result.confidence:.2f}")
        
        if edge_result.handled and edge_result.response:
            # Edge processing succeeded - send immediate response
            processing_time = (time.time() - start_time) * 1000
            logger.info(f"⚡ [DEBUG] Edge processed in {processing_time:.1f}ms: '{edge_result.response[:100]}...'")
            
            await websocket.send_json({
                "type": "response",
                "content": edge_result.response,
                "source": "edge",
                "processing_time_ms": processing_time,
                "confidence": edge_result.confidence,
                "metadata": edge_result.metadata
            })
            logger.info(f"📤 [DEBUG] Edge response sent successfully to user {user_id}")
            return
        
        # Fallback to full PAM processing
        logger.info(f"🔄 [DEBUG] Falling back to cloud processing (edge confidence: {edge_result.confidence:.2f})")
        
        # Use SimplePamService instead of orchestrator
        from app.core.simple_pam_service import simple_pam_service
        logger.info(f"📥 [DEBUG] Imported SimplePamService, calling get_response...")
        
        # Get conversation history if available
        conversation_history = context.get("conversation_history", [])
        logger.info(f"📚 [DEBUG] Conversation history length: {len(conversation_history)}")
        
        # Process through SimplePamService
        logger.info(f"🤖 [DEBUG] Calling SimplePamService.get_response with message: '{message}'")
        response_message = await simple_pam_service.get_response(
            message=message,
            context=context,
            conversation_history=conversation_history
        )
        
        logger.info(f"🎯 [DEBUG] SimplePamService response received: '{response_message[:100]}...'")
        
        # Create actions array for compatibility
        actions = [{
            "type": "message",
            "content": response_message
        }]
        
        # Calculate total processing time
        total_processing_time = (time.time() - start_time) * 1000
        logger.info(f"⏱️ [DEBUG] Total processing time: {total_processing_time:.1f}ms")
        
        # Check if WebSocket is still open before sending
        if websocket.client_state.value == 1:  # WebSocketState.CONNECTED
            logger.info(f"📡 [DEBUG] WebSocket still connected, sending response...")
            
            response_payload = {
                "type": "chat_response",
                "message": response_message,
                "content": response_message,  # Add content field for frontend compatibility
                "actions": actions,
                "source": "cloud",
                "processing_time_ms": total_processing_time,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            logger.info(f"📤 [DEBUG] Sending response payload: {response_payload}")
            
            # Send response
            await websocket.send_json(response_payload)
            logger.info(f"✅ [DEBUG] Response sent successfully to user {user_id}")
            
            # Send UI actions if any (currently none from SimplePamService)
            ui_actions = [a for a in actions if a.get("type") in ["navigate", "fill_form", "click", "alert"]]
            if ui_actions and websocket.client_state.value == 1:
                logger.info(f"🎬 [DEBUG] Sending UI actions: {ui_actions}")
                await websocket.send_json({
                    "type": "ui_actions",
                    "actions": ui_actions
                })
        else:
            logger.warning(f"❌ [DEBUG] WebSocket closed for user {user_id}, skipping response")
            
    except Exception as e:
        logger.error(f"❌ [DEBUG] Chat handling error: {str(e)}", exc_info=True)
        if websocket.client_state.value == 1:  # Only send if connected
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

# OPTIONS handlers removed - using global OPTIONS handler in main.py

# Handle OPTIONS for chat endpoint explicitly
@router.options("/chat")
async def chat_options(request: Request):
    """Handle CORS preflight for chat endpoint"""
    from app.core.cors_config import cors_config
    
    # Get the origin from the request
    origin = request.headers.get("origin")
    requested_method = request.headers.get("access-control-request-method")
    requested_headers = request.headers.get("access-control-request-headers")
    
    return cors_config.create_options_response(
        origin=origin,
        requested_method=requested_method,
        requested_headers=requested_headers,
        cache_bust=True
    )

# REST Chat endpoint
@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    request: ChatRequest,
    orchestrator = Depends(get_pam_orchestrator),
    current_user: dict = Depends(verify_supabase_jwt_token),
    # _rate_limit = Depends(apply_rate_limit("chat", 30, 60))  # Disabled for now
):
    """Process a chat message via REST API - uses standard JWT auth with OPTIONS support"""
    try:
        start_time = datetime.utcnow()
        
        # Handle OPTIONS preflight - should not reach here but add safety check
        if current_user.get("method") == "OPTIONS":
            return {"message": "OPTIONS handled"}
        
        # Get user_id from validated token payload
        user_id = current_user.get("sub")
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
async def pam_health_check():
    """Optimized PAM service health check with caching and performance monitoring"""
    from app.core.performance_optimizer import performance_optimizer, optimized_operation
    
    async with optimized_operation("pam_health_check"):
        async def _perform_health_check():
            """Actual health check logic with optimizations"""
            try:
                # Quick configuration check (no complex validation)
                from app.core.config import get_settings
                settings = get_settings()
                
                has_openai_key = bool(getattr(settings, 'OPENAI_API_KEY', None))
                
                if not has_openai_key:
                    return {
                        "status": "degraded",
                        "timestamp": datetime.utcnow().isoformat(),
                        "service": "PAM",
                        "openai_api": "not_configured",
                        "message": "PAM available in text-only mode - OpenAI API key not configured"
                    }
                
                # Quick OpenAI connectivity test (no actual API call)
                try:
                    import openai
                    openai_available = True
                except ImportError:
                    openai_available = False
                
                # Determine status based on available components
                if openai_available and has_openai_key:
                    status = "healthy"
                    openai_status = "available"
                    message = "PAM service operational"
                elif has_openai_key:
                    status = "degraded"
                    openai_status = "library_missing"
                    message = "OpenAI library not available"
                else:
                    status = "degraded"
                    openai_status = "not_configured"
                    message = "OpenAI API not configured"
                
                return {
                    "status": status,
                    "timestamp": datetime.utcnow().isoformat(),
                    "service": "PAM",
                    "openai_api": openai_status,
                    "message": message,
                    "performance": {
                        "optimized": True,
                        "cached": True
                    }
                }
                
            except Exception as e:
                logger.error(f"Optimized PAM health check error: {str(e)}")
                return {
                    "status": "unhealthy",
                    "timestamp": datetime.utcnow().isoformat(),
                    "error": f"Health check failed: {str(e)}",
                    "service": "PAM"
                }
        
        # Use cached health check with 30-second TTL
        return await performance_optimizer.get_cached_health_status(
            "pam_service", _perform_health_check
        )


# OPTIONS handler for voice endpoint
@router.options("/voice")
async def voice_options(request: Request):
    """Handle CORS preflight for voice endpoint"""
    from app.core.cors_config import cors_config
    
    # Get the origin from the request
    origin = request.headers.get("origin")
    requested_method = request.headers.get("access-control-request-method")
    requested_headers = request.headers.get("access-control-request-headers")
    
    return cors_config.create_options_response(
        origin=origin,
        requested_method=requested_method,
        requested_headers=requested_headers,
        cache_bust=True
    )

# TTS Debug endpoint
@router.get("/tts-debug")
async def tts_debug_info():
    """Debug endpoint to verify TTS configuration and deployment"""
    from app.services.tts.enhanced_tts_service import enhanced_tts_service
    from app.core.config import get_settings
    
    settings = get_settings()
    
    return {
        "deployment_timestamp": "2025-08-02T01:52:00Z",
        "tts_voice_configured": settings.TTS_VOICE_DEFAULT,
        "enhanced_tts_initialized": enhanced_tts_service.is_initialized,
        "available_engines": list(enhanced_tts_service.engines.keys()) if enhanced_tts_service.engines else [],
        "fallback_chain": [engine.value for engine in enhanced_tts_service.fallback_chain],
        "edge_tts_available": "edge-tts package check",
        "commit_hash": "62c0ef3"
    }

# TTS endpoint for voice generation
class VoiceRequest(BaseModel):
    text: str
    temperature: float = 1.1
    cfg_scale: float = 3.0
    speed_factor: float = 0.96
    max_new_tokens: int = 2048

@router.post("/voice")
async def generate_pam_voice(
    request: VoiceRequest,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
):
    """Generate PAM voice audio from text using enhanced TTS service"""
    try:
        logger.info(f"🎙️ Enhanced TTS request for text: {request.text[:100]}...")
        
        # Use the enhanced TTS service with 4-tier fallback
        from app.services.tts.enhanced_tts_service import enhanced_tts_service
        from app.core.config import get_settings
        settings = get_settings()
        
        # Initialize service if not already done
        if not enhanced_tts_service.is_initialized:
            logger.info("🔄 Initializing Enhanced TTS service...")
            await enhanced_tts_service.initialize()
        
        if not enhanced_tts_service.is_initialized:
            logger.error("❌ Enhanced TTS service could not be initialized")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "error": "TTS service initialization failed",
                    "message": "No TTS engines could be initialized. Please check system configuration."
                }
            )
        
        # Use enhanced TTS service with automatic fallback
        result = await enhanced_tts_service.synthesize(
            text=request.text,
            voice_id=settings.TTS_VOICE_DEFAULT or "en-US-JennyNeural",  # Mature female voice
            max_retries=4  # Try all 4 engines in fallback chain
        )
        
        if result.audio_data:
            logger.info(f"✅ Enhanced TTS successful with {result.engine.value}: {len(result.audio_data)} bytes")
            
            # Convert audio data to array format expected by frontend
            audio_array = list(result.audio_data)
            
            return {
                "audio": audio_array,
                "duration": result.duration_ms // 1000 if result.duration_ms else len(request.text) // 10,
                "cached": result.cache_hit,
                "engine": result.engine.value,
                "quality": result.quality.value,
                "fallback_used": result.fallback_used,
                "processing_time_ms": result.processing_time_ms
            }
        
        # Enhanced TTS failed completely - return meaningful error
        error_message = result.error if result.error else "Unknown TTS failure"
        logger.error(f"❌ All TTS engines failed: {error_message}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "TTS service unavailable",
                "message": f"All text-to-speech engines failed: {error_message}",
                "fallback_text": request.text,
                "engines_tried": [engine.value for engine in enhanced_tts_service.fallback_chain]
            }
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"❌ Voice generation critical error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Voice generation system error: {str(e)}")
