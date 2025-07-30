"""
Multi-Engine Speech-to-Text Service
Implements robust STT with multiple engine fallbacks inspired by open source Jarvis models
"""

import asyncio
import logging
from typing import Optional, List, Dict, Any, AsyncIterator
from abc import ABC, abstractmethod
from enum import Enum
import time
import io
from datetime import datetime
import json

logger = logging.getLogger(__name__)

class STTEngine(Enum):
    OPENAI_WHISPER = "openai_whisper"
    GOOGLE_SPEECH = "google_speech"
    LOCAL_WHISPER = "local_whisper"
    BROWSER_SPEECH = "browser_speech"
    AZURE_SPEECH = "azure_speech"

class STTQuality(Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    FAILED = "failed"

class STTResult:
    def __init__(
        self,
        text: str,
        confidence: float,
        engine: STTEngine,
        latency_ms: int,
        quality: STTQuality,
        language: str = "en",
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.text = text
        self.confidence = confidence
        self.engine = engine
        self.latency_ms = latency_ms
        self.quality = quality
        self.language = language
        self.metadata = metadata or {}
        self.timestamp = datetime.utcnow()

class STTEngineBase(ABC):
    """Base class for STT engines"""
    
    def __init__(self, engine_type: STTEngine):
        self.engine_type = engine_type
        self.is_initialized = False
        self.is_available = False
        self.error_count = 0
        self.total_requests = 0
        self.avg_latency = 0
        self.success_rate = 1.0
    
    @abstractmethod
    async def initialize(self) -> bool:
        """Initialize the STT engine"""
        pass
    
    @abstractmethod
    async def transcribe(self, audio_data: bytes, language: str = "en") -> Optional[STTResult]:
        """Transcribe audio data to text"""
        pass
    
    @abstractmethod
    async def health_check(self) -> bool:
        """Check if engine is healthy"""
        pass
    
    def update_metrics(self, success: bool, latency_ms: int):
        """Update engine performance metrics"""
        self.total_requests += 1
        if not success:
            self.error_count += 1
        
        # Calculate rolling average latency
        self.avg_latency = (self.avg_latency * (self.total_requests - 1) + latency_ms) / self.total_requests
        
        # Calculate success rate
        self.success_rate = (self.total_requests - self.error_count) / self.total_requests

class OpenAIWhisperEngine(STTEngineBase):
    """OpenAI Whisper API engine - Primary choice for high quality"""
    
    def __init__(self):
        super().__init__(STTEngine.OPENAI_WHISPER)
        self.client = None
    
    async def initialize(self) -> bool:
        """Initialize OpenAI client"""
        try:
            from openai import AsyncOpenAI
            from app.core.config import get_settings
            
            settings = get_settings()
            if not settings.OPENAI_API_KEY:
                logger.warning("❌ OpenAI API key not configured")
                return False
            
            self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            self.is_initialized = True
            self.is_available = await self.health_check()
            
            logger.info("✅ OpenAI Whisper engine initialized")
            return True
            
        except ImportError:
            logger.warning("❌ OpenAI package not installed")
            return False
        except Exception as e:
            logger.error(f"❌ OpenAI Whisper initialization failed: {e}")
            return False
    
    async def transcribe(self, audio_data: bytes, language: str = "en") -> Optional[STTResult]:
        """Transcribe using OpenAI Whisper API"""
        if not self.is_initialized or not self.client:
            return None
        
        start_time = time.time()
        
        try:
            # Create file-like object for audio data
            audio_file = io.BytesIO(audio_data)
            audio_file.name = "audio.wav"  # Required for OpenAI API
            
            # Call Whisper API
            response = await self.client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language=language,
                response_format="verbose_json",
                temperature=0.0  # Deterministic output
            )
            
            latency_ms = int((time.time() - start_time) * 1000)
            
            # Parse response
            text = response.text.strip()
            confidence = getattr(response, 'confidence', 0.95)  # Whisper doesn't provide confidence
            
            # Determine quality based on text length and content
            quality = self._assess_quality(text, confidence)
            
            result = STTResult(
                text=text,
                confidence=confidence,
                engine=self.engine_type,
                latency_ms=latency_ms,
                quality=quality,
                language=language,
                metadata={
                    "model": "whisper-1",
                    "segments": getattr(response, 'segments', []),
                    "duration": getattr(response, 'duration', 0)
                }
            )
            
            self.update_metrics(True, latency_ms)
            logger.info(f"✅ OpenAI Whisper transcription: '{text}' ({latency_ms}ms)")
            
            return result
            
        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000)
            self.update_metrics(False, latency_ms)
            logger.error(f"❌ OpenAI Whisper transcription failed: {e}")
            return None
    
    async def health_check(self) -> bool:
        """Check if OpenAI API is accessible"""
        try:
            if not self.client:
                return False
            
            # Simple API test (we'll use a minimal audio file if needed)
            await self.client.models.list()
            return True
            
        except Exception as e:
            logger.warning(f"⚠️ OpenAI Whisper health check failed: {e}")
            return False
    
    def _assess_quality(self, text: str, confidence: float) -> STTQuality:
        """Assess transcription quality"""
        if not text or len(text.strip()) < 2:
            return STTQuality.FAILED
        elif confidence > 0.9 and len(text.strip()) > 5:
            return STTQuality.HIGH
        elif confidence > 0.7:
            return STTQuality.MEDIUM
        else:
            return STTQuality.LOW

