"""
Voice Conversation API Endpoints
RESTful and WebSocket endpoints for real-time voice conversations with PAM
"""

import asyncio
import json
import logging
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.responses import Response
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.core.logging import get_logger
from app.services.voice.conversation_manager import conversation_manager, VoiceMessage
from app.services.tts.tts_service import tts_service
from app.models.schemas.user import User

logger = get_logger(__name__)
router = APIRouter(prefix="/voice", tags=["Voice Conversation"])

# Request/Response Models
class StartConversationRequest(BaseModel):
    driving_status: str = "unknown"  # driving, parked, passenger
    current_location: Optional[Dict[str, Any]] = None

class StartConversationResponse(BaseModel):
    session_id: str
    greeting_audio: Optional[bytes] = None
    status: str = "active"

class VoiceInputResponse(BaseModel):
    session_id: str
    transcript: str
    response_text: str
    response_audio: Optional[bytes] = None
    timestamp: str
    conversation_continues: bool = True
    proactive_suggestions: Optional[List[str]] = None

class ProactiveMessageRequest(BaseModel):
    message: str
    priority: str = "normal"  # normal, urgent, emergency

class ConversationStatusResponse(BaseModel):
    session_id: str
    user_id: str
    start_time: str
    last_interaction: str
    driving_status: str
    message_count: int
    waiting_for_response: bool

# WebSocket connection manager for real-time voice
class VoiceConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket
        logger.info(f"🎤 WebSocket connected for session: {session_id}")
    
    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]
            logger.info(f"🎤 WebSocket disconnected for session: {session_id}")
    
    async def send_audio(self, session_id: str, audio_data: bytes):
        websocket = self.active_connections.get(session_id)
        if websocket:
            try:
                await websocket.send_bytes(audio_data)
            except Exception as e:
                logger.error(f"❌ Failed to send audio via WebSocket: {e}")
                self.disconnect(session_id)

voice_connection_manager = VoiceConnectionManager()

# REST API Endpoints

@router.post("/start", response_model=StartConversationResponse)
async def start_voice_conversation(
    request: StartConversationRequest,
    current_user: User = Depends(get_current_user)
):
    """Start a new voice conversation session with PAM"""
    try:
        session_id = await conversation_manager.start_conversation(
            user_id=str(current_user.id),
            location=request.current_location,
            driving_status=request.driving_status
        )
        
        # Get the greeting audio from the conversation start
        conversation_status = conversation_manager.get_conversation_status(session_id)
        
        return StartConversationResponse(
            session_id=session_id,
            status="active"
        )
        
    except Exception as e:
        logger.error(f"❌ Failed to start voice conversation: {e}")
        raise HTTPException(status_code=500, detail="Failed to start conversation")

