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


class DatabaseUnavailableError(Exception):
    """Raised when the Supabase database client cannot be created.

    Callers should catch this and surface a clear error to the user rather
    than letting it propagate silently.
    """
    pass


@lru_cache(maxsize=1)
def get_cached_supabase_client() -> Client:
    """
    Create a single shared Supabase client with connection pooling.

    Using @lru_cache ensures only one client instance is created and reused
    across all requests, preventing connection exhaustion under high load.

    Raises:
        DatabaseUnavailableError: If credentials are missing or client creation fails.
    """
    url = getattr(settings, "SUPABASE_URL", None)
    key = getattr(settings, "SUPABASE_SERVICE_ROLE_KEY", None)

    # Convert SecretStr to string if needed
    if hasattr(key, 'get_secret_value'):
        key = key.get_secret_value()

    if not url or not key:
        get_cached_supabase_client.cache_clear()
        raise DatabaseUnavailableError(
            "Supabase credentials not configured. "
            "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env."
        )

    try:
        client = create_client(str(url), key)
        logger.info("Cached Supabase client created (connection pooling enabled)")
        return client
    except Exception as e:
        get_cached_supabase_client.cache_clear()
        raise DatabaseUnavailableError(
            f"Failed to create Supabase client: {e}"
        ) from e


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
        if user_jwt:
            import jwt
            try:
                decoded = jwt.decode(user_jwt, options={"verify_signature": False})
                # Log user ID only - never log email or other PII
                logger.debug(f"User-context client for sub={decoded.get('sub')}")
            except Exception:
                pass

        return get_supabase()

    except Exception as e:
        logger.error(f"Failed to create user-context Supabase client: {e}")
        return get_supabase()
