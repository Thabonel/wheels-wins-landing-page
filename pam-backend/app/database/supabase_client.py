from supabase import create_client
from app.core.config import settings


def get_supabase_client():
    """Initialize and return a Supabase client."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)