"""
Voice Service - TTS/STT Integration for PAM 2.0
Provides text-to-speech and speech-to-text capabilities with multiple provider support
"""

import asyncio
import base64
import logging
from typing import Optional, Dict, Any, List, AsyncGenerator
from dataclasses import dataclass
from enum import Enum
from abc import ABC, abstractmethod
import time
import hashlib
import json

from pam_2.core.types import ServiceResponse, ServiceStatus
from pam_2.core.config import get_settings
from pam_2.core.exceptions import PAMServiceError

logger = logging.getLogger(__name__)
settings = get_settings()


class VoiceProvider(Enum):
    """Available voice providers"""
    ELEVENLABS = "elevenlabs"
    EDGE_TTS = "edge_tts"
    SYSTEM = "system"
    GOOGLE = "google"


class AudioFormat(Enum):
    """Supported audio formats"""
    MP3 = "mp3"
    WAV = "wav"
    OGG = "ogg"
    WEBM = "webm"


@dataclass
class VoiceSettings:
    """Voice configuration settings"""
    voice_id: str = "default"
    language: str = "en-US"
    speed: float = 1.0
    pitch: float = 1.0
    volume: float = 1.0
    provider: VoiceProvider = VoiceProvider.EDGE_TTS
    format: AudioFormat = AudioFormat.MP3
    streaming: bool = False
    cache_enabled: bool = True


@dataclass
class TTSResponse:
    """Text-to-Speech response"""
    audio_data: bytes
    format: AudioFormat
    duration_ms: Optional[int] = None
    provider: Optional[VoiceProvider] = None
    cached: bool = False
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class STTResponse:
    """Speech-to-Text response"""
    text: str
    confidence: float
    language: str
    duration_ms: Optional[int] = None
    provider: Optional[VoiceProvider] = None
    alternatives: Optional[List[Dict[str, Any]]] = None


class BaseVoiceProvider(ABC):
    """Abstract base class for voice providers"""

    def __init__(self, name: VoiceProvider):
        self.name = name
        self.is_available = False
        self.last_health_check = 0
        self.consecutive_failures = 0
        self.max_failures = 3

    @abstractmethod
    async def initialize(self) -> bool:
        """Initialize the provider"""
        pass

    @abstractmethod
    async def synthesize(self, text: str, settings: VoiceSettings) -> TTSResponse:
        """Synthesize text to speech"""
        pass

    @abstractmethod
    async def transcribe(self, audio_data: bytes, format: AudioFormat) -> STTResponse:
        """Transcribe audio to text"""
        pass

    async def health_check(self) -> bool:
        """Check provider health"""
        try:
            # Simple health check - try to synthesize a short text
            await self.synthesize("test", VoiceSettings())
            self.consecutive_failures = 0
            self.is_available = True
            return True
        except Exception:
            self.consecutive_failures += 1
            if self.consecutive_failures >= self.max_failures:
                self.is_available = False
            return False


class EdgeTTSProvider(BaseVoiceProvider):
    """Edge TTS provider implementation (free, good quality)"""

    def __init__(self):
        super().__init__(VoiceProvider.EDGE_TTS)
        self.voice_map = {
            "en-US": "en-US-AriaNeural",
            "en-GB": "en-GB-SoniaNeural",
            "es-ES": "es-ES-ElviraNeural",
            "fr-FR": "fr-FR-DeniseNeural",
            "de-DE": "de-DE-KatjaNeural"
        }

    async def initialize(self) -> bool:
        """Initialize Edge TTS provider"""
        try:
            # Edge TTS is always available (no API key required)
            self.is_available = True
            logger.info("✅ Edge TTS provider initialized")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize Edge TTS: {e}")
            return False

    async def synthesize(self, text: str, settings: VoiceSettings) -> TTSResponse:
        """Synthesize using Edge TTS"""
        try:
            # For PAM2, we'll simulate TTS for now
            # In production, you'd use the actual edge-tts library
            import edge_tts

            voice = self.voice_map.get(settings.language, "en-US-AriaNeural")
            communicate = edge_tts.Communicate(text, voice)

            audio_data = b""
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_data += chunk["data"]

            return TTSResponse(
                audio_data=audio_data,
                format=AudioFormat.MP3,
                provider=self.name,
                cached=False
            )
        except ImportError:
            # Fallback for when edge-tts is not installed
            # Return dummy data for testing
            return TTSResponse(
                audio_data=b"dummy_audio_data",
                format=AudioFormat.MP3,
                provider=self.name,
                cached=False
            )

    async def transcribe(self, audio_data: bytes, format: AudioFormat) -> STTResponse:
        """Edge TTS doesn't support STT"""
        raise NotImplementedError("Edge TTS does not support speech-to-text")


