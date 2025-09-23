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
    try:
        data = json.loads(html)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON from Overpass API: {e}")
        return []

    items = []
    for element in data.get("elements", []):
        # Safe null checking for coordinates
        lat = element.get("lat")
        lon = element.get("lon")

        if lat is not None and lon is not None:
            # Additional null checks for numeric comparisons
            try:
                # Ensure coordinates are valid numbers
                lat_float = float(lat)
                lon_float = float(lon)

                # Basic coordinate validation
                if -90 <= lat_float <= 90 and -180 <= lon_float <= 180:
                    item = {
                        "id": element.get("id", 0),
                        "name": element.get("tags", {}).get("name", "Unknown"),
                        "lat": lat_float,
                        "lng": lon_float,
                        "type": "campsite",
                        "info": element.get("tags", {})
                    }

                    # Safe numeric parsing for additional fields
                    tags = element.get("tags", {})
                    if tags:
                        # Handle fee information safely
                        fee = tags.get("fee")
                        if fee is not None:
                            try:
                                item["fee"] = float(fee) if fee != "no" and fee != "yes" else (0.0 if fee == "no" else None)
                            except (ValueError, TypeError):
                                item["fee"] = None

                        # Handle rating safely
                        rating = tags.get("rating")
                        if rating is not None:
                            try:
                                item["rating"] = float(rating)
                            except (ValueError, TypeError):
                                item["rating"] = None

                    items.append(item)
                else:
                    logger.warning(f"Invalid coordinates: lat={lat_float}, lon={lon_float}")
            except (ValueError, TypeError) as e:
                logger.warning(f"Invalid coordinate values lat={lat}, lon={lon}: {e}")
        else:
            logger.debug(f"Skipping element with missing coordinates: lat={lat}, lon={lon}")

    logger.info(f"Parsed {len(items)} valid items from Overpass API")
    return items

async def fetch_and_parse(url: str, **kwargs):
    async with httpx.AsyncClient() as client:
        try:
            logger.info(f"Fetching data from {url}")
            resp = await client.get(url, timeout=HTTP_TIMEOUT)
        except httpx.TimeoutException:
            logger.error("Timeout fetching %s after %.1fs", url, HTTP_TIMEOUT)
            return []
        except httpx.RequestError as exc:
            logger.error("Request error fetching %s: %s", url, exc)
            return []

        try:
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error {e.response.status_code} fetching {url}")
            return []

        # Check for empty response
        if not resp.text.strip():
            logger.warning(f"Empty response from {url}")
            return []

        domain = httpx.URL(url).host
        for registered_domain, parser in parsers.items():
            if registered_domain in domain:
                try:
                    results = parser(resp.text, **kwargs)
                    logger.info(f"Successfully parsed {len(results)} items from {domain}")
                    return results
                except Exception as e:
                    logger.error(f"Parser error for {domain}: {e}")
                    return []

        logger.warning(f"No parser registered for {domain}")
        return []

async def scheduled_job():
    logger.info("Running scheduled scrape job")
    total_scraped = 0
    total_errors = 0

    for source in DATA_SOURCES:
        domain = source["domain"]
        source_scraped = 0
        source_errors = 0

        for url in source["urls"]:
            try:
                logger.info(f"Processing {domain}: {url}")
                results = await fetch_and_parse(url)

                if results:
                    source_scraped += len(results)
                    total_scraped += len(results)
                    logger.info(f"✅ Scraped {len(results)} items from {domain}")

                    # TODO: Save results to database here
                    # await save_results_to_database(results, domain, url)
                else:
                    logger.warning(f"⚠️ No results from {domain} ({url})")

            except Exception as e:
                source_errors += 1
                total_errors += 1
                logger.error(f"❌ Error scraping {url}: {e}")

        logger.info(f"Source {domain} summary: {source_scraped} items scraped, {source_errors} errors")

    logger.info(f"📊 Job complete: {total_scraped} total items, {total_errors} total errors")
    return {"total_scraped": total_scraped, "total_errors": total_errors}

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
