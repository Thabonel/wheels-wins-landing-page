import asyncio
import os
import time
from typing import List, Dict, Any
import xml.etree.ElementTree as ET
import requests

from app.core.database import get_supabase_client
from app.services.ai.ingest_service import ingest_service


def _site_url() -> str:
    return (os.getenv('SITE_URL') or os.getenv('PUBLIC_SITE_URL') or 'https://wheelsandwins.com').rstrip('/')


def _upsert_setting(key: str, value: Dict[str, Any]) -> None:
    supabase = get_supabase_client()
    supabase.table('system_settings').upsert({
        'setting_key': key,
        'setting_value': value,
    }, on_conflict='setting_key').execute()


def _get_setting(key: str) -> Dict[str, Any]:
    supabase = get_supabase_client()
    res = supabase.table('system_settings').select('setting_value').eq('setting_key', key).maybe_single().execute()
    data = getattr(res, 'data', None)
    return (data or {}).get('setting_value', {})


def ensure_defaults():
    # Default routing flags if not present
    if not _get_setting('ai_router_dry_run'):
        _upsert_setting('ai_router_dry_run', {'enabled': True})
    if not _get_setting('ai_router_enabled'):
        _upsert_setting('ai_router_enabled', {'enabled': True})
    # Default automation flag
    if not _get_setting('ai_automation_enabled'):
        _upsert_setting('ai_automation_enabled', {'enabled': True})


def discover_seeds_from_sitemap(max_urls: int = 50) -> List[str]:
    url = f"{_site_url()}/sitemap.xml"
    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        urls: List[str] = []
        root = ET.fromstring(resp.text)
        # Handle basic <urlset><url><loc> cases
        for loc in root.iter():
            if loc.tag.endswith('loc') and loc.text:
                u = loc.text.strip()
                if u.startswith(_site_url()):
                    urls.append(u)
            if len(urls) >= max_urls:
                break
        return urls[:max_urls]
    except Exception:
        return []


async def periodic_ingest_loop(interval_seconds: int = 6 * 60 * 60):
    # Run forever; pause if disabled via DB flag
    while True:
        try:
            auto = _get_setting('ai_automation_enabled')
            if not auto.get('enabled', True):
                await asyncio.sleep(interval_seconds)
                continue

            seeds_setting = _get_setting('ai_crawl_seeds')
            seeds = seeds_setting.get('urls') or []
            if not seeds:
                seeds = discover_seeds_from_sitemap()
                if seeds:
                    _upsert_setting('ai_crawl_seeds', {'urls': seeds})

            # Ingest top N seeds
            for u in (seeds or [])[:20]:
                html, _ = ingest_service.fetch(u)
                if not html:
                    continue
                parsed = ingest_service.parse(html)
                slug = u.rstrip('/').split('/')[-1] or 'home'
                ingest_service.upsert_entity(slug, parsed)
                ingest_service.upsert_answer_card(slug, parsed)
        except Exception:
            # Never crash the loop
            pass
        await asyncio.sleep(interval_seconds)

