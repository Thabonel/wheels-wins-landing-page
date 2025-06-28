
"""
Configuration Management
Centralized application settings with environment variable support.
"""

from pydantic_settings import BaseSettings
from typing import List, Optional
from pathlib import Path

class Settings(BaseSettings):
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    VERSION: str = "2.0.0"
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Database
    DATABASE_URL: str
    POSTGRES_DB: str = "pam_backend"
    POSTGRES_USER: str = "pam_user"
    POSTGRES_PASSWORD: str
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    REDIS_PASSWORD: Optional[str] = None
    
    # External APIs
    OPENAI_API_KEY: str
    SUPABASE_URL: str
    SUPABASE_KEY: str
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8080",
        "https://wheelsandwins.com",
        "https://www.wheelsandwins.com"
    ]
    
    # Monitoring
    SENTRY_DSN: Optional[str] = None
    PROMETHEUS_ENABLED: bool = True
    METRICS_ENABLED: bool = True
    
    # Performance
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 30
    CACHE_TTL: int = 300
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 100
    RATE_LIMIT_BURST: int = 200
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "allow"
    }


# Global settings instance
settings = Settings()

def get_settings() -> Settings:
    """Retrieve the global settings."""
    return settings
