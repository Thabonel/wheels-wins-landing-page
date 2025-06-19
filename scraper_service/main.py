import asyncio
import logging

import httpx
from bs4 import BeautifulSoup
from apscheduler.schedulers.asyncio import AsyncIOScheduler

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# === Parser Registry ===
parsers = {}

def register_parser(domain: str):
    """Decorator to register a parser for a given domain."""
    def decorator(func):
        parsers[domain] = func
        return func
    return decorator

@register_parser("example.com")
def parse_example(html: str, **kwargs):
    """Demo parser for example.com pages."""
    soup = BeautifulSoup(html, "html.parser")
    # TODO: implement real extraction logic
    items = [el.get_text(strip=True) for el in soup.select("h2")]
    return [{"title": title} for title in items]

# === Core Fetch & Parse ===
async def fetch_and_parse(url: str, **kwargs):
    """Fetch a URL and run the appropriate parser."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, timeout=10.0)
        resp.raise_for_status()
        domain = httpx.URL(url).host
        # find matching parser
        for registered_domain, parser in parsers.items():
            if registered_domain in domain:
                return parser(resp.text, **kwargs)
        logger.warning(f"No parser registered for {domain}")
        return []

# === Scheduled Job ===
async def scheduled_job():
    logger.info("Running scheduled scrape job")
    # Example usage — replace with real URLs/params
    url = "https://example.com"
    results = await fetch_and_parse(url)
    logger.info(f"Scraped {len(results)} items from {url}")

# === Main Entrypoint ===
def main():
    scheduler = AsyncIOScheduler()
    # run every hour; adjust as needed
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
