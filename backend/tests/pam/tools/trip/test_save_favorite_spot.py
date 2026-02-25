import importlib.util
from pathlib import Path

import pytest


MODULE_PATH = Path("backend/app/services/pam/tools/trip/save_favorite_spot.py")
SPEC = importlib.util.spec_from_file_location("save_favorite_spot_module", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(MODULE)


@pytest.mark.asyncio
async def test_save_favorite_spot_resolves_address_when_missing(monkeypatch):
    captured = {}

    async def fake_safe_db_insert(table_name, data, user_id):
        captured["table_name"] = table_name
        captured["data"] = data
        captured["user_id"] = user_id
        return {"id": "fav-1", **data}

    async def fake_resolve_location_address(location_name, location_address):
        assert location_name == "Minimbah Fishing Lodge"
        assert location_address is None
        return "Minimbah Fishing Lodge, 126 Minimbah Road, Nabiac NSW 2312, Australia"

    monkeypatch.setattr(MODULE, "safe_db_insert", fake_safe_db_insert)
    monkeypatch.setattr(MODULE, "_resolve_location_address", fake_resolve_location_address)

    user_id = "21a2151a-cd37-41d5-a1c7-124bb05e7a6a"

    result = await MODULE.save_favorite_spot(
        user_id=user_id,
        location_name="Minimbah Fishing Lodge",
        category="campground",
        notes="Around 3 hours from Sydney",
    )

    assert result["success"] is True
    assert captured["table_name"] == "favorite_locations"
    assert captured["user_id"] == user_id
    assert captured["data"]["location_name"] == "Minimbah Fishing Lodge"
    assert captured["data"]["location_address"].startswith("Minimbah Fishing Lodge")


@pytest.mark.asyncio
async def test_save_favorite_spot_uses_provided_location_address(monkeypatch):
    captured = {}

    async def fake_safe_db_insert(table_name, data, user_id):
        captured["data"] = data
        return {"id": "fav-2", **data}

    def fail_if_called(*_args, **_kwargs):
        raise AssertionError("Resolver should not run when location_address is provided")

    monkeypatch.setattr(MODULE, "safe_db_insert", fake_safe_db_insert)
    monkeypatch.setattr(MODULE, "_lookup_address_sync", fail_if_called)

    user_id = "21a2151a-cd37-41d5-a1c7-124bb05e7a6a"

    await MODULE.save_favorite_spot(
        user_id=user_id,
        location_name="Minimbah Fishing Lodge",
        location_address="Minimbah, NSW",
        category="campground",
    )

    assert captured["data"]["location_address"] == "Minimbah, NSW"


@pytest.mark.asyncio
async def test_resolve_location_address_falls_back_to_name_on_lookup_error(monkeypatch):
    def failing_lookup(_location_query):
        raise RuntimeError("network failure")

    monkeypatch.setattr(MODULE, "_lookup_address_sync", failing_lookup)

    result = await MODULE._resolve_location_address(
        location_name="Minimbah Fishing Lodge",
        location_address=None,
    )

    assert result == "Minimbah Fishing Lodge"
