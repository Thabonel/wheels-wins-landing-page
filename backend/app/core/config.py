"""
Unified Configuration Management
Central configuration module that imports and combines all configuration modules.
"""

from .user_config import UserSettings, user_settings
from .infra_config import InfrastructureSettings, infra_settings, get_infra_settings
from .feature_flags import FeatureFlags, feature_flags, get_feature_flags, is_feature_enabled


class UnifiedSettings:
    """
    Unified settings class that provides access to all configuration modules.
    
    This class maintains backward compatibility while organizing settings
    into logical groups for better maintainability.
    """
    
    def __init__(self):
        self.user = user_settings
        self.infra = infra_settings
        self.features = feature_flags
    
    # Backward compatibility properties - delegate to appropriate config modules
    
    # Environment settings (from infra)
    @property
    def ENVIRONMENT(self) -> str:
        return self.infra.ENVIRONMENT
    
    @property
    def DEBUG(self) -> bool:
        return self.infra.DEBUG
    
    @property
    def VERSION(self) -> str:
        return self.infra.VERSION
    
    # Security settings (from infra)
    @property
    def SECRET_KEY(self):
        return self.infra.SECRET_KEY
    
    @property
    def ALGORITHM(self) -> str:
        return self.infra.ALGORITHM
    
    @property
    def ACCESS_TOKEN_EXPIRE_MINUTES(self) -> int:
        return self.infra.ACCESS_TOKEN_EXPIRE_MINUTES
    
    # Database settings (from infra)
    @property
    def DATABASE_URL(self):
        return self.infra.DATABASE_URL
    
    @property
    def SUPABASE_URL(self) -> str:
        return self.infra.SUPABASE_URL
    
    @property
    def SUPABASE_KEY(self) -> str:
        return self.infra.SUPABASE_KEY
    
    @property
    def SITE_URL(self) -> str:
        return self.infra.SITE_URL

    @property
    def OPENAI_API_KEY(self) -> str | None:
        return self.infra.OPENAI_API_KEY
    
    # TTS settings (from user)
    @property
    def TTS_ENABLED(self) -> bool:
        return self.user.TTS_ENABLED
    
    @property
    def TTS_PRIMARY_ENGINE(self) -> str:
        return self.user.TTS_PRIMARY_ENGINE
    
    @property
    def TTS_VOICE_DEFAULT(self) -> str:
        return self.user.TTS_VOICE_DEFAULT
    
    # CORS settings (from infra)
    @property
    def CORS_ORIGINS(self):
        return self.infra.CORS_ORIGINS
    
    # Performance settings (from user and infra)
    @property
    def CACHE_TTL(self) -> int:
        return self.user.CACHE_TTL
    
    @property
    def DATABASE_POOL_SIZE(self) -> int:
        return self.infra.DATABASE_POOL_SIZE
    
    # Feature-specific methods
    def is_feature_enabled(self, feature_name: str, user_id: str = None) -> bool:
        """Check if a feature is enabled"""
        return self.features.is_feature_enabled(feature_name, user_id)
    
    def get_enabled_features(self):
        """Get all enabled features"""
        return self.features.get_enabled_features()


# Global unified settings instance for backward compatibility
settings = UnifiedSettings()


def get_settings() -> UnifiedSettings:
    """Retrieve the global unified settings."""
    return settings


# Export individual settings modules for direct access
__all__ = [
    "settings",
    "get_settings",
    "user_settings", 
    "infra_settings",
    "feature_flags",
    "get_infra_settings",
    "get_feature_flags", 
    "is_feature_enabled",
    "UserSettings",
    "InfrastructureSettings", 
    "FeatureFlags",
    "UnifiedSettings"
]
