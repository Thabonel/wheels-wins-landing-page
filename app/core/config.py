from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # Environment
    ENVIRONMENT: str = "development"
    
    # API Keys (set in Render environment)
    OPENAI_API_KEY: str
    SUPABASE_URL: str
    SUPABASE_KEY: str

    # Web scraping data source URL
    OVERPASS_URL: str = (
        "https://overpass-api.de/api/interpreter?"
        "data=[out:json];node[\"tourism\"=\"camp_site\"]"
        "(around:50000,-33.86,151.21);out;"
    )
    
    # Security
    SECRET_KEY: str = "your-secret-key-here"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    # Allow all origins by default to prevent CORS preflight errors.
    # Override in production by setting the ALLOWED_ORIGINS environment variable
    # with a comma separated list or JSON array of allowed domains.
    ALLOWED_ORIGINS: List[str] = ["*"]
    
    # Redis (for future use)
    REDIS_URL: str = "redis://localhost:6379"
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "allow"
    }

# Instantiate settings (values for API keys and URLs come from Render environment)
settings = Settings()
