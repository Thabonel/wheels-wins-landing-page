"""
Microsoft Edge TTS Engine Implementation
Free, high-quality TTS using Microsoft Edge browser TTS
"""

import asyncio
import tempfile
import os
from typing import Dict, List, Any, Optional, AsyncGenerator
from datetime import datetime
import logging

try:
    import edge_tts
    EDGE_TTS_AVAILABLE = True
except ImportError:
    EDGE_TTS_AVAILABLE = False

from .base_tts import (
    BaseTTSEngine, TTSEngine, VoiceProfile, VoiceSettings, AudioFormat,
    TTSRequest, TTSResponse, AudioChunk, VoiceStyle
)

logger = logging.getLogger(__name__)

class EdgeTTS(BaseTTSEngine):
    """Microsoft Edge TTS engine implementation"""
    
    def __init__(self):
        super().__init__(TTSEngine.EDGE)
        self.rate_limit_delay = 0.1  # Edge TTS is very fast and has no rate limits
        
        # Common Edge TTS voices
        self.edge_voices = [
            VoiceProfile(
                voice_id="en-US-AriaNeural",
                name="Aria",
                gender="female",
                age="young",
                accent="american",
                engine=TTSEngine.EDGE
            ),
            VoiceProfile(
                voice_id="en-US-DavisNeural",
                name="Davis",
                gender="male",
                age="middle",
                accent="american",
                engine=TTSEngine.EDGE
            ),
            VoiceProfile(
                voice_id="en-US-GuyNeural",
                name="Guy",
                gender="male",
                age="middle",
                accent="american",
                engine=TTSEngine.EDGE
            ),
            VoiceProfile(
                voice_id="en-US-JennyNeural",
                name="Jenny",
                gender="female",
                age="young",
                accent="american",
                engine=TTSEngine.EDGE
            ),
            VoiceProfile(
                voice_id="en-US-JasonNeural",
                name="Jason",
                gender="male",
                age="young",
                accent="american",
                engine=TTSEngine.EDGE
            ),
            VoiceProfile(
                voice_id="en-US-TonyNeural",
                name="Tony",
                gender="male",
                age="middle",
                accent="american",
                engine=TTSEngine.EDGE
            ),
            VoiceProfile(
                voice_id="en-AU-NatashaNeural",
                name="Natasha",
                gender="female",
                age="young",
                accent="australian",
                engine=TTSEngine.EDGE
            ),
            VoiceProfile(
                voice_id="en-GB-SoniaNeural",
                name="Sonia",
                gender="female",
                age="middle",
                accent="british",
                engine=TTSEngine.EDGE
            ),
            VoiceProfile(
                voice_id="en-GB-RyanNeural",
                name="Ryan",
                gender="male",
                age="young",
                accent="british",
                engine=TTSEngine.EDGE
            )
        ]
    
    async def initialize(self) -> bool:
        """Initialize Edge TTS engine"""
        if not EDGE_TTS_AVAILABLE:
            logger.warning("⚠️ edge-tts package not available")
            return False
        
        try:
            # Test Edge TTS functionality
            health_result = await self.health_check()
            if health_result.get("status") == "healthy":
                self.is_initialized = True
                self.available_voices = self.edge_voices
                logger.info("✅ Edge TTS engine initialized successfully")
                return True
            else:
                logger.error("❌ Edge TTS health check failed")
                return False
                
        except Exception as e:
            logger.error(f"❌ Failed to initialize Edge TTS: {e}")
            return False
    
    async def synthesize(self, request: TTSRequest) -> TTSResponse:
        """Synthesize speech using Edge TTS"""
        if not self.is_initialized:
            return TTSResponse(
                request=request,
                success=False,
                error="Edge TTS engine not initialized"
            )
        
        if not self.validate_request(request):
            return TTSResponse(
                request=request,
                success=False,
                error="Invalid TTS request"
            )
        
        start_time = datetime.utcnow()
        
        try:
            # Prepare text
            text = self.prepare_text(request.text)
            
            # Build SSML with voice settings
            ssml = self._build_ssml(text, request.voice_profile)
            
            # Create temporary file for output
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                temp_path = temp_file.name
            
            try:
                # Create TTS communicate object
                communicate = edge_tts.Communicate(ssml, request.voice_profile.voice_id)
                
                # Save to temporary file
                await communicate.save(temp_path)
                
                # Read the generated audio
                with open(temp_path, 'rb') as audio_file:
                    audio_data = audio_file.read()
                
                # Calculate metrics
                generation_time = (datetime.utcnow() - start_time).total_seconds() * 1000
                estimated_duration = self.estimate_duration(text, request.voice_profile) * 1000
                
                return TTSResponse(
                    request=request,
                    audio_data=audio_data,
                    duration_ms=int(estimated_duration),
                    generation_time_ms=int(generation_time),
                    engine_used=TTSEngine.EDGE,
                    success=True
                )
                
            finally:
                # Clean up temporary file
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
                    
        except Exception as e:
            return TTSResponse(
                request=request,
                success=False,
                error=f"Edge TTS synthesis failed: {str(e)}"
            )
    
    def _build_ssml(self, text: str, voice_profile: VoiceProfile) -> str:
        """Build SSML markup for Edge TTS"""
        settings = voice_profile.settings
        
        # Map our settings to Edge TTS prosody
        rate = f"{int((settings.speed - 1.0) * 50):+d}%"
        pitch = f"{int((settings.pitch - 1.0) * 50):+d}%"
        volume = f"{int(settings.volume * 100)}%"
        
        # Build SSML
        ssml = f"""
        <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
            <voice name="{voice_profile.voice_id}">
                <prosody rate="{rate}" pitch="{pitch}" volume="{volume}">
                    {text}
                </prosody>
            </voice>
        </speak>
        """.strip()
        
        return ssml
    
    async def synthesize_stream(self, request: TTSRequest) -> AsyncGenerator[AudioChunk, None]:
        """
        Edge TTS supports streaming synthesis
        """
        if not self.is_initialized:
            yield AudioChunk(
                data=b'',
                sample_rate=22050,
                format=request.format,
                chunk_index=0,
                is_final=True,
                metadata={"error": "Edge TTS engine not initialized"}
            )
            return
        
        try:
            # Prepare text and SSML
            text = self.prepare_text(request.text)
            ssml = self._build_ssml(text, request.voice_profile)
            
            # Create TTS communicate object
            communicate = edge_tts.Communicate(ssml, request.voice_profile.voice_id)
            
            chunk_index = 0
            
            # Stream audio chunks
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    yield AudioChunk(
                        data=chunk["data"],
                        sample_rate=22050,  # Edge TTS default
                        format=AudioFormat.WAV,  # Edge TTS outputs WAV
                        chunk_index=chunk_index,
                        is_final=False
                    )
                    chunk_index += 1
            
            # Send final chunk
            yield AudioChunk(
                data=b'',
                sample_rate=22050,
                format=AudioFormat.WAV,
                chunk_index=chunk_index,
                is_final=True
            )
                    
        except Exception as e:
            yield AudioChunk(
                data=b'',
                sample_rate=22050,
                format=request.format,
                chunk_index=0,
                is_final=True,
                metadata={"error": f"Edge TTS streaming failed: {str(e)}"}
            )
    
    async def get_available_voices(self) -> List[VoiceProfile]:
        """Get list of available Edge TTS voices"""
        if EDGE_TTS_AVAILABLE:
            try:
                # Get voices from Edge TTS
                voices = await edge_tts.list_voices()
                
                edge_voice_profiles = []
                for voice in voices[:20]:  # Limit to first 20 voices
                    voice_profile = VoiceProfile(
                        voice_id=voice["Name"],
                        name=voice["FriendlyName"],
                        gender=voice["Gender"].lower(),
                        age=self._extract_age_from_voice(voice),
                        accent=self._extract_accent_from_locale(voice["Locale"]),
                        language=voice["Locale"][:2],
                        engine=TTSEngine.EDGE
                    )
                    edge_voice_profiles.append(voice_profile)
                
                return edge_voice_profiles
                
            except Exception as e:
                logger.warning(f"⚠️ Could not load Edge TTS voices: {e}, using defaults")
                return self.edge_voices
        else:
            return self.edge_voices
    
    def _extract_age_from_voice(self, voice_data: Dict) -> str:
        """Extract age category from voice data"""
        name = voice_data.get("FriendlyName", "").lower()
        if any(keyword in name for keyword in ["young", "teen", "child"]):
            return "young"
        elif any(keyword in name for keyword in ["old", "senior", "elder"]):
            return "old"
        else:
            return "middle"
    
    def _extract_accent_from_locale(self, locale: str) -> str:
        """Extract accent from locale string"""
        accent_mapping = {
            "en-US": "american",
            "en-GB": "british",
            "en-AU": "australian",
            "en-CA": "canadian",
            "en-IN": "indian",
            "en-IE": "irish",
            "en-ZA": "south_african"
        }
        return accent_mapping.get(locale, "american")
    
    async def health_check(self) -> Dict[str, Any]:
        """Check Edge TTS health"""
        if not EDGE_TTS_AVAILABLE:
            return {
                "status": "unhealthy",
                "error": "edge-tts package not available"
            }
        
        try:
            # Test synthesis with a short phrase
            test_text = "Test"
            communicate = edge_tts.Communicate(test_text, "en-US-AriaNeural")
            
            # Try to get first chunk to verify it works
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    break
            
            return {
                "status": "healthy",
                "engine_available": True,
                "available_voices": len(await self.get_available_voices()),
                "supports_streaming": True
            }
                    
        except Exception as e:
            return {
                "status": "unhealthy",
                "engine_available": False,
                "error": str(e)
            }
    
    async def close(self):
        """Edge TTS doesn't require cleanup"""
        self.is_initialized = False
    
    def supports_streaming(self) -> bool:
        """Edge TTS supports native streaming"""
        return True
    
    def supports_voice_cloning(self) -> bool:
        """Edge TTS doesn't support voice cloning"""
        return False
    
    def get_supported_formats(self) -> List[AudioFormat]:
        """Edge TTS outputs WAV format"""
        return [AudioFormat.WAV]
    
    def get_max_text_length(self) -> int:
        """Edge TTS text length limit"""
        return 10000  # Very generous limit
    
    def prepare_text(self, text: str) -> str:
        """Prepare text for Edge TTS synthesis"""
        text = super().prepare_text(text)
        
        # Edge TTS handles SSML, so escape XML characters
        text = text.replace('&', '&amp;')
        text = text.replace('<', '&lt;')
        text = text.replace('>', '&gt;')
        text = text.replace('"', '&quot;')
        text = text.replace("'", '&apos;')
        
        return text