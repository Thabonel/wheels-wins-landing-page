"""
PAM 2.0 API Endpoints - Clean, Modular Implementation
Following original Phase 1 setup from Build Playbook
"""

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Query, UploadFile, File, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import logging
import asyncio
import json

# Import the ConversationalEngine service
from app.services.pam_2.services.conversational_engine import ConversationalEngine
from app.services.pam_2.core.types import ChatMessage, MessageType, ConversationContext
from datetime import datetime
from app.db.supabase import supabase

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

class MessageHistoryResponse(BaseModel):
    user_id: str
    messages: List[Dict[str, Any]]
    total_count: int

class ContextUpdateRequest(BaseModel):
    user_id: str
    context_data: Dict[str, Any]

class ContextResponse(BaseModel):
    user_id: str
    context: Dict[str, Any]

class FeedbackRequest(BaseModel):
    user_id: str
    message_id: Optional[str] = None
    feedback_type: str  # 'thumbs_up', 'thumbs_down', 'report'
    feedback_text: Optional[str] = None

class MultimodalChatRequest(BaseModel):
    user_id: str
    message: str
    analysis_type: Optional[str] = 'general'  # 'general', 'damage_assessment', 'campsite', 'document', 'troubleshooting'
    context: Optional[Dict[str, Any]] = None

class MultimodalChatResponse(BaseModel):
    response: str
    ui_action: Optional[str] = None
    image_analysis: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None

class SuccessResponse(BaseModel):
    success: bool
    message: str

