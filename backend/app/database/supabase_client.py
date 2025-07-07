

from typing import Optional
from supabase import create_client, Client
from app.core.config import settings
from app.core.logging import setup_logging

logger = setup_logging()
supabase_client: Optional[Client] = None

def init_supabase() -> Client:
    """Initialize Supabase client"""
    global supabase_client
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

def get_supabase() -> Client:
    """Get Supabase client instance"""
    if not supabase_client:
        return init_supabase()
    return supabase_client

def get_supabase_client() -> Client:
    """Alias for get_supabase() for backward compatibility"""
    return get_supabase()

