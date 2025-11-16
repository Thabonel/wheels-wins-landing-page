"""
Voice Conversation Manager
Handles real-time speech-to-speech conversations with PAM using existing infrastructure
"""

import asyncio
import json
import time
import logging
from typing import Dict, List, Any, Optional, AsyncGenerator
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict

from app.core.config import get_settings
from app.services.tts.tts_service import tts_service
from app.services.tts.manager import synthesize_for_pam, PAMVoiceProfile
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()

@dataclass
class ConversationState:
    """Tracks ongoing conversation context"""
    user_id: str
    session_id: str
    start_time: datetime
    last_interaction: datetime
    conversation_history: List[Dict[str, Any]]
    current_location: Optional[Dict[str, Any]] = None
    driving_status: str = "unknown"  # driving, parked, passenger
    interruption_stack: List[Dict[str, Any]] = None
    waiting_for_response: bool = False
    route_id: Optional[str] = None  # Track proactive discovery route
    conversation_mode: str = "voice"  # "voice" = speak responses, "text" = text only
    
    def __post_init__(self):
        if self.interruption_stack is None:
            self.interruption_stack = []

@dataclass
class VoiceMessage:
    """Voice interaction message"""
    text: str
    audio_data: Optional[bytes] = None
    timestamp: datetime = None
    speaker: str = "user"  # user or pam
    confidence: float = 1.0
    requires_response: bool = True
    priority: str = "normal"  # normal, urgent, emergency
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()

