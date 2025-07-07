from __future__ import annotations

import os
from typing import Any, Dict, Tuple, List, Optional

import httpx
from langchain_core.tools import tool

from app.database.supabase_client import get_supabase_client


async def _geocode(
    client: httpx.AsyncClient, token: str, place: str
) -> Tuple[float, float]:
    resp = await client.get(
        f"https://api.mapbox.com/geocoding/v5/mapbox.places/{place}.json",
        params={"access_token": token, "limit": 1},
    )
    resp.raise_for_status()
    lon, lat = resp.json()["features"][0]["center"]
    return lat, lon


async def build_corridor_route(
    client: httpx.AsyncClient,
    token: str,
    origin: Tuple[float, float],
    destination: Tuple[float, float],
    waypoints: Optional[List[Tuple[float, float]]] = None,
) -> Dict[str, Any]:
    """Generate a driving route using Mapbox Directions v5."""

    coords = [origin] + (waypoints or []) + [destination]
    coord_str = ";".join(f"{lon},{lat}" for lat, lon in coords)
    resp = await client.get(
        f"https://api.mapbox.com/directions/v5/mapbox/driving/{coord_str}",
        params={
            "access_token": token,
            "geometries": "geojson",
            "overview": "full",
            "steps": "false",
        },
    )
    resp.raise_for_status()
    return resp.json()


async def search_campsites(route: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Find camping locations along a route from Supabase."""

    coords = route.get("routes", [])[0]["geometry"]["coordinates"]
    if not coords:
        return []

    lats = [c[1] for c in coords]
    lons = [c[0] for c in coords]

    min_lat, max_lat = min(lats), max(lats)
    min_lon, max_lon = min(lons), max(lons)

    supabase = get_supabase_client()
    result = (
        supabase.table("camping_locations")
        .select("*")
        .gte("latitude", min_lat)
        .lte("latitude", max_lat)
        .gte("longitude", min_lon)
        .lte("longitude", max_lon)
        .limit(20)
        .execute()
    )
    return result.data or []


async def merge_weather(
    client: httpx.AsyncClient, route: Dict[str, Any]
) -> Dict[str, Any]:
    """Overlay basic weather data from BOM or NOAA along the route."""

    coords = route.get("routes", [])[0]["geometry"].get("coordinates", [])
    if not coords:
        return route

    weather_segments: List[Dict[str, Any]] = []

    sample_points = [coords[0], coords[-1]]
    if len(coords) > 2:
        sample_points.insert(1, coords[len(coords) // 2])

    for lon, lat in sample_points:
        if 112 <= lon <= 154 and -44 <= lat <= -10:
            url = f"https://api.weather.bom.gov.au/v1/locations?lat={lat}&lon={lon}"
        else:
            url = f"https://api.weather.gov/points/{lat},{lon}"

        try:
            resp = await client.get(url, timeout=10)
            if resp.status_code == 200:
                weather_segments.append({"lat": lat, "lon": lon, "data": resp.json()})
        except Exception:
            continue

    route["weather_segments"] = weather_segments
    return route


@tool
async def plan_trip(start: str, end: str, user_id: str) -> Dict[str, Any]:
    """Plan a trip using Mapbox, weather data and campground DB."""
    token = os.getenv("MAPBOX_API_KEY") or os.getenv("MAPBOX_TOKEN")
    if not token:
        raise RuntimeError("Mapbox token not configured")

    async with httpx.AsyncClient(timeout=15) as client:
        start_lat, start_lon = await _geocode(client, token, start)
        end_lat, end_lon = await _geocode(client, token, end)

        weather = {}
        weather_api = os.getenv("WEATHER_API_KEY")
        if weather_api:
            resp = await client.get(
                "https://api.weatherapi.com/v1/forecast.json",
                params={"key": weather_api, "q": f"{end_lat},{end_lon}", "days": 3},
            )
            if resp.status_code == 200:
                weather = resp.json()

    supabase = get_supabase_client()
    camps = supabase.table("camping_locations").select("*").limit(5).execute().data

    return {
        "route": {
            "start": {"lat": start_lat, "lon": start_lon},
            "end": {"lat": end_lat, "lon": end_lon},
        },
        "weather": weather,
        "campsites": camps,
    }
