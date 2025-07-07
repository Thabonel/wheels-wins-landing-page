import httpx
import logging
from typing import List, Dict

from .route_intelligence import SearchZone

logger = logging.getLogger("pam")


class RouteIntelligentScraper:
    """Scrape campgrounds for a series of search zones using Overpass."""

    def __init__(self, base_url: str = "https://overpass-api.de/api/interpreter"):
        self.base_url = base_url

    async def _query_zone(self, lat: float, lng: float, radius_km: float) -> List[Dict[str, any]]:
        """Fetch camp sites within radius from Overpass."""
        query = (
            "[out:json];"
            f"node[\"tourism\"=\"camp_site\"](around:{int(radius_km * 1000)},{lat},{lng});"
            "out;"
        )
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(self.base_url, data={"data": query})
            resp.raise_for_status()
            data = resp.json().get("elements", [])
        camps = []
        for element in data:
            camps.append({
                "id": element.get("id"),
                "name": element.get("tags", {}).get("name"),
                "lat": element.get("lat"),
                "lon": element.get("lon"),
                "tags": element.get("tags", {}),
            })
        return camps

    async def scrape_zones(self, zones: List[SearchZone]) -> List[Dict[str, any]]:
        """Scrape all provided zones for campgrounds."""
        all_camps: List[Dict[str, any]] = []
        for zone in zones:
            radius_km = zone.radius_miles * 1.60934
            try:
                camps = await self._query_zone(zone.center_lat, zone.center_lng, radius_km)
                all_camps.extend(camps)
            except Exception as exc:  # pragma: no cover - best effort
                logger.error(f"Error scraping zone {zone}: {exc}")
        unique = {c["id"]: c for c in all_camps if c.get("id")}
        return list(unique.values())
