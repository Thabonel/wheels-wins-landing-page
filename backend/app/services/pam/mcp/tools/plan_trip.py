from __future__ import annotations

import os
from typing import Any, Dict, Tuple

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
