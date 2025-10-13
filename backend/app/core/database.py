from typing import Optional
from functools import lru_cache
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


@lru_cache(maxsize=1)
def get_cached_supabase_client() -> Client:
    """
    Create a single shared Supabase client with connection pooling

    Using @lru_cache ensures only one client instance is created and reused
    across all requests, preventing connection exhaustion under high load.

    Returns:
        Supabase Client instance (cached)
    """
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

        client = create_client(str(url), key)
        logger.info("✅ Cached Supabase client created (connection pooling enabled)")
        return client
    except Exception as e:
        logger.error(f"Failed to create cached Supabase client: {str(e)}")
        class MockClient:
            def __getattr__(self, name):
                return lambda *args, **kwargs: None
        return MockClient()


def init_supabase() -> Client:
    """Initialize Supabase client using cached instance"""
    global supabase_client
    if not supabase_client:
        supabase_client = get_cached_supabase_client()
        logger.info("Supabase client initialized from cache")
    return supabase_client


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

    SIMPLIFIED APPROACH: For now, use service role client but bypass RLS for profile access.
    The LoadUserProfileTool will access the profiles table directly using service role permissions.

    Args:
        user_jwt: The user's JWT token from the request headers (for logging/debugging)

    Returns:
        Supabase client with service role access
    """
    try:
        # For now, use service role client with enhanced logging
        # This bypasses RLS but allows profile access
        logger.info(f"🔐 Creating user-context client for user JWT (simplified approach)")

        if user_jwt:
            # Parse JWT for debugging
            import jwt
            try:
                decoded = jwt.decode(user_jwt, options={"verify_signature": False})
                logger.info(f"🔐 User context: {decoded.get('sub')} ({decoded.get('email')})")
            except Exception:
                logger.warning("Could not parse user JWT for debugging")

        # Return service role client - this will bypass RLS but allow profile access
        service_client = get_supabase()
        logger.info("✅ Service role client returned for profile access (bypasses RLS)")
        return service_client

    except Exception as e:
        logger.error(f"Failed to create user-context Supabase client: {str(e)}")
        # Fallback to service role client
        logger.warning("Falling back to service role client")
        return get_supabase()
