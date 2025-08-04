"""
Supabase database integration
"""
from supabase import create_client, Client
from app.core.infra_config import infra_settings

# Create Supabase client
supabase: Client = create_client(
    infra_settings.SUPABASE_URL,
    infra_settings.SUPABASE_KEY
)

# Service role client for admin operations
if infra_settings.SUPABASE_SERVICE_ROLE_KEY:
    supabase_admin: Client = create_client(
        infra_settings.SUPABASE_URL,
        infra_settings.SUPABASE_SERVICE_ROLE_KEY
    )
else:
    supabase_admin = supabase

def get_supabase_client() -> Client:
    """Get the Supabase client instance"""
    return supabase