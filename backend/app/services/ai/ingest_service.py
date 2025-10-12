import re
import json
import time
from typing import Any, Dict, Optional, Tuple
import requests

try:
    from bs4 import BeautifulSoup  # type: ignore
    BS4_AVAILABLE = True
except Exception:
    BS4_AVAILABLE = False

from app.core.database import get_supabase_client


class AIIngestService:
    """Lightweight extractor to build Answer Cards and Entities from URLs.

    Heuristics only (no LLM) to keep it fast and deterministic:
      - title: <title> or <h1>
      - summary: <meta name="description"> or first paragraph
      - key facts: bullets under h2/h3 containing 'Key Facts' or first ul/li on page
      - sources: links in 'Sources'/'References' section if present
    """

    def __init__(self):
        self.supabase = get_supabase_client()

    def fetch(self, url: str) -> Tuple[Optional[str], Optional[str]]:
        try:
            resp = requests.get(url, timeout=10)
            resp.raise_for_status()
            return resp.text, resp.headers.get('Last-Modified')
        except Exception:
            return None, None

    def parse(self, html: str) -> Dict[str, Any]:
        if BS4_AVAILABLE:
            soup = BeautifulSoup(html, 'html.parser')
            title = (soup.title.string.strip() if soup.title and soup.title.string else None) or self._first_text(soup.select('h1'))
            meta = soup.find('meta', attrs={'name': 'description'})
            summary = meta['content'].strip() if meta and meta.get('content') else None
            if not summary:
                p = soup.find('p')
                summary = p.get_text(strip=True) if p else None

            # Key facts
            facts: list[str] = []
            key_facts_header = soup.find(lambda tag: tag.name in ['h2', 'h3'] and 'key facts' in tag.get_text(strip=True).lower())
            if key_facts_header:
                ul = key_facts_header.find_next('ul')
                if ul:
                    facts = [li.get_text(strip=True) for li in ul.find_all('li')][:6]
            if not facts:
                ul = soup.find('ul')
                if ul:
                    facts = [li.get_text(strip=True) for li in ul.find_all('li')][:4]

            # Sources
            sources: list[Dict[str, Any]] = []
            sources_header = soup.find(lambda tag: tag.name in ['h2', 'h3'] and any(x in tag.get_text(strip=True).lower() for x in ['sources', 'references']))
            if sources_header:
                for a in sources_header.find_all_next('a', href=True, limit=10):
                    text = a.get_text(strip=True)
                    href = a['href']
                    if href and text:
                        sources.append({"title": text, "url": href})

            return {
                'title': title or '',
                'summary': summary or '',
                'key_facts': facts,
                'sources': sources,
            }
        # Fallback naive parsing
        title = None
        m = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
        if m:
            title = re.sub(r'\s+', ' ', m.group(1)).strip()
        return {
            'title': title or '',
            'summary': '',
            'key_facts': [],
            'sources': [],
        }

    def _first_text(self, tags):
        for t in tags or []:
            txt = t.get_text(strip=True)
            if txt:
                return txt
        return None

    def upsert_entity(self, slug: str, data: Dict[str, Any]) -> bool:
        payload = {
            '@context': 'https://schema.org',
            '@type': data.get('@type') or 'Organization',
            'identifier': slug,
            'name': data.get('title') or slug.replace('-', ' ').title(),
            'description': data.get('summary', ''),
            'citation': data.get('sources', []),
            'license': data.get('license', 'CC BY 4.0'),
        }
        res = self.supabase.table('system_settings').upsert({
            'setting_key': f'entity_{slug}',
            'setting_value': payload
        }, on_conflict='setting_key').execute()
        if getattr(res, 'error', None):
            return False
        return True

    def upsert_answer_card(self, slug: str, data: Dict[str, Any]) -> bool:
        # Store a copy so answers endpoint can read from entity if needed; optional
        res = self.supabase.table('system_settings').upsert({
            'setting_key': f'answer_{slug}',
            'setting_value': {
                'title': data.get('title'),
                'summary': data.get('summary'),
                'key_facts': data.get('key_facts', []),
                'sources': data.get('sources', []),
            }
        }, on_conflict='setting_key').execute()
        if getattr(res, 'error', None):
            return False
        return True


ingest_service = AIIngestService()

