"""
User Configuration Module
User-adjustable settings for TTS, preferences, and feature toggles.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import SecretStr
from typing import List, Optional


class UserSettings(BaseSettings):
    """User-configurable settings that can be adjusted per user or deployment"""
    
    # Debug Features Control (only enabled in development)
    ENABLE_DEBUG_FEATURES: bool = False
    SHOW_DEBUG_TOKENS: bool = False
    ENABLE_REASONING_DEBUG: bool = False

    # TTS Configuration - Enhanced Neural Voice Quality
    TTS_ENABLED: bool = True
    TTS_PRIMARY_ENGINE: str = "edge"  # Edge TTS working while debugging Coqui
    TTS_FALLBACK_ENABLED: bool = True
    TTS_CACHE_ENABLED: bool = True
    TTS_CACHE_TTL: int = 86400  # 24 hours
    TTS_VOICE_DEFAULT: str = "en-US-SaraNeural"  # Edge TTS mature female voice
    TTS_QUALITY_THRESHOLD: float = 0.8  # Higher threshold for neural voices
    TTS_MAX_TEXT_LENGTH: int = 5000  # Maximum text length for TTS
    TTS_RATE_LIMIT: int = 10  # Requests per minute per user

    # AI Agent Observability
    OBSERVABILITY_ENABLED: bool = True
    
    # Monitoring Preferences
    PROMETHEUS_ENABLED: bool = True
    METRICS_ENABLED: bool = True

    # Performance User Controls
    CACHE_TTL: int = 300
    
    # Rate Limiting User Controls
    RATE_LIMIT_PER_MINUTE: int = 100
    RATE_LIMIT_BURST: int = 200

    # Logging Preferences
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"

    # Graph RAG User Settings
    GRAPH_ENABLED: bool = False  # Enable when Neo4j is available
    GRAPH_CONTEXT_DEPTH: int = 2  # Maximum relationship hops for context
    GRAPH_SYNC_ON_STARTUP: bool = False  # Sync existing data to graph on startup

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="allow"
        # No env_prefix for backward compatibility with existing deployments
    )


# Create user settings instance
user_settings = UserSettings()