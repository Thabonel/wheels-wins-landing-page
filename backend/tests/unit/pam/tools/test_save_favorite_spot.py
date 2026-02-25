import importlib.util
import sys
import types
import uuid
from pathlib import Path

import pytest

# save_favorite_spot imports this module, but the function under test does not use it directly.
mock_supabase_module = types.ModuleType("app.integrations.supabase")
mock_supabase_module.get_supabase_client = lambda: None
sys.modules["app.integrations.supabase"] = mock_supabase_module

# Stub utility module to avoid loading full DB/config stack in tests.
mock_utils_module = types.ModuleType("app.services.pam.tools.utils")


def _validate_uuid(value, field_name):
    uuid.UUID(value)


def _validate_positive_number(value, field_name):
    if value <= 0:
        raise ValueError(f"{field_name} must be positive")


async def _safe_db_insert(table_name, data, user_id):
    return {"id": "stub", **data}


mock_utils_module.validate_uuid = _validate_uuid
mock_utils_module.validate_positive_number = _validate_positive_number
mock_utils_module.safe_db_insert = _safe_db_insert
sys.modules["app.services.pam.tools.utils"] = mock_utils_module

MODULE_PATH = (
    Path(__file__).resolve().parents[4]
    / "app/services/pam/tools/trip/save_favorite_spot.py"
)
spec = importlib.util.spec_from_file_location("save_favorite_spot_module", MODULE_PATH)
module = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(module)
save_favorite_spot = module.save_favorite_spot


@pytest.mark.unit
@pytest.mark.tools
@pytest.mark.asyncio
async def test_save_favorite_spot_persists_string_category(monkeypatch):
    captured = {}

    async def fake_safe_db_insert(table_name, data, user_id):
        captured["table_name"] = table_name
        captured["data"] = data
        captured["user_id"] = user_id
        return {"id": "favorite-1", **data}

    monkeypatch.setattr(module, "safe_db_insert", fake_safe_db_insert)

    user_id = "123e4567-e89b-12d3-a456-426614174000"
    result = await save_favorite_spot(
        user_id=user_id,
        location_name="Minimbah Fishing Lodge",
        location_address="3 hours from Sydney",
        category="campground",
    )

    assert result["success"] is True
    assert captured["table_name"] == "favorite_locations"
    assert captured["user_id"] == user_id
    assert captured["data"]["location_name"] == "Minimbah Fishing Lodge"
    assert captured["data"]["location_address"] == "3 hours from Sydney"
    assert captured["data"]["category"] == "campground"


@pytest.mark.unit
@pytest.mark.tools
@pytest.mark.asyncio
async def test_save_favorite_spot_accepts_rough_location(monkeypatch):
    async def fake_safe_db_insert(table_name, data, user_id):
        return {"id": "favorite-2", **data}

    monkeypatch.setattr(module, "safe_db_insert", fake_safe_db_insert)

    result = await save_favorite_spot(
        user_id="123e4567-e89b-12d3-a456-426614174001",
        location_name="Minimbah Fishing Lodge",
        location_address="3 hours from Sydney",
    )

    assert result["success"] is True
    assert result["favorite"]["location_address"] == "3 hours from Sydney"
