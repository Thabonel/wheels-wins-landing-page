from typing import Optional
from supabase import create_client, Client
from app.core.config import settings
from app.core.logging import setup_logging

logger = setup_logging()
supabase_client: Optional[Client] = None

def init_supabase() -> Optional[Client]:
    """Initialize Supabase client"""
    global supabase_client
    
    # Skip initialization if credentials are not available (local development)
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        logger.info("Supabase credentials not available - running in local development mode")
        return None
    
    try:
        supabase_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_KEY
        )
        logger.info("Supabase client initialized successfully")
        return supabase_client
    except Exception as e:
        logger.error(f"Failed to initialize Supabase: {str(e)}")
        raise

def get_supabase() -> Optional[Client]:
    """Get Supabase client instance"""
    if not supabase_client:
        return init_supabase()
    return supabase_client
