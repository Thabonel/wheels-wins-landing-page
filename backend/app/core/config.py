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
    SITE_URL: str = "http://localhost:3000"

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8080",
        "https://wheelsandwins.com",
        "https://www.wheelsandwins.com",
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
