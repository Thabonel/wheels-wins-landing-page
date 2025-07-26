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
from app.services.stt.multi_engine_stt import multi_engine_stt
from app.services.voice.audio_processor import AudioStreamProcessor, AudioChunk, AudioFormat, ProcessingStage
from app.services.pam.orchestrator import get_orchestrator
from app.api.v1.voice import router as voice_router

router = APIRouter()
setup_logging()
logger = get_logger(__name__)

class VoiceStreamingManager:
    """Manages real-time voice streaming sessions with enhanced audio processing"""
    
    def __init__(self):
        self.active_sessions: Dict[str, Dict[str, Any]] = {}
        self.audio_processors: Dict[str, AudioStreamProcessor] = {}
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
        
        # Create audio processor for this session
        processor = AudioStreamProcessor()
        await processor.initialize({
            "sample_rate": session_data['config']['sampleRate'],
            "channels": session_data['config']['channels'],
            "parallel_processing": True,
            "max_latency_ms": 1500
        })
        
        self.audio_processors[session_id] = processor
        logger.info(f"🎙️ Created voice streaming session {session_id} for user {user_id} with audio processor")
        
        return session_id
    
    async def remove_session(self, session_id: str):
        """Remove a voice streaming session"""
        if session_id in self.active_sessions:
            session = self.active_sessions[session_id]
            logger.info(f"🛑 Removing voice streaming session {session_id} for user {session['user_id']}")
            
            # Stop and cleanup audio processor
            if session_id in self.audio_processors:
                await self.audio_processors[session_id].stop()
                del self.audio_processors[session_id]
            
            del self.active_sessions[session_id]
    
    async def process_audio_chunk(self, session_id: str, chunk_data: Dict[str, Any], audio_data: bytes):
        """Process incoming audio chunk using enhanced audio processor"""
        if session_id not in self.active_sessions or session_id not in self.audio_processors:
            return
            
        session = self.active_sessions[session_id]
        processor = self.audio_processors[session_id]
        session['last_activity'] = datetime.utcnow()
        
        try:
            # Create audio chunk object
            chunk = AudioChunk(
                id=chunk_data.get('id', str(uuid.uuid4())),
                timestamp=time.time(),
                data=audio_data,
                format=AudioFormat.WEBM,  # Assuming WebM from frontend
                sample_rate=session['config']['sampleRate'],
                channels=session['config']['channels'],
                duration_ms=chunk_data.get('duration', 50),
                is_speech=chunk_data.get('is_speech', False),
                is_final=chunk_data.get('is_end_of_utterance', False),
                metadata=chunk_data
            )
            
            # Process through enhanced audio processor
            await processor.process_audio_chunk(chunk)
            
            # Update session state
            if chunk.is_speech:
                if not session['is_speaking']:
                    session['is_speaking'] = True
                    session['current_utterance'] = chunk_data.get('utterance_id')
                    logger.info(f"🗣️ Speech started for session {session_id}")
            elif chunk.is_final:
                session['is_speaking'] = False
                logger.info(f"🤐 Speech ended for session {session_id}")
                
        except Exception as e:
            logger.error(f"❌ Error processing audio chunk for session {session_id}: {e}")
    
    async def process_complete_utterance(self, session_id: str):
        """Process a complete user utterance (legacy method - now handled by AudioStreamProcessor)"""
        if session_id not in self.active_sessions:
            return
            
        session = self.active_sessions[session_id]
        
        # The AudioStreamProcessor now handles the complete pipeline
        # This method is kept for backward compatibility
        logger.info(f"🎤 Legacy utterance processing called for session {session_id}")
        
        # Start processing pipeline if not already started
        if session_id in self.audio_processors:
            processor = self.audio_processors[session_id]
            
            # Register callbacks to handle results
            await self._setup_processor_callbacks(session_id, processor)
            
            # Start processing pipeline
            try:
                async for result in processor.start_processing():
                    await self._handle_processing_result(session_id, result)
            except Exception as e:
                logger.error(f"❌ Audio processing pipeline error for session {session_id}: {e}")
                await self.send_message(session_id, {
                    'type': 'error',
                    'error': str(e),
                    'utterance_id': session.get('current_utterance')
                })
    
    async def _setup_processor_callbacks(self, session_id: str, processor: AudioStreamProcessor):
        """Setup callbacks for audio processor results"""
        
        async def on_stt_result(result):
            if result.success and result.data:
                await self.send_message(session_id, {
                    'type': 'transcription',
                    'text': result.data['text'],
                    'confidence': result.data['confidence'],
                    'engine': result.data['engine'],
                    'is_final': True,
                    'latency_ms': result.latency_ms
                })
        
        async def on_ai_result(result):
            if result.success and result.data:
                await self.send_message(session_id, {
                    'type': 'response',
                    'text': result.data['response'],
                    'input_text': result.data['input_text'],
                    'latency_ms': result.latency_ms
                })
        
        async def on_tts_result(result):
            if result.success and result.data:
                # Stream TTS audio to client
                await self._stream_tts_audio(session_id, result.data)
        
        # Register callbacks
        processor.register_callback('on_stt_processing', on_stt_result)
        processor.register_callback('on_ai_processing', on_ai_result)
        processor.register_callback('on_tts_synthesis', on_tts_result)
    
    async def _handle_processing_result(self, session_id: str, result):
        """Handle processing results from audio processor"""
        try:
            if result.stage == ProcessingStage.STT_PROCESSING and result.success:
                # Send transcription result
                await self.send_message(session_id, {
                    'type': 'transcription',
                    'text': result.data['text'],
                    'confidence': result.data['confidence'],
                    'engine': result.data['engine'],
                    'is_final': True,
                    'latency_ms': result.latency_ms
                })
                
            elif result.stage == ProcessingStage.AI_PROCESSING and result.success:
                # Send AI response
                await self.send_message(session_id, {
                    'type': 'response',
                    'text': result.data['response'],
                    'input_text': result.data['input_text'],
                    'latency_ms': result.latency_ms
                })
                
            elif result.stage == ProcessingStage.TTS_SYNTHESIS and result.success:
                # Stream TTS audio
                await self._stream_tts_audio(session_id, result.data)
                
            elif not result.success:
                # Handle errors
                await self.send_message(session_id, {
                    'type': 'error',
                    'stage': result.stage.value,
                    'error': result.error or "Processing failed",
                    'latency_ms': result.latency_ms
                })
        
        except Exception as e:
            logger.error(f"❌ Error handling processing result for session {session_id}: {e}")
    
    async def _stream_tts_audio(self, session_id: str, tts_data: Dict[str, Any]):
        """Stream TTS audio to client"""
        try:
            audio_data = tts_data.get('audio_data')
            text = tts_data.get('text', '')
            
            if audio_data:
                # Send TTS start message
                await self.send_message(session_id, {
                    'type': 'tts_start',
                    'text': text,
                    'format': 'mp3'
                })
                
                # Stream audio data
                session = self.active_sessions.get(session_id)
                if session:
                    websocket = session['websocket']
                    
                    # Use existing streaming function
                    from app.voice import stream_wav_over_websocket
                    await stream_wav_over_websocket(websocket, audio_data)
                    
                    # Send completion
                    await self.send_message(session_id, {
                        'type': 'tts_complete',
                        'text': text,
                        'audio_size_bytes': len(audio_data) if isinstance(audio_data, bytes) else 0
                    })
        
        except Exception as e:
            logger.error(f"❌ TTS streaming error for session {session_id}: {e}")
            await self.send_message(session_id, {
                'type': 'tts_error',
                'error': str(e),
                'text': tts_data.get('text', '')
            })
    
    async def generate_tts_response(self, session_id: str, text: str):
        """Generate and send TTS audio response"""
        try:
            logger.info(f"🔊 Generating TTS for session {session_id}: {text}")
            
            session = self.active_sessions.get(session_id)
            if not session:
                return
            
            user_id = session['user_id']
            
            # Import TTS service
            try:
                from app.services.tts.streaming_tts import streaming_tts_service
                
                # Check if TTS service is available and initialized
                if not streaming_tts_service.is_initialized:
                    await self.send_message(session_id, {
                        'type': 'tts_ready',
                        'text': text,
                        'note': 'TTS service not available, text-only response'
                    })
                    return
                
                # Get streaming TTS
                audio_stream = await streaming_tts_service.synthesize_text(
                    text=text,
                    user_id=user_id,
                    context="voice_conversation",
                    stream=True,
                    format="mp3"
                )
                
                # Send TTS start message
                await self.send_message(session_id, {
                    'type': 'tts_start',
                    'text': text,
                    'format': 'mp3'
                })
                
                # Collect all audio chunks first
                audio_chunks = []
                async for chunk in audio_stream:
                    if chunk.data:
                        audio_chunks.append(chunk.data)
                    
                    if chunk.is_final:
                        # Handle errors in chunk metadata
                        if chunk.metadata and 'error' in chunk.metadata:
                            await self.send_message(session_id, {
                                'type': 'tts_error',
                                'error': chunk.metadata['error'],
                                'text': text
                            })
                            return
                        break
                
                # Combine all chunks into complete audio
                if audio_chunks:
                    complete_audio = b''.join(audio_chunks)
                    
                    # Use existing WebSocket streaming function
                    from app.voice import stream_wav_over_websocket
                    websocket = session['websocket']
                    
                    # Stream the complete WAV audio
                    await stream_wav_over_websocket(websocket, complete_audio)
                    
                    # Send completion message
                    await self.send_message(session_id, {
                        'type': 'tts_complete',
                        'audio_size_bytes': len(complete_audio),
                        'text': text
                    })
                else:
                    await self.send_message(session_id, {
                        'type': 'tts_error',
                        'error': 'No audio data generated',
                        'text': text
                    })
                
                logger.info(f"✅ TTS completed for session {session_id}: {len(audio_chunks)} chunks processed")
                
            except ImportError:
                # Fallback if TTS service not available
                await self.send_message(session_id, {
                    'type': 'tts_ready',
                    'text': text,
                    'note': 'TTS service not available, text-only response'
                })
            
        except Exception as e:
            logger.error(f"❌ TTS generation failed for session {session_id}: {e}")
            await self.send_message(session_id, {
                'type': 'tts_error',
                'error': str(e),
                'text': text
            })
    
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