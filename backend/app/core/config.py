"""
Production-Ready Configuration Management
Central configuration with validation, startup checks, and environment management
Fixed for Pydantic v2 compatibility
"""

import os
import sys
import json
from typing import Optional, Dict, Any, List, Union
from pathlib import Path
from enum import Enum
import secrets

from pydantic import Field, field_validator, SecretStr, ValidationError
from pydantic_settings import BaseSettings
from pydantic.networks import AnyHttpUrl, PostgresDsn, RedisDsn

# AI models configuration - Claude only
try:
    from .ai_models_config import DEFAULT_MODEL, FALLBACK_MODELS
except ImportError:
    # Fallback configuration - Claude 3.5 Sonnet only
    DEFAULT_MODEL = "claude-3-5-sonnet-20241022"
    FALLBACK_MODELS = ["claude-3-5-sonnet-20241022"]


class Environment(str, Enum):
    """Application environments"""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    TESTING = "testing"


class Settings(BaseSettings):
    """
    Production-ready settings with validation and startup checks
    
    Features:
    - Required fields validation at startup
    - Type safety with Pydantic
    - Environment-specific configuration
    - Secret handling
    - Default values for optional settings
    """
    
    # =====================================================
    # ENVIRONMENT - v1.1.0 with Health Consultation
    # =====================================================
    
    NODE_ENV: Environment = Field(
        default=Environment.DEVELOPMENT,
        description="Application environment"
    )
    
    DEBUG: bool = Field(
        default=False,
        description="Debug mode"
    )
    
    VERSION: str = Field(
        default="1.0.0",
        description="Application version"
    )
    
    # =====================================================
    # CORE CONFIGURATION (REQUIRED)
    # =====================================================
    
    # Anthropic Configuration (Primary and Only AI Provider)
    ANTHROPIC_API_KEY: SecretStr = Field(
        default="",
        description="Anthropic API key (required for PAM AI functionality with Claude)"
    )
    
    @field_validator("ANTHROPIC_API_KEY", mode="before")
    @classmethod
    def validate_anthropic_api_key(cls, v):
        """Validate Anthropic API key format and provide helpful error messages"""
        if not v:
            raise ValueError(
                "Anthropic API key is required for PAM functionality. "
                "Please set ANTHROPIC_API_KEY environment variable. "
                "Get your API key from https://console.anthropic.com/settings/keys"
            )
        
        # Convert to string for validation if it's a SecretStr
        key_str = v.get_secret_value() if hasattr(v, 'get_secret_value') else str(v)
        
        if not key_str.startswith('sk-ant-'):
            raise ValueError(
                "Invalid Anthropic API key format. "
                "Anthropic API keys should start with 'sk-ant-'. "
                "Please check your key at https://console.anthropic.com/settings/keys"
            )
        
        if len(key_str) < 20:
            raise ValueError(
                "Anthropic API key appears to be too short. "
                "Please verify your key at https://console.anthropic.com/settings/keys"
            )
        
        return v
    
    # Anthropic Model Configuration
    ANTHROPIC_DEFAULT_MODEL: str = Field(
        default="claude-3-5-sonnet-20241022",
        description="Default Anthropic model (always Sonnet for cost control)"
    )
    
    @field_validator("ANTHROPIC_DEFAULT_MODEL", mode="before")
    @classmethod
    def validate_anthropic_model(cls, v):
        """Ensure only Sonnet models are used (never Opus for cost reasons)"""
        if v and "opus" in v.lower():
            raise ValueError(
                "Opus models are not allowed due to high costs. "
                "Use Claude 3.5 Sonnet (claude-3-5-sonnet-20241022) instead."
            )
        return v or "claude-3-5-sonnet-20241022"
    
    # OpenAI configuration removed - migrated to Claude 3.5 Sonnet
    
    # Anthropic Configuration (Primary AI Provider) - handled by fallback logic
    # ANTHROPIC_API_KEY: Already defined above

    @property
    def anthropic_api_key(self) -> str:
        """Get Anthropic API key with fallback to alternative environment variable names"""
        if hasattr(self, 'ANTHROPIC_API_KEY') and self.ANTHROPIC_API_KEY:
            return self.ANTHROPIC_API_KEY.get_secret_value()

        # Check for alternative environment variable names
        import os
        alternative_names = [
            'ANTHROPIC_API_KEY',
            'VITE_ANTHROPIC_API_KEY',
            'ANTHROPIC-WHEELS-KEY',
            'ANTHROPIC_WHEELS_KEY'
        ]
        for alt_name in alternative_names:
            alt_value = os.getenv(alt_name)
            if alt_value and alt_value != "sk-ant-api03-your-api-key-here":
                return alt_value
        return None

    @field_validator("ANTHROPIC_API_KEY", mode="before")
    @classmethod
    def validate_anthropic_api_key(cls, v):
        """Validate Anthropic API key format and check alternative environment variables"""
        if not v:
            # Check for alternative environment variable names
            import os
            alternative_names = [
                'VITE_ANTHROPIC_API_KEY',
                'ANTHROPIC-WHEELS-KEY',
                'ANTHROPIC_WHEELS_KEY'
            ]
            for alt_name in alternative_names:
                alt_value = os.getenv(alt_name)
                if alt_value and alt_value != "sk-ant-api03-your-api-key-here":
                    v = alt_value
                    break

            if not v:
                # Import here to avoid circular imports
                import os
                # Check if the actual environment variable we're using exists
                if not os.getenv('ANTHROPIC-WHEELS-KEY'):
                    raise ValueError(
                        "Anthropic API key is required for PAM functionality. "
                        "Please set ANTHROPIC_API_KEY or ANTHROPIC-WHEELS-KEY environment variable. "
                        "Get your API key from https://console.anthropic.com/settings/keys"
                    )
                # If ANTHROPIC-WHEELS-KEY exists, use it
                v = os.getenv('ANTHROPIC-WHEELS-KEY')

        # Convert to string for validation if it's a SecretStr
        key_str = v.get_secret_value() if hasattr(v, 'get_secret_value') else str(v)

        if key_str == "sk-ant-api03-your-api-key-here":
            raise ValueError(
                "Please replace the placeholder Anthropic API key with your actual key. "
                "Get your API key from https://console.anthropic.com/settings/keys"
            )

        if not key_str.startswith('sk-ant-'):
            raise ValueError(
                "Invalid Anthropic API key format. "
                "Anthropic API keys should start with 'sk-ant-'. "
                "Please check your key at https://console.anthropic.com/settings/keys"
            )

        if len(key_str) < 20:
            raise ValueError(
                "Anthropic API key appears to be too short. "
                "Please verify your key at https://console.anthropic.com/settings/keys"
            )

        return v

    # Anthropic Model Configuration
    ANTHROPIC_DEFAULT_MODEL: str = Field(
        default="claude-3-5-sonnet-20241022",
        description="Default Anthropic model (always Sonnet for cost control)"
    )

    @field_validator("ANTHROPIC_DEFAULT_MODEL", mode="before")
    @classmethod
    def validate_anthropic_model(cls, v):
        """Ensure only Sonnet models are used (never Opus for cost reasons)"""
        if v and "opus" in v.lower():
            raise ValueError(
                "Opus models are not allowed due to high costs. "
                "Use Claude 3.5 Sonnet (claude-3-5-sonnet-20241022) instead."
            )
        return v or "claude-3-5-sonnet-20241022"

    # Supabase Configuration (Required)
    SUPABASE_URL: AnyHttpUrl = Field(
        ...,
        description="Supabase project URL (required)"
    )
    
    SUPABASE_SERVICE_ROLE_KEY: SecretStr = Field(
        ...,
        description="Supabase service role key (required)"
    )
    
    VITE_SUPABASE_URL: Optional[AnyHttpUrl] = Field(
        default=None,
        description="Supabase URL for frontend"
    )
    
    VITE_SUPABASE_ANON_KEY: Optional[SecretStr] = Field(
        default=None,
        description="Supabase anon key for frontend"
    )
    
    # Database Configuration
    DATABASE_URL: Optional[PostgresDsn] = Field(
        default=None,
        description="PostgreSQL connection string"
    )
    
    READ_REPLICA_URL: Optional[PostgresDsn] = Field(
        default=None,
        description="Read replica connection string"
    )
    
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
    TTS_PRIMARY_ENGINE: str = Field(default="edge")
    TTS_FALLBACK_ENABLED: bool = Field(default=True)
    TTS_VOICE_DEFAULT: str = Field(default="en-US-AriaNeural")
    TTS_CACHE_ENABLED: bool = Field(default=True)
    TTS_CACHE_TTL: int = Field(default=3600, ge=60)
    
    # WebSocket Configuration
    WEBSOCKET_ENABLED: bool = Field(default=True)
    WEBSOCKET_MAX_CONNECTIONS: int = Field(default=1000, ge=1)
    WEBSOCKET_CONNECTION_TIMEOUT: int = Field(default=300, ge=30)
    WEBSOCKET_MAX_MESSAGE_SIZE: int = Field(default=65536, ge=1024)
    WEBSOCKET_RATE_LIMIT: int = Field(default=100, ge=1)
    
    # Voice Configuration
    VOICE_ENABLED: bool = Field(default=True)
    VOICE_RATE_LIMIT: int = Field(default=10, ge=1)
    VOICE_MAX_DURATION: int = Field(default=60, ge=1, le=300)
    
    # =====================================================
    # EXTERNAL APIS (Optional)
    # =====================================================
    
    # Google Services
    GOOGLE_PLACES_API_KEY: Optional[SecretStr] = Field(default=None)
    YOUTUBE_API_KEY: Optional[SecretStr] = Field(default=None)
    VITE_GOOGLE_MAPS_API_KEY: Optional[str] = Field(default=None)
    
    # Mapbox
    VITE_MAPBOX_PUBLIC_TOKEN: Optional[str] = Field(default=None)
    VITE_MAPBOX_TOKEN: Optional[str] = Field(default=None)  # Alias
    MAPBOX_SECRET_TOKEN: Optional[SecretStr] = Field(default=None)
    
    # =====================================================
    # CACHING & STORAGE
    # =====================================================
    
    # Redis Configuration
    REDIS_ENABLED: bool = Field(default=True)
    REDIS_URL: Optional[str] = Field(  # Changed from RedisDsn to str for Pydantic v2 compatibility
        default="redis://localhost:6379",
        description="Redis connection URL"
    )
    REDIS_PASSWORD: Optional[SecretStr] = Field(default=None)
    REDIS_CACHE_TTL: int = Field(default=300, ge=1)
    REDIS_MAX_CONNECTIONS: int = Field(default=50, ge=1)
    
    # =====================================================
    # MONITORING & LOGGING
    # =====================================================
    
    # Sentry
    SENTRY_ENABLED: bool = Field(default=False)
    SENTRY_DSN: Optional[AnyHttpUrl] = Field(default=None)
    SENTRY_ENVIRONMENT: Optional[str] = Field(default=None)
    
    # Logging
    LOG_LEVEL: str = Field(default="INFO")
    LOG_FORMAT: str = Field(default="json")
    
    # =====================================================
    # SECURITY
    # =====================================================
    
    # JWT Configuration
    SECRET_KEY: SecretStr = Field(
        default_factory=lambda: SecretStr(secrets.token_urlsafe(32)),
        description="JWT secret key"
    )
    
    JWT_SECRET_KEY: Optional[SecretStr] = Field(default=None)  # Alias
    ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, ge=1)
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7, ge=1)
    
    # CORS - Delegated to cors_settings.py for robust handling
    # Kept here for backward compatibility only
    CORS_ENABLED: bool = Field(default=True)
    CORS_ALLOWED_ORIGINS: Optional[List[str]] = Field(default=None)
    CORS_ALLOW_CREDENTIALS: bool = Field(default=True)
    
    @field_validator("CORS_ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS origins from string or list"""
        if v is None:
            return None
        
        # If it's already a list, return as-is
        if isinstance(v, list):
            return v
        
        # If it's a string, split by comma and clean up
        if isinstance(v, str):
            # Handle empty string
            if not v.strip():
                return []
            
            # Split by comma and clean whitespace
            origins = [origin.strip() for origin in v.split(",")]
            # Filter out empty strings
            origins = [origin for origin in origins if origin]
            return origins
        
        # For any other type, try to convert to string first
        try:
            return cls.parse_cors_origins(str(v))
        except Exception:
            return []
    
    # Session
    SESSION_SECRET_KEY: SecretStr = Field(
        default_factory=lambda: SecretStr(secrets.token_urlsafe(32))
    )
    SESSION_COOKIE_SECURE: bool = Field(default=True)
    SESSION_COOKIE_HTTPONLY: bool = Field(default=True)
    
    # =====================================================
    # DATABASE OPTIMIZATION
    # =====================================================
    
    DB_POOL_MIN_SIZE: int = Field(default=5, ge=1)
    DB_POOL_MAX_SIZE: int = Field(default=20, ge=1)
    DB_POOL_TIMEOUT: float = Field(default=10.0, ge=1)
    
    # Cache Settings
    CACHE_DEFAULT_TTL: int = Field(default=300, ge=1)
    CACHE_MAX_MEMORY_ITEMS: int = Field(default=1000, ge=100)
    CACHE_COMPRESSION_ENABLED: bool = Field(default=True)
    
    # Query Optimization
    QUERY_SLOW_THRESHOLD_MS: int = Field(default=100, ge=10)
    QUERY_CACHE_ENABLED: bool = Field(default=True)
    
    # =====================================================
    # APPLICATION SETTINGS
    # =====================================================
    
    APP_NAME: str = Field(default="Wheels & Wins")
    APP_URL: str = Field(default="http://localhost:8080")
    APP_PORT: int = Field(default=8000, ge=1, le=65535)
    APP_HOST: str = Field(default="0.0.0.0")
    
    # Backend URLs
    BACKEND_URL: str = Field(default="http://localhost:8000")
    BACKEND_PORT: int = Field(default=8000)
    
    class Config:
        """Pydantic configuration"""
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        
        # Load environment-specific file if exists
        @classmethod
        def customise_sources(cls, init_settings, env_settings, file_secret_settings):
            # Determine environment
            env = os.getenv("NODE_ENV", "development")
            
            # Try to load environment-specific file
            env_files = [
                f".env.{env}",
                f".env.{env}.local",
                ".env.production" if env == "production" else None,
                ".env"
            ]
            
            for env_file in filter(None, env_files):
                if Path(env_file).exists():
                    cls.env_file = env_file
                    break
            
            return (init_settings, env_settings, file_secret_settings)
    
    # =====================================================
    # VALIDATORS
    # =====================================================
    
    @field_validator("NODE_ENV", mode="before")
    @classmethod
    def set_environment(cls, v):
        """Set environment from NODE_ENV or default"""
        if v:
            return v
        return os.getenv("NODE_ENV", Environment.DEVELOPMENT)
    
    @field_validator("DEBUG", mode="before")
    @classmethod
    def set_debug(cls, v, info):
        """Set debug based on environment"""
        if info.data and "NODE_ENV" in info.data:
            if info.data["NODE_ENV"] == Environment.PRODUCTION:
                return False
        return v
    
    @field_validator("SENTRY_ENVIRONMENT", mode="before")
    @classmethod
    def set_sentry_env(cls, v, info):
        """Set Sentry environment from NODE_ENV if not set"""
        if not v and info.data and "NODE_ENV" in info.data:
            return info.data["NODE_ENV"]
        return v
    
    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def construct_database_url(cls, v, info):
        """Construct database URL from Supabase if not provided"""
        if not v and info.data and "SUPABASE_URL" in info.data:
            # Extract project ref from Supabase URL
            supabase_url = str(info.data["SUPABASE_URL"])
            if "supabase.co" in supabase_url:
                project_ref = supabase_url.split("//")[1].split(".")[0]
                # Construct database URL (this is the typical pattern)
                return f"postgresql://postgres.{project_ref}:5432/postgres"
        return v
    
    @field_validator("VITE_SUPABASE_URL", mode="before")
    @classmethod
    def copy_supabase_url(cls, v, info):
        """Copy SUPABASE_URL to VITE_SUPABASE_URL if not set"""
        if not v and info.data and "SUPABASE_URL" in info.data:
            return info.data["SUPABASE_URL"]
        return v
    
    @field_validator("JWT_SECRET_KEY", mode="before")
    @classmethod
    def copy_secret_key(cls, v, info):
        """Copy SECRET_KEY to JWT_SECRET_KEY if not set"""
        if not v and info.data and "SECRET_KEY" in info.data:
            return info.data["SECRET_KEY"]
        return v
    
    @field_validator("VITE_MAPBOX_TOKEN", mode="before")
    @classmethod
    def copy_mapbox_token(cls, v, info):
        """Copy VITE_MAPBOX_PUBLIC_TOKEN to VITE_MAPBOX_TOKEN"""
        if not v and info.data and "VITE_MAPBOX_PUBLIC_TOKEN" in info.data:
            return info.data["VITE_MAPBOX_PUBLIC_TOKEN"]
        return v
    
    # CORS validation removed - handled by cors_settings.py for better separation of concerns
    
    # =====================================================
    # STARTUP VALIDATION
    # =====================================================
    
    def validate_on_startup(self) -> Dict[str, Any]:
        """
        Validate all critical settings at startup
        Returns validation result with issues and warnings
        """
        issues = []
        warnings = []
        
        # Check required settings with detailed validation
        required_settings = {
            "ANTHROPIC_API_KEY": {
                "message": "Anthropic API key is required for PAM functionality",
                "validation": self._validate_anthropic_key
            },
            "SUPABASE_URL": {
                "message": "Supabase URL is required for authentication",
                "validation": None
            },
            "SUPABASE_SERVICE_ROLE_KEY": {
                "message": "Supabase service role key is required",
                "validation": None
            }
        }
        
        for setting, config in required_settings.items():
            value = getattr(self, setting, None)
            if not value:
                issues.append(f"{setting}: {config['message']}")
            elif isinstance(value, SecretStr):
                if not value.get_secret_value():
                    issues.append(f"{setting}: {config['message']}")
                else:
                    # Run additional validation if available
                    if config.get('validation'):
                        try:
                            config['validation'](value)
                        except Exception as e:
                            issues.append(f"{setting}: {str(e)}")
            else:
                # Run additional validation if available
                if config.get('validation'):
                    try:
                        config['validation'](value)
                    except Exception as e:
                        issues.append(f"{setting}: {str(e)}")
        
        # Check production-specific requirements
        if self.NODE_ENV == Environment.PRODUCTION:
            # Production must have secure settings
            if not self.SESSION_COOKIE_SECURE:
                issues.append("SESSION_COOKIE_SECURE must be True in production")
            
            if self.DEBUG:
                warnings.append("DEBUG mode is enabled in production")
            
            if self.LOG_LEVEL == "DEBUG":
                warnings.append("Debug logging is enabled in production")
            
            if not self.SENTRY_ENABLED:
                warnings.append("Sentry monitoring is disabled in production")
            
            # Check for localhost in production URLs
            if "localhost" in self.APP_URL:
                issues.append("Production APP_URL should not contain localhost")
            
            # Safe CORS check
            if self.CORS_ALLOWED_ORIGINS and isinstance(self.CORS_ALLOWED_ORIGINS, list):
                if any("localhost" in origin for origin in self.CORS_ALLOWED_ORIGINS):
                    warnings.append("CORS allows localhost origins in production")
        
        # Check optional but recommended services
        if self.PAM_CACHE_ENABLED and not self.REDIS_URL:
            warnings.append("PAM caching is enabled but Redis is not configured")
        
        if self.TTS_ENABLED and self.TTS_CACHE_ENABLED and not self.REDIS_URL:
            warnings.append("TTS caching is enabled but Redis is not configured")
        
        # Check external API keys
        if not self.GOOGLE_PLACES_API_KEY:
            warnings.append("Google Places API key not configured (location features limited)")
        
        if not self.VITE_MAPBOX_PUBLIC_TOKEN and not self.VITE_MAPBOX_TOKEN:
            warnings.append("Mapbox token not configured (map features disabled)")
        
        # Performance checks
        if self.DB_POOL_MAX_SIZE < 10 and self.NODE_ENV == Environment.PRODUCTION:
            warnings.append("Database pool size might be too small for production")
        
        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "warnings": warnings,
            "environment": self.NODE_ENV.value,
            "debug": self.DEBUG,
            "services": {
                "anthropic": bool(self.ANTHROPIC_API_KEY),
                "supabase": bool(self.SUPABASE_URL and self.SUPABASE_SERVICE_ROLE_KEY),
                "redis": bool(self.REDIS_URL),
                "sentry": self.SENTRY_ENABLED,
                "google_places": bool(self.GOOGLE_PLACES_API_KEY),
                "mapbox": bool(self.VITE_MAPBOX_PUBLIC_TOKEN or self.VITE_MAPBOX_TOKEN)
            }
        }
    
    def _validate_anthropic_key(self, key_value):
        """Validate Anthropic key format at runtime"""
        if isinstance(key_value, SecretStr):
            key_str = key_value.get_secret_value()
        else:
            key_str = str(key_value)

        if not key_str.startswith('sk-ant-'):
            raise ValueError("Invalid Anthropic API key format (should start with 'sk-ant-')")

        if len(key_str) < 20:
            raise ValueError("Anthropic API key appears to be too short")
    
    def print_startup_info(self):
        """Print configuration info at startup"""
        validation = self.validate_on_startup()
        
        print("\n" + "=" * 60)
        print(f"🚀 {self.APP_NAME} Configuration")
        print("=" * 60)
        print(f"Environment: {self.NODE_ENV.value}")
        print(f"Debug Mode: {self.DEBUG}")
        print(f"Version: {self.VERSION}")
        print(f"Log Level: {self.LOG_LEVEL}")
        print("\n📦 Services Status:")
        for service, enabled in validation["services"].items():
            status = "✅" if enabled else "❌"
            print(f"  {status} {service.title()}")
        
        if validation["issues"]:
            print("\n❌ Configuration Issues:")
            for issue in validation["issues"]:
                print(f"  • {issue}")
        
        if validation["warnings"]:
            print("\n⚠️  Configuration Warnings:")
            for warning in validation["warnings"]:
                print(f"  • {warning}")
        
        print("=" * 60 + "\n")
        
        if not validation["valid"]:
            if self.NODE_ENV == Environment.PRODUCTION:
                print("🛑 CRITICAL: Invalid configuration for production!")
                print("   Application startup blocked due to configuration issues.")
                sys.exit(1)
            else:
                print("⚠️  WARNING: Configuration issues detected.")
                print("   Application will start but some features may not work.")
    
    # =====================================================
    # HELPER METHODS
    # =====================================================
    
    def is_production(self) -> bool:
        """Check if running in production"""
        return self.NODE_ENV == Environment.PRODUCTION
    
    def is_development(self) -> bool:
        """Check if running in development"""
        return self.NODE_ENV == Environment.DEVELOPMENT
    
    def is_staging(self) -> bool:
        """Check if running in staging"""
        return self.NODE_ENV == Environment.STAGING
    
    def is_testing(self) -> bool:
        """Check if running in testing"""
        return self.NODE_ENV == Environment.TESTING
    
    def get_secret_value(self, key: str) -> Optional[str]:
        """Safely get secret value"""
        value = getattr(self, key, None)
        if isinstance(value, SecretStr):
            return value.get_secret_value()
        return value
    
    def export_frontend_env(self) -> Dict[str, str]:
        """Export VITE_ prefixed variables for frontend"""
        frontend_env = {}
        for key in dir(self):
            if key.startswith("VITE_"):
                value = getattr(self, key)
                if value is not None:
                    if isinstance(value, SecretStr):
                        frontend_env[key] = value.get_secret_value()
                    else:
                        frontend_env[key] = str(value)
        return frontend_env
    
    def to_dict(self, include_secrets: bool = False) -> Dict[str, Any]:
        """Export configuration as dictionary"""
        config = {}
        for key in dir(self):
            if key.startswith("_") or key.isupper() is False:
                continue
            value = getattr(self, key)
            if isinstance(value, SecretStr):
                config[key] = value.get_secret_value() if include_secrets else "***REDACTED***"
            elif value is not None:
                config[key] = value
        return config


