"""
Configuration Management
Centralized application settings with environment variable support.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import SecretStr, ValidationError
from typing import List, Optional


class Settings(BaseSettings):
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    VERSION: str = "2.0.0"

    # Security
    SECRET_KEY: SecretStr
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Database (PostgreSQL - optional since using Supabase)
    DATABASE_URL: Optional[str] = None
    POSTGRES_DB: str = "pam_backend"
    POSTGRES_USER: str = "pam_user"
    POSTGRES_PASSWORD: Optional[str] = None
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432

    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    REDIS_PASSWORD: Optional[str] = None

    # External APIs
    OPENAI_API_KEY: Optional[str] = None
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SITE_URL: str = "http://localhost:3000"
    MUNDI_URL: Optional[str] = None
    
    # AI Agent Observability
    LANGFUSE_SECRET_KEY: Optional[str] = None
    LANGFUSE_PUBLIC_KEY: Optional[str] = None
    LANGFUSE_HOST: str = "https://cloud.langfuse.com"
    AGENTOPS_API_KEY: Optional[str] = None
    OBSERVABILITY_ENABLED: bool = True

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8080",
        "http://localhost:5173",
        "https://wheelsandwins.com",
        "https://www.wheelsandwins.com",
        "https://4fd8d7d4-1c59-4996-a0dd-48be31131e7c.lovable.app",
        "https://id-preview--4fd8d7d4-1c59-4996-a0dd-48be31131e7c.lovable.app",
        "https://4fd8d7d4-1c59-4996-a0dd-48be31131e7c.lovableproject.com",
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

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="allow",
    )

    @classmethod
    def load(cls) -> "Settings":
        """Load settings and handle missing required environment variables."""
        try:
            return cls()
        except ValidationError as exc:  # pragma: no cover - runtime configuration failure
            missing = ", ".join(err["loc"][0] for err in exc.errors())
            raise RuntimeError(f"Missing required settings: {missing}") from exc


# Global settings instance
settings = Settings.load()


def get_settings() -> Settings:
    """Retrieve the global settings."""
    return settings
