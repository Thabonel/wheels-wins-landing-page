from __future__ import annotations

import os
from typing import Any, Dict, Tuple, List, Optional

import httpx
from langchain_core.tools import tool

from app.database.supabase_client import get_supabase_client
from app.services.enhanced_routing_service import enhanced_routing_service
from app.models.domain.wheels import RouteType, ManualWaypoint


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
async def plan_trip(
    start: str, 
    end: str, 
    user_id: str, 
    route_type: str = "fastest",
    manual_waypoints: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """Plan a trip using enhanced routing with support for all route types and manual waypoints."""
    
    # Parse route type
    try:
        routing_type = RouteType(route_type.lower())
    except ValueError:
        routing_type = RouteType.FASTEST
    
    # Geocode start and end locations
    start_lat, start_lon = await enhanced_routing_service.geocode_location(start)
    end_lat, end_lon = await enhanced_routing_service.geocode_location(end)
    
    # Convert manual waypoints if provided
    manual_wp_objects = []
    if manual_waypoints and routing_type == RouteType.MANUAL:
        for wp_data in manual_waypoints:
            manual_wp_objects.append(ManualWaypoint(
                id=wp_data.get("id", ""),
                latitude=wp_data.get("latitude", 0),
                longitude=wp_data.get("longitude", 0),
                order=wp_data.get("order", 0),
                is_locked=wp_data.get("is_locked", True),
                created_at=wp_data.get("created_at", "")
            ))
    
    # Build the route using enhanced routing service
    route_data = await enhanced_routing_service.build_route(
        origin=(start_lat, start_lon),
        destination=(end_lat, end_lon),
        route_type=routing_type,
        manual_waypoints=manual_wp_objects
    )
    
    # Get POI filters for this route type
    poi_filters = enhanced_routing_service.get_poi_filters(routing_type)
    
    # Find campsites based on route type
    campsites = await search_campsites_by_route_type(route_data, poi_filters)
    
    # Get weather data
    weather = await get_weather_data(end_lat, end_lon)
    
    return {
        "route": route_data,
        "route_type": routing_type,
        "poi_filters": poi_filters,
        "campsites": campsites,
        "weather": weather,
        "manual_waypoints": len(manual_wp_objects) if manual_wp_objects else 0
    }


async def search_campsites_by_route_type(route_data: Dict[str, Any], poi_filters: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Find campsites along route with filtering based on route type"""
    
    if not route_data.get("routes"):
        return []
    
    # Get route coordinates
    coords = route_data["routes"][0]["geometry"]["coordinates"]
    if not coords:
        return []
    
    # Calculate bounding box
    lats = [c[1] for c in coords]
    lons = [c[0] for c in coords]
    min_lat, max_lat = min(lats), max(lats)
    min_lon, max_lon = min(lons), max(lons)
    
    # Query campsites
    supabase = get_supabase_client()
    query = (
        supabase.table("camping_locations")
        .select("*")
        .gte("latitude", min_lat)
        .lte("latitude", max_lat)
        .gte("longitude", min_lon)
        .lte("longitude", max_lon)
    )
    
    # Apply filters based on route type
    if poi_filters.get("min_rating"):
        query = query.gte("rating", poi_filters["min_rating"])
    
    if poi_filters.get("price_range") == "free_to_low":
        query = query.lte("price_per_night", 20)
    elif poi_filters.get("price_range") == "premium":
        query = query.gte("price_per_night", 50)
    
    result = query.limit(20).execute()
    campsites = result.data or []
    
    # Additional filtering based on route type
    if poi_filters.get("exclude_types"):
        campsites = [c for c in campsites if c.get("type") not in poi_filters["exclude_types"]]
    
    if poi_filters.get("prefer_types"):
        # Sort preferred types first
        preferred = [c for c in campsites if c.get("type") in poi_filters["prefer_types"]]
        others = [c for c in campsites if c.get("type") not in poi_filters["prefer_types"]]
        campsites = preferred + others
    
    return campsites


async def get_weather_data(lat: float, lon: float) -> Dict[str, Any]:
    """Get weather data for destination"""
    
    weather = {}
    weather_api = os.getenv("WEATHER_API_KEY")
    
    if weather_api:
        async with httpx.AsyncClient(timeout=15) as client:
            try:
                resp = await client.get(
                    "https://api.weatherapi.com/v1/forecast.json",
                    params={"key": weather_api, "q": f"{lat},{lon}", "days": 3},
                )
                if resp.status_code == 200:
                    weather = resp.json()
            except Exception:
                pass  # Weather is optional
    
    return weather