class VoiceConversationManager:
    """Manages real-time voice conversations with PAM"""
    
    def __init__(self):
        self.active_conversations: Dict[str, ConversationState] = {}
        self.speech_to_text_service = None  # Will implement STT service
        self.conversation_timeout = timedelta(minutes=30)
        self.max_conversation_history = 50
        
    async def initialize(self):
        """Initialize the conversation manager"""
        try:
            logger.info("🎤 Initializing Voice Conversation Manager...")
            
            # Initialize speech-to-text service
            await self._initialize_speech_to_text()
            
            # Initialize proactive discovery service (lazy import)
            from app.services.voice.proactive_discovery import proactive_discovery_service
            await proactive_discovery_service.initialize()
            self.proactive_discovery_service = proactive_discovery_service
            
            # Start background cleanup
            asyncio.create_task(self._cleanup_inactive_conversations())
            
            # Start proactive discovery monitoring
            asyncio.create_task(self._monitor_proactive_discoveries())
            
            logger.info("✅ Voice Conversation Manager initialized")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Voice Conversation Manager: {e}")
            return False
    
    async def start_conversation(
        self, 
        user_id: str, 
        location: Optional[Dict[str, Any]] = None,
        driving_status: str = "unknown"
    ) -> str:
        """Start a new voice conversation session"""
        try:
            session_id = f"voice_{user_id}_{int(time.time())}"
            
            conversation_state = ConversationState(
                user_id=user_id,
                session_id=session_id,
                start_time=datetime.utcnow(),
                last_interaction=datetime.utcnow(),
                conversation_history=[],
                current_location=location,
                driving_status=driving_status
            )
            
            self.active_conversations[session_id] = conversation_state
            
            # Start proactive discovery monitoring for this route
            if location and hasattr(self, 'proactive_discovery_service'):
                route_id = await self.proactive_discovery_service.start_route_monitoring(
                    user_id=user_id,
                    current_location=location
                )
                conversation_state.route_id = route_id
            
            # Generate greeting using existing PAM system
            greeting_context = {
                "voice_mode": True,
                "driving_status": driving_status,
                "location": location,
                "conversation_start": True
            }
            
            # Use PAM orchestrator (lazy import to avoid circular dependency)
            try:
                from app.services.pam.graph_enhanced_orchestrator import graph_enhanced_orchestrator
                greeting_response = await graph_enhanced_orchestrator.process_user_message(
                    user_id=user_id,
                    message="Hello PAM",
                    session_id=session_id,
                    context=greeting_context
                )
            except ImportError:
                # Fallback if orchestrator not available
                greeting_response = {"response": "Hello! How can I help you on the road today?"}
            
            # Convert to voice using existing TTS
            greeting_audio = await synthesize_for_pam(
                text=greeting_response.get("response", "Hello! How can I help you on the road today?"),
                voice_profile=PAMVoiceProfile.PAM_ASSISTANT,
                user_id=user_id,
                context={"voice_greeting": True}
            )
            
            # Add to conversation history
            self._add_to_history(
                conversation_state,
                VoiceMessage(
                    text=greeting_response.get("response", "Hello!"),
                    speaker="pam",
                    audio_data=greeting_audio.audio_data if greeting_audio else None
                )
            )
            
            logger.info(f"🎤 Started voice conversation for user {user_id}: {session_id}")
            return session_id
            
        except Exception as e:
            logger.error(f"❌ Failed to start conversation: {e}")
            raise
    
    async def process_voice_input(
        self,
        session_id: str,
        audio_data: bytes,
        location: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Process voice input and generate response"""
        try:
            conversation = self.active_conversations.get(session_id)
            if not conversation:
                raise ValueError(f"No active conversation found: {session_id}")
            
            # Update location if provided
            if location:
                conversation.current_location = location
                # Update proactive discovery with new location
                if conversation.route_id and hasattr(self, 'proactive_discovery_service'):
                    await self.proactive_discovery_service.update_location(
                        conversation.route_id, 
                        location
                    )
            
            # Convert speech to text
            transcript = await self._speech_to_text(audio_data)
            if not transcript:
                return {"error": "Could not understand speech"}
            
            # Add user message to history
            user_message = VoiceMessage(
                text=transcript,
                audio_data=audio_data,
                speaker="user"
            )
            self._add_to_history(conversation, user_message)
            
            # Prepare context for PAM
            conversation_context = {
                "voice_mode": True,
                "conversation_mode": conversation.conversation_mode,  # "voice" or "text"
                "driving_status": conversation.driving_status,
                "location": conversation.current_location,
                "conversation_history": self._get_recent_history(conversation, 5),
                "session_id": session_id
            }
            
            # Process with unified PAM brain (same as text chat)
            from app.services.pam.turn_handler import handle_pam_turn

            pam_response = await handle_pam_turn(
                user_id=conversation.user_id,
                message=transcript,
                frontend_context=conversation_context
            )

            response_text = pam_response.get("response_text", "I'm not sure how to help with that.")

            # Convert to voice using existing TTS (only if in voice mode)
            response_audio = None
            if conversation.conversation_mode == "voice":
                response_audio = await synthesize_for_pam(
                    text=response_text,
                    voice_profile=PAMVoiceProfile.PAM_ASSISTANT,
                    user_id=conversation.user_id,
                    context={"voice_conversation": True}
                )
            
            # Add PAM response to history
            pam_message = VoiceMessage(
                text=response_text,
                speaker="pam",
                audio_data=response_audio.audio_data if response_audio else None
            )
            self._add_to_history(conversation, pam_message)
            
            # Update conversation state
            conversation.last_interaction = datetime.utcnow()
            conversation.waiting_for_response = False
            
            result = {
                "session_id": session_id,
                "transcript": transcript,
                "response_text": response_text,
                "response_audio": response_audio.audio_data if response_audio else None,
                "timestamp": datetime.utcnow().isoformat(),
                "conversation_continues": True
            }
            
            # Check if PAM has additional context to share
            if pam_response.get("proactive_suggestions"):
                result["proactive_suggestions"] = pam_response["proactive_suggestions"]
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Error processing voice input: {e}")
            return {"error": str(e)}
    
    async def inject_proactive_message(
        self,
        session_id: str,
        message: str,
        priority: str = "normal"
    ) -> Optional[Dict[str, Any]]:
        """Inject a proactive message from PAM (like traffic alerts, suggestions)"""
        try:
            conversation = self.active_conversations.get(session_id)
            if not conversation:
                return None
            
            # Handle interruption if currently speaking
            if priority in ["urgent", "emergency"]:
                await self._handle_interruption(conversation, message, priority)
            
            # Convert to voice  
            voice_profile = PAMVoiceProfile.EMERGENCY if priority == "emergency" else PAMVoiceProfile.PAM_ASSISTANT
            proactive_audio = await synthesize_for_pam(
                text=message,
                voice_profile=voice_profile,
                user_id=conversation.user_id,
                context={"proactive_alert": True, "priority": priority}
            )
            
            # Add to conversation history
            proactive_message = VoiceMessage(
                text=message,
                speaker="pam",
                priority=priority,
                audio_data=proactive_audio.audio_data if proactive_audio else None
            )
            self._add_to_history(conversation, proactive_message)
            
            return {
                "session_id": session_id,
                "message": message,
                "priority": priority,
                "audio_data": proactive_audio.audio_data if proactive_audio else None,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Error injecting proactive message: {e}")
            return None
    
    async def update_driving_status(self, session_id: str, driving_status: str):
        """Update driving status for safety-aware responses"""
        conversation = self.active_conversations.get(session_id)
        if conversation:
            conversation.driving_status = driving_status
            logger.debug(f"Updated driving status for {session_id}: {driving_status}")
    
    async def end_conversation(self, session_id: str) -> bool:
        """End a voice conversation"""
        try:
            conversation = self.active_conversations.get(session_id)
            if not conversation:
                return False
            
            # Generate goodbye message
            goodbye_text = "Safe travels! I'll be here when you need me."
            goodbye_audio = await synthesize_for_pam(
                text=goodbye_text,
                voice_profile=PAMVoiceProfile.PAM_ASSISTANT,
                user_id=conversation.user_id,
                context={"voice_goodbye": True}
            )
            
            # Stop proactive discovery monitoring
            if conversation.route_id and hasattr(self, 'proactive_discovery_service'):
                await self.proactive_discovery_service.stop_route_monitoring(conversation.route_id)
            
            # Clean up
            del self.active_conversations[session_id]
            
            logger.info(f"🎤 Ended voice conversation: {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error ending conversation: {e}")
            return False
    
    def get_conversation_status(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get current conversation status"""
        conversation = self.active_conversations.get(session_id)
        if not conversation:
            return None
        
        return {
            "session_id": session_id,
            "user_id": conversation.user_id,
            "start_time": conversation.start_time.isoformat(),
            "last_interaction": conversation.last_interaction.isoformat(),
            "driving_status": conversation.driving_status,
            "message_count": len(conversation.conversation_history),
            "waiting_for_response": conversation.waiting_for_response
        }
    
    async def _initialize_speech_to_text(self):
        """Initialize speech-to-text service"""
        try:
            from app.services.voice.speech_to_text import speech_to_text_service
            
            self.speech_to_text_service = speech_to_text_service
            success = await self.speech_to_text_service.initialize()
            
            if success:
                logger.info("🎤 Speech-to-text service initialized")
            else:
                logger.warning("⚠️ STT service initialization failed - voice input will be limited")
                
        except Exception as e:
            logger.error(f"❌ Failed to initialize STT service: {e}")
            self.speech_to_text_service = None
    
    async def _speech_to_text(self, audio_data: bytes) -> Optional[str]:
        """Convert speech to text"""
        if not hasattr(self, 'speech_to_text_service') or not self.speech_to_text_service:
            logger.warning("⚠️ STT service not available")
            return None
        
        try:
            transcript = await self.speech_to_text_service.transcribe(audio_data)
            if transcript:
                logger.debug(f"🎤 Transcription successful: {transcript[:50]}...")
                return transcript
            else:
                logger.warning("⚠️ No transcript generated from audio")
                return None
                
        except Exception as e:
            logger.error(f"❌ Speech-to-text failed: {e}")
            return None
    
    def _add_to_history(self, conversation: ConversationState, message: VoiceMessage):
        """Add message to conversation history"""
        conversation.conversation_history.append(asdict(message))
        
        # Trim history if too long
        if len(conversation.conversation_history) > self.max_conversation_history:
            conversation.conversation_history = conversation.conversation_history[-self.max_conversation_history:]
    
    def _get_recent_history(self, conversation: ConversationState, count: int) -> List[Dict[str, Any]]:
        """Get recent conversation history"""
        return conversation.conversation_history[-count:] if conversation.conversation_history else []
    
    async def _handle_interruption(self, conversation: ConversationState, message: str, priority: str):
        """Handle interrupting current speech for urgent messages"""
        # Stop current TTS output
        # TODO: Implement TTS interruption
        
        # Save context to interruption stack
        conversation.interruption_stack.append({
            "interrupted_at": datetime.utcnow().isoformat(),
            "message": message,
            "priority": priority
        })
        
        logger.info(f"🎤 Handled {priority} interruption for session {conversation.session_id}")
    
    async def _cleanup_inactive_conversations(self):
        """Background task to clean up inactive conversations"""
        while True:
            try:
                current_time = datetime.utcnow()
                expired_sessions = []
                
                for session_id, conversation in self.active_conversations.items():
                    if current_time - conversation.last_interaction > self.conversation_timeout:
                        expired_sessions.append(session_id)
                
                for session_id in expired_sessions:
                    await self.end_conversation(session_id)
                    logger.info(f"🎤 Cleaned up expired conversation: {session_id}")
                
                # Check every 5 minutes
                await asyncio.sleep(300)
                
            except Exception as e:
                logger.error(f"❌ Error in conversation cleanup: {e}")
                await asyncio.sleep(60)  # Retry after 1 minute
    
    async def _monitor_proactive_discoveries(self):
        """Background task to monitor and inject proactive discoveries"""
        while True:
            try:
                for session_id, conversation in self.active_conversations.items():
                    if conversation.route_id and conversation.driving_status == "driving":
                        # Get pending discoveries
                        if hasattr(self, 'proactive_discovery_service'):
                            discoveries = await self.proactive_discovery_service.get_pending_discoveries(
                                conversation.route_id,
                                max_count=1,  # One at a time while driving
                                min_priority="normal"
                            )
                            
                            for discovery in discoveries:
                                # Inject proactive message
                                await self.inject_proactive_message(
                                    session_id=session_id,
                                    message=discovery.message,
                                    priority=discovery.priority
                                )
                                
                                # Mark as delivered
                                await self.proactive_discovery_service.mark_discovery_delivered(
                                    conversation.route_id,
                                    discovery.id
                                )
                            
                            # Only deliver one discovery per cycle to avoid overwhelming
                            break
                
                # Check every 30 seconds
                await asyncio.sleep(30)
                
            except Exception as e:
                logger.error(f"❌ Error in proactive discovery monitoring: {e}")
                await asyncio.sleep(60)  # Retry after 1 minute

# Global conversation manager instance
conversation_manager = VoiceConversationManager()