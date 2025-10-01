"""
Supabase integration shim - re-exports database client functions
"""
from app.database.supabase_client import (
    get_supabase_client,
    get_supabase,
    init_supabase
)

__all__ = ['get_supabase_client', 'get_supabase', 'init_supabase']
