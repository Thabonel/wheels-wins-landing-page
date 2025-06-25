from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any, List
import openai
from app.core.config import settings
from app.core.security import verify_token
from app.core.logging import setup_logging
from app.core.orchestrator import orchestrator
from app.core.websocket_manager import manager

router = APIRouter()
logger = setup_logging()

# Set OpenAI API key
openai.api_key = settings.OPENAI_API_KEY

class ChatRequest(BaseModel):
    message: str
    user_id: str
    context: Optional[Dict[str, Any]] = None
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    actions: Optional[List[Dict[str, Any]]] = None
    timestamp: datetime
    session_id: str

@router.post("/message", response_model=ChatResponse)
async def process_message(
    request: ChatRequest,
    token_data: dict = Depends(verify_token)
):
    """Process a chat message from the user with intelligent orchestration"""
    try:
        # Log the incoming request
        logger.info(
            "Processing chat message",
            extra={
                "user_id": request.user_id,
                "action": "chat_message",
                "message": request.message
            }
        )
        
        # Prepare context for orchestrator
        context = request.context or {}
        context["user_id"] = request.user_id
        
        # Plan actions via orchestrator
        actions = await orchestrator.plan(request.message, context)
        
        # Determine the text response from actions
        response_text = "I'm processing your request..."
        for action in actions or []:
            if action.get("type") == "message":
                response_text = action.get("content", response_text)
                break
            if action.get("type") == "error":
                response_text = f"❌ {action.get('content', 'An error occurred')}"
                break
        
        # Send the full action batch over WebSocket
        if actions:
            await manager.send_personal_message({
                "type": "action_batch",
                "actions": actions,
                "message": request.message
            }, request.user_id)
        
        return ChatResponse(
            response=response_text,
            actions=actions,
            timestamp=datetime.utcnow(),
            session_id=request.session_id or f"session_{datetime.utcnow().timestamp()}"
        )
        
    except Exception as e:
        logger.error(f"Error processing message: {e}")
        
        # Notify error over WebSocket
        await manager.send_personal_message({
            "type": "error",
            "message": f"Sorry, I encountered an error: {e}"
        }, request.user_id)
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing message"
        )

@router.get("/sessions/{session_id}")
async def get_session(
    session_id: str,
    token_data: dict = Depends(verify_token)
):
    """Get chat session history"""
    # TODO: Implement with Supabase storage
    return {
        "session_id": session_id,
        "messages": [],
        "created_at": datetime.utcnow()
    }

@router.post("/demo")
async def demo_expense(
    token_data: dict = Depends(verify_token)
):
    """Demo endpoint to test PAM functionality"""
    try:
        user_id = token_data.get("user_id", "demo_user")
        demo_message = "I spent $25 on fuel today"
        context = {"user_id": user_id}
        
        actions = await orchestrator.plan(demo_message, context)
        
        return {
            "message": demo_message,
            "actions": actions,
            "status": "demo_completed"
        }
        
    except Exception as e:
        logger.error(f"Demo error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Demo error: {e}"
        )
