"""
Simplified Configuration for Render Deployment
Minimal config to get the backend running
"""

import os
from typing import Optional

# Simple settings class without Pydantic for basic deployment
class SimpleSettings:
    def __init__(self):
        # Environment - Override any production settings for staging deployment
        os.environ["NODE_ENV"] = "staging"
        os.environ["ENVIRONMENT"] = "staging"
        
        self.NODE_ENV = "staging"  # Force staging environment
        self.ENVIRONMENT = "staging"  # Also set ENVIRONMENT
        self.DEBUG = True  # Enable debug for staging
        
        # App URL for staging
        self.APP_URL = os.getenv("APP_URL", "https://wheels-wins-backend-staging.onrender.com")
        
        # Supabase
        self.SUPABASE_URL = os.getenv("SUPABASE_URL", "")
        self.SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
        self.SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        
        # AI
        self.OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
        
        # Security
        self.SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
        self.JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", self.SECRET_KEY)
        
        # Database
        self.DATABASE_URL = os.getenv("DATABASE_URL", "")
        self.REDIS_URL = os.getenv("REDIS_URL", "")
        
        # CORS - Only staging frontend URLs, no localhost
        cors_origins = os.getenv("CORS_ALLOWED_ORIGINS", "https://staging-wheelsandwins.netlify.app,https://wheels-wins-staging.netlify.app")
        self.CORS_ALLOWED_ORIGINS = [origin.strip() for origin in cors_origins.split(",") if not "localhost" in origin]
        
        # TTS
        self.TTS_ENABLED = os.getenv("TTS_ENABLED", "true").lower() == "true"
        self.TTS_PRIMARY_ENGINE = os.getenv("TTS_PRIMARY_ENGINE", "edge")
        self.TTS_FALLBACK_ENABLED = os.getenv("TTS_FALLBACK_ENABLED", "true").lower() == "true"
        self.TTS_VOICE_DEFAULT = os.getenv("TTS_VOICE_DEFAULT", "en-US-AriaNeural")
        
        # Monitoring
        self.SENTRY_DSN = os.getenv("SENTRY_DSN", "")
        self.SENTRY_ENVIRONMENT = os.getenv("SENTRY_ENVIRONMENT", self.NODE_ENV)

# Create settings instance
simple_settings = SimpleSettings()

# Export for backwards compatibility
settings = simple_settings