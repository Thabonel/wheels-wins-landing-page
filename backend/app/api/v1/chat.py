
"""
Chat API Endpoints
Handles PAM conversation and chat functionality.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import Dict, Any, List, Optional
import uuid
from datetime import datetime

from app.models.schemas.pam import ChatRequest, ChatResponse
from app.core.simple_pam_service import simple_pam_service
from app.core.logging import setup_logging, get_logger
from app.core.database import get_supabase_client
from app.core.unified_auth import get_current_user_unified, UnifiedUser

router = APIRouter()
setup_logging()
logger = get_logger(__name__)

def generate_fallback_response(message: str) -> str:
    """Generate a fallback response when the orchestrator is unavailable"""
    message_lower = message.lower()
    
    # Simple intent-based responses
    if any(word in message_lower for word in ['hello', 'hi', 'hey', 'greeting']):
        return "Hi! I'm PAM, your AI assistant. I'm currently running in basic mode. How can I help you today?"
    
    elif any(word in message_lower for word in ['expense', 'spent', 'cost', 'money', 'budget']):
        return "I can help you track expenses and manage your budget! I'm currently in basic mode, but I can still provide general financial advice."
    
    elif any(word in message_lower for word in ['trip', 'travel', 'route', 'drive', 'destination']):
        return "I'd love to help you plan your trip! I'm currently in basic mode, but I can provide general travel advice and route suggestions."
    
    elif any(word in message_lower for word in ['help', 'what can you do', 'capabilities']):
        return "I'm PAM, your AI assistant! I can help with expenses, budgets, trip planning, and more. I'm currently running in basic mode while my full systems initialize."
    
    elif any(word in message_lower for word in ['route', 'find', 'near', 'map', 'location']):
        return "🗺️ I can help with location and mapping queries! I'm currently in basic mode, but I can provide general geographic information and travel advice."
    
    else:
        return "I'm PAM, your AI assistant! I'm currently running in basic mode while my systems initialize. I can still provide general assistance with travel, budgets, and planning. What would you like help with?"

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
                response=f"Context data for {request.message}",  # Fixed: use 'response' field
                actions=[{"type": "context", "data": {"user_id": user_id}}],
                session_id=request.session_id or str(uuid.uuid4()),
                timestamp=datetime.utcnow()
            )
        
        # Use SimplePamService for processing
        try:
            # Get conversation history if available
            conversation_history = request.context.get("conversation_history", []) if request.context else []
            
            # Process the message with SimplePamService
            response_data = await simple_pam_service.process_message(
                user_id=user_id,
                message=request.message,
                session_id=request.session_id or request.conversation_id,
                context=request.context
            )
            
            # Convert to API response format
            return ChatResponse(
                response=response_data.get("content", "I'm here to help!"),
                intent=response_data.get("intent"),
                confidence=response_data.get("confidence", 0.8),
                suggestions=response_data.get("suggestions", []),
                actions=response_data.get("actions", []),
                requires_followup=response_data.get("requires_followup", False),
                context_updates=response_data.get("context_updates", {}),
                voice_enabled=response_data.get("voice_enabled", False),
                session_id=request.session_id or str(uuid.uuid4()),
                timestamp=datetime.utcnow()
            )
        except Exception as e:
            logger.error(f"SimplePamService failed: {e}")
            
            # Fallback response when service fails
            fallback_response = generate_fallback_response(request.message)
            return ChatResponse(
                response=fallback_response,
                intent="general",
                confidence=0.5,
                session_id=request.session_id or str(uuid.uuid4()),
                timestamp=datetime.utcnow()
            )
        
    except Exception as e:
        logger.error(f"Chat processing error: {e}")
        raise HTTPException(
            status_code=500,
            detail="I'm having trouble processing your message right now. Please try again."
        )

@router.get("/chat/history")
async def get_chat_history(
    current_user: UnifiedUser = Depends(get_current_user_unified),
    limit: int = 20,
    session_id: Optional[str] = None
):
    """Get conversation history for a user"""
    try:
        # For now, return empty history - can be implemented later with database
        history = []
        
        return {
            "user_id": current_user.user_id,
            "session_id": session_id,
            "history": history,
            "total_messages": len(history)
        }
        
    except Exception as e:
        logger.error(f"History retrieval error: {e}")
        raise HTTPException(status_code=500, detail="Could not retrieve chat history")

@router.post("/chat/context")
async def update_context(
    session_id: str,
    context_updates: Dict[str, Any],
    current_user: UnifiedUser = Depends(get_current_user_unified)
):
    """Update conversation context"""
    try:
        supabase = current_user.get_supabase_client()
        
        # Check if session context exists
        existing_result = supabase.table("chat_sessions")\
            .select("*")\
            .eq("session_id", session_id)\
            .eq("user_id", current_user.user_id)\
            .execute()
        
        context_data = {
            "user_id": current_user.user_id,
            "session_id": session_id,
            "context_data": context_updates,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        if existing_result.data:
            # Update existing session context
            result = supabase.table("chat_sessions")\
                .update(context_data)\
                .eq("session_id", session_id)\
                .eq("user_id", current_user.user_id)\
                .execute()
        else:
            # Create new session context
            context_data["created_at"] = datetime.utcnow().isoformat()
            result = supabase.table("chat_sessions")\
                .insert(context_data)\
                .execute()
        
        logger.info(f"✅ Context updated for session {session_id}")
        
        return {
            "status": "success",
            "user_id": current_user.user_id,
            "session_id": session_id,
            "context_keys_updated": list(context_updates.keys()),
            "updated_at": datetime.utcnow()
        }
        
    except Exception as e:
        logger.error(f"❌ Context update error: {e}")
        raise HTTPException(status_code=500, detail="Could not update context")

@router.get("/chat/context/{session_id}")
async def get_session_context(session_id: str, current_user: UnifiedUser = Depends(get_current_user_unified)):
    """Get session context data"""
    try:
        supabase = current_user.get_supabase_client()
        
        query = supabase.table("chat_sessions")\
            .select("*")\
            .eq("session_id", session_id)\
            .eq("user_id", current_user.user_id)
        
        result = query.execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session_data = result.data[0]
        
        return {
            "session_id": session_id,
            "user_id": session_data.get("user_id"),
            "context_data": session_data.get("context_data", {}),
            "created_at": session_data.get("created_at"),
            "updated_at": session_data.get("updated_at"),
            "status": session_data.get("status", "active")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error retrieving session context: {e}")
        raise HTTPException(status_code=500, detail="Could not retrieve session context")

@router.delete("/chat/session/{session_id}")
async def end_chat_session(session_id: str, current_user: UnifiedUser = Depends(get_current_user_unified)):
    """End a chat session"""
    try:
        supabase = current_user.get_supabase_client()
        
        # Mark session as ended in database
        session_data = {
            "status": "ended",
            "ended_at": datetime.utcnow().isoformat()
        }
        
        query = supabase.table("chat_sessions").update(session_data).eq("session_id", session_id).eq("user_id", current_user.user_id)
        
        result = query.execute()
        
        # Session cleanup can be implemented later if needed
        logger.info(f"Session {session_id} marked as ended")
        
        logger.info(f"✅ Session {session_id} ended successfully")
        
        return {
            "status": "success",
            "session_id": session_id,
            "ended_at": datetime.utcnow(),
            "cleaned_records": len(result.data) if result.data else 0
        }
        
    except Exception as e:
        logger.error(f"❌ Session cleanup error: {e}")
        raise HTTPException(status_code=500, detail="Could not end session")

@router.get("/test")
async def test_chat_endpoint():
    """Test endpoint to verify chat API is working"""
    logger.info("🧪 Chat test endpoint called")
    return {
        "success": True,
        "message": "Chat API is working correctly",
        "timestamp": datetime.utcnow().isoformat()
    }
