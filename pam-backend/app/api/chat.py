
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any
import openai
from app.core.config import settings
from app.core.security import verify_token
from app.core.logging import setup_logging

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
    action: Optional[Dict[str, Any]] = None
    timestamp: datetime
    session_id: str

@router.post("/message", response_model=ChatResponse)
async def process_message(
    request: ChatRequest,
    token_data: dict = Depends(verify_token)
):
    """Process a chat message from the user"""
    try:
        # Log the incoming request
        logger.info(
            "Processing chat message",
            extra={
                "user_id": request.user_id,
                "action": "chat_message"
            }
        )
        
        # For now, just echo back - we'll implement the full orchestrator later
        response = ChatResponse(
            response=f"PAM received: {request.message}",
            action=None,
            timestamp=datetime.utcnow(),
            session_id=request.session_id or f"session_{datetime.utcnow().timestamp()}"
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Error processing message: {str(e)}")
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
    # Placeholder - will implement with Supabase
    return {
        "session_id": session_id,
        "messages": [],
        "created_at": datetime.utcnow()
    }
