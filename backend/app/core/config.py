
from typing import List, Optional, Union
from pydantic import BaseSettings, validator, Field
from enum import Enum
import os


class Environment(str, Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "PAM Backend"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: Environment = Field(default=Environment.DEVELOPMENT)
    DEBUG: bool = Field(default=False)
    
    # Server
    HOST: str = Field(default="0.0.0.0")
    PORT: int = Field(default=8000)
    
    # Database (Supabase)
    SUPABASE_URL: str = Field(..., description="Supabase project URL")
    SUPABASE_ANON_KEY: str = Field(..., description="Supabase anonymous key")
    SUPABASE_SERVICE_ROLE_KEY: str = Field(..., description="Supabase service role key")
    SUPABASE_DB_URL: Optional[str] = Field(None, description="Direct database connection URL")
    
    # Redis
    REDIS_URL: str = Field(default="redis://localhost:6379", description="Redis connection URL")
    REDIS_PASSWORD: Optional[str] = Field(None, description="Redis password if required")
    REDIS_SSL: bool = Field(default=False, description="Use SSL for Redis connection")
    
    # OpenAI
    OPENAI_API_KEY: str = Field(..., description="OpenAI API key for AI services")
    OPENAI_MODEL: str = Field(default="gpt-4.1-2025-04-14", description="Default OpenAI model")
    OPENAI_MAX_TOKENS: int = Field(default=4000, description="Maximum tokens for OpenAI requests")
    OPENAI_TEMPERATURE: float = Field(default=0.7, description="OpenAI temperature setting")
    
    # JWT & Security
    SECRET_KEY: str = Field(..., description="Secret key for JWT signing")
    ALGORITHM: str = Field(default="HS256", description="JWT algorithm")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, description="Access token expiration in minutes")
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7, description="Refresh token expiration in days")
    
    # CORS
    CORS_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:5173"],
        description="Allowed CORS origins"
    )
    CORS_ALLOW_CREDENTIALS: bool = Field(default=True)
    CORS_ALLOW_METHODS: List[str] = Field(default=["*"])
    CORS_ALLOW_HEADERS: List[str] = Field(default=["*"])
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = Field(default=100, description="Requests per minute per user")
    RATE_LIMIT_WINDOW: int = Field(default=60, description="Rate limit window in seconds")
    RATE_LIMIT_ENABLED: bool = Field(default=True, description="Enable rate limiting")
    
    # Logging
    LOG_LEVEL: str = Field(default="INFO", description="Logging level")
    LOG_FORMAT: str = Field(
        default="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        description="Log format string"
    )
    LOG_FILE: Optional[str] = Field(None, description="Log file path (optional)")
    
    # WebSocket
    WS_MAX_CONNECTIONS: int = Field(default=1000, description="Maximum WebSocket connections")
    WS_HEARTBEAT_INTERVAL: int = Field(default=30, description="WebSocket heartbeat interval in seconds")
    
    # Cache
    CACHE_TTL: int = Field(default=300, description="Default cache TTL in seconds")
    CACHE_PREFIX: str = Field(default="pam:", description="Cache key prefix")
    
    # PAM Specific
    PAM_MAX_MEMORY_ITEMS: int = Field(default=100, description="Maximum memory items per user")
    PAM_SESSION_TIMEOUT: int = Field(default=1800, description="PAM session timeout in seconds")
    PAM_MAX_MESSAGE_LENGTH: int = Field(default=10000, description="Maximum message length")
    
    # External APIs
    STRIPE_SECRET_KEY: Optional[str] = Field(None, description="Stripe secret key (if payments enabled)")
    STRIPE_WEBHOOK_SECRET: Optional[str] = Field(None, description="Stripe webhook secret")
    
    # Monitoring & Health
    HEALTH_CHECK_ENABLED: bool = Field(default=True, description="Enable health check endpoints")
    METRICS_ENABLED: bool = Field(default=True, description="Enable metrics collection")
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        
    @validator("ENVIRONMENT", pre=True)
    def validate_environment(cls, v):
        if isinstance(v, str):
            return Environment(v.lower())
        return v
    
    @validator("DEBUG", pre=True)
    def set_debug_from_environment(cls, v, values):
        if "ENVIRONMENT" in values:
            if values["ENVIRONMENT"] == Environment.DEVELOPMENT:
                return True
        return v
    
    @validator("CORS_ORIGINS", pre=True)
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    @validator("LOG_LEVEL")
    def validate_log_level(cls, v):
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in valid_levels:
            raise ValueError(f"LOG_LEVEL must be one of: {valid_levels}")
        return v.upper()
    
    @validator("OPENAI_TEMPERATURE")
    def validate_openai_temperature(cls, v):
        if not 0.0 <= v <= 2.0:
            raise ValueError("OPENAI_TEMPERATURE must be between 0.0 and 2.0")
        return v
    
    @validator("RATE_LIMIT_REQUESTS")
    def validate_rate_limit_requests(cls, v):
        if v <= 0:
            raise ValueError("RATE_LIMIT_REQUESTS must be greater than 0")
        return v
    
    @validator("SUPABASE_URL")
    def validate_supabase_url(cls, v):
        if not v.startswith("https://"):
            raise ValueError("SUPABASE_URL must start with https://")
        return v
    
    @validator("REDIS_URL")
    def validate_redis_url(cls, v):
        if not (v.startswith("redis://") or v.startswith("rediss://")):
            raise ValueError("REDIS_URL must start with redis:// or rediss://")
        return v
    
    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == Environment.DEVELOPMENT
    
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == Environment.PRODUCTION
    
    @property
    def is_staging(self) -> bool:
        return self.ENVIRONMENT == Environment.STAGING
    
    def get_database_url(self) -> str:
        """Get the appropriate database URL based on environment"""
        if self.SUPABASE_DB_URL:
            return self.SUPABASE_DB_URL
        return f"{self.SUPABASE_URL}/rest/v1/"
    
    def get_cors_origins(self) -> List[str]:
        """Get CORS origins with environment-specific defaults"""
        origins = self.CORS_ORIGINS[:]
        
        if self.is_production:
            # Remove localhost origins in production
            origins = [origin for origin in origins if "localhost" not in origin]
        
        return origins
    
    def validate_required_settings(self) -> None:
        """Validate that all required settings are present"""
        required_fields = [
            "SUPABASE_URL",
            "SUPABASE_ANON_KEY", 
            "SUPABASE_SERVICE_ROLE_KEY",
            "OPENAI_API_KEY",
            "SECRET_KEY"
        ]
        
        missing_fields = []
        for field in required_fields:
            if not getattr(self, field, None):
                missing_fields.append(field)
        
        if missing_fields:
            raise ValueError(
                f"Missing required environment variables: {', '.join(missing_fields)}\n"
                f"Please check your .env file or environment configuration."
            )
    
    def get_log_config(self) -> dict:
        """Get logging configuration"""
        config = {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "default": {
                    "format": self.LOG_FORMAT,
                },
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": "default",
                    "level": self.LOG_LEVEL,
                },
            },
            "root": {
                "level": self.LOG_LEVEL,
                "handlers": ["console"],
            },
        }
        
        if self.LOG_FILE:
            config["handlers"]["file"] = {
                "class": "logging.FileHandler",
                "formatter": "default",
                "filename": self.LOG_FILE,
                "level": self.LOG_LEVEL,
            }
            config["root"]["handlers"].append("file")
        
        return config


# Global settings instance
settings = Settings()

# Validate settings on import
try:
    settings.validate_required_settings()
except ValueError as e:
    if settings.is_development:
        print(f"Warning: Configuration validation failed: {e}")
    else:
        raise e
