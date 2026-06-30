"""
Admin AI Control Center API
Runtime AI registry management — provider, model, and route configuration.
All endpoints require admin authentication. Secrets never exposed.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.unified_auth import require_admin, UnifiedUser

router = APIRouter(prefix="/ai-control", tags=["admin", "ai-control"])


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class ProviderRead(BaseModel):
    id: str
    provider_key: str
    family: str
    display_name: str
    enabled: bool
    base_url: Optional[str] = None
    data_region: Optional[str] = None
    secret_ref: str
    created_at: str
    updated_at: str


class ProviderWrite(BaseModel):
    provider_key: Optional[str] = None
    family: Optional[str] = None
    display_name: Optional[str] = None
    enabled: Optional[bool] = None
    base_url: Optional[str] = None
    data_region: Optional[str] = None
    secret_ref: Optional[str] = None


class ModelSlotRead(BaseModel):
    id: str
    slot_key: str
    display_name: str
    provider_key: str
    model_id: str
    secret_ref: str
    enabled: bool
    capabilities: List[str] = []
    context_window: int
    input_cost_per_1m: float
    output_cost_per_1m: float
    created_at: str
    updated_at: str


class ModelSlotWrite(BaseModel):
    slot_key: Optional[str] = None
    display_name: Optional[str] = None
    provider_key: Optional[str] = None
    model_id: Optional[str] = None
    secret_ref: Optional[str] = None
    enabled: Optional[bool] = None
    capabilities: Optional[List[str]] = None
    context_window: Optional[int] = None
    input_cost_per_1m: Optional[float] = None
    output_cost_per_1m: Optional[float] = None


class TaskRouteRead(BaseModel):
    id: str
    task_key: str
    display_name: str
    primary_slot: str
    fallback_slots: List[str] = []
    required_capabilities: List[str] = []
    output_format: str
    max_tokens: int
    temperature: float
    enabled: bool
    risk_level: str
    created_at: str
    updated_at: str


class TaskRouteWrite(BaseModel):
    task_key: Optional[str] = None
    display_name: Optional[str] = None
    primary_slot: Optional[str] = None
    fallback_slots: Optional[List[str]] = None
    required_capabilities: Optional[List[str]] = None
    output_format: Optional[str] = None
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None
    enabled: Optional[bool] = None
    risk_level: Optional[str] = None


class UsageEventRead(BaseModel):
    id: str
    provider_key: Optional[str] = None
    model_slot: Optional[str] = None
    task_key: Optional[str] = None
    user_id: Optional[str] = None
    prompt_tokens: int
    completion_tokens: int
    latency_ms: int
    cost_estimate: float
    fallback_used: bool
    created_at: str


class BudgetSettingsRead(BaseModel):
    id: str
    monthly_budget_cap: float
    is_active: bool
    created_at: str
    updated_at: str


class BudgetSettingsWrite(BaseModel):
    monthly_budget_cap: Optional[float] = None
    is_active: Optional[bool] = None


class AuditLogEntry(BaseModel):
    id: str
    admin_user_id: str
    action: str
    entity_type: str
    entity_key: str
    old_values: Optional[Any] = None
    new_values: Optional[Any] = None
    change_note: Optional[str] = None
    created_at: str


class TestPromptRequest(BaseModel):
    task_key: str = "admin_test"
    prompt: str


class TestPromptResponse(BaseModel):
    provider: str
    model: str
    response_text: str
    latency_ms: float
    prompt_tokens: int = 0
    completion_tokens: int = 0
    cost_estimate: float = 0.0
    fallback_used: bool = False
    warnings: List[str] = []


class SavePayload(BaseModel):
    change_note: str = ""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_jsonb(val, default=None):
    if val is None:
        return default if default is not None else []
    if isinstance(val, list):
        return val
    try:
        return json.loads(val)
    except (json.JSONDecodeError, TypeError):
        return default if default is not None else []


def _valid_family(family: str) -> bool:
    return family in ("anthropic", "openai", "deepseek", "gemini")


def _valid_risk(risk: str) -> bool:
    return risk in ("low", "medium", "high")


async def _audit(client, admin_user_id: str, action: str, entity_type: str,
                  entity_key: str, old_values=None, new_values=None,
                  change_note: str = ""):
    try:
        await client.table("ai_admin_audit_log").insert({
            "admin_user_id": admin_user_id,
            "action": action,
            "entity_type": entity_type,
            "entity_key": entity_key,
            "old_values": old_values,
            "new_values": new_values,
            "change_note": change_note,
        }).execute()
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Overview
# ---------------------------------------------------------------------------

@router.get("/overview")
async def overview(current_user: UnifiedUser = Depends(require_admin)):
    client = current_user.get_supabase_client()
    providers = (await client.table("ai_providers").select("*").execute()).data
    models = (await client.table("ai_models").select("*").execute()).data
    routes = (await client.table("ai_task_routes").select("*").execute()).data

    warnings: List[str] = []
    enabled_providers = {p["provider_key"] for p in providers if p.get("enabled")}
    for m in models:
        if m.get("enabled") and m["provider_key"] not in enabled_providers:
            warnings.append(f"Model '{m['slot_key']}' uses disabled provider '{m['provider_key']}'")
    for r in routes:
        if r.get("enabled"):
            slot = r["primary_slot"]
            model = next((m for m in models if m["slot_key"] == slot), None)
            if model and not model.get("enabled"):
                warnings.append(f"Route '{r['task_key']}' primary slot '{slot}' is disabled")
            req_caps = set(r.get("required_capabilities", []))
            if model:
                model_caps = set(model.get("capabilities", []))
                missing = req_caps - model_caps
                if missing:
                    warnings.append(f"Route '{r['task_key']}' missing caps: {sorted(missing)}")

    return {
        "providers_enabled": sum(1 for p in providers if p.get("enabled")),
        "providers_total": len(providers),
        "models_enabled": sum(1 for m in models if m.get("enabled")),
        "models_total": len(models),
        "routes_enabled": sum(1 for r in routes if r.get("enabled")),
        "routes_total": len(routes),
        "warnings": warnings,
        "timestamp": _now(),
    }


# ---------------------------------------------------------------------------
# Providers
# ---------------------------------------------------------------------------

@router.get("/providers", response_model=List[ProviderRead])
async def list_providers(current_user: UnifiedUser = Depends(require_admin)):
    client = current_user.get_supabase_client()
    data = (await client.table("ai_providers").select("*").order("provider_key").execute()).data
    return [_provider_out(p) for p in data]


@router.put("/providers/{provider_key}", response_model=ProviderRead)
async def update_provider(
    provider_key: str,
    body: ProviderWrite,
    meta: SavePayload = SavePayload(),
    current_user: UnifiedUser = Depends(require_admin),
):
    client = current_user.get_supabase_client()
    existing = (await client.table("ai_providers").select("*").eq("provider_key", provider_key).execute()).data
    if not existing:
        raise HTTPException(404, f"Provider '{provider_key}' not found")
    old = _provider_out(existing[0])

    patch = body.model_dump(exclude_none=True)
    if "family" in patch and not _valid_family(patch["family"]):
        raise HTTPException(400, f"Invalid family: {patch['family']}")
    patch["updated_at"] = _now()

    await client.table("ai_providers").update(patch).eq("provider_key", provider_key).execute()
    new = (await client.table("ai_providers").select("*").eq("provider_key", provider_key).execute()).data[0]
    await _audit(client, current_user.user_id, "update_provider", "provider", provider_key,
                 old.model_dump(), _provider_out(new).model_dump(), meta.change_note)
    return _provider_out(new)


def _provider_out(row: dict) -> ProviderRead:
    return ProviderRead(
        id=row["id"], provider_key=row["provider_key"], family=row["family"],
        display_name=row["display_name"], enabled=row["enabled"],
        base_url=row.get("base_url"), data_region=row.get("data_region"),
        secret_ref=row["secret_ref"], created_at=row["created_at"], updated_at=row["updated_at"],
    )


# ---------------------------------------------------------------------------
# Model slots
# ---------------------------------------------------------------------------

@router.get("/models", response_model=List[ModelSlotRead])
async def list_models(current_user: UnifiedUser = Depends(require_admin)):
    client = current_user.get_supabase_client()
    data = (await client.table("ai_models").select("*").order("slot_key").execute()).data
    return [_model_out(m) for m in data]


@router.put("/models/{slot_key}", response_model=ModelSlotRead)
async def update_model(
    slot_key: str,
    body: ModelSlotWrite,
    meta: SavePayload = SavePayload(),
    current_user: UnifiedUser = Depends(require_admin),
):
    client = current_user.get_supabase_client()
    existing = (await client.table("ai_models").select("*").eq("slot_key", slot_key).execute()).data
    if not existing:
        raise HTTPException(404, f"Model slot '{slot_key}' not found")
    old = _model_out(existing[0])

    patch = body.model_dump(exclude_none=True)
    if "capabilities" in patch and "text" not in patch["capabilities"]:
        raise HTTPException(400, "A model slot must include the 'text' capability")
    if "provider_key" in patch:
        prov = (await client.table("ai_providers").select("*").eq("provider_key", patch["provider_key"]).execute()).data
        if not prov:
            raise HTTPException(400, f"Provider '{patch['provider_key']}' not found")
    patch["updated_at"] = _now()

    await client.table("ai_models").update(patch).eq("slot_key", slot_key).execute()
    new_row = (await client.table("ai_models").select("*").eq("slot_key", slot_key).execute()).data[0]
    await _audit(client, current_user.user_id, "update_model", "model", slot_key,
                 old.model_dump(), _model_out(new_row).model_dump(), meta.change_note)
    return _model_out(new_row)


def _model_out(row: dict) -> ModelSlotRead:
    return ModelSlotRead(
        id=row["id"], slot_key=row["slot_key"], display_name=row["display_name"],
        provider_key=row["provider_key"], model_id=row["model_id"],
        secret_ref=row["secret_ref"], enabled=bool(row.get("enabled", True)),
        capabilities=_parse_jsonb(row.get("capabilities"), []),
        context_window=row.get("context_window", 8192),
        input_cost_per_1m=float(row.get("input_cost_per_1m", 0)),
        output_cost_per_1m=float(row.get("output_cost_per_1m", 0)),
        created_at=row["created_at"], updated_at=row["updated_at"],
    )


# ---------------------------------------------------------------------------
# Task routes
# ---------------------------------------------------------------------------

@router.get("/routes", response_model=List[TaskRouteRead])
async def list_routes(current_user: UnifiedUser = Depends(require_admin)):
    client = current_user.get_supabase_client()
    data = (await client.table("ai_task_routes").select("*").order("task_key").execute()).data
    return [_route_out(r) for r in data]


@router.put("/routes/{task_key}", response_model=TaskRouteRead)
async def update_route(
    task_key: str,
    body: TaskRouteWrite,
    meta: SavePayload = SavePayload(),
    current_user: UnifiedUser = Depends(require_admin),
):
    client = current_user.get_supabase_client()
    existing = (await client.table("ai_task_routes").select("*").eq("task_key", task_key).execute()).data
    if not existing:
        raise HTTPException(404, f"Route '{task_key}' not found")
    old = _route_out(existing[0])

    patch = body.model_dump(exclude_none=True)
    if "risk_level" in patch and not _valid_risk(patch["risk_level"]):
        raise HTTPException(400, f"Invalid risk_level: {patch['risk_level']}")
    if "primary_slot" in patch:
        slot = (await client.table("ai_models").select("*").eq("slot_key", patch["primary_slot"]).execute()).data
        if not slot:
            raise HTTPException(400, f"Model slot '{patch['primary_slot']}' not found")
    patch["updated_at"] = _now()

    await client.table("ai_task_routes").update(patch).eq("task_key", task_key).execute()
    new_row = (await client.table("ai_task_routes").select("*").eq("task_key", task_key).execute()).data[0]
    await _audit(client, current_user.user_id, "update_route", "route", task_key,
                 old.model_dump(), _route_out(new_row).model_dump(), meta.change_note)
    return _route_out(new_row)


def _route_out(row: dict) -> TaskRouteRead:
    return TaskRouteRead(
        id=row["id"], task_key=row["task_key"], display_name=row["display_name"],
        primary_slot=row["primary_slot"],
        fallback_slots=_parse_jsonb(row.get("fallback_slots"), []),
        required_capabilities=_parse_jsonb(row.get("required_capabilities"), []),
        output_format=row.get("output_format", "text"),
        max_tokens=row.get("max_tokens", 4096),
        temperature=float(row.get("temperature", 0.7)),
        enabled=bool(row.get("enabled", True)),
        risk_level=row.get("risk_level", "low"),
        created_at=row["created_at"], updated_at=row["updated_at"],
    )


# ---------------------------------------------------------------------------
# Usage
# ---------------------------------------------------------------------------

@router.get("/usage", response_model=List[UsageEventRead])
async def list_usage(limit: int = 100, current_user: UnifiedUser = Depends(require_admin)):
    client = current_user.get_supabase_client()
    data = (await client.table("ai_usage_events").select("*").order("created_at", desc=True).limit(min(limit, 1000)).execute()).data
    return [_usage_out(u) for u in data]


@router.get("/usage/summary")
async def usage_summary(current_user: UnifiedUser = Depends(require_admin)):
    client = current_user.get_supabase_client()
    data = (await client.table("ai_usage_events").select("*").order("created_at", desc=True).limit(2000).execute()).data

    by_provider: Dict[str, float] = {}
    by_task: Dict[str, float] = {}
    by_model: Dict[str, float] = {}
    total_cost = 0.0

    for u in data:
        pk = u.get("provider_key", "unknown")
        tk = u.get("task_key", "unknown")
        ms = u.get("model_slot", "unknown")
        cost = float(u.get("cost_estimate", 0))
        by_provider[pk] = by_provider.get(pk, 0) + cost
        by_task[tk] = by_task.get(tk, 0) + cost
        by_model[ms] = by_model.get(ms, 0) + cost
        total_cost += cost

    return {
        "total_cost": round(total_cost, 4),
        "by_provider": by_provider,
        "by_task": by_task,
        "by_model": by_model,
        "events_count": len(data),
    }


def _usage_out(row: dict) -> UsageEventRead:
    return UsageEventRead(
        id=row["id"], provider_key=row.get("provider_key"), model_slot=row.get("model_slot"),
        task_key=row.get("task_key"), user_id=row.get("user_id"),
        prompt_tokens=row.get("prompt_tokens", 0), completion_tokens=row.get("completion_tokens", 0),
        latency_ms=row.get("latency_ms", 0), cost_estimate=float(row.get("cost_estimate", 0)),
        fallback_used=bool(row.get("fallback_used", False)), created_at=row["created_at"],
    )


# ---------------------------------------------------------------------------
# Budget
# ---------------------------------------------------------------------------

@router.get("/budget", response_model=BudgetSettingsRead)
async def get_budget(current_user: UnifiedUser = Depends(require_admin)):
    client = current_user.get_supabase_client()
    data = (await client.table("ai_budget_settings").select("*").limit(1).execute()).data
    if not data:
        raise HTTPException(404, "No budget settings found")
    row = data[0]
    return BudgetSettingsRead(
        id=row["id"], monthly_budget_cap=float(row["monthly_budget_cap"]),
        is_active=bool(row["is_active"]), created_at=row["created_at"], updated_at=row["updated_at"],
    )


@router.put("/budget", response_model=BudgetSettingsRead)
async def update_budget(
    body: BudgetSettingsWrite,
    meta: SavePayload = SavePayload(),
    current_user: UnifiedUser = Depends(require_admin),
):
    client = current_user.get_supabase_client()
    existing = (await client.table("ai_budget_settings").select("*").limit(1).execute()).data
    if not existing:
        raise HTTPException(404, "No budget settings found")
    old = existing[0]
    patch = body.model_dump(exclude_none=True)
    patch["updated_at"] = _now()

    await client.table("ai_budget_settings").update(patch).eq("id", old["id"]).execute()
    new_row = (await client.table("ai_budget_settings").select("*").eq("id", old["id"]).execute()).data[0]
    await _audit(client, current_user.user_id, "update_budget", "budget", str(old["id"]),
                 {"monthly_budget_cap": old.get("monthly_budget_cap"), "is_active": old.get("is_active")},
                 {"monthly_budget_cap": new_row.get("monthly_budget_cap"), "is_active": new_row.get("is_active")},
                 meta.change_note)
    return BudgetSettingsRead(
        id=new_row["id"], monthly_budget_cap=float(new_row["monthly_budget_cap"]),
        is_active=bool(new_row["is_active"]), created_at=new_row["created_at"], updated_at=new_row["updated_at"],
    )


# ---------------------------------------------------------------------------
# Audit log
# ---------------------------------------------------------------------------

@router.get("/audit", response_model=List[AuditLogEntry])
async def list_audit_logs(limit: int = 100, current_user: UnifiedUser = Depends(require_admin)):
    client = current_user.get_supabase_client()
    data = (await client.table("ai_admin_audit_log").select("*").order("created_at", desc=True).limit(min(limit, 500)).execute()).data
    return [
        AuditLogEntry(
            id=r["id"], admin_user_id=r["admin_user_id"], action=r["action"],
            entity_type=r["entity_type"], entity_key=r["entity_key"],
            old_values=r.get("old_values"), new_values=r.get("new_values"),
            change_note=r.get("change_note"), created_at=r["created_at"],
        ) for r in data
    ]


# ---------------------------------------------------------------------------
# Orchestrator status & test prompt
# ---------------------------------------------------------------------------

@router.get("/orchestrator-status")
async def orchestrator_status(current_user: UnifiedUser = Depends(require_admin)):
    from app.services.ai.ai_orchestrator import ai_orchestrator
    return ai_orchestrator.get_status()


@router.post("/test-prompt", response_model=TestPromptResponse)
async def test_prompt(
    body: TestPromptRequest,
    current_user: UnifiedUser = Depends(require_admin),
):
    import time
    from app.services.ai.ai_orchestrator import ai_orchestrator
    from app.services.ai.provider_interface import AIMessage

    warnings: List[str] = []
    client = current_user.get_supabase_client()

    route_data = (await client.table("ai_task_routes").select("*").eq("task_key", body.task_key).execute()).data
    if not route_data:
        raise HTTPException(400, f"Unknown task: {body.task_key}")
    route = route_data[0]
    if not route.get("enabled"):
        raise HTTPException(400, f"Route '{body.task_key}' is disabled")

    primary_slot = route["primary_slot"]
    model_data = (await client.table("ai_models").select("*").eq("slot_key", primary_slot).execute()).data
    if not model_data or not model_data[0].get("enabled"):
        warnings.append(f"Primary slot '{primary_slot}' is disabled or missing")

    start = time.time()
    try:
        messages = [AIMessage(role="user", content=body.prompt)]
        response = await ai_orchestrator.complete(
            messages=messages,
            user_id=current_user.user_id,
            temperature=float(route.get("temperature", 0.7)),
            max_tokens=route.get("max_tokens", 1024),
        )
        latency = (time.time() - start) * 1000

        resp_text = getattr(response, 'content', '') or str(response)
        usage = getattr(response, 'usage', None)
        pt = getattr(usage, 'prompt_tokens', 0) or 0 if usage else 0
        ct = getattr(usage, 'completion_tokens', 0) or 0 if usage else 0
        provider_used = getattr(response, 'provider', 'unknown') or 'unknown'
        model_used = getattr(response, 'model', 'unknown') or 'unknown'

        cost = 0.0
        if model_data:
            cost = (pt * float(model_data[0].get("input_cost_per_1m", 0)) / 1_000_000 +
                    ct * float(model_data[0].get("output_cost_per_1m", 0)) / 1_000_000)

        return TestPromptResponse(
            provider=provider_used, model=model_used, response_text=resp_text,
            latency_ms=round(latency, 1), prompt_tokens=pt, completion_tokens=ct,
            cost_estimate=round(cost, 6), fallback_used=False, warnings=warnings,
        )
    except Exception as exc:
        latency = (time.time() - start) * 1000
        return TestPromptResponse(
            provider="error", model="error", response_text=f"Error: {str(exc)}",
            latency_ms=round(latency, 1), warnings=warnings,
        )