# LocalWhisperEngine completely removed for memory optimization
# This eliminates 72MB+ memory usage from local Whisper model downloads
# Using simplified 2-tier STT: OpenAI Whisper (cloud) + Browser WebSpeech (fallback)

class GoogleSpeechEngine(STTEngineBase):
    """Google Speech-to-Text engine for backup"""
    
    def __init__(self):
        super().__init__(STTEngine.GOOGLE_SPEECH)
        self.client = None
    
    async def initialize(self) -> bool:
        """Initialize Google Speech client"""
        try:
            from google.cloud import speech
            
            # Check for credentials
            import os
            if not os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
                logger.warning("❌ Google Speech credentials not configured")
                return False
            
            self.client = speech.SpeechClient()
            self.is_initialized = True
            self.is_available = await self.health_check()
            
            logger.info("✅ Google Speech engine initialized")
            return True
            
        except ImportError:
            logger.warning("❌ Google Cloud Speech package not installed")
            return False
        except Exception as e:
            logger.error(f"❌ Google Speech initialization failed: {e}")
            return False
    
    async def transcribe(self, audio_data: bytes, language: str = "en") -> Optional[STTResult]:
        """Transcribe using Google Speech API"""
        if not self.is_initialized or not self.client:
            return None
        
        start_time = time.time()
        
        try:
            from google.cloud import speech
            
            audio = speech.RecognitionAudio(content=audio_data)
            config = speech.RecognitionConfig(
                encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
                sample_rate_hertz=16000,
                language_code=language,
                enable_automatic_punctuation=True,
                model="default"
            )
            
            # Run in thread pool to avoid blocking
            import asyncio
            loop = asyncio.get_event_loop()
            
            response = await loop.run_in_executor(
                None,
                self.client.recognize,
                config,
                audio
            )
            
            latency_ms = int((time.time() - start_time) * 1000)
            
            if not response.results:
                self.update_metrics(False, latency_ms)
                return None
            
            # Get best result
            result = response.results[0]
            alternative = result.alternatives[0]
            
            text = alternative.transcript.strip()
            confidence = alternative.confidence
            
            quality = self._assess_quality(text, confidence)
            
            stt_result = STTResult(
                text=text,
                confidence=confidence,
                engine=self.engine_type,
                latency_ms=latency_ms,
                quality=quality,
                language=language,
                metadata={
                    "alternatives": [alt.transcript for alt in result.alternatives]
                }
            )
            
            self.update_metrics(True, latency_ms)
            logger.info(f"✅ Google Speech transcription: '{text}' ({latency_ms}ms)")
            
            return stt_result
            
        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000)
            self.update_metrics(False, latency_ms)
            logger.error(f"❌ Google Speech transcription failed: {e}")
            return None
    
    async def health_check(self) -> bool:
        """Check if Google Speech API is accessible"""
        try:
            # Simple health check
            return self.client is not None
        except Exception:
            return False
    
    def _assess_quality(self, text: str, confidence: float) -> STTQuality:
        """Assess transcription quality"""
        if not text or len(text.strip()) < 2:
            return STTQuality.FAILED
        elif confidence > 0.9 and len(text.strip()) > 5:
            return STTQuality.HIGH
        elif confidence > 0.7:
            return STTQuality.MEDIUM
        else:
            return STTQuality.LOW

