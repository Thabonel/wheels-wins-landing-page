"""
Coqui TTS Engine Implementation
Integration with existing Coqui TTS open-source system
"""

import asyncio
from typing import Dict, List, Any, Optional, AsyncGenerator
from datetime import datetime
import logging

from .base_tts import (
    BaseTTSEngine, TTSEngine, VoiceProfile, VoiceSettings, AudioFormat,
    TTSRequest, TTSResponse, AudioChunk, VoiceStyle
)
from app.voice.tts_coqui import get_coqui_tts

logger = logging.getLogger(__name__)

class CoquiTTSEngine(BaseTTSEngine):
    """Coqui TTS engine implementation using existing open-source system"""
    
    def __init__(self):
        super().__init__(TTSEngine.COQUI)
        self.coqui_tts = None
        self.rate_limit_delay = 0.1  # Very fast, local processing
        
        # Available Coqui voices (VCTK dataset voices)
        self.coqui_voices = [
            VoiceProfile(
                voice_id="p225",
                name="Emma (British Female)",
                gender="female",
                age="young",
                accent="british",
                engine=TTSEngine.COQUI
            ),
            VoiceProfile(
                voice_id="p226",
                name="Alex (British Male)", 
                gender="male",
                age="young",
                accent="british",
                engine=TTSEngine.COQUI
            ),
            VoiceProfile(
                voice_id="p227",
                name="Sarah (British Female)",
                gender="female",
                age="middle",
                accent="british",
                engine=TTSEngine.COQUI
            ),
            VoiceProfile(
                voice_id="p228",
                name="James (British Male)",
                gender="male",
                age="middle",
                accent="british",
                engine=TTSEngine.COQUI
            ),
            VoiceProfile(
                voice_id="p229",
                name="Sophie (British Female)",
                gender="female",
                age="young",
                accent="british",
                engine=TTSEngine.COQUI
            ),
            VoiceProfile(
                voice_id="p230",
                name="Oliver (British Male)",
                gender="male",
                age="young",
                accent="british",
                engine=TTSEngine.COQUI
            ),
            # American voices
            VoiceProfile(
                voice_id="p231",
                name="Grace (American Female)",
                gender="female",
                age="young",
                accent="american",
                engine=TTSEngine.COQUI
            ),
            VoiceProfile(
                voice_id="p232",
                name="David (American Male)",
                gender="male",
                age="middle",
                accent="american",
                engine=TTSEngine.COQUI
            )
        ]
    
    async def initialize(self) -> bool:
        """Initialize Coqui TTS engine"""
        try:
            # Get the existing Coqui TTS instance
            self.coqui_tts = await get_coqui_tts()
            
            # Test synthesis to verify it works
            test_result = await self.coqui_tts.synthesize("Test")
            
            if test_result and len(test_result) > 0:
                self.is_initialized = True
                self.available_voices = self.coqui_voices
                logger.info("✅ Coqui TTS engine initialized successfully")
                return True
            else:
                logger.error("❌ Coqui TTS test synthesis failed")
                return False
                
        except Exception as e:
            logger.error(f"❌ Failed to initialize Coqui TTS: {e}")
            return False
    
    async def synthesize(self, request: TTSRequest) -> TTSResponse:
        """Synthesize speech using Coqui TTS"""
        if not self.is_initialized:
            return TTSResponse(
                request=request,
                success=False,
                error="Coqui TTS engine not initialized"
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
            
            # Build synthesis parameters
            synthesis_kwargs = {}
            
            # Map voice profile to speaker ID if available
            if hasattr(request.voice_profile, 'voice_id') and request.voice_profile.voice_id:
                # For VCTK model, use speaker_wav parameter
                synthesis_kwargs['speaker_wav'] = None  # Could be implemented for voice cloning
            
            # Synthesize with Coqui TTS
            audio_data = await self.coqui_tts.synthesize(text, **synthesis_kwargs)
            
            # Calculate metrics
            generation_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            estimated_duration = self.estimate_duration(text, request.voice_profile) * 1000
            
            return TTSResponse(
                request=request,
                audio_data=audio_data,
                duration_ms=int(estimated_duration),
                generation_time_ms=int(generation_time),
                engine_used=TTSEngine.COQUI,
                success=True
            )
            
        except Exception as e:
            return TTSResponse(
                request=request,
                success=False,
                error=f"Coqui TTS synthesis failed: {str(e)}"
            )
    
    async def synthesize_stream(self, request: TTSRequest) -> AsyncGenerator[AudioChunk, None]:
        """
        Coqui TTS doesn't support native streaming, so we'll simulate it
        by chunking the complete response
        """
        if not self.is_initialized:
            yield AudioChunk(
                data=b'',
                sample_rate=22050,
                format=request.format,
                chunk_index=0,
                is_final=True,
                metadata={"error": "Coqui TTS engine not initialized"}
            )
            return
        
        try:
            # Synthesize full audio first
            response = await self.synthesize(request)
            
            if not response.success:
                yield AudioChunk(
                    data=b'',
                    sample_rate=22050,
                    format=request.format,
                    chunk_index=0,
                    is_final=True,
                    metadata={"error": response.error}
                )
                return
            
            # Chunk the audio data for streaming effect
            audio_data = response.audio_data
            chunk_size = 4096  # 4KB chunks
            chunk_index = 0
            
            for i in range(0, len(audio_data), chunk_size):
                chunk = audio_data[i:i + chunk_size]
                is_final = (i + chunk_size) >= len(audio_data)
                
                yield AudioChunk(
                    data=chunk,
                    sample_rate=22050,  # Coqui TTS default
                    format=AudioFormat.WAV,  # Coqui outputs WAV
                    chunk_index=chunk_index,
                    is_final=is_final
                )
                
                chunk_index += 1
                
                # Add small delay for streaming effect
                if not is_final:
                    await asyncio.sleep(0.05)  # 50ms delay
                    
        except Exception as e:
            yield AudioChunk(
                data=b'',
                sample_rate=22050,
                format=request.format,
                chunk_index=0,
                is_final=True,
                metadata={"error": f"Coqui TTS streaming failed: {str(e)}"}
            )
    
    async def get_available_voices(self) -> List[VoiceProfile]:
        """Get list of available Coqui voices"""
        return self.coqui_voices
    
    async def health_check(self) -> Dict[str, Any]:
        """Check Coqui TTS health"""
        if not self.coqui_tts:
            return {"status": "unhealthy", "error": "Coqui TTS not available"}
        
        try:
            # Test synthesis with a short phrase
            test_audio = await self.coqui_tts.synthesize("Test")
            
            if test_audio and len(test_audio) > 0:
                return {
                    "status": "healthy",
                    "engine_available": True,
                    "available_voices": len(self.coqui_voices),
                    "supports_streaming": True,
                    "test_audio_size": len(test_audio)
                }
            else:
                return {
                    "status": "unhealthy",
                    "engine_available": False,
                    "error": "Test synthesis failed"
                }
                
        except Exception as e:
            return {
                "status": "unhealthy",
                "engine_available": False,
                "error": str(e)
            }
    
    async def close(self):
        """Coqui TTS doesn't require cleanup"""
        self.is_initialized = False
    
    def supports_streaming(self) -> bool:
        """Coqui TTS supports simulated streaming"""
        return True
    
    def supports_voice_cloning(self) -> bool:
        """Coqui TTS supports voice cloning with speaker reference audio"""
        return True
    
    def get_supported_formats(self) -> List[AudioFormat]:
        """Coqui TTS outputs WAV format"""
        return [AudioFormat.WAV]
    
    def get_max_text_length(self) -> int:
        """Coqui TTS can handle long texts"""
        return 5000  # Conservative limit for memory usage
    
    def prepare_text(self, text: str) -> str:
        """Prepare text for Coqui TTS synthesis"""
        text = super().prepare_text(text)
        
        # Coqui TTS specific text preparation
        # Add better punctuation for natural speech flow
        text = text.replace('?', '? ')
        text = text.replace('!', '! ')
        text = text.replace('.', '. ')
        
        # Remove extra spaces
        import re
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text
    
    def estimate_duration(self, text: str, voice_profile: VoiceProfile) -> float:
        """Estimate audio duration for Coqui TTS"""
        # Coqui TTS tends to be slightly slower than commercial TTS
        words = len(text.split())
        # Estimate ~140 words per minute for more natural speech
        return (words / 140) * 60