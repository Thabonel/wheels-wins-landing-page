
from pydantic_settings import BaseSettings
from typing import List, Optional
import os

class Settings(BaseSettings):
    # Environment
    ENVIRONMENT: str = "development"
    
    # API Keys (optional for local development, required in production)
    OPENAI_API_KEY: Optional[str] = None
    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None
    
    # Web scraping data source URL
    OVERPASS_URL: str = (
        "https://overpass-api.de/api/interpreter?"
        "data=[out:json];node[\"tourism\"=\"camp_site\"]"
        "(around:50000,-33.86,151.21);out;"
    )
    
    # Security
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "https://wheelsandwins.com",
        "https://www.wheelsandwins.com",
        "https://4fd8d7d4-1c59-4996-a0dd-48be31131e7c.lovableproject.com",
        "https://*.lovableproject.com"
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
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        
        # Validate required fields for production
        if self.ENVIRONMENT == "production":
            required_fields = ["OPENAI_API_KEY", "SUPABASE_URL", "SUPABASE_KEY"]
            missing_fields = [field for field in required_fields if getattr(self, field) is None]
            
            if missing_fields:
                raise ValueError(f"Missing required environment variables for production: {', '.join(missing_fields)}")

# Instantiate settings
settings = Settings()
