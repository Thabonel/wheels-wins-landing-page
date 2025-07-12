"""
Main TTS Service
Central service for all text-to-speech operations with PAM integration
"""

import asyncio
from typing import Dict, List, Any, Optional, Union
from datetime import datetime
import logging

from .streaming_tts import streaming_tts_service
from .base_tts import VoiceProfile, AudioFormat, TTSRequest, TTSResponse
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

class TTSService:
    """Main TTS service for PAM integration"""
    
    def __init__(self):
        self.streaming_service = streaming_tts_service
        self.is_initialized = False
    
    async def initialize(self):
        """Initialize the TTS service"""
        try:
            logger.info("🎙️ Initializing PAM TTS Service...")
            
            # Initialize streaming service
            result = await self.streaming_service.initialize()
            
            if result:
                self.is_initialized = True
                logger.info("✅ PAM TTS Service initialized successfully")
                return True
            else:
                logger.error("❌ PAM TTS Service initialization failed")
                return False
                
        except Exception as e:
            logger.error(f"❌ TTS Service initialization error: {e}")
            return False
    
    async def synthesize_for_pam(
        self,
        text: str,
        user_id: Optional[str] = None,
        context: str = "general_conversation",
        voice_preference: Optional[str] = None,
        stream: bool = False
    ) -> Union[TTSResponse, Any]:
        """
        Synthesize speech for PAM responses
        Simplified interface for PAM orchestrator
        """
        
        if not self.is_initialized:
            logger.error("❌ TTS Service not initialized")
            return None
        
        try:
            # Get voice profile for context
            voice_profile = await self._resolve_voice_preference(
                voice_preference, user_id, context
            )
            
            # Use streaming service
            result = await self.streaming_service.synthesize_text(
                text=text,
                user_id=user_id,
                context=context,
                voice_preference=voice_profile,
                format=AudioFormat.MP3,
                stream=stream,
                use_cache=True
            )
            
            return result
            
        except Exception as e:
            logger.error(f"❌ PAM TTS synthesis failed: {e}")
            return None
    
    async def get_available_voices(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get available voices formatted for API response"""
        
        try:
            if user_id:
                # Get personalized recommendations
                voices = await self.streaming_service.get_recommended_voices(
                    user_id=user_id,
                    context="general_conversation",
                    limit=10
                )
            else:
                # Get all available voices
                voices = []
                for engine in self.streaming_service.tts_manager.engines.values():
                    if engine.is_initialized:
                        engine_voices = await engine.get_available_voices()
                        voices.extend(engine_voices)
            
            # Format for API
            formatted_voices = []
            for voice in voices:
                formatted_voices.append({
                    "voice_id": voice.voice_id,
                    "name": voice.name,
                    "gender": voice.gender,
                    "age": voice.age,
                    "accent": voice.accent,
                    "language": voice.language,
                    "engine": voice.engine.value,
                    "settings": {
                        "stability": voice.settings.stability,
                        "similarity_boost": voice.settings.similarity_boost,
                        "speed": voice.settings.speed,
                        "pitch": voice.settings.pitch,
                        "volume": voice.settings.volume,
                        "style": voice.settings.style.value
                    }
                })
            
            return formatted_voices
            
        except Exception as e:
            logger.error(f"❌ Failed to get available voices: {e}")
            return []
    
    async def set_user_voice_preference(
        self,
        user_id: str,
        voice_data: Dict[str, Any],
        context: Optional[str] = None,
        is_default: bool = False
    ) -> bool:
        """Set user voice preference from API data"""
        
        try:
            # Convert API data to VoiceProfile
            voice_profile = self._api_data_to_voice_profile(voice_data)
            
            await self.streaming_service.set_user_voice_preference(
                user_id=user_id,
                voice_profile=voice_profile,
                context=context,
                is_default=is_default
            )
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to set voice preference: {e}")
            return False
    
    async def rate_voice(
        self,
        user_id: str,
        voice_data: Dict[str, Any],
        rating: float,
        feedback: Optional[str] = None
    ) -> bool:
        """Rate a voice interaction"""
        
        try:
            voice_profile = self._api_data_to_voice_profile(voice_data)
            
            await self.streaming_service.rate_voice_interaction(
                user_id=user_id,
                voice_profile=voice_profile,
                rating=rating,
                feedback=feedback
            )
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to rate voice: {e}")
            return False
    
    def _api_data_to_voice_profile(self, voice_data: Dict[str, Any]) -> VoiceProfile:
        """Convert API voice data to VoiceProfile object"""
        from .base_tts import VoiceSettings, VoiceStyle, TTSEngine
        
        settings_data = voice_data.get("settings", {})
        settings = VoiceSettings(
            stability=settings_data.get("stability", 0.75),
            similarity_boost=settings_data.get("similarity_boost", 0.75),
            speed=settings_data.get("speed", 1.0),
            pitch=settings_data.get("pitch", 1.0),
            volume=settings_data.get("volume", 1.0),
            style=VoiceStyle(settings_data.get("style", "friendly"))
        )
        
        return VoiceProfile(
            voice_id=voice_data["voice_id"],
            name=voice_data["name"],
            gender=voice_data["gender"],
            age=voice_data["age"],
            accent=voice_data["accent"],
            language=voice_data.get("language", "en"),
            engine=TTSEngine(voice_data["engine"]),
            settings=settings
        )
    
    async def get_service_status(self) -> Dict[str, Any]:
        """Get TTS service status"""
        
        if not self.is_initialized:
            return {
                "status": "not_initialized",
                "initialized": False,
                "engines": {}
            }
        
        return await self.streaming_service.get_service_health()
    
    async def get_user_analytics(self, user_id: str) -> Dict[str, Any]:
        """Get user TTS analytics"""
        
        if not self.is_initialized:
            return {"error": "TTS service not initialized"}
        
        return await self.streaming_service.get_user_analytics(user_id)
    
    async def clear_cache(self, older_than_hours: Optional[int] = None) -> Dict[str, Any]:
        """Clear TTS cache"""
        
        if not self.is_initialized:
            return {"error": "TTS service not initialized"}
        
        try:
            cleared_count = await self.streaming_service.cache.clear_cache(older_than_hours)
            return {
                "success": True,
                "cleared_entries": cleared_count,
                "older_than_hours": older_than_hours
            }
        except Exception as e:
            return {"error": str(e)}
    
    async def _resolve_voice_preference(
        self,
        voice_preference: Optional[str],
        user_id: Optional[str],
        context: str
    ) -> Optional[VoiceProfile]:
        """Resolve voice preference string to actual voice profile"""
        try:
            # If no preference specified, get user's default or context-based voice
            if not voice_preference:
                if user_id:
                    # Get user's preferred voice for this context
                    user_voice = await self.streaming_service.get_user_voice_preference(
                        user_id=user_id,
                        context=context
                    )
                    if user_voice:
                        return user_voice
                
                # Fall back to system default for context
                return await self._get_context_default_voice(context)
            
            # Handle specific voice preference string
            if isinstance(voice_preference, str):
                # Try to find voice by ID first
                voice_profile = await self._find_voice_by_id(voice_preference)
                if voice_profile:
                    return voice_profile
                
                # Try to find voice by name
                voice_profile = await self._find_voice_by_name(voice_preference)
                if voice_profile:
                    return voice_profile
                
                # Try to parse as voice characteristics (e.g., "female young british")
                voice_profile = await self._find_voice_by_characteristics(voice_preference)
                if voice_profile:
                    return voice_profile
            
            # If voice_preference is already a VoiceProfile object, return it
            if hasattr(voice_preference, 'voice_id'):
                return voice_preference
                
            # Fall back to default
            logger.warning(f"Could not resolve voice preference '{voice_preference}', using default")
            return await self._get_context_default_voice(context)
            
        except Exception as e:
            logger.error(f"❌ Error resolving voice preference: {e}")
            return await self._get_context_default_voice(context)
    
    async def _get_context_default_voice(self, context: str) -> Optional[VoiceProfile]:
        """Get default voice for specific context"""
        try:
            # Context-specific voice mappings
            context_voices = {
                "professional": "p267",  # Professional female voice
                "casual": "p225",        # Casual female voice  
                "formal": "p376",        # Formal male voice
                "friendly": "p225",      # Friendly female voice
                "general_conversation": "p225"  # Default
            }
            
            voice_id = context_voices.get(context, "p225")  # Default to p225
            return await self._find_voice_by_id(voice_id)
            
        except Exception as e:
            logger.error(f"❌ Error getting context default voice: {e}")
            return None
    
    async def _find_voice_by_id(self, voice_id: str) -> Optional[VoiceProfile]:
        """Find voice profile by voice ID"""
        try:
            for engine in self.streaming_service.tts_manager.engines.values():
                if engine.is_initialized:
                    voices = await engine.get_available_voices()
                    for voice in voices:
                        if voice.voice_id == voice_id:
                            return voice
            return None
        except Exception as e:
            logger.error(f"❌ Error finding voice by ID: {e}")
            return None
    
    async def _find_voice_by_name(self, name: str) -> Optional[VoiceProfile]:
        """Find voice profile by name"""
        try:
            name_lower = name.lower()
            for engine in self.streaming_service.tts_manager.engines.values():
                if engine.is_initialized:
                    voices = await engine.get_available_voices()
                    for voice in voices:
                        if voice.name.lower() == name_lower:
                            return voice
            return None
        except Exception as e:
            logger.error(f"❌ Error finding voice by name: {e}")
            return None
    
    async def _find_voice_by_characteristics(self, characteristics: str) -> Optional[VoiceProfile]:
        """Find voice by characteristics like 'female young british'"""
        try:
            chars = characteristics.lower().split()
            
            # Extract characteristics
            gender = None
            age = None
            accent = None
            
            for char in chars:
                if char in ['male', 'female']:
                    gender = char
                elif char in ['young', 'adult', 'elderly']:
                    age = char
                elif char in ['british', 'american', 'australian', 'irish', 'scottish']:
                    accent = char
            
            # Find matching voices
            best_matches = []
            for engine in self.streaming_service.tts_manager.engines.values():
                if engine.is_initialized:
                    voices = await engine.get_available_voices()
                    for voice in voices:
                        score = 0
                        if gender and voice.gender.lower() == gender:
                            score += 3
                        if age and voice.age.lower() == age:
                            score += 2
                        if accent and voice.accent.lower() == accent:
                            score += 2
                        
                        if score > 0:
                            best_matches.append((voice, score))
            
            # Return highest scoring match
            if best_matches:
                best_matches.sort(key=lambda x: x[1], reverse=True)
                return best_matches[0][0]
                
            return None
            
        except Exception as e:
            logger.error(f"❌ Error finding voice by characteristics: {e}")
            return None

    async def shutdown(self):
        """Shutdown TTS service"""
        try:
            await self.streaming_service.shutdown()
            self.is_initialized = False
            logger.info("🛑 PAM TTS Service shutdown completed")
        except Exception as e:
            logger.error(f"❌ TTS Service shutdown error: {e}")

# Global TTS service instance
tts_service = TTSService()