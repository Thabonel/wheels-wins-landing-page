"""
Real-time Voice Streaming WebSocket Endpoint
Handles STT→LLM→TTS pipeline with VAD and turn detection
"""

import asyncio
import json
import uuid
import time
from datetime import datetime
from typing import Dict, Any, Optional
from io import BytesIO

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from fastapi.responses import Response

from app.core.logging import setup_logging, get_logger
from app.core.auth import verify_token_websocket
from app.voice.stt_whisper import whisper_stt
from app.services.pam.orchestrator import get_orchestrator
from app.api.v1.voice import voice_router

router = APIRouter()
setup_logging()
logger = get_logger(__name__)

class VoiceStreamingManager:
    """Manages real-time voice streaming sessions"""
    
    def __init__(self):
        self.active_sessions: Dict[str, Dict[str, Any]] = {}
        self.processing_queue = asyncio.Queue()
        self.response_queue = asyncio.Queue()
        
    async def create_session(self, websocket: WebSocket, user_id: str, token: str) -> str:
        """Create a new voice streaming session"""
        session_id = str(uuid.uuid4())
        
        session_data = {
            'id': session_id,
            'user_id': user_id,
            'websocket': websocket,
            'token': token,
            'created_at': datetime.utcnow(),
            'last_activity': datetime.utcnow(),
            'current_utterance': None,
            'audio_buffer': BytesIO(),
            'is_speaking': False,
            'turn_state': 'user',  # 'user' or 'ai'
            'latency_start': None,
            'config': {
                'sampleRate': 16000,
                'channels': 1,
                'format': 'pcm_s16le'
            }
        }
        
        self.active_sessions[session_id] = session_data
        logger.info(f"🎙️ Created voice streaming session {session_id} for user {user_id}")
        
        return session_id
    
    async def remove_session(self, session_id: str):
        """Remove a voice streaming session"""
        if session_id in self.active_sessions:
            session = self.active_sessions[session_id]
            logger.info(f"🛑 Removing voice streaming session {session_id} for user {session['user_id']}")
            del self.active_sessions[session_id]
    
    async def process_audio_chunk(self, session_id: str, chunk_data: Dict[str, Any], audio_data: bytes):
        """Process incoming audio chunk"""
        if session_id not in self.active_sessions:
            return
            
        session = self.active_sessions[session_id]
        session['last_activity'] = datetime.utcnow()
        
        # Update session state based on VAD
        if chunk_data.get('is_speech', False):
            if not session['is_speaking']:
                session['is_speaking'] = True
                session['current_utterance'] = chunk_data.get('utterance_id')
                session['audio_buffer'] = BytesIO()
                logger.info(f"🗣️ Speech started for session {session_id}")
            
            # Accumulate audio data
            session['audio_buffer'].write(audio_data)
            
        elif chunk_data.get('is_end_of_utterance', False):
            await self.process_complete_utterance(session_id)
    
    async def process_complete_utterance(self, session_id: str):
        """Process a complete user utterance"""
        if session_id not in self.active_sessions:
            return
            
        session = self.active_sessions[session_id]
        
        if not session['is_speaking'] or session['audio_buffer'].tell() == 0:
            return
        
        logger.info(f"🎤 Processing complete utterance for session {session_id}")
        
        try:
            # Get audio data
            audio_data = session['audio_buffer'].getvalue()
            session['audio_buffer'] = BytesIO()
            session['is_speaking'] = False
            session['latency_start'] = time.time()
            
            # STT - Speech to Text
            logger.info("📝 Transcribing audio...")
            text = await whisper_stt.transcribe(audio_data)
            
            if not text or text.strip() == "":
                logger.warning("⚠️ No speech detected in audio")
                return
            
            logger.info(f"📝 Transcribed: {text}")
            
            # Send interim transcription
            await self.send_message(session_id, {
                'type': 'transcription',
                'text': text,
                'is_final': True,
                'utterance_id': session['current_utterance']
            })
            
            # Change turn state to AI
            session['turn_state'] = 'ai'
            
            # LLM Processing through PAM
            logger.info("🧠 Processing through PAM...")
            orchestrator = await get_orchestrator()
            
            # Create context for voice interaction
            voice_context = {
                'input_type': 'voice_streaming',
                'user_id': session['user_id'],
                'session_id': session_id,
                'utterance_id': session['current_utterance'],
                'turn_state': session['turn_state'],
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Process through PAM
            pam_response = await orchestrator.process_message(
                user_id=session['user_id'],
                message=text,
                session_id=session_id,
                context=voice_context
            )
            
            response_text = pam_response.content or "I understand."
            logger.info(f"🤖 PAM Response: {response_text}")
            
            # Calculate processing latency
            processing_latency = int((time.time() - session['latency_start']) * 1000)
            
            # Send response
            await self.send_message(session_id, {
                'type': 'response',
                'text': response_text,
                'actions': pam_response.actions,
                'confidence': pam_response.confidence,
                'processing_latency': processing_latency,
                'utterance_id': session['current_utterance']
            })
            
            # Send latency metrics
            await self.send_message(session_id, {
                'type': 'latency',
                'latency': processing_latency,
                'timestamp': datetime.utcnow().isoformat()
            })
            
            # Generate TTS audio (placeholder - implement actual TTS)
            await self.generate_tts_response(session_id, response_text)
            
            # Change turn state back to user
            session['turn_state'] = 'user'
            
        except Exception as e:
            logger.error(f"❌ Error processing utterance for session {session_id}: {e}")
            await self.send_message(session_id, {
                'type': 'error',
                'error': str(e),
                'utterance_id': session['current_utterance']
            })
    
    async def generate_tts_response(self, session_id: str, text: str):
        """Generate and send TTS audio response"""
        try:
            # For now, send text response - implement actual TTS later
            logger.info(f"🔊 Generating TTS for session {session_id}: {text}")
            
            # Placeholder: Send empty audio data
            # In production, this would generate actual TTS audio
            await self.send_message(session_id, {
                'type': 'tts_ready',
                'text': text,
                'note': 'TTS audio would be sent as binary data'
            })
            
        except Exception as e:
            logger.error(f"❌ TTS generation failed for session {session_id}: {e}")
    
    async def send_message(self, session_id: str, message: Dict[str, Any]):
        """Send JSON message to session"""
        if session_id not in self.active_sessions:
            return
            
        session = self.active_sessions[session_id]
        websocket = session['websocket']
        
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"❌ Failed to send message to session {session_id}: {e}")
    
    async def send_binary(self, session_id: str, data: bytes):
        """Send binary data to session"""
        if session_id not in self.active_sessions:
            return
            
        session = self.active_sessions[session_id]
        websocket = session['websocket']
        
        try:
            await websocket.send_bytes(data)
        except Exception as e:
            logger.error(f"❌ Failed to send binary data to session {session_id}: {e}")

