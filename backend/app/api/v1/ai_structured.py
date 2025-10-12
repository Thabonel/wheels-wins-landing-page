from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from typing import Any, Dict, Optional
import hashlib
import json
import os

from app.core.database import get_supabase_client


router = APIRouter(prefix="/api/v1", tags=["AI Structured Data"])


def _json_response_with_etag(payload: Dict[str, Any], last_modified: Optional[str] = None) -> JSONResponse:
    body = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    etag = hashlib.sha256(body).hexdigest()
    headers = {"ETag": etag}
    if last_modified:
        headers["Last-Modified"] = last_modified
    return JSONResponse(content=payload, headers=headers)


def _get_site_url() -> str:
    # Try settings first; fall back to environment
    site_url = os.getenv("SITE_URL") or os.getenv("PUBLIC_SITE_URL") or "https://wheelsandwins.com"
    return site_url.rstrip("/")


def _fetch_system_setting(key: str) -> Optional[Dict[str, Any]]:
    try:
        supabase = get_supabase_client()
        res = supabase.table("system_settings").select("setting_value, updated_at").eq("setting_key", key).maybe_single().execute()
        data = getattr(res, "data", None)
        if data and data.get("setting_value"):
            return data
    except Exception:
        # System settings table may not exist yet in some environments
        pass
    return None


@router.get("/answers")
async def get_answer_card(entity: str):
    """Return a compact Answer Card for an entity slug (AI-friendly)."""
    site = _get_site_url()
    sys = _fetch_system_setting(f"entity_{entity}")
    updated_at = sys.get("updated_at") if sys else None
    entity_data = (sys or {}).get("setting_value", {})

    answer = {
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        "entity": entity,
        "headline": entity_data.get("title") or entity.replace("-", " ").title(),
        "abstract": entity_data.get("summary") or "",
        "bullet_points": entity_data.get("key_facts") or [],
        "sources": entity_data.get("sources") or [],
        "license": entity_data.get("license") or "CC BY 4.0",
        "canonical_url": f"{site}/{entity}",
        "updated_at": updated_at,
        "attribution_required": True,
        "preferred_citation": entity_data.get("preferred_citation") or "Wheels & Wins (accessed today)",
    }
    return _json_response_with_etag(answer, updated_at)


@router.get("/entities/{slug}")
async def get_entity(slug: str, request: Request):
    """Return a canonical entity record (Schema.org JSON-LD style)."""
    site = _get_site_url()
    sys = _fetch_system_setting(f"entity_{slug}")
    updated_at = sys.get("updated_at") if sys else None
    entity_data = (sys or {}).get("setting_value", {})
    if not sys:
        # Provide a minimal skeleton for discoverability
        entity_data = {
            "@context": "https://schema.org",
            "@type": "Organization",
            "identifier": slug,
            "name": slug.replace("-", " ").title(),
            "url": f"{site}/{slug}",
            "sameAs": [],
            "citation": [],
            "isBasedOn": [],
            "license": "CC BY 4.0",
        }
    return _json_response_with_etag(entity_data, updated_at)


@router.get("/claims/{claim_id}")
async def get_claim(claim_id: str):
    """Return a single claim with provenance and sources."""
    sys = _fetch_system_setting(f"claim_{claim_id}")
    if not sys:
        raise HTTPException(status_code=404, detail="Claim not found")
    payload = sys.get("setting_value") or {}
    return _json_response_with_etag(payload, sys.get("updated_at"))


# Well-known registry for AI engines discovery
@router.get("/.well-known/ai/registry.json")
async def ai_registry():
    site = _get_site_url()
    registry = {
        "name": "Wheels & Wins AI Registry",
        "site": site,
        "openapi": f"{site}/openapi.json",
        "endpoints": {
            "answers": f"{site}/api/v1/answers?entity=:slug",
            "entities": f"{site}/api/v1/entities/:slug",
            "claims": f"{site}/api/v1/claims/:id",
            "metrics": f"{site}/api/v1/ai/router/metrics",
        },
        "version": "1.0.0",
    }
    return _json_response_with_etag(registry)

