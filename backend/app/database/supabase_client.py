

from typing import Optional
from supabase import create_client, Client
from app.core.config import settings
from app.core.logging import setup_logging, get_logger

setup_logging()
logger = get_logger(__name__)
supabase_client: Optional[Client] = None
supabase_service_client: Optional[Client] = None

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
        class MockClient:
            def __getattr__(self, name):
                return lambda *args, **kwargs: None
        return MockClient()

def get_supabase() -> Client:
    """Get Supabase client instance"""
    if not supabase_client:
        return init_supabase()
    return supabase_client

def get_supabase_client() -> Client:
    """Alias for get_supabase() for backward compatibility"""
    return get_supabase()

def init_supabase_service() -> Client:
    """Initialize Supabase service client with admin privileges"""
    global supabase_service_client
    try:
        if not settings.SUPABASE_SERVICE_ROLE_KEY:
            logger.warning("SUPABASE_SERVICE_ROLE_KEY not configured, falling back to regular client")
            return get_supabase()
            
        supabase_service_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY
        )
        logger.info("Supabase service client initialized successfully")
        return supabase_service_client
    except Exception as e:
        logger.error(f"Failed to initialize Supabase service client: {str(e)}")
        logger.info("Falling back to regular client")
        return get_supabase()

def get_supabase_service() -> Client:
    """Get Supabase service client for admin operations"""
    if not supabase_service_client:
        return init_supabase_service()
    return supabase_service_client