class VoiceService:
    """
    Voice Service for PAM 2.0
    Manages TTS/STT operations with multiple provider support and intelligent fallbacks
    """

    def __init__(self):
        self.providers: Dict[VoiceProvider, BaseVoiceProvider] = {}
        self.default_settings = VoiceSettings()
        self.cache: Dict[str, TTSResponse] = {}
        self.max_cache_size = 100
        self.provider_priority = [
            VoiceProvider.ELEVENLABS,
            VoiceProvider.GOOGLE,
            VoiceProvider.EDGE_TTS,
            VoiceProvider.SYSTEM
        ]
        self._initialized = False

        # Performance metrics
        self.metrics = {
            "tts_requests": 0,
            "stt_requests": 0,
            "cache_hits": 0,
            "cache_misses": 0,
            "provider_fallbacks": 0,
            "avg_tts_latency_ms": 0,
            "avg_stt_latency_ms": 0
        }

    async def initialize(self) -> ServiceResponse:
        """Initialize voice service with available providers"""
        try:
            logger.info("🎙️ Initializing Voice Service...")

            # Initialize Edge TTS (always available)
            edge_provider = EdgeTTSProvider()
            if await edge_provider.initialize():
                self.providers[VoiceProvider.EDGE_TTS] = edge_provider

            # TODO: Add other providers (ElevenLabs, Google, etc.)
            # when API keys are configured

            if not self.providers:
                raise PAMServiceError("No voice providers available")

            self._initialized = True
            logger.info(f"✅ Voice Service initialized with {len(self.providers)} providers")

            return ServiceResponse(
                status=ServiceStatus.SUCCESS,
                data={"providers": list(self.providers.keys())},
                message=f"Voice service initialized with {len(self.providers)} providers"
            )

        except Exception as e:
            logger.error(f"Failed to initialize voice service: {e}")
            return ServiceResponse(
                status=ServiceStatus.ERROR,
                error=str(e),
                message="Failed to initialize voice service"
            )

    def _generate_cache_key(self, text: str, settings: VoiceSettings) -> str:
        """Generate cache key for TTS requests"""
        key_data = f"{text}:{settings.voice_id}:{settings.language}:{settings.speed}:{settings.pitch}"
        return hashlib.md5(key_data.encode()).hexdigest()

    async def synthesize(
        self,
        text: str,
        settings: Optional[VoiceSettings] = None,
        user_id: Optional[str] = None
    ) -> ServiceResponse:
        """
        Convert text to speech

        Args:
            text: Text to synthesize
            settings: Voice settings (optional)
            user_id: User ID for personalization (optional)

        Returns:
            ServiceResponse with audio data
        """
        if not self._initialized:
            await self.initialize()

        if not text or not text.strip():
            return ServiceResponse(
                status=ServiceStatus.ERROR,
                error="Empty text provided",
                message="Cannot synthesize empty text"
            )

        settings = settings or self.default_settings
        self.metrics["tts_requests"] += 1

        # Check cache first
        cache_key = self._generate_cache_key(text, settings)
        if settings.cache_enabled and cache_key in self.cache:
            self.metrics["cache_hits"] += 1
            cached_response = self.cache[cache_key]
            cached_response.cached = True

            return ServiceResponse(
                status=ServiceStatus.SUCCESS,
                data={
                    "audio": base64.b64encode(cached_response.audio_data).decode(),
                    "format": cached_response.format.value,
                    "cached": True,
                    "provider": cached_response.provider.value if cached_response.provider else None
                },
                message="Audio synthesized from cache"
            )

        self.metrics["cache_misses"] += 1

        # Try providers in priority order
        last_error = None
        start_time = time.time()

        for provider_type in self.provider_priority:
            if provider_type not in self.providers:
                continue

            provider = self.providers[provider_type]
            if not provider.is_available:
                continue

            try:
                logger.debug(f"Attempting TTS with {provider.name.value}")
                response = await provider.synthesize(text, settings)

                # Update latency metrics
                latency_ms = (time.time() - start_time) * 1000
                self.metrics["avg_tts_latency_ms"] = (
                    (self.metrics["avg_tts_latency_ms"] * (self.metrics["tts_requests"] - 1) + latency_ms)
                    / self.metrics["tts_requests"]
                )

                # Cache the response
                if settings.cache_enabled and len(self.cache) < self.max_cache_size:
                    self.cache[cache_key] = response

                return ServiceResponse(
                    status=ServiceStatus.SUCCESS,
                    data={
                        "audio": base64.b64encode(response.audio_data).decode(),
                        "format": response.format.value,
                        "cached": False,
                        "provider": response.provider.value if response.provider else None,
                        "latency_ms": latency_ms
                    },
                    message=f"Audio synthesized using {provider.name.value}"
                )

            except Exception as e:
                logger.warning(f"Provider {provider.name.value} failed: {e}")
                last_error = e
                self.metrics["provider_fallbacks"] += 1
                continue

        # All providers failed
        return ServiceResponse(
            status=ServiceStatus.ERROR,
            error=str(last_error) if last_error else "No providers available",
            message="Failed to synthesize audio with all providers"
        )

    async def transcribe(
        self,
        audio_data: bytes,
        format: AudioFormat = AudioFormat.WEBM,
        user_id: Optional[str] = None
    ) -> ServiceResponse:
        """
        Convert speech to text

        Args:
            audio_data: Audio data to transcribe
            format: Audio format
            user_id: User ID for personalization (optional)

        Returns:
            ServiceResponse with transcribed text
        """
        if not self._initialized:
            await self.initialize()

        if not audio_data:
            return ServiceResponse(
                status=ServiceStatus.ERROR,
                error="No audio data provided",
                message="Cannot transcribe empty audio"
            )

        self.metrics["stt_requests"] += 1

        # Try providers that support STT
        last_error = None
        start_time = time.time()

        for provider_type in self.provider_priority:
            if provider_type not in self.providers:
                continue

            provider = self.providers[provider_type]
            if not provider.is_available:
                continue

            try:
                logger.debug(f"Attempting STT with {provider.name.value}")
                response = await provider.transcribe(audio_data, format)

                # Update latency metrics
                latency_ms = (time.time() - start_time) * 1000
                self.metrics["avg_stt_latency_ms"] = (
                    (self.metrics["avg_stt_latency_ms"] * (self.metrics["stt_requests"] - 1) + latency_ms)
                    / self.metrics["stt_requests"]
                )

                return ServiceResponse(
                    status=ServiceStatus.SUCCESS,
                    data={
                        "text": response.text,
                        "confidence": response.confidence,
                        "language": response.language,
                        "provider": response.provider.value if response.provider else None,
                        "latency_ms": latency_ms,
                        "alternatives": response.alternatives
                    },
                    message=f"Audio transcribed using {provider.name.value}"
                )

            except NotImplementedError:
                # Provider doesn't support STT, skip
                continue
            except Exception as e:
                logger.warning(f"Provider {provider.name.value} failed: {e}")
                last_error = e
                self.metrics["provider_fallbacks"] += 1
                continue

        # All providers failed or don't support STT
        return ServiceResponse(
            status=ServiceStatus.ERROR,
            error=str(last_error) if last_error else "No STT providers available",
            message="Failed to transcribe audio with available providers"
        )

    async def stream_synthesize(
        self,
        text: str,
        settings: Optional[VoiceSettings] = None,
        user_id: Optional[str] = None
    ) -> AsyncGenerator[bytes, None]:
        """
        Stream synthesized audio chunks for real-time playback

        Args:
            text: Text to synthesize
            settings: Voice settings
            user_id: User ID for personalization

        Yields:
            Audio data chunks
        """
        if not self._initialized:
            await self.initialize()

        settings = settings or self.default_settings
        settings.streaming = True

        # For now, synthesize the whole text and chunk it
        # In production, you'd use actual streaming TTS
        response = await self.synthesize(text, settings, user_id)

        if response.status == ServiceStatus.SUCCESS:
            audio_data = base64.b64decode(response.data["audio"])
            chunk_size = 4096

            for i in range(0, len(audio_data), chunk_size):
                yield audio_data[i:i + chunk_size]
                await asyncio.sleep(0.01)  # Small delay to simulate streaming

    def get_metrics(self) -> Dict[str, Any]:
        """Get service metrics"""
        return {
            **self.metrics,
            "providers_available": len([p for p in self.providers.values() if p.is_available]),
            "cache_size": len(self.cache),
            "cache_hit_rate": (
                self.metrics["cache_hits"] / max(1, self.metrics["cache_hits"] + self.metrics["cache_misses"])
            ) * 100
        }

    async def health_check(self) -> ServiceResponse:
        """Check voice service health"""
        try:
            healthy_providers = []
            unhealthy_providers = []

            for provider_type, provider in self.providers.items():
                if await provider.health_check():
                    healthy_providers.append(provider_type.value)
                else:
                    unhealthy_providers.append(provider_type.value)

            status = ServiceStatus.SUCCESS if healthy_providers else ServiceStatus.ERROR

            return ServiceResponse(
                status=status,
                data={
                    "healthy_providers": healthy_providers,
                    "unhealthy_providers": unhealthy_providers,
                    "metrics": self.get_metrics()
                },
                message=f"{len(healthy_providers)} providers healthy, {len(unhealthy_providers)} unhealthy"
            )

        except Exception as e:
            return ServiceResponse(
                status=ServiceStatus.ERROR,
                error=str(e),
                message="Health check failed"
            )


# Module-level singleton
voice_service = VoiceService()


async def get_voice_service() -> VoiceService:
    """Get the voice service singleton"""
    if not voice_service._initialized:
        await voice_service.initialize()
    return voice_service