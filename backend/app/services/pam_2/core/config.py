"""
PAM 2.0 Configuration
Specific configuration for PAM 2.0 services
"""

from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field, SecretStr

from .types import (
    GuardrailsConfig,
    ServiceConfig,
    GeminiConfig,
    MCPConfig,
    RedisConfig,
    SafetyLevel
)

class PAM2Settings(BaseSettings):
    """PAM 2.0 specific settings"""

    # =====================================================
    # Core PAM 2.0 Configuration
    # =====================================================

    # Service Information
    service_name: str = Field(default="pam-2.0")
    version: str = Field(default="2.0.0")
    environment: str = Field(default="development")

    # Performance Settings
    max_response_time_ms: int = Field(default=500, description="Target response time")
    max_concurrent_requests: int = Field(default=100)
    request_timeout_seconds: int = Field(default=30)

    # =====================================================
    # AI Provider Configuration
    # =====================================================

    # Google Gemini (Primary Provider)
    GEMINI_API_KEY: SecretStr = Field(default="", description="Google Gemini API key", alias="gemini_api_key")
    GEMINI_DEFAULT_MODEL: str = Field(default="gemini-1.5-flash", alias="gemini_model")
    gemini_temperature: float = Field(default=0.7)
    gemini_max_tokens: int = Field(default=1000)

    # Anthropic Claude (Fallback Provider)
    ANTHROPIC_API_KEY: Optional[SecretStr] = Field(default=None, description="Anthropic API key for fallback", alias="anthropic_api_key")
    ANTHROPIC_DEFAULT_MODEL: str = Field(default="claude-3-5-sonnet-20241022", alias="anthropic_model")

    # =====================================================
    # Database Configuration
    # =====================================================

    # Supabase/MCP Configuration
    SUPABASE_URL: str = Field(default="https://placeholder.supabase.co", description="Supabase project URL", alias="supabase_url")
    SUPABASE_SERVICE_ROLE_KEY: SecretStr = Field(default="placeholder-service-role-key", description="Supabase service role key", alias="supabase_service_role_key")
    mcp_enabled_tables: list[str] = Field(
        default=["profiles", "user_settings", "pam_conversations", "expenses", "budgets"],
        description="Tables accessible via MCP"
    )

    # =====================================================
    # Cache and Rate Limiting
    # =====================================================

    # Redis Configuration
    redis_url: str = Field(default="redis://localhost:6379")
    redis_db: int = Field(default=0)
    redis_password: Optional[SecretStr] = Field(default=None)

    # Rate Limiting
    rate_limit_messages_per_hour: int = Field(default=100)
    rate_limit_burst_size: int = Field(default=10)

    # =====================================================
    # Safety and Guardrails
    # =====================================================

    # Guardrails Configuration
    safety_level: SafetyLevel = Field(default=SafetyLevel.MEDIUM)
    content_filtering_enabled: bool = Field(default=True)
    user_safety_monitoring: bool = Field(default=True)

    # =====================================================
    # Feature Flags
    # =====================================================

    # Service Enablement
    conversational_engine_enabled: bool = Field(default=True)
    context_manager_enabled: bool = Field(default=True)
    trip_logger_enabled: bool = Field(default=True)
    savings_tracker_enabled: bool = Field(default=True)
    safety_layer_enabled: bool = Field(default=True)

    # Real-time Features
    websocket_enabled: bool = Field(default=True)
    realtime_sync_enabled: bool = Field(default=True)

    # =====================================================
    # Development Settings
    # =====================================================

    # Development/Testing
    debug_mode: bool = Field(default=False)
    mock_ai_responses: bool = Field(default=False)
    log_level: str = Field(default="INFO")

    class Config:
        env_prefix = ""  # Accept standard environment variables
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # Ignore extra environment variables

    def get_gemini_config(self) -> GeminiConfig:
        """Get Gemini configuration"""
        return GeminiConfig(
            api_key=self.GEMINI_API_KEY.get_secret_value(),
            model=self.GEMINI_DEFAULT_MODEL,
            temperature=self.gemini_temperature,
            max_tokens=self.gemini_max_tokens
        )

    def get_mcp_config(self) -> MCPConfig:
        """Get MCP configuration"""
        return MCPConfig(
            supabase_url=self.SUPABASE_URL,
            service_role_key=self.SUPABASE_SERVICE_ROLE_KEY.get_secret_value(),
            enabled_tables=self.mcp_enabled_tables
        )

    def get_redis_config(self) -> RedisConfig:
        """Get Redis configuration"""
        return RedisConfig(
            url=self.redis_url,
            db=self.redis_db,
            password=self.redis_password.get_secret_value() if self.redis_password else None
        )

    def get_guardrails_config(self) -> GuardrailsConfig:
        """Get guardrails configuration"""
        return GuardrailsConfig(
            safety_level=self.safety_level,
            rate_limit_messages_per_hour=self.rate_limit_messages_per_hour,
            content_filtering_enabled=self.content_filtering_enabled,
            user_safety_monitoring=self.user_safety_monitoring
        )

# Global settings instance
pam2_settings = PAM2Settings()