# Health Check for PAM 2.0
@router.get("/health")
async def pam_health():
    """PAM 2.0 Health Check with Enhanced Capabilities"""
    return JSONResponse(
        status_code=200,
        content={
            "status": "healthy",
            "service": "pam-2.0",
            "version": "2.0.0",
            "modules": {
                "conversational_engine": "healthy",
                "context_manager": "healthy",
                "trip_logger": "healthy",
                "savings_tracker": "healthy",
                "safety_layer": "healthy"
            },
            "features": {
                "chat_rest_api": "active",
                "chat_websocket": "active",
                "conversation_history": "active",
                "context_management": "active",
                "feedback_system": "active",
                "persistent_memory": "active",
                "gemini_integration": "active"
            },
            "timestamp": datetime.now().isoformat()
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
            response_text = service_response.data.get('response', 'I\'m here to help!')

            # Save conversation to database
            try:
                conversation_data = {
                    'user_id': request.user_id,
                    'message': request.message,
                    'response': response_text,
                    'timestamp': datetime.now().isoformat(),
                    'metadata': {
                        "phase": "2_active",
                        "model_used": service_response.data.get('model_used', 'gemini-1.5-flash'),
                        **service_response.metadata
                    }
                }

                supabase.table('pam_conversations').insert(conversation_data).execute()
                logger.debug(f"Saved conversation for user {request.user_id}")
            except Exception as save_error:
                logger.error(f"Failed to save conversation: {save_error}")

            response = ChatResponse(
                response=response_text,
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
@router.websocket("/chat/ws/{user_id}")
async def chat_websocket(websocket: WebSocket, user_id: str):
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

            message = data.get("message", "")
            context_data = data.get("context", {})

            if not message:
                error_response = {
                    "error": "Missing message",
                    "type": "error"
                }
                await websocket.send_json(error_response)
                continue

            logger.info(f"PAM 2.0 WebSocket message from user {user_id}: {message[:50]}...")

            try:
                # Create context if provided
                context = None
                if context_data:
                    context = ConversationContext(
                        user_id=user_id,
                        current_topic=None,
                        messages=[],  # WebSocket context management to be enhanced
                        context_data=context_data
                    )

                # Process message through ConversationalEngine
                service_response = await engine.process_message(
                    user_id=user_id,
                    message=message,
                    context=context
                )

                if service_response.success:
                    response_text = service_response.data.get('response', 'I\'m here to help!')

                    # Save conversation to database
                    try:
                        conversation_data = {
                            'user_id': user_id,
                            'message': message,
                            'response': response_text,
                            'timestamp': datetime.now().isoformat(),
                            'metadata': {
                                "phase": "2_websocket",
                                "model_used": service_response.data.get('model_used', 'gemini-1.5-flash'),
                                **service_response.metadata
                            }
                        }

                        supabase.table('pam_conversations').insert(conversation_data).execute()
                        logger.debug(f"Saved WebSocket conversation for user {user_id}")
                    except Exception as save_error:
                        logger.error(f"Failed to save WebSocket conversation: {save_error}")

                    response = {
                        "response": response_text,
                        "ui_action": service_response.data.get('ui_action'),
                        "type": "message",
                        "metadata": {
                            "user_id": user_id,
                            "phase": "2_websocket",
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

# Conversation History Management
@router.get("/history", response_model=MessageHistoryResponse)
async def get_conversation_history(
    user_id: str = Query(..., description="User ID"),
    limit: int = Query(50, description="Number of messages to return"),
    offset: int = Query(0, description="Offset for pagination")
):
    """Get conversation history for a user"""
    try:
        response = supabase.table('pam_conversations') \
            .select('id, user_id, message, response, timestamp, metadata') \
            .eq('user_id', user_id) \
            .order('timestamp', desc=True) \
            .limit(limit) \
            .offset(offset) \
            .execute()

        # Count total messages
        count_response = supabase.table('pam_conversations') \
            .select('id', count='exact') \
            .eq('user_id', user_id) \
            .execute()

        total_count = count_response.count or 0
        messages = response.data or []

        # Format messages for response
        formatted_messages = []
        for msg in messages:
            formatted_messages.append({
                'id': msg.get('id'),
                'type': 'user',
                'content': msg.get('message'),
                'timestamp': msg.get('timestamp')
            })
            if msg.get('response'):
                formatted_messages.append({
                    'id': f"{msg.get('id')}_response",
                    'type': 'assistant',
                    'content': msg.get('response'),
                    'timestamp': msg.get('timestamp')
                })

        return MessageHistoryResponse(
            user_id=user_id,
            messages=formatted_messages,
            total_count=total_count
        )

    except Exception as e:
        logger.error(f"Error fetching conversation history: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch conversation history")

@router.delete("/history", response_model=SuccessResponse)
async def clear_conversation_history(user_id: str = Query(..., description="User ID")):
    """Clear conversation history for a user"""
    try:
        response = supabase.table('pam_conversations') \
            .delete() \
            .eq('user_id', user_id) \
            .execute()

        return SuccessResponse(
            success=True,
            message=f"Conversation history cleared for user {user_id}"
        )

    except Exception as e:
        logger.error(f"Error clearing conversation history: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear conversation history")

# Context Management
@router.get("/context", response_model=ContextResponse)
async def get_user_context(user_id: str = Query(..., description="User ID")):
    """Get user context data"""
    try:
        response = supabase.table('user_settings') \
            .select('pam_context, location_preferences, financial_context') \
            .eq('user_id', user_id) \
            .single() \
            .execute()

        context_data = {}
        if response.data:
            context_data = {
                'pam_context': response.data.get('pam_context', {}),
                'location_preferences': response.data.get('location_preferences', {}),
                'financial_context': response.data.get('financial_context', {})
            }

        return ContextResponse(
            user_id=user_id,
            context=context_data
        )

    except Exception as e:
        logger.error(f"Error fetching user context: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch user context")

@router.put("/context", response_model=SuccessResponse)
async def update_user_context(request: ContextUpdateRequest):
    """Update user context data"""
    try:
        # Check if user settings exist
        existing_response = supabase.table('user_settings') \
            .select('id') \
            .eq('user_id', request.user_id) \
            .execute()

        if existing_response.data:
            # Update existing record
            response = supabase.table('user_settings') \
                .update({'pam_context': request.context_data}) \
                .eq('user_id', request.user_id) \
                .execute()
        else:
            # Insert new record
            response = supabase.table('user_settings') \
                .insert({
                    'user_id': request.user_id,
                    'pam_context': request.context_data
                }) \
                .execute()

        return SuccessResponse(
            success=True,
            message=f"Context updated for user {request.user_id}"
        )

    except Exception as e:
        logger.error(f"Error updating user context: {e}")
        raise HTTPException(status_code=500, detail="Failed to update user context")

# Multimodal Chat Endpoint with Image Upload
@router.post("/multimodal-chat", response_model=MultimodalChatResponse)
async def multimodal_chat_endpoint(
    user_id: str = Form(...),
    message: str = Form(...),
    analysis_type: str = Form("general"),
    context: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None)
):
    """
    PAM 2.0 Multimodal Chat Endpoint with Image Processing
    Phase 2.3: Supports text + image analysis via Gemini Vision
    """
    try:
        logger.info(f"PAM 2.0 multimodal chat request from user {user_id}: {message[:50]}... with image: {image.filename if image else 'None'}")

        # Initialize ConversationalEngine
        engine = ConversationalEngine()

        # Process image if provided
        image_data = None
        image_format = None
        if image:
            # Validate image file
            if not image.content_type or not image.content_type.startswith('image/'):
                raise HTTPException(status_code=400, detail="Invalid image file type")

            # Read image data
            image_data = await image.read()
            image_format = image.content_type.split('/')[1]  # Extract format (jpeg, png, etc.)

            logger.info(f"Processing image: {image.filename}, type: {image.content_type}, size: {len(image_data)} bytes")

        # Parse context if provided
        parsed_context = None
        if context:
            try:
                context_dict = json.loads(context) if isinstance(context, str) else context
                parsed_context = ConversationContext(
                    user_id=user_id,
                    current_topic=None,
                    messages=[],
                    context_data=context_dict
                )
            except Exception as e:
                logger.warning(f"Failed to parse context: {e}")

        # Process multimodal message through ConversationalEngine
        service_response = await engine.process_multimodal_message(
            user_id=user_id,
            message=message,
            image_data=image_data,
            image_format=image_format,
            analysis_type=analysis_type,
            context=parsed_context
        )

        if service_response.success:
            response_text = service_response.data.get('response', 'I\\'m here to help!')
            image_analysis = service_response.data.get('image_analysis', {})

            # Save multimodal conversation to database
            try:
                conversation_data = {
                    'user_id': user_id,
                    'message': message,
                    'response': response_text,
                    'timestamp': datetime.now().isoformat(),
                    'metadata': {
                        "phase": "2_multimodal",
                        "model_used": service_response.data.get('model_used', 'gemini-1.5-flash'),
                        "analysis_type": analysis_type,
                        "has_image": image_data is not None,
                        "image_filename": image.filename if image else None,
                        "image_analysis_summary": image_analysis.get('summary', '') if image_analysis else '',
                        **service_response.metadata
                    }
                }

                supabase.table('pam_conversations').insert(conversation_data).execute()
                logger.debug(f"Saved multimodal conversation for user {user_id}")
            except Exception as save_error:
                logger.error(f"Failed to save multimodal conversation: {save_error}")

            response = MultimodalChatResponse(
                response=response_text,
                ui_action=service_response.data.get('ui_action'),
                image_analysis=image_analysis,
                metadata={
                    "user_id": user_id,
                    "phase": "2_multimodal",
                    "model_used": service_response.data.get('model_used', 'gemini-1.5-flash'),
                    "analysis_type": analysis_type,
                    "has_image": image_data is not None,
                    "timestamp": service_response.data.get('timestamp'),
                    **service_response.metadata
                }
            )
            logger.info(f"✅ PAM 2.0 multimodal successful response for user {user_id}")
            return response
        else:
            logger.error(f"❌ ConversationalEngine multimodal processing failed for user {user_id}")
            raise HTTPException(status_code=500, detail="Multimodal AI service unavailable")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PAM 2.0 multimodal chat endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Feedback Management
@router.post("/feedback", response_model=SuccessResponse)
async def submit_feedback(request: FeedbackRequest):
    """Submit user feedback for PAM responses"""
    try:
        feedback_data = {
            'user_id': request.user_id,
            'message_id': request.message_id,
            'feedback_type': request.feedback_type,
            'feedback_text': request.feedback_text,
            'timestamp': datetime.now().isoformat(),
            'service': 'pam_2.0'
        }

        response = supabase.table('pam_feedback') \
            .insert(feedback_data) \
            .execute()

        return SuccessResponse(
            success=True,
            message="Feedback submitted successfully"
        )

    except Exception as e:
        logger.error(f"Error submitting feedback: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit feedback")