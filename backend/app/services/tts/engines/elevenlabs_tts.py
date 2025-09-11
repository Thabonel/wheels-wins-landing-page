"""
ElevenLabs TTS Engine - High-quality voice synthesis
"""

import asyncio
import logging
import os
from typing import List, Dict, Any, Optional
import time

from ..base import BaseTTSEngine, VoiceSettings, TTSResponse, TTSError

logger = logging.getLogger(__name__)

class ElevenLabsTTSEngine(BaseTTSEngine):
    """
    ElevenLabs TTS Engine for high-quality voice synthesis
    
    Features:
    - Premium voice quality with emotional range
    - Multi-language support (29+ languages)
    - Multiple voice models (Flash v2.5, Multilingual v2)
    - Voice cloning capabilities
    - Low latency options
    """
    
    def __init__(self):
        self.api_key = None
        self.client = None
        self.default_voice_id = "JBFqnCBsd6RMkjVDRZzb"  # Rachel voice (high quality)
        self.default_model = "eleven_multilingual_v2"  # Highest quality model
        super().__init__("ElevenLabs")
    
    def _setup_engine(self):
        """Initialize ElevenLabs client"""
        try:
            # Try to import ElevenLabs SDK
            from elevenlabs.client import ElevenLabs
            
            # Get API key from environment
            self.api_key = os.getenv("ELEVENLABS_API_KEY")
            if not self.api_key:
                raise Exception("ELEVENLABS_API_KEY environment variable not set")
            
            # Initialize client
            self.client = ElevenLabs(api_key=self.api_key)
            
            # Get configuration from environment
            self.default_voice_id = os.getenv("ELEVENLABS_DEFAULT_VOICE", self.default_voice_id)
            self.default_model = os.getenv("ELEVENLABS_MODEL", self.default_model)
            
            # Test API connection with a simple call
            voices = self.client.voices.get_all()
            logger.info(f"✅ ElevenLabs initialized with {len(voices.voices)} available voices")
            
        except ImportError as e:
            raise Exception(f"ElevenLabs SDK not installed. Run: pip install elevenlabs") from e
        except Exception as e:
            raise Exception(f"Failed to initialize ElevenLabs: {str(e)}") from e
    
    async def synthesize(self, text: str, settings: VoiceSettings = None) -> TTSResponse:
        """
        Synthesize text using ElevenLabs API
        
        Args:
            text: Text to synthesize
            settings: Voice settings
            
        Returns:
            TTSResponse with audio data
        """
        if not self.client:
            raise TTSError("ElevenLabs client not initialized", engine=self.name)
        
        if not text or not text.strip():
            raise TTSError("Empty text provided", engine=self.name)
        
        if settings is None:
            settings = VoiceSettings()
        
        try:
            start_time = time.time()
            
            # Map voice names to ElevenLabs voice IDs
            voice_id = self._get_voice_id(settings.voice)
            
            # Determine model based on quality/speed preference
            model_id = self._select_model(settings)
            
            logger.debug(f"🎵 ElevenLabs synthesizing with voice_id={voice_id}, model={model_id}")
            
            # Call ElevenLabs API
            audio_response = self.client.text_to_speech.convert(
                text=text.strip(),
                voice_id=voice_id,
                model_id=model_id,
                output_format="mp3_44100_128"  # High quality MP3
            )
            
            # Convert response to bytes
            audio_data = b"".join(audio_response)
            
            # Calculate duration estimate (rough)
            duration = len(text.split()) * 0.6  # ~0.6 seconds per word
            
            response_time = time.time() - start_time
            logger.info(f"✅ ElevenLabs synthesis completed in {response_time:.2f}s ({len(audio_data)} bytes)")
            
            return TTSResponse(
                audio_data=audio_data,
                format="mp3",
                duration=duration,
                voice_used=settings.voice,
                engine_used=self.name
            )
            
        except Exception as e:
            logger.error(f"❌ ElevenLabs synthesis failed: {str(e)}")
            raise TTSError(f"ElevenLabs synthesis error: {str(e)}", engine=self.name, original_error=e)
    
    def get_available_voices(self) -> List[Dict[str, Any]]:
        """
        Get available ElevenLabs voices
        
        Returns:
            List of voice information
        """
        if not self.client:
            return []
        
        try:
            voices_response = self.client.voices.get_all()
            voices = []
            
            for voice in voices_response.voices:
                voices.append({
                    "id": voice.voice_id,
                    "name": voice.name,
                    "category": voice.category or "standard",
                    "language": "multilingual",  # ElevenLabs supports multiple languages
                    "gender": self._detect_gender(voice.name),
                    "quality": "premium",
                    "description": f"ElevenLabs {voice.name} voice"
                })
            
            # Add common voice mappings
            common_voices = self._get_common_voice_mappings()
            voices.extend(common_voices)
            
            return voices
            
        except Exception as e:
            logger.warning(f"⚠️ Failed to get ElevenLabs voices: {e}")
            return self._get_fallback_voices()
    
    def _get_voice_id(self, voice_name: str) -> str:
        """
        Map voice name to ElevenLabs voice ID
        
        Args:
            voice_name: Voice name (e.g., 'alloy', 'rachel', etc.)
            
        Returns:
            ElevenLabs voice ID
        """
        # Voice name to ID mappings
        voice_mappings = {
            # Common PAM voices
            "alloy": "JBFqnCBsd6RMkjVDRZzb",  # Rachel (clear, professional)
            "echo": "21m00Tcm4TlvDq8ikWAM",   # Rachel alternative
            "fable": "JBFqnCBsd6RMkjVDRZzb",  # Rachel
            "onyx": "VR6AewLTigWG4xSOukaG",   # Josh (deeper voice)
            "nova": "EXAVITQu4vr4xnSDxMaL",   # Bella (friendly)
            "shimmer": "ThT5KcBeYPX3keUQqHPh",  # Dorothy (warm)
            
            # ElevenLabs premium voices
            "rachel": "JBFqnCBsd6RMkjVDRZzb",  # Professional female
            "josh": "VR6AewLTigWG4xSOukaG",    # Professional male
            "bella": "EXAVITQu4vr4xnSDxMaL",   # Friendly female
            "adam": "pNInz6obpgDQGcFmaJgB",    # Professional male
            "antoni": "ErXwobaYiN019PkySvjV",  # Smooth male
            "arnold": "VR6AewLTigWG4xSOukaG",  # Strong male
            "domi": "AZnzlk1XvdvUeBnXmlld",    # Confident female
            "elli": "MF3mGyEYCl7XYWbV9V6O",    # Young female
            "josh": "TxGEqnHWrfWFTfGW9XjX",    # Calm male
            "sam": "yoZ06aMxZJJ28mfd3POQ"      # Energetic male
        }
        
        return voice_mappings.get(voice_name.lower(), self.default_voice_id)
    
    def _select_model(self, settings: VoiceSettings) -> str:
        """
        Select appropriate ElevenLabs model based on settings
        
        Args:
            settings: Voice settings
            
        Returns:
            Model ID to use
        """
        # If speed is prioritized (rate > 1.5), use fast model
        if settings.speed > 1.5:
            return "eleven_flash_v2_5"  # 75ms latency, good quality
        
        # For high quality, use multilingual model
        return self.default_model  # eleven_multilingual_v2
    
    def _detect_gender(self, name: str) -> str:
        """Detect voice gender from name"""
        female_names = ["rachel", "bella", "dorothy", "elli", "domi"]
        male_names = ["josh", "adam", "antoni", "arnold", "sam"]
        
        name_lower = name.lower()
        if any(f in name_lower for f in female_names):
            return "female"
        elif any(m in name_lower for m in male_names):
            return "male"
        return "neutral"
    
    def _get_common_voice_mappings(self) -> List[Dict[str, Any]]:
        """Get common voice mappings for compatibility"""
        return [
            {
                "id": "alloy",
                "name": "Alloy (ElevenLabs)",
                "category": "professional",
                "language": "en-US",
                "gender": "female",
                "quality": "premium",
                "description": "Professional, clear voice powered by ElevenLabs"
            },
            {
                "id": "nova",
                "name": "Nova (ElevenLabs)", 
                "category": "friendly",
                "language": "en-US",
                "gender": "female",
                "quality": "premium",
                "description": "Friendly, warm voice powered by ElevenLabs"
            },
            {
                "id": "onyx",
                "name": "Onyx (ElevenLabs)",
                "category": "professional", 
                "language": "en-US",
                "gender": "male",
                "quality": "premium",
                "description": "Professional, deep voice powered by ElevenLabs"
            }
        ]
    
    def _get_fallback_voices(self) -> List[Dict[str, Any]]:
        """Fallback voice list if API fails"""
        return [
            {
                "id": "rachel",
                "name": "Rachel",
                "category": "professional",
                "language": "en-US", 
                "gender": "female",
                "quality": "premium",
                "description": "ElevenLabs professional voice (fallback)"
            }
        ]
    
    def health_check(self) -> bool:
        """Check ElevenLabs service health"""
        if not self.client or not self.api_key:
            return False
        
        try:
            # Quick API test
            voices = self.client.voices.get_all()
            return len(voices.voices) > 0
        except Exception:
            return False