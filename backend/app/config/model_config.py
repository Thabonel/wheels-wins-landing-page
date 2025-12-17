"""
⚠️ DEPRECATION NOTICE (November 16, 2025) ⚠️

This file contains deprecated model configurations.
For CURRENT AI models, see: /backend/app/config/ai_providers.py

CURRENT MODELS (December 2025):
  - Primary: Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)
  - Fallback: Gemini 3.0 Flash (gemini-3.0-flash) - latest fast model (Dec 16, 2025)

DEPRECATED MODELS (Do Not Use):
  - Claude 3.5 variants (claude-3-5-*)
  - GPT-4 variants (gpt-4*, gpt-3.5-turbo)
  - Gemini variants (gemini-* - unstable API)

See /docs/VERIFIED_AI_MODELS.md for full documentation.

---

AI Model Configuration System - Hot-Swappable Models (LEGACY)
Zero-downtime model switching via environment variables

Environment Variables:
  PAM_PRIMARY_MODEL - Primary model (default: claude-sonnet-4-5-20250929)
  PAM_FALLBACK_MODEL_1 - First fallback (default: gpt-5.1-instant)
  PAM_FALLBACK_MODEL_2 - Second fallback (default: none - Gemini disabled)
  PAM_FALLBACK_MODEL_3 - Third fallback (default: none)

Example .env:
  PAM_PRIMARY_MODEL=claude-sonnet-4-5-20250929
  PAM_FALLBACK_MODEL_1=gpt-5.1-instant

Date: November 16, 2025 (Updated)
"""

import os
import logging
from typing import Dict, List, Optional, Literal
from dataclasses import dataclass
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


@dataclass
class ModelConfig:
    """Configuration for a single AI model"""
    name: str
    provider: Literal["anthropic", "google", "openai"]
    model_id: str
    cost_per_1m_input: float
    cost_per_1m_output: float
    max_tokens: int
    supports_tools: bool
    supports_streaming: bool
    description: str


# Known model registry (updated as new models release)
MODEL_REGISTRY: Dict[str, ModelConfig] = {
    # Anthropic Claude Models
    "claude-sonnet-4-5-20250929": ModelConfig(
        name="Claude Sonnet 4.5",
        provider="anthropic",
        model_id="claude-sonnet-4-5-20250929",
        cost_per_1m_input=3.0,
        cost_per_1m_output=15.0,
        max_tokens=200000,
        supports_tools=True,
        supports_streaming=True,
        description="Best quality, state-of-the-art reasoning"
    ),
    "claude-3-7-sonnet-20250219": ModelConfig(
        name="Claude Sonnet 3.7",
        provider="anthropic",
        model_id="claude-3-7-sonnet-20250219",
        cost_per_1m_input=3.0,
        cost_per_1m_output=15.0,
        max_tokens=200000,
        supports_tools=True,
        supports_streaming=True,
        description="Previous generation Sonnet, still excellent"
    ),
    "claude-3-5-haiku-20241022": ModelConfig(
        name="Claude Haiku 3.5",
        provider="anthropic",
        model_id="claude-3-5-haiku-20241022",
        cost_per_1m_input=1.0,
        cost_per_1m_output=5.0,
        max_tokens=200000,
        supports_tools=True,
        supports_streaming=True,
        description="Fast, cheap, good for simple queries"
    ),
    "claude-haiku-4-5-20250514": ModelConfig(
        name="Claude Haiku 4.5",
        provider="anthropic",
        model_id="claude-haiku-4-5-20250514",
        cost_per_1m_input=1.0,
        cost_per_1m_output=5.0,
        max_tokens=200000,
        supports_tools=True,
        supports_streaming=True,
        description="Latest Haiku - ideal for PAM (fast + cheap + capable)"
    ),
    "claude-opus-4-20250514": ModelConfig(
        name="Claude Opus 4",
        provider="anthropic",
        model_id="claude-opus-4-20250514",
        cost_per_1m_input=15.0,
        cost_per_1m_output=75.0,
        max_tokens=200000,
        supports_tools=True,
        supports_streaming=True,
        description="Most powerful, very expensive, use sparingly"
    ),

    # Google Gemini Models (December 2025)
    "gemini-3.0-flash": ModelConfig(
        name="Gemini 3.0 Flash",
        provider="google",
        model_id="gemini-3.0-flash",
        cost_per_1m_input=0.10,  # Estimated pricing
        cost_per_1m_output=0.40,
        max_tokens=1000000,
        supports_tools=True,
        supports_streaming=True,
        description="Latest fast model (Dec 16, 2025) - speed optimized"
    ),
    "gemini-3-pro": ModelConfig(
        name="Gemini 3 Pro",
        provider="google",
        model_id="gemini-3-pro",
        cost_per_1m_input=1.50,  # Estimated pricing
        cost_per_1m_output=6.0,
        max_tokens=2000000,
        supports_tools=True,
        supports_streaming=True,
        description="Flagship model (Nov 18, 2025) - complex reasoning"
    ),
    # Legacy Gemini models (being deprecated)
    "gemini-1.5-flash-latest": ModelConfig(
        name="Gemini 1.5 Flash (Legacy)",
        provider="google",
        model_id="gemini-1.5-flash-latest",
        cost_per_1m_input=0.075,
        cost_per_1m_output=0.30,
        max_tokens=1000000,
        supports_tools=True,
        supports_streaming=True,
        description="Legacy - use gemini-3.0-flash instead"
    ),
    "gemini-1.5-pro-latest": ModelConfig(
        name="Gemini 1.5 Pro (Legacy)",
        provider="google",
        model_id="gemini-1.5-pro-latest",
        cost_per_1m_input=1.25,
        cost_per_1m_output=5.0,
        max_tokens=2000000,
        supports_tools=True,
        supports_streaming=True,
        description="Legacy - use gemini-3-pro instead"
    ),

    # OpenAI Models
    "gpt-5.1-instant": ModelConfig(
        name="GPT-5.1 Instant",
        provider="openai",
        model_id="gpt-5.1-instant",
        cost_per_1m_input=1.25,  # Estimated based on GPT-5 pricing
        cost_per_1m_output=10.0,
        max_tokens=200000,  # Estimated, verify with OpenAI docs
        supports_tools=True,
        supports_streaming=True,
        description="Latest OpenAI model (Nov 13, 2025) - 2-5x faster, more conversational"
    ),
    "gpt-5.1-thinking": ModelConfig(
        name="GPT-5.1 Thinking",
        provider="openai",
        model_id="gpt-5.1-thinking",
        cost_per_1m_input=1.25,  # Estimated - may include reasoning token costs
        cost_per_1m_output=10.0,
        max_tokens=200000,
        supports_tools=True,
        supports_streaming=True,
        description="GPT-5.1 with adaptive reasoning (dynamic thinking time)"
    ),
    "gpt-4o": ModelConfig(
        name="GPT-4o",
        provider="openai",
        model_id="gpt-4o",
        cost_per_1m_input=2.5,
        cost_per_1m_output=10.0,
        max_tokens=128000,
        supports_tools=True,
        supports_streaming=True,
        description="OpenAI flagship, good fallback"
    ),
    "gpt-4o-mini": ModelConfig(
        name="GPT-4o Mini",
        provider="openai",
        model_id="gpt-4o-mini",
        cost_per_1m_input=0.15,
        cost_per_1m_output=0.60,
        max_tokens=128000,
        supports_tools=True,
        supports_streaming=True,
        description="Cheap OpenAI option"
    ),
}


