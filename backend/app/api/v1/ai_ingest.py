from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.services.ai.ingest_service import ingest_service

router = APIRouter(prefix="/api/v1/ai/ingest", tags=["AI Ingest"])


class IngestUrlPayload(BaseModel):
  url: str
  slug: Optional[str] = None


@router.post("/url")
async def ingest_url(payload: IngestUrlPayload):
    html, last_mod = ingest_service.fetch(payload.url)
    if not html:
        raise HTTPException(status_code=400, detail="Failed to fetch URL")
    parsed = ingest_service.parse(html)
    slug = payload.slug or payload.url.rstrip('/').split('/')[-1] or 'home'
    ok1 = ingest_service.upsert_entity(slug, parsed)
    ok2 = ingest_service.upsert_answer_card(slug, parsed)
    if not (ok1 and ok2):
        raise HTTPException(status_code=500, detail="Failed to store entity/answer card")
    return {
        'slug': slug,
        'title': parsed.get('title'),
        'summary': parsed.get('summary'),
        'key_facts': parsed.get('key_facts'),
        'sources_count': len(parsed.get('sources') or []),
        'last_modified': last_mod,
    }


@router.post("/rebuild")
async def rebuild_index():
    # Read seeds from system_settings: ai_crawl_seeds = { urls: [] }
    from app.core.database import get_supabase_client
    supabase = get_supabase_client()
    res = supabase.table('system_settings').select('setting_value').eq('setting_key', 'ai_crawl_seeds').maybe_single().execute()
    seeds = (getattr(res, 'data', {}) or {}).get('setting_value', {}).get('urls', []) if res else []
    results = []
    for u in seeds[:20]:  # cap to 20 per call
        html, _ = ingest_service.fetch(u)
        if not html:
            results.append({'url': u, 'ok': False, 'error': 'fetch_failed'})
            continue
        parsed = ingest_service.parse(html)
        slug = u.rstrip('/').split('/')[-1] or 'home'
        ok1 = ingest_service.upsert_entity(slug, parsed)
        ok2 = ingest_service.upsert_answer_card(slug, parsed)
        results.append({'url': u, 'slug': slug, 'ok': bool(ok1 and ok2)})
    return { 'count': len(results), 'results': results }

