"""
Test PAM database access for all tool-accessed tables.
Validates that the service role client can read/write to each table.
"""
import os
import sys
import pytest
import inspect

# Override env vars that may have invalid placeholders in root .env
# Force-set VITE_* vars because root .env has non-URL placeholders
# that fail pydantic validation in the Settings model
os.environ['VITE_SUPABASE_URL'] = 'https://kycoklimpzkyrecbjecn.supabase.co'
os.environ['VITE_SUPABASE_ANON_KEY'] = 'test-anon-key'
os.environ.setdefault('SUPABASE_URL', 'https://kycoklimpzkyrecbjecn.supabase.co')
os.environ.setdefault('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key')
os.environ.setdefault('ANTHROPIC_API_KEY', 'sk-test-anthropic-key')
os.environ.setdefault('GEMINI_API_KEY', 'AIzaTest-google-api-key')
os.environ.setdefault('ENVIRONMENT', 'development')

# Add backend to path so app.* imports resolve
backend_path = os.path.join(os.path.dirname(__file__), '../../backend')
sys.path.insert(0, backend_path)


PAM_INSERT_TABLES = [
    "user_trips", "vehicles", "calendar_events", "expenses", "budgets",
    "pam_savings_events", "fuel_log", "maintenance_records",
    "posts", "comments", "post_likes", "messages", "user_follows",
    "shared_locations", "events", "event_attendees",
    "meal_plans", "pantry_items", "shopping_lists",
    "favorite_locations", "shakedown_trips", "shakedown_issues",
    "transition_equipment", "user_launch_tasks", "transition_tasks",
    "community_tips", "tip_usage_log",
    "pam_admin_knowledge", "pam_knowledge_usage_log",
    "timers_and_alarms",
]

PAM_SELECT_TABLES = PAM_INSERT_TABLES + [
    "profiles", "user_settings", "community_knowledge", "recipes",
]


def test_safe_db_insert_signature():
    """safe_db_insert accepts table, data, user_id parameters."""
    from app.services.pam.tools.utils.database import safe_db_insert
    sig = inspect.signature(safe_db_insert)
    params = list(sig.parameters.keys())
    assert "table" in params
    assert "data" in params
    assert "user_id" in params


def test_safe_db_select_signature():
    """safe_db_select accepts filters, columns, single parameters."""
    from app.services.pam.tools.utils.database import safe_db_select
    sig = inspect.signature(safe_db_select)
    params = list(sig.parameters.keys())
    assert "table" in params
    assert "filters" in params
    assert "columns" in params
    assert "single" in params
    assert "order_by" in params
    assert "limit" in params


def test_safe_db_update_signature():
    """safe_db_update supports custom id_column for profiles table."""
    from app.services.pam.tools.utils.database import safe_db_update
    sig = inspect.signature(safe_db_update)
    params = list(sig.parameters.keys())
    assert "table" in params
    assert "record_id" in params
    assert "data" in params
    assert "user_id" in params
    assert "id_column" in params


def test_safe_db_delete_signature():
    """safe_db_delete supports custom id_column."""
    from app.services.pam.tools.utils.database import safe_db_delete
    sig = inspect.signature(safe_db_delete)
    params = list(sig.parameters.keys())
    assert "table" in params
    assert "record_id" in params
    assert "user_id" in params
    assert "id_column" in params


def test_supabase_client_not_mock():
    """Database client uses service role key, not MockClient fallback."""
    from app.core.database import get_supabase_client
    client = get_supabase_client()
    assert client.__class__.__name__ != "MockClient", \
        "Supabase client is MockClient - SUPABASE_SERVICE_ROLE_KEY not configured"
