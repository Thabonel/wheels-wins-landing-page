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
        key = getattr(settings, "SUPABASE_SERVICE_ROLE_KEY", None)
        
        # Convert SecretStr to string if needed
        if hasattr(key, 'get_secret_value'):
            key = key.get_secret_value()
        
        if not url or not key:
            logger.warning("Supabase settings not configured; using dummy client")
            class MockClient:
                def __getattr__(self, name):
                    return lambda *args, **kwargs: None
            return MockClient()

        supabase_client = create_client(str(url), key)
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


def get_user_context_supabase_client(user_jwt: str) -> Client:
    """Get Supabase client with user authentication context for RLS

    This creates a Supabase client using the user's JWT token instead of the service role key.
    This ensures that auth.uid() returns the correct user ID and RLS policies are respected.

    Args:
        user_jwt: The user's JWT token from the request headers

    Returns:
        Supabase client with user authentication context
    """
    try:
        url = getattr(settings, "SUPABASE_URL", None)

        if not url:
            logger.warning("SUPABASE_URL not configured; using dummy client")
            class MockClient:
                def __getattr__(self, name):
                    return lambda *args, **kwargs: None
            return MockClient()

        # Create client with user JWT instead of service role key
        # This ensures auth.uid() works correctly in RLS policies
        user_client = create_client(str(url), user_jwt)
        logger.info("User-context Supabase client created successfully")
        return user_client

    except Exception as e:
        logger.error(f"Failed to create user-context Supabase client: {str(e)}")
        # Fallback to service role client if user context fails
        logger.warning("Falling back to service role client")
        return get_supabase()
