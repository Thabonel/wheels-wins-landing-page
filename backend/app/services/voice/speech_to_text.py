"""
Speech-to-Text Service
Handles speech recognition for voice conversations using multiple providers
"""

import asyncio
import io
import logging
import tempfile
from typing import Optional, Dict, Any
from abc import ABC, abstractmethod

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()

class BaseSpeechToText(ABC):
    """Base class for speech-to-text providers"""
    
    @abstractmethod
    async def transcribe(self, audio_data: bytes) -> Optional[str]:
        """Transcribe audio data to text"""
        pass
    
    @abstractmethod
    async def is_available(self) -> bool:
        """Check if the STT service is available"""
        pass

class OpenAIWhisperSTT(BaseSpeechToText):
    """OpenAI Whisper speech-to-text service"""
    
    def __init__(self):
        self.client = None
        self.is_initialized = False
    
    async def initialize(self):
        """Initialize OpenAI Whisper client"""
        try:
            # Try to import and initialize OpenAI client
            try:
                import openai
                from app.core.config import settings
                
                if hasattr(settings, 'OPENAI_API_KEY') and settings.OPENAI_API_KEY:
                    self.client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
                    self.is_initialized = True
                    logger.info("✅ OpenAI Whisper STT initialized")
                    return True
                else:
                    logger.warning("⚠️ OpenAI API key not found")
                    return False
                    
            except ImportError:
                logger.warning("⚠️ OpenAI library not installed")
                return False
                
        except Exception as e:
            logger.error(f"❌ Failed to initialize OpenAI Whisper: {e}")
            return False
    
    async def transcribe(self, audio_data: bytes) -> Optional[str]:
        """Transcribe audio using OpenAI Whisper"""
        if not self.is_initialized or not self.client:
            return None
        
        try:
            # Create temporary file for audio data
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                temp_file.write(audio_data)
                temp_file.flush()
                
                # Transcribe using OpenAI Whisper
                with open(temp_file.name, "rb") as audio_file:
                    transcript = await self.client.audio.transcriptions.create(
                        model="whisper-1",
                        file=audio_file,
                        language="en"  # Can be made configurable
                    )
                
                return transcript.text.strip() if transcript.text else None
                
        except Exception as e:
            logger.error(f"❌ OpenAI Whisper transcription failed: {e}")
            return None
    
    async def is_available(self) -> bool:
        """Check if OpenAI Whisper is available"""
        return self.is_initialized and self.client is not None

class BrowserWebSpeechSTT(BaseSpeechToText):
    """Placeholder for browser-based Web Speech API"""
    
    async def transcribe(self, audio_data: bytes) -> Optional[str]:
        """Browser-based STT handled on frontend"""
        # This is handled by the browser's Web Speech API
        # Audio data here would be the result passed from frontend
        logger.debug("🎤 Browser Web Speech API transcription")
        return None
    
    async def is_available(self) -> bool:
        """Browser Web Speech API availability"""
        return True

class LocalWhisperSTT(BaseSpeechToText):
    """Local Whisper model for offline usage"""
    
    def __init__(self):
        self.model = None
        self.is_initialized = False
    
    async def initialize(self):
        """Initialize local Whisper model with memory-optimized settings"""
        try:
            import whisper
            
            # Use tiny model for production deployments with memory constraints
            # Options: tiny (~39MB), base (~74MB), small (~244MB), medium (~769MB), large (~1550MB)
            model_size = getattr(settings, 'LOCAL_WHISPER_MODEL', 'tiny')
            
            logger.info(f"🔄 Loading local Whisper model '{model_size}' for memory-optimized deployment...")
            
            # Load model asynchronously to avoid blocking startup
            import asyncio
            loop = asyncio.get_event_loop()
            
            self.model = await loop.run_in_executor(
                None, 
                whisper.load_model, 
                model_size
            )
            
            self.is_initialized = True
            logger.info(f"✅ Local Whisper STT initialized with {model_size} model")
            return True
            
        except ImportError:
            logger.warning("⚠️ Whisper library not installed for local STT")
            return False
        except Exception as e:
            logger.error(f"❌ Failed to initialize local Whisper: {e}")
            return False
    
    async def transcribe(self, audio_data: bytes) -> Optional[str]:
        """Transcribe audio using local Whisper model"""
        if not self.is_initialized or not self.model:
            return None
        
        try:
            # Create temporary audio file
            with tempfile.NamedTemporaryFile(suffix=".wav") as temp_file:
                temp_file.write(audio_data)
                temp_file.flush()
                
                # Transcribe using local Whisper
                result = self.model.transcribe(temp_file.name)
                return result["text"].strip() if result.get("text") else None
                
        except Exception as e:
            logger.error(f"❌ Local Whisper transcription failed: {e}")
            return None
    
    async def is_available(self) -> bool:
        """Check if local Whisper is available"""
        return self.is_initialized and self.model is not None

