"""
MAPBOX API Proxy Endpoints
Secure proxy for all Mapbox API requests to prevent token exposure in frontend.
"""

from fastapi import APIRouter, HTTPException, Query, Path
from typing import Optional, Dict, Any
import httpx
import os
from app.core.logging import setup_logging, get_logger

router = APIRouter()
setup_logging()
logger = get_logger(__name__)

# Get Mapbox secret token from environment (server-side only, industry standard)
MAPBOX_TOKEN = (
    os.getenv("MAPBOX_SECRET_TOKEN") or  # Primary: Secret token for production
    os.getenv("MAPBOX_API_KEY") or       # Secondary: Legacy support
    os.getenv("MAPBOX_TOKEN")            # Tertiary: Fallback
)

if not MAPBOX_TOKEN:
    logger.warning("No Mapbox token found. Set MAPBOX_SECRET_TOKEN for production.")
elif MAPBOX_TOKEN.startswith("sk."):
    logger.info("✅ Using Mapbox secret token (industry standard)")
elif MAPBOX_TOKEN.startswith("pk."):
    logger.warning("⚠️ Using public token in backend. Recommend MAPBOX_SECRET_TOKEN for production.")
else:
    logger.error("❌ Invalid Mapbox token format")

# Mapbox API base URL
MAPBOX_BASE_URL = "https://api.mapbox.com"

