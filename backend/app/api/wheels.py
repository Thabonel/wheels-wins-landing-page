from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any, List
import httpx
from app.core.security import verify_token
from app.core.logging import setup_logging, get_logger
from app.nodes.wheels_node import wheels_node

router = APIRouter()
setup_logging()
logger = get_logger(__name__)

class TripPlanRequest(BaseModel):
    origin: str
    destination: str
    trip_type: Optional[str] = "general"
    budget: Optional[float] = None
    duration_days: Optional[int] = None
    vehicle_type: Optional[str] = None

class FuelLogRequest(BaseModel):
    amount_litres: float
    cost: float
    odometer: int
    location: Optional[str] = "Unknown"

class WeatherRequest(BaseModel):
    location: str
    days: Optional[int] = 7

@router.post("/plan-trip")
async def plan_trip(
    request: TripPlanRequest,
    user_id: str = Depends(verify_token)
):
    """Plan a complete trip with route, stops, and attractions"""
    try:
        trip_data = {
            "origin": request.origin,
            "destination": request.destination,
            "trip_type": request.trip_type,
            "constraints": {
                "budget": request.budget,
                "duration_days": request.duration_days,
                "vehicle_type": request.vehicle_type
            }
        }
        
        result = await wheels_node.plan_trip(user_id, trip_data)
        return result
        
    except Exception as e:
        logger.error(f"Error planning trip: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error planning trip"
        )

@router.post("/fuel-log")
async def log_fuel_purchase(
    request: FuelLogRequest,
    user_id: str = Depends(verify_token)
):
    """Log a fuel purchase and update efficiency tracking"""
    try:
        fuel_data = request.dict()
        result = await wheels_node.log_fuel_purchase(user_id, fuel_data)
        return result
        
    except Exception as e:
        logger.error(f"Error logging fuel: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error logging fuel purchase"
        )

@router.get("/maintenance")
async def check_maintenance(
    user_id: str = Depends(verify_token)
):
    """Check vehicle maintenance schedule"""
    try:
        result = await wheels_node.check_maintenance_schedule(user_id)
        return result
        
    except Exception as e:
        logger.error(f"Error checking maintenance: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error checking maintenance schedule"
        )

@router.post("/weather")
async def get_weather_forecast(
    request: WeatherRequest,
    user_id: str = Depends(verify_token)
):
    """Get weather forecast for a location"""
    try:
        result = await wheels_node.get_weather_forecast(
            request.location, 
            request.days
        )
        return result
        
    except Exception as e:
        logger.error(f"Error getting weather: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error getting weather forecast"
        )

@router.get("/nearby")
async def get_nearby_attractions(
    lat: float,
    lon: float,
    radius_km: int = 50,
    user_id: str = Depends(verify_token)
):
    """Get nearby attractions, camps, and services"""
    try:
        overpass_url = "https://overpass-api.de/api/interpreter"
        radius_m = radius_km * 1000
        query = f"""
        [out:json];
        (
          node(around:{radius_m},{lat},{lon})[tourism~"attraction|museum|viewpoint"];
          node(around:{radius_m},{lat},{lon})[tourism=camp_site];
          node(around:{radius_m},{lat},{lon})[amenity=fuel];
        );
        out center 50;
        """

        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(overpass_url, data={"data": query})
            resp.raise_for_status()
            data = resp.json().get("elements", [])

        attractions = []
        camping_spots = []
        fuel_stations = []
        for el in data:
            tags = el.get("tags", {})
            item = {
                "id": el.get("id"),
                "name": tags.get("name"),
                "lat": el.get("lat"),
                "lon": el.get("lon"),
                "type": tags.get("tourism") or tags.get("amenity"),
            }
            if tags.get("tourism") in ["attraction", "museum", "viewpoint"]:
                attractions.append(item)
            elif tags.get("tourism") == "camp_site":
                camping_spots.append(item)
            elif tags.get("amenity") == "fuel":
                fuel_stations.append(item)

        return {
            "success": True,
            "data": {
                "attractions": attractions,
                "camping_spots": camping_spots,
                "fuel_stations": fuel_stations,
            },
            "message": f"Found attractions within {radius_km}km",
        }
        
    except Exception as e:
        logger.error(f"Error finding nearby attractions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error finding nearby attractions"
        )
