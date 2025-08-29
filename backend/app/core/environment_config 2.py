"""
Environment Configuration Management System
Provides validation, defaults, and type safety for environment variables
"""

import os
import json
from typing import Dict, Any, Optional, List, Union
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
import secrets
from urllib.parse import urlparse

from pydantic import Field, field_validator, SecretStr
from pydantic_settings import BaseSettings
from pydantic.networks import AnyHttpUrl, PostgresDsn, RedisDsn

from app.core.logging import get_logger

logger = get_logger(__name__)


class Environment(str, Enum):
    """Application environments"""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    TESTING = "testing"


class LogLevel(str, Enum):
    """Log level options"""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class TTSEngine(str, Enum):
    """TTS engine options"""
    EDGE = "edge"
    COQUI = "coqui"
    SYSTEM = "system"
    GOOGLE = "google"


class EnvironmentConfig(BaseSettings):
    """
    Comprehensive environment configuration with validation
    
    Features:
    - Type safety with Pydantic
    - Automatic validation
    - Default values
    - Environment-specific overrides
    - Secret handling
    """
    
    # =====================================================
    # CORE CONFIGURATION
    # =====================================================
    
    # Environment
    NODE_ENV: Environment = Field(default=Environment.DEVELOPMENT)
    APP_NAME: str = Field(default="Wheels & Wins")
    APP_URL: AnyHttpUrl = Field(default="http://localhost:8080")
    APP_PORT: int = Field(default=8000, ge=1, le=65535)
    APP_HOST: str = Field(default="0.0.0.0")
    
    # OpenAI Configuration
    OPENAI_API_KEY: Optional[SecretStr] = Field(default=None)
    OPENAI_MODEL: str = Field(default="gpt-4-turbo-preview")
    OPENAI_TEMPERATURE: float = Field(default=0.7, ge=0, le=2)
    OPENAI_MAX_TOKENS: int = Field(default=2000, ge=1, le=8000)
    
    # Anthropic Configuration
    ANTHROPIC_API_KEY: Optional[SecretStr] = Field(default=None)
    ANTHROPIC_MODEL: str = Field(default="claude-3-opus-20240229")
    
    # Supabase Configuration
    SUPABASE_URL: Optional[AnyHttpUrl] = Field(default=None)
    SUPABASE_SERVICE_ROLE_KEY: Optional[SecretStr] = Field(default=None)
    VITE_SUPABASE_URL: Optional[AnyHttpUrl] = Field(default=None)
    VITE_SUPABASE_ANON_KEY: Optional[SecretStr] = Field(default=None)
    
    # Database Configuration
    DATABASE_URL: Optional[PostgresDsn] = Field(default=None)
    READ_REPLICA_URL: Optional[PostgresDsn] = Field(default=None)
    
    # =====================================================
    # FEATURE FLAGS
    # =====================================================
    
    # PAM Features
    PAM_ENABLED: bool = Field(default=True)
    PAM_CACHE_ENABLED: bool = Field(default=True)
    PAM_LEARNING_ENABLED: bool = Field(default=False)
    PAM_PROACTIVE_ENABLED: bool = Field(default=False)
    PAM_VOICE_ENABLED: bool = Field(default=True)
    PAM_FUNCTION_CALLING_ENABLED: bool = Field(default=True)
    PAM_CONTEXT_WINDOW: int = Field(default=8000, ge=1000, le=32000)
    
    # Security Features
    SECURITY_ENHANCED_MODE: bool = Field(default=True)
    SECURITY_RATE_LIMITING: bool = Field(default=True)
    SECURITY_MESSAGE_VALIDATION: bool = Field(default=True)
    SECURITY_IP_REPUTATION: bool = Field(default=True)
    SECURITY_AUDIT_LOGGING: bool = Field(default=True)
    
    # Performance Features
    PERFORMANCE_CACHING: bool = Field(default=True)
    PERFORMANCE_CONNECTION_POOLING: bool = Field(default=True)
    PERFORMANCE_QUERY_OPTIMIZATION: bool = Field(default=True)
    PERFORMANCE_COMPRESSION: bool = Field(default=True)
    
    # =====================================================
    # SERVICE CONFIGURATION
    # =====================================================
    
    # TTS Configuration
    TTS_ENABLED: bool = Field(default=True)
    TTS_PRIMARY_ENGINE: TTSEngine = Field(default=TTSEngine.EDGE)
    TTS_FALLBACK_ENABLED: bool = Field(default=True)
    TTS_VOICE_DEFAULT: str = Field(default="en-US-AriaNeural")
    TTS_RATE: float = Field(default=1.0, ge=0.5, le=2.0)
    TTS_PITCH: float = Field(default=1.0, ge=0.5, le=2.0)
    TTS_VOLUME: float = Field(default=0.9, ge=0, le=1.0)
    TTS_CACHE_ENABLED: bool = Field(default=True)
    TTS_CACHE_TTL: int = Field(default=3600, ge=60)
    
    # WebSocket Configuration
    WEBSOCKET_ENABLED: bool = Field(default=True)
    WEBSOCKET_MAX_CONNECTIONS: int = Field(default=1000, ge=1)
    WEBSOCKET_CONNECTION_TIMEOUT: int = Field(default=300, ge=30)
    WEBSOCKET_PING_INTERVAL: int = Field(default=30, ge=10)
    WEBSOCKET_MAX_MESSAGE_SIZE: int = Field(default=65536, ge=1024)
    WEBSOCKET_RATE_LIMIT: int = Field(default=100, ge=1)
    
    # Voice Configuration
    VOICE_ENABLED: bool = Field(default=True)
    VOICE_RATE_LIMIT: int = Field(default=10, ge=1)
    VOICE_MAX_DURATION: int = Field(default=60, ge=1, le=300)
    VOICE_SAMPLE_RATE: int = Field(default=16000)
    VOICE_ENCODING: str = Field(default="opus")
    VOICE_LANGUAGE: str = Field(default="en-US")
    
    # =====================================================
    # RATE LIMITING
    # =====================================================
    
    RATE_LIMIT_ENABLED: bool = Field(default=True)
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = Field(default=60, ge=1)
    RATE_LIMIT_REQUESTS_PER_HOUR: int = Field(default=1000, ge=1)
    RATE_LIMIT_REQUESTS_PER_DAY: int = Field(default=10000, ge=1)
    
    # Service-specific limits
    RATE_LIMIT_WEBSOCKET_PER_MINUTE: int = Field(default=30, ge=1)
    RATE_LIMIT_VOICE_PER_MINUTE: int = Field(default=10, ge=1)
    RATE_LIMIT_API_PER_MINUTE: int = Field(default=100, ge=1)
    RATE_LIMIT_AUTH_PER_MINUTE: int = Field(default=5, ge=1)
    
    # =====================================================
    # EXTERNAL APIS
    # =====================================================
    
    # Google Services
    GOOGLE_PLACES_API_KEY: Optional[SecretStr] = Field(default=None)
    GOOGLE_MAPS_API_KEY: Optional[SecretStr] = Field(default=None)
    YOUTUBE_API_KEY: Optional[SecretStr] = Field(default=None)
    
    # Mapbox
    VITE_MAPBOX_PUBLIC_TOKEN: Optional[str] = Field(default=None)
    MAPBOX_SECRET_TOKEN: Optional[SecretStr] = Field(default=None)
    MAPBOX_STYLE_URL: str = Field(default="mapbox://styles/mapbox/streets-v11")
    
    # Weather
    OPENWEATHER_API_KEY: Optional[SecretStr] = Field(default=None)
    OPENWEATHER_UNITS: str = Field(default="imperial")
    
    # =====================================================
    # CACHING & STORAGE
    # =====================================================
    
    # Redis
    REDIS_ENABLED: bool = Field(default=True)
    REDIS_URL: Optional[RedisDsn] = Field(default="redis://localhost:6379")
    REDIS_PASSWORD: Optional[SecretStr] = Field(default=None)
    REDIS_DB: int = Field(default=0, ge=0, le=15)
    REDIS_CACHE_TTL: int = Field(default=300, ge=1)
    REDIS_MAX_CONNECTIONS: int = Field(default=50, ge=1)
    
    # File Storage
    STORAGE_ENABLED: bool = Field(default=True)
    STORAGE_PROVIDER: str = Field(default="supabase")
    STORAGE_BUCKET: str = Field(default="wheels-wins-uploads")
    
    # =====================================================
    # MONITORING & LOGGING
    # =====================================================
    
    # Sentry
    SENTRY_ENABLED: bool = Field(default=False)
    SENTRY_DSN: Optional[AnyHttpUrl] = Field(default=None)
    SENTRY_ENVIRONMENT: str = Field(default="development")
    SENTRY_TRACES_SAMPLE_RATE: float = Field(default=0.1, ge=0, le=1.0)
    
    # Logging
    LOG_LEVEL: LogLevel = Field(default=LogLevel.INFO)
    LOG_FORMAT: str = Field(default="json")
    LOG_FILE_ENABLED: bool = Field(default=True)
    LOG_FILE_PATH: str = Field(default="/var/log/wheels-wins/app.log")
    LOG_FILE_MAX_SIZE: int = Field(default=10485760)  # 10MB
    LOG_FILE_BACKUP_COUNT: int = Field(default=10)
    
    # =====================================================
    # SECURITY
    # =====================================================
    
    # JWT
    JWT_SECRET_KEY: SecretStr = Field(default_factory=lambda: SecretStr(secrets.token_urlsafe(32)))
    JWT_ALGORITHM: str = Field(default="HS256")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, ge=1)
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7, ge=1)
    
    # CORS
    CORS_ENABLED: bool = Field(default=True)
    CORS_ALLOWED_ORIGINS: List[str] = Field(default=["http://localhost:8080"])
    CORS_ALLOWED_METHODS: List[str] = Field(default=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
    CORS_ALLOWED_HEADERS: List[str] = Field(default=["Content-Type", "Authorization"])
    CORS_ALLOW_CREDENTIALS: bool = Field(default=True)
    
    # Session
    SESSION_SECRET_KEY: SecretStr = Field(default_factory=lambda: SecretStr(secrets.token_urlsafe(32)))
    SESSION_COOKIE_SECURE: bool = Field(default=True)
    SESSION_COOKIE_HTTPONLY: bool = Field(default=True)
    SESSION_COOKIE_SAMESITE: str = Field(default="strict")
    SESSION_LIFETIME_HOURS: int = Field(default=24, ge=1)
    
    # =====================================================
    # DATABASE OPTIMIZATION
    # =====================================================
    
    DB_POOL_MIN_SIZE: int = Field(default=5, ge=1)
    DB_POOL_MAX_SIZE: int = Field(default=20, ge=1)
    DB_POOL_TIMEOUT: float = Field(default=10.0, ge=1)
    DB_POOL_COMMAND_TIMEOUT: float = Field(default=60.0, ge=1)
    DB_POOL_MAX_IDLE_TIME: int = Field(default=300, ge=30)
    
    # Cache Settings
    CACHE_DEFAULT_TTL: int = Field(default=300, ge=1)
    CACHE_MAX_MEMORY_ITEMS: int = Field(default=1000, ge=100)
    CACHE_COMPRESSION_ENABLED: bool = Field(default=True)
    CACHE_COMPRESSION_THRESHOLD: int = Field(default=1024, ge=256)
    
    # Query Optimization
    QUERY_SLOW_THRESHOLD_MS: int = Field(default=100, ge=10)
    QUERY_CACHE_ENABLED: bool = Field(default=True)
    QUERY_PLAN_CACHE_SIZE: int = Field(default=100, ge=10)
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        
    # =====================================================
    # VALIDATORS
    # =====================================================
    
    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def validate_database_url(cls, v):
        """Validate and construct database URL"""
        if v and not v.startswith(("postgresql://", "postgres://")):
            raise ValueError("Database URL must be a valid PostgreSQL connection string")
        return v
    
    @field_validator("REDIS_URL", mode="before")
    @classmethod
    def validate_redis_url(cls, v):
        """Validate Redis URL"""
        if v and not v.startswith("redis://"):
            raise ValueError("Redis URL must start with redis://")
        return v
    
    @field_validator("CORS_ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS origins from string or list"""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    @field_validator("NODE_ENV")
    @classmethod
    def validate_environment(cls, v):
        """Validate environment setting"""
        if v == Environment.PRODUCTION:
            logger.warning("⚠️ Running in PRODUCTION mode")
        return v
    
    @field_validator("JWT_SECRET_KEY", "SESSION_SECRET_KEY")
    @classmethod
    def validate_secret_keys(cls, v):
        """Ensure secret keys are strong enough"""
        if len(v.get_secret_value()) < 32:
            raise ValueError("Secret keys must be at least 32 characters long")
        return v
    
    # =====================================================
    # HELPER METHODS
    # =====================================================
    
    def is_production(self) -> bool:
        """Check if running in production"""
        return self.NODE_ENV == Environment.PRODUCTION
    
    def is_development(self) -> bool:
        """Check if running in development"""
        return self.NODE_ENV == Environment.DEVELOPMENT
    
    def is_testing(self) -> bool:
        """Check if running in testing"""
        return self.NODE_ENV == Environment.TESTING
    
    def get_required_services(self) -> List[str]:
        """Get list of required external services"""
        required = []
        
        if self.PAM_ENABLED and not self.OPENAI_API_KEY:
            required.append("OpenAI API")
        
        if not self.SUPABASE_URL or not self.SUPABASE_SERVICE_ROLE_KEY:
            required.append("Supabase")
        
        if not self.DATABASE_URL:
            required.append("PostgreSQL Database")
        
        if self.REDIS_ENABLED and not self.REDIS_URL:
            required.append("Redis")
        
        return required
    
    def validate_configuration(self) -> Dict[str, Any]:
        """
        Validate entire configuration and return status
        """
        issues = []
        warnings = []
        
        # Check required services
        required_services = self.get_required_services()
        if required_services:
            issues.append(f"Missing required services: {', '.join(required_services)}")
        
        # Check production-specific requirements
        if self.is_production():
            if not self.SENTRY_ENABLED:
                warnings.append("Sentry monitoring is disabled in production")
            
            if not self.SESSION_COOKIE_SECURE:
                issues.append("Session cookies must be secure in production")
            
            if "localhost" in str(self.APP_URL):
                issues.append("Production URL should not contain localhost")
            
            if self.LOG_LEVEL == LogLevel.DEBUG:
                warnings.append("Debug logging is enabled in production")
        
        # Check security settings
        if not self.SECURITY_ENHANCED_MODE:
            warnings.append("Enhanced security mode is disabled")
        
        if not self.SECURITY_RATE_LIMITING:
            warnings.append("Rate limiting is disabled")
        
        # Check performance settings
        if self.DB_POOL_MAX_SIZE < 10 and self.is_production():
            warnings.append("Database pool size might be too small for production")
        
        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "warnings": warnings,
            "environment": self.NODE_ENV,
            "required_services": required_services
        }
    
    def export_frontend_env(self) -> Dict[str, str]:
        """
        Export environment variables for frontend (VITE_ prefixed)
        """
        frontend_env = {}
        for key, value in self.dict().items():
            if key.startswith("VITE_"):
                if isinstance(value, SecretStr):
                    frontend_env[key] = value.get_secret_value()
                else:
                    frontend_env[key] = str(value)
        return frontend_env
    
    def export_safe_config(self) -> Dict[str, Any]:
        """
        Export configuration without sensitive data
        """
        config = self.dict()
        sensitive_keys = [
            "OPENAI_API_KEY", "ANTHROPIC_API_KEY",
            "SUPABASE_SERVICE_ROLE_KEY", "VITE_SUPABASE_ANON_KEY",
            "DATABASE_URL", "READ_REPLICA_URL",
            "JWT_SECRET_KEY", "SESSION_SECRET_KEY",
            "GOOGLE_PLACES_API_KEY", "YOUTUBE_API_KEY",
            "MAPBOX_SECRET_TOKEN", "REDIS_PASSWORD",
            "SENTRY_DSN"
        ]
        
        for key in sensitive_keys:
            if key in config:
                config[key] = "***REDACTED***"
        
        return config


# Global configuration instance
_config_instance = None

def get_config() -> EnvironmentConfig:
    """Get or create global configuration instance"""
    global _config_instance
    
    if _config_instance is None:
        _config_instance = EnvironmentConfig()
        
        # Validate configuration
        validation = _config_instance.validate_configuration()
        
        if not validation["valid"]:
            logger.error(f"Configuration validation failed: {validation['issues']}")
            # In production, we might want to fail fast
            if _config_instance.is_production():
                raise ValueError(f"Invalid configuration: {validation['issues']}")
        
        if validation["warnings"]:
            for warning in validation["warnings"]:
                logger.warning(f"Configuration warning: {warning}")
        
        logger.info(f"Environment configuration loaded for {_config_instance.NODE_ENV}")
    
    return _config_instance


# Convenience function for getting settings
def get_settings() -> EnvironmentConfig:
    """Alias for get_config() for backward compatibility"""
    return get_config()


# Export main components
__all__ = [
    'EnvironmentConfig',
    'Environment',
    'LogLevel',
    'TTSEngine',
    'get_config',
    'get_settings'
]