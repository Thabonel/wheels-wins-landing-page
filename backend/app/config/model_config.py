"""
AI Model Configuration System - Hot-Swappable Models
Zero-downtime model switching via environment variables

Usage:
  1. Set environment variables in Render/Netlify dashboard
  2. Models switch instantly (no code deploy needed)
  3. Automatic fallback if primary model fails
  4. Health monitoring with auto-failover

Environment Variables:
  PAM_PRIMARY_MODEL - Primary Claude model (default: claude-sonnet-4-5-20250929)
  PAM_FALLBACK_MODEL_1 - First fallback (default: claude-3-5-haiku-20241022)
  PAM_FALLBACK_MODEL_2 - Second fallback (default: gemini-1.5-flash-latest)
  PAM_FALLBACK_MODEL_3 - Third fallback (default: gpt-4o)

Example .env:
  PAM_PRIMARY_MODEL=claude-sonnet-4-5-20250929
  PAM_FALLBACK_MODEL_1=claude-3-5-haiku-20241022
  PAM_FALLBACK_MODEL_2=gemini-1.5-flash-latest

To switch models instantly (no downtime):
  1. Update env var in Render dashboard
  2. Model switches on next request (no restart needed)

Date: October 16, 2025
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

    # Google Gemini Models
    "gemini-1.5-flash-latest": ModelConfig(
        name="Gemini 1.5 Flash",
        provider="google",
        model_id="gemini-1.5-flash-latest",
        cost_per_1m_input=0.075,
        cost_per_1m_output=0.30,
        max_tokens=1000000,
        supports_tools=True,
        supports_streaming=True,
        description="Extremely cheap, good fallback"
    ),
    "gemini-1.5-pro-latest": ModelConfig(
        name="Gemini 1.5 Pro",
        provider="google",
        model_id="gemini-1.5-pro-latest",
        cost_per_1m_input=1.25,
        cost_per_1m_output=5.0,
        max_tokens=2000000,
        supports_tools=True,
        supports_streaming=True,
        description="Good quality, cheap, huge context"
    ),

    # OpenAI Models
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

        # Fallback chain (default: Haiku 3.5 -> Gemini -> GPT-4o)
        self.fallback_chain = [
            os.getenv("PAM_FALLBACK_MODEL_1", "claude-3-5-haiku-20241022"),
            os.getenv("PAM_FALLBACK_MODEL_2", "gemini-1.5-flash-latest"),
            os.getenv("PAM_FALLBACK_MODEL_3", "gpt-4o"),
        ]

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