class SpeechToTextService:
    """Manages multiple STT providers with fallback support"""
    
    def __init__(self):
        self.providers = {}
        self.primary_provider = None
        self.fallback_providers = []
        self.is_initialized = False
        
        # Performance monitoring for local vs cloud STT
        self.performance_metrics = {
            "total_requests": 0,
            "provider_usage": {},  # Track usage per provider
            "provider_performance": {},  # Track performance per provider
            "cost_analysis": {
                "cloud_requests": 0,
                "local_requests": 0,
                "estimated_api_cost": 0.0,  # OpenAI Whisper API cost estimation
                "offline_savings": 0.0
            }
        }
    
    async def initialize(self):
        """Initialize STT service with multiple providers"""
        try:
            logger.info("🎤 Initializing Speech-to-Text Service...")
            
            # Initialize providers in order of preference
            providers_to_init = [
                ("openai_whisper", OpenAIWhisperSTT()),
                ("local_whisper", LocalWhisperSTT()),
                ("browser_webspeech", BrowserWebSpeechSTT())
            ]
            
            available_providers = []
            
            for name, provider in providers_to_init:
                if name == "local_whisper":
                    # Initialize local whisper in background to avoid blocking startup
                    asyncio.create_task(self._initialize_local_whisper_background(name, provider))
                    logger.info("🔄 Local Whisper STT initialization started in background")
                    continue
                
                if hasattr(provider, 'initialize'):
                    success = await provider.initialize()
                else:
                    success = await provider.is_available()
                
                if success:
                    self.providers[name] = provider
                    available_providers.append(name)
                    logger.info(f"✅ STT Provider {name} initialized")
            
            # Set primary provider (prefer OpenAI Whisper)
            if "openai_whisper" in self.providers:
                self.primary_provider = self.providers["openai_whisper"]
                self.fallback_providers = [p for name, p in self.providers.items() if name != "openai_whisper"]
            elif "local_whisper" in self.providers:
                self.primary_provider = self.providers["local_whisper"]
                self.fallback_providers = [p for name, p in self.providers.items() if name != "local_whisper"]
            elif self.providers:
                provider_name = list(self.providers.keys())[0]
                self.primary_provider = self.providers[provider_name]
                self.fallback_providers = []
            
            if self.primary_provider:
                self.is_initialized = True
                logger.info(f"🎤 STT Service initialized with {len(available_providers)} providers")
                return True
            else:
                logger.warning("⚠️ No STT providers available - voice input will be limited")
                return False
                
        except Exception as e:
            logger.error(f"❌ Failed to initialize STT Service: {e}")
            return False
    
    async def _initialize_local_whisper_background(self, name: str, provider: LocalWhisperSTT):
        """Initialize local whisper in background to avoid blocking startup"""
        try:
            logger.info("🔄 Starting background initialization of Local Whisper...")
            
            # Wait a bit to let the main app finish startup
            await asyncio.sleep(2)
            
            success = await provider.initialize()
            
            if success:
                self.providers[name] = provider
                logger.info("✅ Local Whisper STT initialized successfully in background")
                
                # Update primary provider if we don't have one or if this is preferred
                if not self.primary_provider or name == "local_whisper":
                    # Re-evaluate provider priority
                    await self._update_provider_priority()
            else:
                logger.warning("⚠️ Local Whisper STT background initialization failed")
                
        except Exception as e:
            logger.error(f"❌ Local Whisper background initialization error: {e}")
    
    async def _update_provider_priority(self):
        """Update provider priority after background initialization"""
        try:
            # Re-set primary provider with updated providers
            if "openai_whisper" in self.providers:
                self.primary_provider = self.providers["openai_whisper"]
                self.fallback_providers = [p for name, p in self.providers.items() if name != "openai_whisper"]
                logger.info("🎤 Primary STT: OpenAI Whisper (cloud)")
            elif "local_whisper" in self.providers:
                self.primary_provider = self.providers["local_whisper"]
                self.fallback_providers = [p for name, p in self.providers.items() if name != "local_whisper"]
                logger.info("🎤 Primary STT: Local Whisper (offline)")
            
            self.is_initialized = True
            
        except Exception as e:
            logger.error(f"❌ Failed to update STT provider priority: {e}")
    
    async def transcribe(self, audio_data: bytes, provider: Optional[str] = None) -> Optional[str]:
        """Transcribe audio data to text with performance monitoring"""
        if not self.is_initialized:
            logger.warning("⚠️ STT Service not initialized")
            return None
        
        import time
        start_time = time.time()
        
        # Use specific provider if requested
        if provider and provider in self.providers:
            try:
                result = await self.providers[provider].transcribe(audio_data)
                if result:
                    latency_ms = int((time.time() - start_time) * 1000)
                    self._track_performance_metrics(provider, True, latency_ms, len(audio_data))
                    logger.debug(f"🎤 Transcription successful using {provider} ({latency_ms}ms)")
                    return result
            except Exception as e:
                latency_ms = int((time.time() - start_time) * 1000)
                self._track_performance_metrics(provider, False, latency_ms, len(audio_data))
                logger.error(f"❌ STT provider {provider} failed: {e}")
        
        # Try primary provider
        if self.primary_provider:
            primary_name = self._get_provider_name(self.primary_provider)
            try:
                result = await self.primary_provider.transcribe(audio_data)
                if result:
                    latency_ms = int((time.time() - start_time) * 1000)
                    self._track_performance_metrics(primary_name, True, latency_ms, len(audio_data))
                    logger.debug(f"🎤 Transcription successful using primary provider {primary_name} ({latency_ms}ms)")
                    return result
            except Exception as e:
                latency_ms = int((time.time() - start_time) * 1000)
                self._track_performance_metrics(primary_name, False, latency_ms, len(audio_data))
                logger.error(f"❌ Primary STT provider {primary_name} failed: {e}")
        
        # Try fallback providers
        for provider in self.fallback_providers:
            provider_name = self._get_provider_name(provider)
            try:
                result = await provider.transcribe(audio_data)
                if result:
                    latency_ms = int((time.time() - start_time) * 1000)
                    self._track_performance_metrics(provider_name, True, latency_ms, len(audio_data))
                    logger.debug(f"🎤 Transcription successful using fallback provider {provider_name} ({latency_ms}ms)")
                    return result
            except Exception as e:
                latency_ms = int((time.time() - start_time) * 1000)
                self._track_performance_metrics(provider_name, False, latency_ms, len(audio_data))
                logger.error(f"❌ Fallback STT provider {provider_name} failed: {e}")
        
        logger.warning("⚠️ All STT providers failed")
        return None
    
    async def get_available_providers(self) -> Dict[str, bool]:
        """Get list of available STT providers"""
        availability = {}
        for name, provider in self.providers.items():
            try:
                availability[name] = await provider.is_available()
            except Exception:
                availability[name] = False
        return availability
    
    async def get_service_status(self) -> Dict[str, Any]:
        """Get comprehensive STT service status with performance metrics"""
        if not self.is_initialized:
            return {
                "status": "not_initialized",
                "providers": {},
                "primary_provider": None,
                "performance_metrics": self.performance_metrics
            }
        
        provider_status = await self.get_available_providers()
        
        # Calculate performance insights
        performance_insights = self._generate_performance_insights()
        
        return {
            "status": "initialized" if self.is_initialized else "not_initialized",
            "providers": provider_status,
            "primary_provider": type(self.primary_provider).__name__ if self.primary_provider else None,
            "fallback_count": len(self.fallback_providers),
            "performance_metrics": self.performance_metrics,
            "performance_insights": performance_insights
        }
    
    def _get_provider_name(self, provider) -> str:
        """Get provider name from provider instance"""
        return type(provider).__name__.replace("STT", "").lower()
    
    def _track_performance_metrics(self, provider_name: str, success: bool, latency_ms: int, audio_size_bytes: int):
        """Track performance metrics for local vs cloud STT analysis"""
        self.performance_metrics["total_requests"] += 1
        
        # Initialize provider tracking if not exists
        if provider_name not in self.performance_metrics["provider_usage"]:
            self.performance_metrics["provider_usage"][provider_name] = {
                "total_requests": 0,
                "successful_requests": 0,
                "failed_requests": 0
            }
            self.performance_metrics["provider_performance"][provider_name] = {
                "avg_latency_ms": 0,
                "min_latency_ms": float('inf'),
                "max_latency_ms": 0,
                "total_audio_processed_mb": 0.0,
                "success_rate": 1.0
            }
        
        # Update usage stats
        usage = self.performance_metrics["provider_usage"][provider_name]
        performance = self.performance_metrics["provider_performance"][provider_name]
        
        usage["total_requests"] += 1
        if success:
            usage["successful_requests"] += 1
        else:
            usage["failed_requests"] += 1
        
        # Update performance stats
        if success:
            # Update latency metrics
            total_requests = usage["successful_requests"]
            performance["avg_latency_ms"] = (
                (performance["avg_latency_ms"] * (total_requests - 1) + latency_ms) / total_requests
            )
            performance["min_latency_ms"] = min(performance["min_latency_ms"], latency_ms)
            performance["max_latency_ms"] = max(performance["max_latency_ms"], latency_ms)
            
            # Update audio processing volume
            audio_mb = audio_size_bytes / (1024 * 1024)
            performance["total_audio_processed_mb"] += audio_mb
            
            # Update success rate
            performance["success_rate"] = usage["successful_requests"] / usage["total_requests"]
        
        # Track cost analysis for local vs cloud
        cost_analysis = self.performance_metrics["cost_analysis"]
        
        if "openai" in provider_name.lower() or "google" in provider_name.lower():
            # Cloud STT provider
            cost_analysis["cloud_requests"] += 1
            if success:
                # OpenAI Whisper API: $0.006 per minute
                # Estimate audio duration (rough): bytes / (16000 * 2) seconds for 16kHz 16-bit audio
                estimated_duration_minutes = audio_size_bytes / (16000 * 2 * 60)
                estimated_cost = estimated_duration_minutes * 0.006
                cost_analysis["estimated_api_cost"] += estimated_cost
        else:
            # Local STT provider (Whisper, browser)
            cost_analysis["local_requests"] += 1
            if success and "openai" in provider_name.lower():
                # Calculate savings from using local instead of API
                estimated_duration_minutes = audio_size_bytes / (16000 * 2 * 60)
                potential_api_cost = estimated_duration_minutes * 0.006
                cost_analysis["offline_savings"] += potential_api_cost
        
        logger.debug(f"📊 STT Metrics - Provider: {provider_name}, Success: {success}, Latency: {latency_ms}ms")
    
    def _generate_performance_insights(self) -> Dict[str, Any]:
        """Generate insights about STT performance for RV/offline use cases"""
        insights = {
            "local_vs_cloud_usage": {},
            "offline_readiness": {},
            "cost_efficiency": {},
            "performance_comparison": {}
        }
        
        total_requests = self.performance_metrics["total_requests"]
        if total_requests == 0:
            return insights
        
        # Analyze local vs cloud usage patterns
        local_providers = ["localwhisper", "browserwebspeech"]
        cloud_providers = ["openaiwhisper", "googlespeech"]
        
        local_requests = sum(
            self.performance_metrics["provider_usage"].get(provider, {}).get("total_requests", 0)
            for provider in local_providers
            if provider in self.performance_metrics["provider_usage"]
        )
        
        cloud_requests = sum(
            self.performance_metrics["provider_usage"].get(provider, {}).get("total_requests", 0)
            for provider in cloud_providers
            if provider in self.performance_metrics["provider_usage"]
        )
        
        insights["local_vs_cloud_usage"] = {
            "local_requests": local_requests,
            "cloud_requests": cloud_requests,
            "local_percentage": (local_requests / total_requests * 100) if total_requests > 0 else 0,
            "cloud_percentage": (cloud_requests / total_requests * 100) if total_requests > 0 else 0
        }
        
        # Offline readiness assessment
        local_success_rate = 0
        if local_requests > 0:
            local_successful = sum(
                self.performance_metrics["provider_usage"].get(provider, {}).get("successful_requests", 0)
                for provider in local_providers
                if provider in self.performance_metrics["provider_usage"]
            )
            local_success_rate = local_successful / local_requests * 100
        
        insights["offline_readiness"] = {
            "local_stt_available": any(
                provider in self.performance_metrics["provider_usage"] 
                for provider in local_providers
            ),
            "local_success_rate": local_success_rate,
            "offline_capable": local_success_rate > 70,  # Consider 70%+ success rate as "offline capable"
            "recommendation": self._get_offline_recommendation(local_success_rate)
        }
        
        # Cost efficiency analysis
        cost_analysis = self.performance_metrics["cost_analysis"]
        insights["cost_efficiency"] = {
            **cost_analysis,
            "cost_per_request": (
                cost_analysis["estimated_api_cost"] / cost_analysis["cloud_requests"]
                if cost_analysis["cloud_requests"] > 0 else 0
            ),
            "monthly_savings_estimate": cost_analysis["offline_savings"] * 30,  # Rough monthly estimate
            "roi_local_setup": "Positive" if cost_analysis["offline_savings"] > 10 else "Evaluate"
        }
        
        # Performance comparison
        for provider, performance in self.performance_metrics["provider_performance"].items():
            if performance["avg_latency_ms"] > 0:
                insights["performance_comparison"][provider] = {
                    "avg_latency_ms": round(performance["avg_latency_ms"], 2),
                    "success_rate": round(performance["success_rate"] * 100, 2),
                    "total_audio_mb": round(performance["total_audio_processed_mb"], 2),
                    "rating": self._rate_provider_performance(performance)
                }
        
        return insights
    
    def _get_offline_recommendation(self, local_success_rate: float) -> str:
        """Generate recommendation for offline STT setup"""
        if local_success_rate >= 90:
            return "Excellent offline capability - ideal for remote RV travel"
        elif local_success_rate >= 70:
            return "Good offline capability - suitable for most remote areas"
        elif local_success_rate >= 50:
            return "Limited offline capability - consider model upgrades"
        else:
            return "Poor offline capability - recommend internet connectivity for STT"
    
    def _rate_provider_performance(self, performance: Dict[str, Any]) -> str:
        """Rate provider performance based on success rate and latency"""
        success_rate = performance["success_rate"] * 100
        latency = performance["avg_latency_ms"]
        
        if success_rate >= 95 and latency < 1000:
            return "Excellent"
        elif success_rate >= 85 and latency < 2000:
            return "Good"
        elif success_rate >= 70 and latency < 3000:
            return "Fair"
        else:
            return "Poor"

# Global STT service instance
speech_to_text_service = SpeechToTextService()