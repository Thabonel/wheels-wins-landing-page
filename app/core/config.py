from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    # Environment
    ENVIRONMENT: str = "development"
    
    # API Keys
    OPENAI_API_KEY: str = ""
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    
    # Security
    SECRET_KEY: str = "your-secret-key-here"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "https://wheelsandwins.com",
        "https://www.wheelsandwins.com"
    ]
    
    # Redis (for future use)
    REDIS_URL: str = "redis://localhost:6379"
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "allow"
    }

settings = Settings()
