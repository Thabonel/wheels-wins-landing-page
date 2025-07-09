from typing import Optional
try:
    from supabase import create_client, Client
except Exception:  # pragma: no cover - fallback when supabase isn't installed
    class Client:  # type: ignore
        """Fallback client when supabase package is unavailable"""
        pass

    def create_client(*_, **__):  # type: ignore
        """Return a dummy client if supabase is missing"""
        return Client()
from app.core.config import settings
try:
    from app.core.logging import setup_logging, get_logger  # type: ignore
except Exception:  # pragma: no cover - fallback without optional deps
    import logging

    def setup_logging():
        pass
    
    def get_logger(name: str = "database") -> logging.Logger:
        return logging.getLogger(name)

setup_logging()
logger = get_logger(__name__)
supabase_client: Optional[Client] = None


def init_supabase() -> Client:
    """Initialize Supabase client"""
    global supabase_client
    try:
        url = getattr(settings, "SUPABASE_URL", None)
        key = getattr(settings, "SUPABASE_KEY", None)
        if not url or not key:
            logger.warning("Supabase settings not configured; using dummy client")
            return Client()

        supabase_client = create_client(url, key)
        logger.info("Supabase client initialized successfully")
        return supabase_client
    except Exception as e:
        logger.error(f"Failed to initialize Supabase: {str(e)}")
        return Client()


def get_supabase() -> Client:
    """Get Supabase client instance"""
    if not supabase_client:
        return init_supabase()
    return supabase_client


def get_supabase_client() -> Client:
    """Alias for get_supabase() for backward compatibility"""
    return get_supabase()