async def proxy_mapbox_request(endpoint: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Generic proxy function for Mapbox API requests
    """
    if not MAPBOX_TOKEN:
        raise HTTPException(status_code=500, detail="Mapbox token not configured on server")
    
    # Add access token to parameters
    if params is None:
        params = {}
    params["access_token"] = MAPBOX_TOKEN
    
    async with httpx.AsyncClient() as client:
        try:
            url = f"{MAPBOX_BASE_URL}/{endpoint}"
            logger.info(f"Proxying Mapbox request to: {url}")
            
            response = await client.get(url, params=params, timeout=30.0)
            response.raise_for_status()
            
            return response.json()
            
        except httpx.TimeoutException:
            logger.error(f"Timeout error for Mapbox request: {endpoint}")
            raise HTTPException(status_code=504, detail="Mapbox API timeout")
        except httpx.HTTPStatusError as e:
            logger.error(f"Mapbox API error: {e.response.status_code} - {e.response.text}")
            raise HTTPException(status_code=e.response.status_code, detail=f"Mapbox API error: {e.response.text}")
        except Exception as e:
            logger.error(f"Unexpected error in Mapbox proxy: {str(e)}")
            raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/geocoding/v5/{endpoint:path}")
async def geocoding_proxy(
    endpoint: str = Path(..., description="Geocoding endpoint path"),
    q: Optional[str] = Query(None, description="Search query"),
    proximity: Optional[str] = Query(None, description="Proximity bias"),
    bbox: Optional[str] = Query(None, description="Bounding box"),
    country: Optional[str] = Query(None, description="Country filter"),
    limit: Optional[int] = Query(None, description="Result limit"),
    types: Optional[str] = Query(None, description="Feature types"),
    autocomplete: Optional[bool] = Query(None, description="Autocomplete mode"),
):
    """
    Proxy for Mapbox Geocoding API
    """
    params = {}
    
    # Add all non-None query parameters
    for key, value in {
        "q": q,
        "proximity": proximity, 
        "bbox": bbox,
        "country": country,
        "limit": limit,
        "types": types,
        "autocomplete": autocomplete
    }.items():
        if value is not None:
            params[key] = value
    
    return await proxy_mapbox_request(f"geocoding/v5/{endpoint}", params)

@router.get("/directions/v5/{profile}/{coordinates}")
async def directions_proxy(
    profile: str = Path(..., description="Routing profile (driving, walking, cycling, etc.)"),
    coordinates: str = Path(..., description="Semicolon-separated coordinates"),
    alternatives: Optional[bool] = Query(None, description="Include alternative routes"),
    geometries: Optional[str] = Query(None, description="Geometry format"),
    overview: Optional[str] = Query(None, description="Overview detail level"),
    steps: Optional[bool] = Query(None, description="Include turn-by-turn instructions"),
    continue_straight: Optional[bool] = Query(None, description="Continue straight"),
    waypoint_snapping: Optional[str] = Query(None, description="Waypoint snapping"),
    annotations: Optional[str] = Query(None, description="Additional annotations"),
    language: Optional[str] = Query(None, description="Instruction language"),
    voice_instructions: Optional[bool] = Query(None, description="Include voice instructions"),
    banner_instructions: Optional[bool] = Query(None, description="Include banner instructions"),
    roundabout_exits: Optional[bool] = Query(None, description="Include roundabout exits"),
    exclude: Optional[str] = Query(None, description="Road types to exclude"),
):
    """
    Proxy for Mapbox Directions API
    """
    params = {}
    
    # Add all non-None query parameters
    for key, value in {
        "alternatives": alternatives,
        "geometries": geometries,
        "overview": overview,
        "steps": steps,
        "continue_straight": continue_straight,
        "waypoint_snapping": waypoint_snapping,
        "annotations": annotations,
        "language": language,
        "voice_instructions": voice_instructions,
        "banner_instructions": banner_instructions,
        "roundabout_exits": roundabout_exits,
        "exclude": exclude
    }.items():
        if value is not None:
            params[key] = value
    
    return await proxy_mapbox_request(f"directions/v5/mapbox/{profile}/{coordinates}", params)

@router.get("/styles/v1/{username}/{style_id}")
async def styles_proxy(
    username: str = Path(..., description="Mapbox username"),
    style_id: str = Path(..., description="Style ID"),
    draft: Optional[bool] = Query(None, description="Use draft version"),
):
    """
    Proxy for Mapbox Styles API
    """
    params = {}
    if draft is not None:
        params["draft"] = draft
    
    return await proxy_mapbox_request(f"styles/v1/{username}/{style_id}", params)

@router.get("/isochrone/v1/{profile}")
async def isochrone_proxy(
    profile: str = Path(..., description="Routing profile"),
    coordinates: str = Query(..., description="Center coordinates"),
    contours_minutes: Optional[str] = Query(None, description="Time contours in minutes"),
    contours_meters: Optional[str] = Query(None, description="Distance contours in meters"),
    polygons: Optional[bool] = Query(None, description="Return polygons"),
    denoise: Optional[float] = Query(None, description="Denoise level"),
    generalize: Optional[float] = Query(None, description="Generalize level"),
):
    """
    Proxy for Mapbox Isochrone API
    """
    params = {"coordinates": coordinates}
    
    # Add optional parameters
    for key, value in {
        "contours_minutes": contours_minutes,
        "contours_meters": contours_meters,
        "polygons": polygons,
        "denoise": denoise,
        "generalize": generalize
    }.items():
        if value is not None:
            params[key] = value
    
    return await proxy_mapbox_request(f"isochrone/v1/mapbox/{profile}", params)

@router.get("/search/geocode/v6/forward")
async def forward_geocoding_proxy(
    q: str = Query(..., description="Search query"),
    proximity: Optional[str] = Query(None, description="Proximity bias"),
    bbox: Optional[str] = Query(None, description="Bounding box"),
    country: Optional[str] = Query(None, description="Country filter"),
    limit: Optional[int] = Query(None, description="Result limit"),
    types: Optional[str] = Query(None, description="Feature types"),
    language: Optional[str] = Query(None, description="Language preference"),
):
    """
    Proxy for Mapbox Forward Geocoding API (v6)
    """
    params = {"q": q}
    
    # Add optional parameters
    for key, value in {
        "proximity": proximity,
        "bbox": bbox,
        "country": country,
        "limit": limit,
        "types": types,
        "language": language
    }.items():
        if value is not None:
            params[key] = value
    
    return await proxy_mapbox_request("search/geocode/v6/forward", params)

@router.get("/search/geocode/v6/reverse")
async def reverse_geocoding_proxy(
    longitude: float = Query(..., description="Longitude"),
    latitude: float = Query(..., description="Latitude"),
    types: Optional[str] = Query(None, description="Feature types"),
    language: Optional[str] = Query(None, description="Language preference"),
):
    """
    Proxy for Mapbox Reverse Geocoding API (v6)
    """
    params = {
        "longitude": longitude,
        "latitude": latitude
    }
    
    # Add optional parameters
    if types is not None:
        params["types"] = types
    if language is not None:
        params["language"] = language
    
    return await proxy_mapbox_request("search/geocode/v6/reverse", params)

@router.get("/health")
async def mapbox_proxy_health():
    """
    Health check endpoint for Mapbox proxy
    """
    return {
        "status": "healthy",
        "service": "mapbox-proxy",
        "token_configured": bool(MAPBOX_TOKEN),
        "timestamp": "2025-01-20T22:00:00Z"
    }