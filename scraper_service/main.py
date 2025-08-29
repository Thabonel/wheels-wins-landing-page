import asyncio
import logging
import json
import os

import httpx
from bs4 import BeautifulSoup
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from scraper_service.config import DATA_SOURCES

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configurable HTTP timeout
HTTP_TIMEOUT = float(os.getenv("HTTP_TIMEOUT", "10"))

# === Parser Registry ===
parsers = {}

def register_parser(domain: str):
    def decorator(func):
        parsers[domain] = func
        return func
    return decorator

@register_parser("example.com")
def parse_example(html: str, **kwargs):
    soup = BeautifulSoup(html, "html.parser")
    items = [el.get_text(strip=True) for el in soup.select("h2")]
    return [{"title": title} for title in items]

@register_parser("overpass-api.de")
def parse_overpass(html: str, **kwargs):
    data = json.loads(html)
    items = []
    for element in data.get("elements", []):
        if "lat" in element and "lon" in element:
            items.append({
                "id": element.get("id"),
                "name": element.get("tags", {}).get("name", "Unknown"),
                "lat": element["lat"],
                "lng": element["lon"],
                "type": "campsite",
                "info": element.get("tags", {})
            })
    return items

async def fetch_and_parse(url: str, **kwargs):
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, timeout=HTTP_TIMEOUT)
        except httpx.TimeoutException:
            logger.error("Timeout fetching %s after %.1fs", url, HTTP_TIMEOUT)
            return []
        except httpx.RequestError as exc:
            logger.error("Request error fetching %s: %s", url, exc)
            return []

        resp.raise_for_status()
        domain = httpx.URL(url).host
        for registered_domain, parser in parsers.items():
            if registered_domain in domain:
                return parser(resp.text, **kwargs)
        logger.warning(f"No parser registered for {domain}")
        return []

async def scheduled_job():
    logger.info("Running scheduled scrape job")
    for source in DATA_SOURCES:
        domain = source["domain"]
        for url in source["urls"]:
            try:
                results = await fetch_and_parse(url)
                logger.info(f"Scraped {len(results)} items from {domain} ({url})")
            except Exception as e:
                logger.error(f"Error scraping {url}: {e}")

def main():
    scheduler = AsyncIOScheduler()
    scheduler.add_job(scheduled_job, "interval", hours=1)
    scheduler.start()
    logger.info("Scheduler started, running indefinitely…")
    try:
        asyncio.get_event_loop().run_forever()
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()
        logger.info("Scheduler stopped")

if __name__ == "__main__":
    main()
