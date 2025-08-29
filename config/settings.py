from __future__ import annotations

from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from pydantic import ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"
if ENV_PATH.exists():
    load_dotenv(ENV_PATH)


class YouTubeAPISettings(BaseSettings):
    """Configuration for the YouTube API."""

    API_KEY: str
    QUOTA_PER_DAY: int = 10_000

    model_config = SettingsConfigDict(
        env_file=str(ENV_PATH),
        env_prefix="YOUTUBE_",
        case_sensitive=True,
    )


class OpenAISettings(BaseSettings):
    """OpenAI API configuration."""

    API_KEY: str
    ORGANIZATION: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=str(ENV_PATH),
        env_prefix="OPENAI_",
        case_sensitive=True,
    )


class SupabaseSettings(BaseSettings):
    """Supabase configuration."""

    URL: str
    ANON_KEY: str
    SERVICE_ROLE_KEY: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=str(ENV_PATH),
        env_prefix="SUPABASE_",
        case_sensitive=True,
    )


class LoggingSettings(BaseSettings):
    """Logging configuration."""

    ENVIRONMENT: str = "development"
    LEVEL: Optional[str] = None

    model_config = SettingsConfigDict(env_file=str(ENV_PATH), case_sensitive=True)

    @property
    def effective_level(self) -> str:
        if self.LEVEL:
            return self.LEVEL
        return "DEBUG" if self.ENVIRONMENT == "development" else "INFO"


class Settings(BaseSettings):
    """Application settings wrapper."""

    youtube: YouTubeAPISettings = YouTubeAPISettings()
    openai: OpenAISettings = OpenAISettings()
    supabase: SupabaseSettings = SupabaseSettings()
    logging: LoggingSettings = LoggingSettings()

    model_config = SettingsConfigDict(env_file=str(ENV_PATH), case_sensitive=True)

    @classmethod
    def load(cls) -> "Settings":
        try:
            return cls()
        except ValidationError as exc:
            missing = ", ".join(err["loc"][0] for err in exc.errors())
            raise RuntimeError(f"Missing required environment variables: {missing}") from exc


settings = Settings.load()


def get_settings() -> Settings:
    return settings
