"""
Infrastructure Configuration Module
Infrastructure and deployment settings for databases, external APIs, and services.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import SecretStr, Field
from typing import List, Optional
import os


class InfrastructureSettings(BaseSettings):
    """Infrastructure settings for databases, APIs, and external services"""
    
    # Environment
    ENVIRONMENT: str = "production"  # Changed to production for deployed instances
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
    OPENAI_API_KEY: Optional[SecretStr] = None
    ANTHROPIC_API_KEY: Optional[SecretStr] = None
    GEMINI_API_KEY: Optional[SecretStr] = None
    DEEPSEEK_API_KEY: Optional[SecretStr] = None  # DeepSeek V3 for free-tier users
    SUPABASE_URL: Optional[str] = "https://placeholder.supabase.co"
    SUPABASE_KEY: Optional[str] = "placeholder-anon-key"
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    SITE_URL: str = "http://localhost:3000"
    MUNDI_URL: Optional[str] = None

    # Search APIs
    GOOGLE_SEARCH_API_KEY: Optional[str] = None
    GOOGLE_SEARCH_ENGINE_ID: Optional[str] = None
    GOOGLE_PLACES_API_KEY: Optional[str] = None  # Google Places API for location search
    BING_SEARCH_API_KEY: Optional[str] = None
    
    # Map APIs
    MAPBOX_PUBLIC_TOKEN: Optional[str] = None
    MAPBOX_SECRET_TOKEN: Optional[str] = None
    
    # YouTube API
    YOUTUBE_API_KEY: Optional[str] = Field(
        default_factory=lambda: os.getenv('YOUTUBE_API_KEY') or os.getenv('YOUTUBE-API')
    )
    
    # Digistore24 Configuration
    DIGISTORE24_VENDOR_ID: Optional[str] = None
    DIGISTORE24_API_KEY: Optional[str] = None
    DIGISTORE24_IPN_PASSPHRASE: Optional[str] = None
    DIGISTORE24_THANK_YOU_PAGE_KEY: Optional[str] = None
    DIGISTORE24_SYNC_ENABLED: bool = False
    DIGISTORE24_MIN_COMMISSION: float = 30.0
    DIGISTORE24_AUTO_IMPORT_CATEGORIES: str = "travel,outdoor,electronics"
    DIGISTORE24_KEYWORDS: Optional[str] = None
    DIGISTORE24_TARGET_AUDIENCE: Optional[str] = None

    # AI Agent Observability Infrastructure
    LANGFUSE_SECRET_KEY: Optional[str] = None
    LANGFUSE_PUBLIC_KEY: Optional[str] = None
    LANGFUSE_HOST: str = "https://cloud.langfuse.com"
    OTLP_ENDPOINT: Optional[str] = None
    OTLP_API_KEY: Optional[str] = None

    # CORS - Allow requests from development and production origins
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8080",
        "http://localhost:5173",
        "https://wheelsandwins.com",
        "https://www.wheelsandwins.com",
        "https://4fd8d7d4-1c59-4996-a0dd-48be31131e7c.lovable.app",
        "https://id-preview--4fd8d7d4-1c59-4996-a0dd-48be31131e7c.lovable.app",
        "https://4fd8d7d4-1c59-4996-a0dd-48be31131e7c.lovableproject.com",
        # Additional Lovable preview URLs
        "https://preview--4fd8d7d4-1c59-4996-a0dd-48be31131e7c.lovable.app",
        "https://main--4fd8d7d4-1c59-4996-a0dd-48be31131e7c.lovable.app",
    ]

    # Voice Processing Configuration
    LOCAL_WHISPER_MODEL: str = "tiny"  # tiny, base, small, medium, large
    
    # Monitoring Infrastructure
    SENTRY_DSN: Optional[str] = None
    OBSERVABILITY_ENABLED: bool = True

    # Performance Infrastructure
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 30
    MAX_RENDER_WORKERS: int = 1

    # Neo4j Graph Database Configuration (Optional)
    NEO4J_URI: Optional[str] = "bolt://localhost:7687"
    NEO4J_USER: Optional[str] = "neo4j"
    NEO4J_PASSWORD: Optional[str] = None
    NEO4J_DATABASE: Optional[str] = "neo4j"

    model_config = SettingsConfigDict(
        env_file=[".env", "backend/.env", "../.env"],  # Multiple potential paths
        case_sensitive=True,
        extra="allow"
        # No env_prefix for backward compatibility with existing deployments
    )

    @classmethod
    def load(cls) -> "InfrastructureSettings":
        """Load settings and handle missing required environment variables."""
        try:
            return cls()
        except Exception as exc:
            # Handle validation errors more gracefully
            missing = str(exc)
            raise RuntimeError(f"Missing required infrastructure settings: {missing}") from exc


# Global infrastructure settings instance
infra_settings = InfrastructureSettings.load()


def get_infra_settings() -> InfrastructureSettings:
    """Retrieve the global infrastructure settings."""
    return infra_settings