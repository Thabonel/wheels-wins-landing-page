from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Any, Dict
from app.core.database import get_supabase_client

router = APIRouter(prefix="/api/v1/system-settings", tags=["System Settings"])


class SettingPayload(BaseModel):
    value: Any


def _get_setting(key: str) -> Any:
    supabase = get_supabase_client()
    res = supabase.table("system_settings").select("setting_value").eq("setting_key", key).maybe_single().execute()
    if getattr(res, 'error', None):
        raise HTTPException(status_code=500, detail=str(res.error))
    data = getattr(res, 'data', None)
    if not data:
        return None
    return data.get("setting_value")


def _upsert_setting(key: str, value: Any, user_id: str | None = None) -> bool:
    supabase = get_supabase_client()
    payload = {"setting_key": key, "setting_value": value}
    if user_id:
        payload["updated_by"] = user_id
    res = supabase.table("system_settings").upsert(payload, on_conflict="setting_key").execute()
    if getattr(res, 'error', None):
        raise HTTPException(status_code=500, detail=str(res.error))
    return True


@router.get("")
async def list_settings() -> Dict[str, Any]:
    supabase = get_supabase_client()
    res = supabase.table("system_settings").select("setting_key, setting_value").execute()
    if getattr(res, 'error', None):
        raise HTTPException(status_code=500, detail=str(res.error))
    settings = {row["setting_key"]: row["setting_value"] for row in getattr(res, 'data', []) or []}
    return settings


@router.get("/{key}")
async def get_setting(key: str) -> Dict[str, Any]:
    return {"key": key, "value": _get_setting(key)}


@router.put("/{key}")
async def set_setting(key: str, payload: SettingPayload) -> Dict[str, Any]:
    # NOTE: RLS on system_settings requires admin; Supabase enforces this via service role/user JWT.
    _upsert_setting(key, payload.value)
    return {"success": True}