class ModelConfigManager:
    """
    Manages AI model configuration with hot-swapping capability

    Features:
    - Zero-downtime model switching via environment variables
    - Automatic fallback chain
    - Model health monitoring
    - Cost tracking
    """

    def __init__(self):
        self._load_config()
        self._health_cache: Dict[str, tuple[bool, datetime]] = {}
        self._cache_duration = timedelta(minutes=5)

    def _load_config(self):
        """Load model configuration from environment variables"""
        # Primary model (default: Claude Sonnet 4.5)
        self.primary_model = os.getenv(
            "PAM_PRIMARY_MODEL",
            "claude-sonnet-4-5-20250929"
        )

        # Fallback chain (default: Gemini 3.0 Flash - latest fast model)
        # ⚠️ DEPRECATED: Use /backend/app/config/ai_providers.py instead
        # Updated to Gemini 3.0 Flash (Dec 16, 2025 release)
        fallback_1 = os.getenv("PAM_FALLBACK_MODEL_1", "gemini-3.0-flash")
        self.fallback_chain = [fallback_1] if fallback_1 else []

        # Remove empty strings and duplicates
        self.fallback_chain = [
            model for model in self.fallback_chain
            if model and model != self.primary_model
        ]

        logger.info(f"Model Config Loaded: Primary={self.primary_model}, Fallbacks={self.fallback_chain}")

    def reload_config(self):
        """Reload configuration from environment (hot-swap)"""
        logger.info("Reloading model configuration from environment...")
        self._load_config()
        self._health_cache.clear()
        logger.info("Model configuration reloaded successfully")

    def get_primary_model(self) -> ModelConfig:
        """Get primary model configuration"""
        if self.primary_model not in MODEL_REGISTRY:
            logger.error(f"Unknown primary model: {self.primary_model}, falling back to default")
            self.primary_model = "claude-sonnet-4-5-20250929"

        return MODEL_REGISTRY[self.primary_model]

    def get_fallback_models(self) -> List[ModelConfig]:
        """Get fallback model configurations"""
        fallbacks = []
        for model_id in self.fallback_chain:
            if model_id in MODEL_REGISTRY:
                fallbacks.append(MODEL_REGISTRY[model_id])
            else:
                logger.warning(f"Unknown fallback model: {model_id}, skipping")
        return fallbacks

    def get_all_models(self) -> List[ModelConfig]:
        """Get all configured models (primary + fallbacks)"""
        return [self.get_primary_model()] + self.get_fallback_models()

    def get_next_model(self, failed_model: str) -> Optional[ModelConfig]:
        """Get next model in fallback chain after a failure"""
        all_models = [self.primary_model] + self.fallback_chain

        try:
            current_index = all_models.index(failed_model)
            next_index = current_index + 1

            if next_index < len(all_models):
                next_model_id = all_models[next_index]
                if next_model_id in MODEL_REGISTRY:
                    logger.info(f"Failing over from {failed_model} to {next_model_id}")
                    return MODEL_REGISTRY[next_model_id]
        except ValueError:
            logger.warning(f"Failed model {failed_model} not in config, using first fallback")
            if self.fallback_chain and self.fallback_chain[0] in MODEL_REGISTRY:
                return MODEL_REGISTRY[self.fallback_chain[0]]

        return None

    def mark_model_unhealthy(self, model_id: str, duration_minutes: int = 5):
        """Mark a model as unhealthy for a duration"""
        unhealthy_until = datetime.now() + timedelta(minutes=duration_minutes)
        self._health_cache[model_id] = (False, unhealthy_until)
        logger.warning(f"Model {model_id} marked unhealthy for {duration_minutes} minutes")

    def is_model_healthy(self, model_id: str) -> bool:
        """Check if a model is healthy"""
        if model_id not in self._health_cache:
            return True

        is_healthy, timestamp = self._health_cache[model_id]

        # Check if health status expired
        if datetime.now() > timestamp:
            del self._health_cache[model_id]
            return True

        return is_healthy

    def get_healthy_model(self) -> ModelConfig:
        """Get the first healthy model from the chain"""
        # Try primary first
        if self.is_model_healthy(self.primary_model):
            return self.get_primary_model()

        # Try fallbacks
        for model_id in self.fallback_chain:
            if self.is_model_healthy(model_id) and model_id in MODEL_REGISTRY:
                logger.warning(f"Primary unhealthy, using fallback: {model_id}")
                return MODEL_REGISTRY[model_id]

        # If all unhealthy, return primary anyway (maybe recovered)
        logger.error("All models marked unhealthy, trying primary again")
        return self.get_primary_model()

    def get_config_summary(self) -> Dict:
        """Get configuration summary for admin dashboard"""
        return {
            "primary_model": {
                "id": self.primary_model,
                "config": self.get_primary_model().__dict__,
                "healthy": self.is_model_healthy(self.primary_model)
            },
            "fallback_models": [
                {
                    "id": model_id,
                    "config": MODEL_REGISTRY[model_id].__dict__ if model_id in MODEL_REGISTRY else None,
                    "healthy": self.is_model_healthy(model_id)
                }
                for model_id in self.fallback_chain
            ],
            "total_models": len([self.primary_model] + self.fallback_chain),
            "healthy_models": sum(
                1 for model_id in [self.primary_model] + self.fallback_chain
                if self.is_model_healthy(model_id)
            )
        }

    def get_available_models(self) -> List[str]:
        """Get list of all available model IDs"""
        return list(MODEL_REGISTRY.keys())