# =====================================================
# GLOBAL SETTINGS INSTANCE
# =====================================================

def get_settings() -> Settings:
    """Get or create settings instance with validation"""
    global _settings_instance
    
    try:
        if "_settings_instance" not in globals():
            _settings_instance = Settings()
            _settings_instance.print_startup_info()
        return _settings_instance
    except ValidationError as e:
        print("\n❌ Configuration Validation Error:")
        
        # Print all errors for debugging
        for error in e.errors():
            field = ".".join(str(loc) for loc in error["loc"])
            msg = error["msg"]
            input_value = error.get("input", "N/A")
            print(f"  • Field: {field}")
            print(f"    Error: {msg}")
            if input_value != "N/A":
                print(f"    Value: {input_value}")
        
        # Check for critical vs non-critical errors
        critical_fields = {
            "ANTHROPIC_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"
        }
        
        critical_errors = [
            error for error in e.errors() 
            if any(str(loc) in critical_fields for loc in error["loc"])
        ]
        
        if critical_errors:
            print("\n🚨 Critical configuration errors detected!")
            print("💡 Please ensure all required environment variables are set.")
            print("🔄 This will trigger fallback to simple configuration...")
            # Don't exit here - let main.py handle the fallback
            raise e  # Re-raise the original ValidationError
        else:
            print("\n⚠️ Non-critical configuration errors - attempting to continue")
            # For non-critical errors, try to create settings with defaults
            try:
                # Clear problematic environment variables
                if any("CORS" in str(error["loc"][0]) for error in e.errors()):
                    # CORS is handled by cors_settings.py, so we can ignore these
                    os.environ.pop("CORS_ALLOWED_ORIGINS", None)
                
                _settings_instance = Settings()
                _settings_instance.print_startup_info()
                print("✅ Configuration loaded with defaults for non-critical fields")
                return _settings_instance
            except Exception as retry_error:
                print(f"❌ Failed to load configuration even with defaults: {retry_error}")
                sys.exit(1)
    except Exception as e:
        print(f"\n❌ Failed to load configuration: {e}")
        sys.exit(1)


# Create and validate settings at module import
settings = get_settings()

# Export commonly used settings for backward compatibility
SECRET_KEY = settings.SECRET_KEY.get_secret_value()
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
SUPABASE_URL = str(settings.SUPABASE_URL)
SUPABASE_SERVICE_ROLE_KEY = settings.SUPABASE_SERVICE_ROLE_KEY.get_secret_value()

# Maintain backward compatibility with old module structure
class UnifiedSettings:
    """Backward compatibility wrapper"""
    def __init__(self):
        self.settings = settings
    
    def __getattr__(self, name):
        return getattr(self.settings, name)

# For imports expecting the old structure
user_settings = settings
infra_settings = settings
feature_flags = settings

def is_feature_enabled(feature: str) -> bool:
    """Check if a feature is enabled"""
    return getattr(settings, f"PAM_{feature.upper()}_ENABLED", False)

# Export main components
__all__ = [
    "Settings",
    "get_settings",
    "settings",
    "Environment",
    "SECRET_KEY",
    "ALGORITHM",
    "ACCESS_TOKEN_EXPIRE_MINUTES",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY"
]