# Global manager instance
voice_manager = VoiceStreamingManager()

@router.websocket("/stream")
async def voice_streaming_websocket(
    websocket: WebSocket,
    token: str = Query(...),
):
    """WebSocket endpoint for real-time voice streaming"""
    
    # Verify token and extract user ID
    try:
        user_id = await verify_token_websocket(token)
        if not user_id:
            await websocket.close(code=1008, reason="Unauthorized")
            return
    except Exception as e:
        logger.error(f"❌ Token verification failed: {e}")
        await websocket.close(code=1008, reason="Invalid token")
        return
    
    # Accept WebSocket connection
    await websocket.accept()
    logger.info(f"🔌 Voice streaming WebSocket connected for user {user_id}")
    
    # Create session
    session_id = await voice_manager.create_session(websocket, user_id, token)
    
    try:
        # Send initial connection message
        await voice_manager.send_message(session_id, {
            'type': 'connected',
            'session_id': session_id,
            'message': '🎙️ Voice streaming connected! Send audio chunks to start.',
            'timestamp': datetime.utcnow().isoformat()
        })
        
        # Message processing loop
        while True:
            try:
                # Try to receive JSON message first
                try:
                    message_text = await asyncio.wait_for(websocket.receive_text(), timeout=0.1)
                    message = json.loads(message_text)
                    await handle_json_message(session_id, message)
                except asyncio.TimeoutError:
                    pass
                except json.JSONDecodeError:
                    logger.warning(f"⚠️ Invalid JSON received from session {session_id}")
                
                # Try to receive binary data
                try:
                    binary_data = await asyncio.wait_for(websocket.receive_bytes(), timeout=0.1)
                    await handle_binary_data(session_id, binary_data)
                except asyncio.TimeoutError:
                    pass
                
                # Small delay to prevent busy waiting
                await asyncio.sleep(0.01)
                
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"❌ Error in message loop for session {session_id}: {e}")
                break
                
    except WebSocketDisconnect:
        logger.info(f"🔌 Voice streaming WebSocket disconnected for user {user_id}")
    except Exception as e:
        logger.error(f"❌ Voice streaming error for user {user_id}: {e}")
    finally:
        await voice_manager.remove_session(session_id)

async def handle_json_message(session_id: str, message: Dict[str, Any]):
    """Handle JSON control messages"""
    message_type = message.get('type')
    
    if message_type == 'config':
        # Update session configuration
        if session_id in voice_manager.active_sessions:
            session = voice_manager.active_sessions[session_id]
            session['config'].update(message.get('config', {}))
            logger.info(f"🔧 Updated config for session {session_id}")
    
    elif message_type == 'audio_chunk':
        # Metadata for incoming audio chunk
        if session_id in voice_manager.active_sessions:
            session = voice_manager.active_sessions[session_id]
            session['last_chunk_metadata'] = message
    
    elif message_type == 'end_of_utterance':
        # Process complete utterance
        await voice_manager.process_complete_utterance(session_id)
    
    elif message_type == 'ping':
        # Respond to ping
        await voice_manager.send_message(session_id, {'type': 'pong'})
    
    else:
        logger.warning(f"⚠️ Unknown message type '{message_type}' from session {session_id}")

async def handle_binary_data(session_id: str, audio_data: bytes):
    """Handle binary audio data"""
    if session_id not in voice_manager.active_sessions:
        return
    
    session = voice_manager.active_sessions[session_id]
    
    # Get metadata from last chunk message
    chunk_metadata = session.get('last_chunk_metadata', {})
    
    # Process audio chunk
    await voice_manager.process_audio_chunk(session_id, chunk_metadata, audio_data)

@router.get("/sessions")
async def get_active_sessions():
    """Get information about active voice streaming sessions"""
    sessions_info = []
    
    for session_id, session in voice_manager.active_sessions.items():
        sessions_info.append({
            'session_id': session_id,
            'user_id': session['user_id'],
            'created_at': session['created_at'].isoformat(),
            'last_activity': session['last_activity'].isoformat(),
            'is_speaking': session['is_speaking'],
            'turn_state': session['turn_state'],
            'config': session['config']
        })
    
    return {
        'active_sessions': len(sessions_info),
        'sessions': sessions_info
    }

@router.post("/test-streaming")
async def test_voice_streaming():
    """Test endpoint for voice streaming functionality"""
    return {
        'status': 'ok',
        'message': 'Voice streaming service is operational',
        'active_sessions': len(voice_manager.active_sessions),
        'timestamp': datetime.utcnow().isoformat()
    }