"""
News RSS Feed Proxy API

Fetches RSS feeds server-side to avoid CORS issues and provide
reliable news aggregation for the frontend.
"""

import logging
from typing import List, Dict, Any
from datetime import datetime
import xml.etree.ElementTree as ET

import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/news", tags=["news"])

# RSS Feed URLs by source ID
NEWS_SOURCES = {
    # Global
    "bbc": "https://feeds.bbci.co.uk/news/world/rss.xml",
    "reuters": "https://www.reutersagency.com/feed/?best-regions=asia&post_type=best",
    "npr": "https://feeds.npr.org/1001/rss.xml",
    "guardian": "https://www.theguardian.com/world/rss",
    "cnn": "https://rss.cnn.com/rss/edition_world.rss",
    "nyt": "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
    "bloomberg": "https://feeds.bloomberg.com/politics/news.rss",

    # Australian
    "abc-au": "https://www.abc.net.au/news/feed/2942460/rss.xml",
    "smh": "https://www.smh.com.au/rss/feed.xml",
    "guardian-au": "https://www.theguardian.com/au/rss",
    "news-com-au": "https://www.news.com.au/content-feeds/latest-news-national/",
    "age": "https://www.theage.com.au/rss/feed.xml",
    "australian": "https://www.theaustralian.com.au/feed/",
    "sbs": "https://www.sbs.com.au/news/feed",
    "9news": "https://www.9news.com.au/rss",

    # US
    "cnn-us": "https://rss.cnn.com/rss/cnn_us.rss",
    "abc-us": "https://abcnews.go.com/abcnews/topstories",
    "usa-today": "https://rssfeeds.usatoday.com/usatoday-NewsTopStories",
    "politico": "https://www.politico.com/rss/politicopicks.xml",

    # European
    "bbc-uk": "https://feeds.bbci.co.uk/news/uk/rss.xml",
    "dw": "https://rss.dw.com/rdf/rss-en-all",
    "france24": "https://www.france24.com/en/rss",
    "euronews": "https://www.euronews.com/rss",
}


async def fetch_rss_feed(url: str, timeout: int = 10) -> str:
    """Fetch RSS feed content with timeout."""
    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            response = await client.get(
                url,
                headers={
                    "User-Agent": "WheelsAndWins-NewsAggregator/1.0",
                    "Accept": "application/rss+xml, application/xml, text/xml, */*"
                }
            )
            response.raise_for_status()
            return response.text
    except httpx.TimeoutException:
        logger.warning(f"Timeout fetching RSS feed: {url}")
        raise HTTPException(status_code=504, detail="Feed fetch timeout")
    except httpx.HTTPError as e:
        logger.error(f"HTTP error fetching RSS feed {url}: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch feed: {str(e)}")


def parse_rss_feed(xml_content: str, source_name: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Parse RSS feed XML and extract news items."""
    try:
        root = ET.fromstring(xml_content)
        items = []

        # Try RSS 2.0 format first
        rss_items = root.findall(".//item")

        # If no RSS items, try Atom format
        if not rss_items:
            # Atom feeds use a different namespace
            namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
            rss_items = root.findall(".//atom:entry", namespaces)

            # Parse Atom format
            for item in rss_items[:limit]:
                title_elem = item.find("atom:title", namespaces)
                link_elem = item.find("atom:link[@rel='alternate']", namespaces) or item.find("atom:link", namespaces)
                published_elem = item.find("atom:published", namespaces) or item.find("atom:updated", namespaces)

                title = title_elem.text if title_elem is not None else "Untitled"
                link = link_elem.get("href", "#") if link_elem is not None else "#"
                pub_date = published_elem.text if published_elem is not None else datetime.now().isoformat()

                if title and title != "Untitled":
                    items.append({
                        "title": title[:150] + "..." if len(title) > 150 else title,
                        "link": link,
                        "pubDate": pub_date,
                        "source": source_name
                    })
        else:
            # Parse RSS 2.0 format
            for item in rss_items[:limit]:
                title_elem = item.find("title")
                link_elem = item.find("link")
                pub_date_elem = item.find("pubDate")

                # Fallback to guid if link not found
                if link_elem is None or not link_elem.text:
                    link_elem = item.find("guid")

                title = title_elem.text if title_elem is not None else "Untitled"
                link = link_elem.text if link_elem is not None and link_elem.text else "#"
                pub_date = pub_date_elem.text if pub_date_elem is not None else datetime.now().isoformat()

                if title and title != "Untitled":
                    items.append({
                        "title": title[:150] + "..." if len(title) > 150 else title,
                        "link": link.strip(),
                        "pubDate": pub_date,
                        "source": source_name
                    })

        logger.info(f"Parsed {len(items)} items from {source_name}")
        return items

    except ET.ParseError as e:
        logger.error(f"XML parsing error for {source_name}: {e}")
        return []
    except Exception as e:
        logger.error(f"Unexpected error parsing RSS for {source_name}: {e}")
        return []


@router.get("/feed")
async def get_news_feed(
    sources: List[str] = Query(
        default=["bbc", "reuters", "guardian"],
        description="List of news source IDs to fetch"
    ),
    limit_per_source: int = Query(default=5, ge=1, le=10, description="Items per source"),
    total_limit: int = Query(default=20, ge=1, le=50, description="Total items to return")
) -> JSONResponse:
    """
    Fetch news from multiple RSS sources.

    Args:
        sources: List of source IDs (e.g., ["bbc", "cnn", "npr"])
        limit_per_source: Maximum items to fetch per source
        total_limit: Maximum total items to return

    Returns:
        JSON response with news items sorted by date
    """
    all_items = []
    successful_sources = []
    failed_sources = []

    for source_id in sources:
        if source_id not in NEWS_SOURCES:
            logger.warning(f"Unknown news source: {source_id}")
            failed_sources.append({"source": source_id, "error": "Unknown source"})
            continue

        try:
            url = NEWS_SOURCES[source_id]
            logger.info(f"Fetching news from {source_id}: {url}")

            xml_content = await fetch_rss_feed(url)
            items = parse_rss_feed(xml_content, source_id, limit_per_source)

            if items:
                all_items.extend(items)
                successful_sources.append(source_id)
                logger.info(f"Successfully fetched {len(items)} items from {source_id}")
            else:
                logger.warning(f"No items parsed from {source_id}")
                failed_sources.append({"source": source_id, "error": "No items found"})

        except HTTPException as e:
            logger.error(f"HTTP error fetching {source_id}: {e.detail}")
            failed_sources.append({"source": source_id, "error": e.detail})
        except Exception as e:
            logger.error(f"Error fetching news from {source_id}: {e}")
            failed_sources.append({"source": source_id, "error": str(e)})

    # Sort by date (newest first) and limit total
    sorted_items = sorted(
        all_items,
        key=lambda x: x.get("pubDate", ""),
        reverse=True
    )[:total_limit]

    return JSONResponse({
        "items": sorted_items,
        "total": len(sorted_items),
        "successful_sources": successful_sources,
        "failed_sources": failed_sources,
        "success": len(successful_sources) > 0
    })


@router.get("/sources")
async def get_available_sources() -> JSONResponse:
    """Get list of available news sources."""
    sources = [
        {"id": source_id, "url": url}
        for source_id, url in NEWS_SOURCES.items()
    ]
    return JSONResponse({"sources": sources, "total": len(sources)})
