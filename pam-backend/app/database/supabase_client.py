import os
from supabase import create_client, Client
import logging

logger = logging.getLogger(__name__)

# Get environment variables directly
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

def get_supabase_client() -> Client:
    """Initialize and return a Supabase client."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.error("Missing SUPABASE_URL or SUPABASE_KEY environment variables")
        raise ValueError("Missing Supabase configuration")
    
    return create_client(SUPABASE_URL, SUPABASE_KEY)