# Global singleton instance
_model_config: Optional[ModelConfigManager] = None


def get_model_config() -> ModelConfigManager:
    """Get or create global model configuration manager"""
    global _model_config
    if _model_config is None:
        _model_config = ModelConfigManager()
    return _model_config


def reload_model_config():
    """Force reload of model configuration (hot-swap)"""
    global _model_config
    if _model_config is not None:
        _model_config.reload_config()
    else:
        _model_config = ModelConfigManager()


# ============================================================================
# VOICE MODELS EXTENSION (Added: November 2025)
# Safe extension - doesn't change existing behavior
# Feature flag: ENABLE_VOICE_MODEL_CONFIG (default: False)
# ============================================================================

@dataclass
class VoiceModelConfig:
    """
    Configuration for OpenAI Realtime API voice models

    ARCHITECTURE:
    - OpenAI Realtime API is speech-to-speech (NOT separate STT/TTS)
    - Whisper-1 is embedded in Realtime API (not configurable)
    - Browser Web Speech API only used for wake word detection

    What CAN be configured:
    - Model ID (changes monthly, e.g., gpt-4o-realtime-preview-2024-12-17)
    - Voice preference (alloy, echo, fable, onyx, nova, shimmer, marin, cedar)
    """
    name: str
    provider: Literal["openai"]
    model_id: str
    voices: List[str]
    cost_per_minute: float
    description: str
    version_note: Optional[str] = None