class MultiEngineSTTService:
    """
    Multi-engine STT service with intelligent fallback
    Inspired by open source Jarvis models' reliability patterns
    """
    
    def __init__(self):
        self.engines: Dict[STTEngine, STTEngineBase] = {}
        # Local Whisper removed for memory optimization (eliminates 72MB+ usage)
        # Using 2-tier system: Cloud STT (OpenAI/Google) + Browser fallback
        self.engine_priority = [
            STTEngine.OPENAI_WHISPER,   # Best quality
            STTEngine.GOOGLE_SPEECH,    # Good quality, reliable
            STTEngine.BROWSER_SPEECH,   # Browser fallback
        ]
        self.is_initialized = False
        self.stats = {
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "avg_latency_ms": 0,
            "engine_usage": {}
        }
    
    async def initialize(self):
        """Initialize all available STT engines"""
        logger.info("🎙️ Initializing Multi-Engine STT Service...")
        
        # Initialize engines in priority order (Local Whisper removed for memory optimization)
        self.engines[STTEngine.OPENAI_WHISPER] = OpenAIWhisperEngine()
        self.engines[STTEngine.GOOGLE_SPEECH] = GoogleSpeechEngine()
        # Local Whisper intentionally removed to save 72MB+ memory
        
        # Try to initialize each engine
        initialized_engines = []
        for engine_type in self.engine_priority:
            if engine_type in self.engines:
                engine = self.engines[engine_type]
                try:
                    success = await engine.initialize()
                    if success:
                        initialized_engines.append(engine_type)
                        logger.info(f"✅ {engine_type.value} engine ready")
                    else:
                        logger.warning(f"⚠️ {engine_type.value} engine failed to initialize")
                except Exception as e:
                    logger.error(f"❌ {engine_type.value} engine initialization error: {e}")
        
        if initialized_engines:
            self.is_initialized = True
            logger.info(f"✅ STT Service initialized with {len(initialized_engines)} engines: {[e.value for e in initialized_engines]}")
        else:
            logger.error("❌ No STT engines could be initialized")
        
        return self.is_initialized
    
    async def transcribe(
        self, 
        audio_data: bytes, 
        language: str = "en",
        quality_threshold: float = 0.7,
        max_attempts: int = 3
    ) -> Optional[STTResult]:
        """
        Transcribe audio using the best available engine
        Falls back to other engines if primary fails or quality is low
        """
        if not self.is_initialized:
            logger.error("❌ STT Service not initialized")
            return None
        
        self.stats["total_requests"] += 1
        start_time = time.time()
        
        # Try engines in priority order
        best_result = None
        attempts = 0
        
        for engine_type in self.engine_priority:
            if attempts >= max_attempts:
                break
                
            if engine_type not in self.engines:
                continue
                
            engine = self.engines[engine_type]
            if not engine.is_available:
                continue
            
            attempts += 1
            logger.info(f"🎤 Attempting transcription with {engine_type.value} (attempt {attempts})")
            
            try:
                result = await engine.transcribe(audio_data, language)
                
                if result and result.quality != STTQuality.FAILED:
                    # Update usage stats
                    if engine_type.value not in self.stats["engine_usage"]:
                        self.stats["engine_usage"][engine_type.value] = 0
                    self.stats["engine_usage"][engine_type.value] += 1
                    
                    # Check if result meets quality threshold
                    if result.confidence >= quality_threshold:
                        logger.info(f"✅ High quality transcription from {engine_type.value}: '{result.text}'")
                        self._update_stats(True, time.time() - start_time)
                        return result
                    else:
                        # Keep as backup if no better result
                        if not best_result or result.confidence > best_result.confidence:
                            best_result = result
                            logger.info(f"📝 Backup result from {engine_type.value}: '{result.text}' (confidence: {result.confidence})")
                
            except Exception as e:
                logger.error(f"❌ Engine {engine_type.value} failed: {e}")
                engine.is_available = False  # Temporarily disable failed engine
        
        # Return best result if any
        if best_result:
            logger.info(f"✅ Using best available result: '{best_result.text}' from {best_result.engine.value}")
            self._update_stats(True, time.time() - start_time)
            return best_result
        
        # All engines failed
        logger.error("❌ All STT engines failed")
        self._update_stats(False, time.time() - start_time)
        return None
    
    async def transcribe_streaming(
        self, 
        audio_chunks: AsyncIterator[bytes],
        language: str = "en"
    ) -> AsyncIterator[STTResult]:
        """
        Transcribe streaming audio chunks
        Returns interim and final results
        """
        # For now, accumulate chunks and transcribe complete utterances
        # TODO: Implement real streaming STT for supported engines
        
        accumulated_audio = bytearray()
        
        async for chunk in audio_chunks:
            accumulated_audio.extend(chunk)
            
            # Process every 2 seconds of audio (32KB at 16kHz)
            if len(accumulated_audio) >= 32000:
                audio_data = bytes(accumulated_audio)
                accumulated_audio.clear()
                
                result = await self.transcribe(audio_data, language)
                if result:
                    yield result
        
        # Process final chunk
        if accumulated_audio:
            audio_data = bytes(accumulated_audio)
            result = await self.transcribe(audio_data, language)
            if result:
                result.metadata["is_final"] = True
                yield result
    
    async def health_check(self) -> Dict[str, Any]:
        """Check health of all engines"""
        engine_health = {}
        
        for engine_type, engine in self.engines.items():
            try:
                is_healthy = await engine.health_check()
                engine.is_available = is_healthy
                
                engine_health[engine_type.value] = {
                    "healthy": is_healthy,
                    "initialized": engine.is_initialized,
                    "error_count": engine.error_count,
                    "success_rate": engine.success_rate,
                    "avg_latency_ms": engine.avg_latency
                }
            except Exception as e:
                engine_health[engine_type.value] = {
                    "healthy": False,
                    "error": str(e)
                }
        
        return {
            "service_initialized": self.is_initialized,
            "engines": engine_health,
            "stats": self.stats
        }
    
    def get_stats(self) -> Dict[str, Any]:
        """Get service statistics"""
        return {
            **self.stats,
            "engine_count": len([e for e in self.engines.values() if e.is_available]),
            "total_engines": len(self.engines)
        }
    
    def _update_stats(self, success: bool, latency_seconds: float):
        """Update service statistics"""
        if success:
            self.stats["successful_requests"] += 1
        else:
            self.stats["failed_requests"] += 1
        
        # Update average latency
        total = self.stats["successful_requests"] + self.stats["failed_requests"]
        latency_ms = latency_seconds * 1000
        
        self.stats["avg_latency_ms"] = (
            (self.stats["avg_latency_ms"] * (total - 1) + latency_ms) / total
        )

# Global service instance
multi_engine_stt = MultiEngineSTTService()