@router.post("/input/{session_id}", response_model=VoiceInputResponse)
async def process_voice_input(
    session_id: str,
    audio: UploadFile = File(...),
    location: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Process voice input and get PAM's response"""
    try:
        # Validate session belongs to user
        conversation_status = conversation_manager.get_conversation_status(session_id)
        if not conversation_status or conversation_status["user_id"] != str(current_user.id):
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        # Parse location if provided
        location_data = None
        if location:
            try:
                location_data = json.loads(location)
            except json.JSONDecodeError:
                logger.warning(f"Invalid location data: {location}")
        
        # Read audio data
        audio_data = await audio.read()
        
        # Process with conversation manager
        result = await conversation_manager.process_voice_input(
            session_id=session_id,
            audio_data=audio_data,
            location=location_data
        )
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        # Send audio via WebSocket if connected
        if result.get("response_audio"):
            await voice_connection_manager.send_audio(session_id, result["response_audio"])
        
        return VoiceInputResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to process voice input: {e}")
        raise HTTPException(status_code=500, detail="Failed to process voice input")

@router.post("/proactive/{session_id}")
async def send_proactive_message(
    session_id: str,
    request: ProactiveMessageRequest,
    current_user: User = Depends(get_current_user)
):
    """Send a proactive message from PAM (for integrations, alerts, etc.)"""
    try:
        # Validate session belongs to user
        conversation_status = conversation_manager.get_conversation_status(session_id)
        if not conversation_status or conversation_status["user_id"] != str(current_user.id):
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        result = await conversation_manager.inject_proactive_message(
            session_id=session_id,
            message=request.message,
            priority=request.priority
        )
        
        if not result:
            raise HTTPException(status_code=400, detail="Failed to send proactive message")
        
        # Send audio via WebSocket if connected
        if result.get("audio_data"):
            await voice_connection_manager.send_audio(session_id, result["audio_data"])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to send proactive message: {e}")
        raise HTTPException(status_code=500, detail="Failed to send proactive message")

@router.put("/status/{session_id}")
async def update_driving_status(
    session_id: str,
    driving_status: str,
    current_user: User = Depends(get_current_user)
):
    """Update driving status for safety-aware responses"""
    try:
        # Validate session belongs to user
        conversation_status = conversation_manager.get_conversation_status(session_id)
        if not conversation_status or conversation_status["user_id"] != str(current_user.id):
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        await conversation_manager.update_driving_status(session_id, driving_status)
        
        return {"status": "updated", "driving_status": driving_status}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to update driving status: {e}")
        raise HTTPException(status_code=500, detail="Failed to update status")

@router.get("/status/{session_id}", response_model=ConversationStatusResponse)
async def get_conversation_status(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get current conversation status"""
    try:
        status = conversation_manager.get_conversation_status(session_id)
        if not status or status["user_id"] != str(current_user.id):
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        return ConversationStatusResponse(**status)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get conversation status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get status")

@router.delete("/end/{session_id}")
async def end_voice_conversation(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """End a voice conversation session"""
    try:
        # Validate session belongs to user
        conversation_status = conversation_manager.get_conversation_status(session_id)
        if not conversation_status or conversation_status["user_id"] != str(current_user.id):
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        success = await conversation_manager.end_conversation(session_id)
        
        # Disconnect WebSocket if connected
        voice_connection_manager.disconnect(session_id)
        
        if success:
            return {"status": "ended", "session_id": session_id}
        else:
            raise HTTPException(status_code=400, detail="Failed to end conversation")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to end conversation: {e}")
        raise HTTPException(status_code=500, detail="Failed to end conversation")

# WebSocket Endpoint for Real-time Audio

@router.websocket("/stream/{session_id}")
async def voice_stream_websocket(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time voice streaming"""
    try:
        await voice_connection_manager.connect(websocket, session_id)
        
        while True:
            # Wait for audio data from client
            audio_data = await websocket.receive_bytes()
            
            # TODO: Process audio in real-time
            # For now, this is a placeholder for streaming implementation
            logger.debug(f"🎤 Received audio data for session {session_id}: {len(audio_data)} bytes")
            
            # Echo back for testing (remove in production)
            await websocket.send_json({
                "type": "audio_received",
                "size": len(audio_data),
                "timestamp": str(asyncio.get_event_loop().time())
            })
    
    except WebSocketDisconnect:
        voice_connection_manager.disconnect(session_id)
        logger.info(f"🎤 WebSocket disconnected for session: {session_id}")
    except Exception as e:
        logger.error(f"❌ WebSocket error for session {session_id}: {e}")
        voice_connection_manager.disconnect(session_id)

# Health Check Endpoint

@router.get("/health")
async def voice_service_health():
    """Check voice conversation service health"""
    try:
        # Check if TTS service is available
        tts_status = await tts_service.get_service_status()
        
        # Check active conversations
        active_count = len(conversation_manager.active_conversations)
        
        return {
            "status": "healthy",
            "tts_service": tts_status.get("status", "unknown"),
            "active_conversations": active_count,
            "websocket_connections": len(voice_connection_manager.active_connections),
            "timestamp": str(asyncio.get_event_loop().time())
        }
        
    except Exception as e:
        logger.error(f"❌ Voice service health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": str(asyncio.get_event_loop().time())
        }