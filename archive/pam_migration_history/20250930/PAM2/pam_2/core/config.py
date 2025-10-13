"""
PAM 2.0 Configuration Management
================================

Clean configuration management using Pydantic Settings with
environment variable support and validation.
"""

import os
from typing import Optional
from pydantic import Field, validator
from pydantic_settings import BaseSettings

from .types import GeminiConfig, RedisConfig, RateLimitConfig


class PAM2Settings(BaseSettings):
    """
    PAM 2.0 configuration with environment variable support

    All settings can be overridden via environment variables
    with the PAM2_ prefix (e.g., PAM2_GEMINI_API_KEY)
    """

    # Application Settings
    app_name: str = Field(default="PAM 2.0", description="Application name")
    app_version: str = Field(default="2.0.0", description="Application version")
    environment: str = Field(default="development", description="Environment (development/staging/production)")
    debug: bool = Field(default=False, description="Debug mode")

    # Google Gemini Configuration
    gemini_api_key: str = Field(..., description="Google Gemini API key")
    gemini_model: str = Field(default="gemini-1.5-flash", description="Gemini model name")
    gemini_temperature: float = Field(default=0.7, ge=0.0, le=2.0, description="Gemini temperature")
    gemini_max_tokens: int = Field(default=1000, ge=1, le=8192, description="Max tokens per request")
    gemini_timeout: int = Field(default=30, ge=1, le=300, description="Gemini API timeout")

    # Redis Configuration
    redis_url: str = Field(default="redis://localhost:6379", description="Redis connection URL")
    redis_max_connections: int = Field(default=10, ge=1, le=100, description="Redis max connections")
    redis_timeout: int = Field(default=5, ge=1, le=30, description="Redis timeout")
    redis_default_ttl: int = Field(default=3600, ge=60, le=86400, description="Default TTL for cached data")

    # Rate Limiting
    rate_limit_messages_per_hour: int = Field(default=100, ge=1, le=1000, description="Messages per hour limit")
    rate_limit_messages_per_minute: int = Field(default=10, ge=1, le=60, description="Messages per minute limit")
    rate_limit_burst_limit: int = Field(default=5, ge=1, le=20, description="Burst limit")

    # Safety & Security
    enable_content_filtering: bool = Field(default=True, description="Enable content safety filtering")
    enable_rate_limiting: bool = Field(default=True, description="Enable rate limiting")
    max_conversation_history: int = Field(default=50, ge=1, le=100, description="Max conversation history")

    # Performance Settings
    response_timeout_seconds: int = Field(default=30, ge=5, le=120, description="Response timeout")
    max_concurrent_requests: int = Field(default=100, ge=1, le=1000, description="Max concurrent requests")

    # Feature Flags
    enable_trip_logger: bool = Field(default=True, description="Enable trip logging features")
    enable_savings_tracker: bool = Field(default=True, description="Enable savings tracking features")
    enable_websocket: bool = Field(default=True, description="Enable WebSocket support")

    # Monitoring & Logging
    log_level: str = Field(default="INFO", description="Logging level")
    enable_metrics: bool = Field(default=True, description="Enable metrics collection")
    metrics_port: int = Field(default=9090, ge=1024, le=65535, description="Metrics server port")

    # Web Server Security
    cors_origins: list = Field(default=["http://localhost:3000", "http://localhost:8080"], description="CORS allowed origins")
    trusted_hosts: list = Field(default=["localhost", "127.0.0.1"], description="Trusted host names")

    class Config:
        env_prefix = "PAM2_"
        case_sensitive = False
        env_file = ".env"
        env_file_encoding = "utf-8"

    @validator("gemini_api_key")
    def validate_gemini_api_key(cls, v):
        """Validate Gemini API key format"""
        if not v:
            raise ValueError(
                "Gemini API key is required. "
                "Set PAM2_GEMINI_API_KEY environment variable. "
                "Get your key at https://makersuite.google.com/app/apikey"
            )

        if not v.startswith('AIza'):
            raise ValueError(
                "Invalid Gemini API key format. "
                "Google API keys typically start with 'AIza'. "
                "Please verify your key at https://makersuite.google.com/app/apikey"
            )

        if len(v) < 35:
            raise ValueError(
                "Gemini API key appears to be too short. "
                "Please verify your key at https://makersuite.google.com/app/apikey"
            )

        return v

    @validator("environment")
    def validate_environment(cls, v):
        """Validate environment setting"""
        valid_environments = ["development", "staging", "production"]
        if v.lower() not in valid_environments:
            raise ValueError(f"Environment must be one of: {valid_environments}")
        return v.lower()

    @validator("log_level")
    def validate_log_level(cls, v):
        """Validate logging level"""
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in valid_levels:
            raise ValueError(f"Log level must be one of: {valid_levels}")
        return v.upper()

    def get_gemini_config(self) -> GeminiConfig:
        """Get Gemini configuration object"""
        return GeminiConfig(
            api_key=self.gemini_api_key,
            model=self.gemini_model,
            temperature=self.gemini_temperature,
            max_tokens=self.gemini_max_tokens,
            timeout_seconds=self.gemini_timeout
        )

    def get_redis_config(self) -> RedisConfig:
        """Get Redis configuration object"""
        return RedisConfig(
            url=self.redis_url,
            max_connections=self.redis_max_connections,
            timeout_seconds=self.redis_timeout,
            default_ttl=self.redis_default_ttl
        )

    def get_rate_limit_config(self) -> RateLimitConfig:
        """Get rate limiting configuration object"""
        return RateLimitConfig(
            messages_per_hour=self.rate_limit_messages_per_hour,
            messages_per_minute=self.rate_limit_messages_per_minute,
            burst_limit=self.rate_limit_burst_limit
        )

    @property
    def is_production(self) -> bool:
        """Check if running in production"""
        return self.environment == "production"

    @property
    def is_development(self) -> bool:
        """Check if running in development"""
        return self.environment == "development"


def get_settings() -> PAM2Settings:
    """
    Get PAM 2.0 settings instance

    Implements singleton pattern for settings to avoid
    re-reading environment variables on every access.
    """
    if not hasattr(get_settings, "_instance"):
        try:
            # Check for custom env file path
            env_file = os.environ.get("PAM2_ENV_FILE", ".env")
            get_settings._instance = PAM2Settings(_env_file=env_file)
        except Exception as e:
            # Provide helpful error message for configuration issues
            error_msg = f"Configuration error: {str(e)}"
            if "PAM2_GEMINI_API_KEY" in str(e):
                error_msg += "\n\nTo fix this:"
                error_msg += "\n1. Get your API key from https://makersuite.google.com/app/apikey"
                error_msg += "\n2. Set environment variable: export PAM2_GEMINI_API_KEY=your_key_here"
                error_msg += "\n3. Or create a .env file with PAM2_GEMINI_API_KEY=your_key_here"

            raise ValueError(error_msg)

    return get_settings._instance


# Global settings instance
pam2_settings = get_settings()