# Voice model registry - OpenAI Realtime API configurations
VOICE_MODEL_REGISTRY: Dict[str, VoiceModelConfig] = {
    "gpt-4o-realtime-2024-12": VoiceModelConfig(
        name="GPT-4o Realtime (Dec 2024)",
        provider="openai",
        model_id="gpt-4o-realtime-preview-2024-12-17",
        voices=["alloy", "echo", "fable", "onyx", "nova", "shimmer", "marin", "cedar"],
        cost_per_minute=0.24,
        description="OpenAI Realtime API - speech-to-speech with function calling",
        version_note="⚠️ Current production model (Dec 2024)"
    ),
    "gpt-4o-realtime-latest": VoiceModelConfig(
        name="GPT-4o Realtime (Latest)",
        provider="openai",
        model_id=os.getenv("OPENAI_REALTIME_MODEL", "gpt-4o-realtime-preview-2024-12-17"),
        voices=["alloy", "echo", "fable", "onyx", "nova", "shimmer", "marin", "cedar"],
        cost_per_minute=0.24,
        description="OpenAI Realtime API - uses OPENAI_REALTIME_MODEL env var",
        version_note="⚠️ Model ID changes monthly! Set via OPENAI_REALTIME_MODEL env var"
    ),
}


class VoiceModelConfigManager:
    """
    Manages OpenAI Realtime API configuration with hot-swapping

    ACTUAL ARCHITECTURE:
    - OpenAI Realtime API handles EVERYTHING (speech-to-speech)
    - Whisper-1 is embedded (not configurable separately)
    - Only model ID and voice preference can be changed

    Features:
    - Zero-downtime model version switching
    - Voice preference hot-swap
    - Environment variable control

    BACKWARD COMPATIBLE: Only used if ENABLE_VOICE_MODEL_CONFIG=true
    """

    def __init__(self):
        self.enabled = os.getenv("ENABLE_VOICE_MODEL_CONFIG", "false").lower() == "true"

        if not self.enabled:
            logger.info("Voice model config disabled (ENABLE_VOICE_MODEL_CONFIG=false)")
            # Set defaults even when disabled
            self.model_id = "gpt-4o-realtime-preview-2024-12-17"
            self.voice = "marin"
            return

        self._load_config()

    def _load_config(self):
        """Load OpenAI Realtime API configuration from environment"""
        # Model selection (use latest or specific version)
        model_key = os.getenv("OPENAI_REALTIME_CONFIG", "gpt-4o-realtime-latest")

        if model_key in VOICE_MODEL_REGISTRY:
            config = VOICE_MODEL_REGISTRY[model_key]
            self.model_id = config.model_id
        else:
            # Fallback to default
            self.model_id = os.getenv("OPENAI_REALTIME_MODEL", "gpt-4o-realtime-preview-2024-12-17")

        # Voice preference (alloy, echo, fable, onyx, nova, shimmer, marin, cedar)
        self.voice = os.getenv("OPENAI_VOICE", "marin")

        logger.info(f"Voice Config Loaded: Model={self.model_id}, Voice={self.voice}")

    def get_realtime_model(self) -> VoiceModelConfig:
        """Get OpenAI Realtime API model configuration"""
        if not self.enabled:
            # Return default config when disabled
            return VOICE_MODEL_REGISTRY["gpt-4o-realtime-2024-12"]

        # Find config matching current model_id
        for config in VOICE_MODEL_REGISTRY.values():
            if config.model_id == self.model_id:
                return config

        # Fallback to latest
        return VOICE_MODEL_REGISTRY["gpt-4o-realtime-latest"]

    def get_model_id(self) -> str:
        """Get current OpenAI Realtime model ID"""
        return self.model_id

    def get_voice(self) -> str:
        """Get OpenAI Realtime voice preference"""
        return self.voice

    def get_available_voices(self) -> List[str]:
        """Get list of available voice options"""
        config = self.get_realtime_model()
        return config.voices

    def reload_config(self):
        """Reload voice configuration (hot-swap without restart)"""
        if not self.enabled:
            return

        logger.info("Reloading OpenAI Realtime API configuration...")
        self._load_config()


# Global singleton for voice models
_voice_model_config: Optional[VoiceModelConfigManager] = None


def get_voice_model_config() -> VoiceModelConfigManager:
    """Get or create voice model configuration manager"""
    global _voice_model_config
    if _voice_model_config is None:
        _voice_model_config = VoiceModelConfigManager()
    return _voice_model_config


def is_voice_config_enabled() -> bool:
    """Check if voice model config is enabled"""
    return os.getenv("ENABLE_VOICE_MODEL_CONFIG", "false").lower() == "true"
