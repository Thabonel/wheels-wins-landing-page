
"""
Chat API Endpoints
Handles PAM conversation and chat functionality.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import Dict, Any, List, Optional
import uuid
from datetime import datetime

from app.models.schemas.pam import ChatRequest, ChatResponse
from app.services.pam.orchestrator import get_orchestrator
from app.core.logging import setup_logging

router = APIRouter()
logger = setup_logging()

@router.post("/chat", response_model=ChatResponse)
async def chat_with_pam(
    request: ChatRequest,
    background_tasks: BackgroundTasks
):
    """Main chat endpoint for PAM conversations - supports both authenticated and public access"""
    try:
        logger.info(f"Received chat request: {request}")
        
        # Use user_id from request if provided, otherwise generate a session ID
        user_id = request.user_id or "anonymous_user"
        # Special handling for context loading requests
        if request.message in ['load_user_context', 'load_conversation_memory']:
            return ChatResponse(
                content=f"Context data for {request.message}",
                actions=[{"type": "context", "data": {"user_id": user_id}}],
                session_id=request.session_id or str(uuid.uuid4()),
                timestamp=datetime.utcnow()
            )
        
        # Get orchestrator instance
        orchestrator = await get_orchestrator()
        
        # Process the message
        response = await orchestrator.process_message(
            user_id=user_id,
            message=request.message,
            session_id=request.session_id or request.conversation_id,
            context=request.context
        )
        
        # Convert to API response format
        return ChatResponse(
            content=response.content,
            intent=response.intent.value if response.intent else None,
            confidence=response.confidence,
            suggestions=response.suggestions,
            actions=response.actions,
            requires_followup=response.requires_followup,
            context_updates=response.context_updates,
            voice_enabled=response.voice_enabled,
            session_id=request.session_id or str(uuid.uuid4()),
            timestamp=datetime.utcnow()
        )
        
    except Exception as e:
        logger.error(f"Chat processing error: {e}")
        raise HTTPException(
            status_code=500,
            detail="I'm having trouble processing your message right now. Please try again."
        )

@router.get("/chat/history/{user_id}")
async def get_chat_history(
    user_id: str,
    limit: int = 20,
    session_id: Optional[str] = None
):
    """Get conversation history for a user"""
    try:
        orchestrator = await get_orchestrator()
        history = await orchestrator.get_conversation_history(user_id, limit)
        
        return {
            "user_id": user_id,
            "session_id": session_id,
            "history": history,
            "total_messages": len(history)
        }
        
    except Exception as e:
        logger.error(f"History retrieval error: {e}")
        raise HTTPException(status_code=500, detail="Could not retrieve chat history")

@router.post("/chat/context")
async def update_context(
    user_id: str,
    session_id: str,
    context_updates: Dict[str, Any]
):
    """Update conversation context"""
    try:
        # Implementation would update user context
        return {
            "status": "success",
            "user_id": user_id,
            "session_id": session_id,
            "updated_at": datetime.utcnow()
        }
        
    except Exception as e:
        logger.error(f"Context update error: {e}")
        raise HTTPException(status_code=500, detail="Could not update context")

@router.delete("/chat/session/{session_id}")
async def end_chat_session(session_id: str):
    """End a chat session"""
    try:
        # Implementation would clean up session data
        return {
            "status": "success",
            "session_id": session_id,
            "ended_at": datetime.utcnow()
        }
        
    except Exception as e:
        logger.error(f"Session cleanup error: {e}")
        raise HTTPException(status_code=500, detail="Could not end session")
