"""
OpenRoute Service API Proxy Endpoints
Secure proxy for OpenRoute Service API requests with RV-specific routing.
"""

from fastapi import APIRouter, HTTPException, Query, Path
from typing import Optional, Dict, Any
import httpx
import os
import json
from app.core.logging import setup_logging, get_logger

router = APIRouter()
setup_logging()
logger = get_logger(__name__)

# Get OpenRoute Service API key from environment
OPENROUTE_API_KEY = (
    os.getenv("OPENROUTE_API_KEY") or  # Primary
    os.getenv("OPENROUTE_TOKEN") or    # Secondary
    os.getenv("ORS_API_KEY")           # Tertiary
)

if not OPENROUTE_API_KEY:
    logger.warning("No OpenRoute Service API key found. Set OPENROUTE_API_KEY environment variable.")
else:
    logger.info("✅ OpenRoute Service API key configured")

# OpenRoute Service API base URL
OPENROUTE_BASE_URL = "https://api.openrouteservice.org"

async def proxy_openroute_request(endpoint: str, params: Dict[str, Any] = None, method: str = "GET", json_data: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Generic proxy function for OpenRoute Service API requests
    """
    if not OPENROUTE_API_KEY:
        raise HTTPException(status_code=500, detail="OpenRoute Service API key not configured on server")
    
    headers = {
        "Authorization": OPENROUTE_API_KEY,
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            url = f"{OPENROUTE_BASE_URL}/{endpoint}"
            logger.info(f"Proxying OpenRoute Service {method} request to: {url}")
            
            if method.upper() == "GET":
                response = await client.get(url, params=params, headers=headers, timeout=45.0)
            else:
                response = await client.post(url, params=params, json=json_data, headers=headers, timeout=45.0)
            
            response.raise_for_status()
            return response.json()
            
        except httpx.TimeoutException:
            logger.error(f"Timeout error for OpenRoute Service request: {endpoint}")
            raise HTTPException(status_code=504, detail="OpenRoute Service API timeout")
        except httpx.HTTPStatusError as e:
            logger.error(f"OpenRoute Service API error: {e.response.status_code} - {e.response.text}")
            raise HTTPException(status_code=e.response.status_code, detail=f"OpenRoute Service API error: {e.response.text}")
        except Exception as e:
            logger.error(f"Unexpected error in OpenRoute Service proxy: {str(e)}")
            raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/directions")
async def directions_proxy(
    coordinates: str = Query(..., description="JSON array of coordinates"),
    profile: str = Query("driving-hgv", description="Routing profile"),
    preference: str = Query("recommended", description="Route preference"),
    alternatives: Optional[int] = Query(None, description="Number of alternative routes"),
    extra_info: Optional[str] = Query(None, description="Extra route information"),
    elevation: Optional[bool] = Query(None, description="Include elevation data"),
    instructions: Optional[bool] = Query(True, description="Include turn-by-turn instructions"),
    instructions_format: str = Query("text", description="Instructions format"),
    language: str = Query("en", description="Language"),
    geometry: Optional[bool] = Query(True, description="Include geometry"),
    geometry_format: str = Query("geojson", description="Geometry format"),
    geometry_simplify: Optional[bool] = Query(None, description="Simplify geometry"),
    avoid_features: Optional[str] = Query(None, description="Features to avoid"),
    avoid_borders: Optional[str] = Query(None, description="Borders to avoid"),
    vehicle_type: Optional[str] = Query(None, description="Vehicle type"),
    restrictions: Optional[str] = Query(None, description="Vehicle restrictions JSON"),
    weightings: Optional[str] = Query(None, description="Route weightings JSON"),
    bearings: Optional[str] = Query(None, description="Bearing constraints JSON"),
    radiuses: Optional[str] = Query(None, description="Snap radiuses JSON"),
    skip_segments: Optional[str] = Query(None, description="Segments to skip JSON"),
    maximum_speed: Optional[int] = Query(None, description="Maximum speed km/h"),
):
    """
    Proxy for OpenRoute Service Directions API with RV optimizations
    """
    try:
        # Parse coordinates from JSON string
        coord_list = json.loads(coordinates)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid coordinates JSON format")
    
    # Build request body for POST request (OpenRoute Service uses POST for complex requests)
    request_body = {
        "coordinates": coord_list,
        "profile": profile,
        "preference": preference,
        "format": "json",
        "instructions": instructions,
        "instructions_format": instructions_format,
        "language": language,
        "geometry": geometry,
        "geometry_format": geometry_format
    }
    
    # Add optional parameters
    if alternatives is not None:
        request_body["alternative_routes"] = {
            "target_count": alternatives,
            "weight_factor": 1.4,
            "share_factor": 0.6
        }
    
    if extra_info:
        request_body["extra_info"] = extra_info.split(',')
    
    if elevation is not None:
        request_body["elevation"] = elevation
    
    if geometry_simplify is not None:
        request_body["geometry_simplify"] = geometry_simplify
    
    if avoid_features:
        request_body["options"] = request_body.get("options", {})
        request_body["options"]["avoid_features"] = avoid_features.split(',')
    
    if avoid_borders:
        request_body["options"] = request_body.get("options", {})
        request_body["options"]["avoid_borders"] = avoid_borders
    
    if vehicle_type:
        request_body["options"] = request_body.get("options", {})
        request_body["options"]["vehicle_type"] = vehicle_type
    
    # Parse JSON parameters
    if restrictions:
        try:
            request_body["options"] = request_body.get("options", {})
            request_body["options"]["profile_params"] = request_body["options"].get("profile_params", {})
            request_body["options"]["profile_params"]["restrictions"] = json.loads(restrictions)
        except json.JSONDecodeError:
            logger.warning("Invalid restrictions JSON format")
    
    if weightings:
        try:
            request_body["options"] = request_body.get("options", {})
            request_body["options"]["profile_params"] = request_body["options"].get("profile_params", {})
            request_body["options"]["profile_params"]["weightings"] = json.loads(weightings)
        except json.JSONDecodeError:
            logger.warning("Invalid weightings JSON format")
    
    if bearings:
        try:
            request_body["bearings"] = json.loads(bearings)
        except json.JSONDecodeError:
            logger.warning("Invalid bearings JSON format")
    
    if radiuses:
        try:
            request_body["radiuses"] = json.loads(radiuses)
        except json.JSONDecodeError:
            logger.warning("Invalid radiuses JSON format")
    
    if skip_segments:
        try:
            request_body["skip_segments"] = json.loads(skip_segments)
        except json.JSONDecodeError:
            logger.warning("Invalid skip_segments JSON format")
    
    if maximum_speed is not None:
        request_body["options"] = request_body.get("options", {})
        request_body["options"]["maximum_speed"] = maximum_speed
    
    logger.info(f"OpenRoute Service directions request - Coordinates: {len(coord_list)}, Profile: {profile}, RV optimized: {bool(vehicle_type)}")
    
    return await proxy_openroute_request("v2/directions/driving-hgv", method="POST", json_data=request_body)

@router.get("/elevation/line")
async def elevation_line_proxy(
    coordinates: str = Query(..., description="JSON array of coordinates"),
    format_in: str = Query("geojson", description="Input format"),
    format_out: str = Query("geojson", description="Output format"),
):
    """
    Proxy for OpenRoute Service Elevation Line API
    """
    try:
        coord_list = json.loads(coordinates)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid coordinates JSON format")
    
    request_body = {
        "coordinates": coord_list,
        "format_in": format_in,
        "format_out": format_out
    }
    
    logger.info(f"OpenRoute Service elevation request - Coordinates: {len(coord_list)}")
    
    return await proxy_openroute_request("elevation/line", method="POST", json_data=request_body)

@router.get("/isochrones")
async def isochrones_proxy(
    coordinates: str = Query(..., description="JSON array of coordinates"),
    profile: str = Query("driving-hgv", description="Routing profile"),
    range_type: str = Query("time", description="Range type (time or distance)"),
    range_values: str = Query(..., description="Range values as comma-separated list"),
    interval: Optional[int] = Query(None, description="Interval for multiple ranges"),
    location_type: str = Query("start", description="Location type"),
    smoothing: Optional[float] = Query(None, description="Smoothing factor"),
):
    """
    Proxy for OpenRoute Service Isochrones API
    """
    try:
        coord_list = json.loads(coordinates)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid coordinates JSON format")
    
    try:
        range_vals = [int(x.strip()) for x in range_values.split(',')]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid range values format")
    
    request_body = {
        "locations": coord_list,
        "profile": profile,
        "range_type": range_type,
        "range": range_vals,
        "location_type": location_type
    }
    
    if interval is not None:
        request_body["interval"] = interval
    
    if smoothing is not None:
        request_body["smoothing"] = smoothing
    
    logger.info(f"OpenRoute Service isochrones request - Locations: {len(coord_list)}, Profile: {profile}")
    
    return await proxy_openroute_request("v2/isochrones/driving-hgv", method="POST", json_data=request_body)

@router.get("/health")
async def openroute_proxy_health():
    """
    Health check endpoint for OpenRoute Service proxy
    """
    return {
        "status": "healthy",
        "service": "openroute-proxy",
        "api_key_configured": bool(OPENROUTE_API_KEY),
        "base_url": OPENROUTE_BASE_URL,
        "timestamp": "2025-01-12T22:00:00Z"
    }