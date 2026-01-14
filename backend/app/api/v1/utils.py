"""
Utility endpoints for common frontend needs
Phase 2: Essential Connectivity Fixes - CORS geolocation proxy
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
import httpx
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()


@router.get("/geolocation")
async def get_geolocation():
    """
    CORS-friendly geolocation proxy endpoint

    Solves the ipapi.co CORS issue by proxying through backend.
    Returns user's location based on IP address.

    Returns:
        {
            "country_code": "US",
            "country_name": "United States",
            "city": "San Francisco",
            "region": "California",
            "latitude": 37.7749,
            "longitude": -122.4194
        }
    """
    try:
        # Use ip-api.com which is free and reliable
        # Falls back to ipapi.co if ip-api fails
        async with httpx.AsyncClient(timeout=5.0) as client:
            try:
                # Try ip-api.com first (free, no rate limits for non-commercial)
                response = await client.get("http://ip-api.com/json/")
                if response.status_code == 200:
                    data = response.json()

                    # Normalize response format
                    return JSONResponse(content={
                        "country_code": data.get("countryCode", "US"),
                        "country_name": data.get("country", "United States"),
                        "city": data.get("city", "Unknown"),
                        "region": data.get("regionName", "Unknown"),
                        "latitude": data.get("lat", 0.0),
                        "longitude": data.get("lon", 0.0),
                        "provider": "ip-api.com"
                    })
            except Exception as e:
                logger.warning(f"ip-api.com failed: {str(e)}, trying ipapi.co")

            # Fallback to ipapi.co
            try:
                response = await client.get("https://ipapi.co/json/")
                if response.status_code == 200:
                    data = response.json()

                    return JSONResponse(content={
                        "country_code": data.get("country_code", "US"),
                        "country_name": data.get("country_name", "United States"),
                        "city": data.get("city", "Unknown"),
                        "region": data.get("region", "Unknown"),
                        "latitude": data.get("latitude", 0.0),
                        "longitude": data.get("longitude", 0.0),
                        "provider": "ipapi.co"
                    })
            except Exception as e:
                logger.error(f"ipapi.co also failed: {str(e)}")

        # Both failed - return default US location
        logger.warning("All geolocation services failed, returning default US location")
        return JSONResponse(content={
            "country_code": "US",
            "country_name": "United States",
            "city": "Unknown",
            "region": "Unknown",
            "latitude": 39.8283,  # Center of US
            "longitude": -98.5795,
            "provider": "fallback"
        })

    except Exception as e:
        logger.error(f"Geolocation endpoint error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to determine location. Please try again."
        )
