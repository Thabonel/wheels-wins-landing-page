
"""
WHEELS API Endpoints  
Travel, route planning, and vehicle management endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional, Dict, Any
from datetime import datetime, date

from app.models.schemas.wheels import (
    TripPlanRequest,
    RouteRequest,
    LocationSearchRequest,
    TripResponse,
    RouteResponse,
    MaintenanceScheduleResponse,
    ItineraryRequest,
    ItineraryResponse,
    ItineraryDay,
    ItineraryStop,
)
import os
import httpx
from app.services.database import get_database_service
from app.services.pam.route_intelligence import route_intelligence
from app.core.logging import setup_logging, get_logger

router = APIRouter()
setup_logging()
logger = get_logger(__name__)

@router.post("/routes/search")
async def search_routes(request: RouteRequest, user_id: Optional[str] = None):
    """Search for routes and directions"""
    try:
        db_service = await get_database_service()
        
        # Search for relevant routes
        query = """
            SELECT route_name, route_description, distance_miles, estimated_time_hours,
                   difficulty_level, scenic_rating, vehicle_requirements, safety_notes
            FROM offroad_routes 
            WHERE route_description ILIKE $1 OR route_name ILIKE $1
            ORDER BY scenic_rating DESC NULLS LAST
            LIMIT 10
        """
        
        routes = await db_service.execute_query(
            query, f"%{request.destination}%"
        )

        search_zones = []
        if user_id:
            search_zones = [z.__dict__ for z in await route_intelligence.calculate_search_zones(user_id)]
        
        return RouteResponse(
            origin=request.origin,
            destination=request.destination,
            routes=[
                {
                    "name": route['route_name'],
                    "description": route['route_description'],
                    "distance_miles": float(route['distance_miles']) if route['distance_miles'] else None,
                    "estimated_hours": float(route['estimated_time_hours']) if route['estimated_time_hours'] else None,
                    "difficulty": route['difficulty_level'],
                    "scenic_rating": float(route['scenic_rating']) if route['scenic_rating'] else None,
                    "safety_notes": route['safety_notes']
                }
                for route in routes
            ],
            total_routes=len(routes),
            extra={"search_zones": search_zones}
        )
        
    except Exception as e:
        logger.error(f"Route search error: {e}")
        raise HTTPException(status_code=500, detail="Could not search routes")

@router.post("/locations/search")
async def search_locations(request: LocationSearchRequest, user_id: Optional[str] = None):
    """Search for camping locations and POIs"""
    try:
        db_service = await get_database_service()
        
        # Search camping locations
        query = """
            SELECT name, type, address, latitude, longitude, price_per_night,
                   user_ratings, amenities, hookups, max_rig_length, reservation_required
            FROM camping_locations 
            WHERE address ILIKE $1 OR name ILIKE $1
            ORDER BY user_ratings DESC NULLS LAST, price_per_night ASC NULLS LAST
            LIMIT $2
        """
        
        locations = await db_service.execute_query(
            query, f"%{request.query}%", request.limit or 20
        )

        filters = {}
        if user_id:
            filters = await route_intelligence.get_content_filters(user_id)
        
        return {
            "query": request.query,
            "location_type": request.location_type,
            "locations": [
                {
                    "name": loc['name'],
                    "type": loc['type'],
                    "address": loc['address'],
                    "coordinates": {
                        "latitude": float(loc['latitude']),
                        "longitude": float(loc['longitude'])
                    } if loc['latitude'] and loc['longitude'] else None,
                    "price_per_night": float(loc['price_per_night']) if loc['price_per_night'] else None,
                    "rating": float(loc['user_ratings']) if loc['user_ratings'] else None,
                    "max_rig_length": loc['max_rig_length'],
                    "reservation_required": loc['reservation_required'],
                    "amenities": loc['amenities'],
                    "hookups": loc['hookups']
                }
                for loc in locations
            ],
            "total_found": len(locations),
            "applied_filters": filters
        }
        
    except Exception as e:
        logger.error(f"Location search error: {e}")
        raise HTTPException(status_code=500, detail="Could not search locations")

@router.get("/fuel-stations")
async def get_fuel_stations(
    location: Optional[str] = None,
    fuel_type: str = "regular",
    rv_friendly: bool = True,
    limit: int = 10
):
    """Get fuel stations with current prices"""
    try:
        db_service = await get_database_service()
        
        where_conditions = []
        params = []
        param_count = 0
        
        if location:
            param_count += 1
            where_conditions.append(f"address ILIKE ${param_count}")
            params.append(f"%{location}%")
        
        if rv_friendly:
            param_count += 1
            where_conditions.append(f"rv_friendly = ${param_count}")
            params.append(True)
        
        where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""
        
        query = f"""
            SELECT station_name, address, regular_price, diesel_price, premium_price,
                   amenities, rv_friendly, last_updated
            FROM fuel_stations 
            {where_clause}
            ORDER BY regular_price ASC NULLS LAST
            LIMIT {limit}
        """
        
        stations = await db_service.execute_query(query, *params)
        
        return {
            "location": location,
            "fuel_type": fuel_type,
            "rv_friendly": rv_friendly,
            "stations": [
                {
                    "name": station['station_name'],
                    "address": station['address'],
                    "prices": {
                        "regular": float(station['regular_price']) if station['regular_price'] else None,
                        "diesel": float(station['diesel_price']) if station['diesel_price'] else None,
                        "premium": float(station['premium_price']) if station['premium_price'] else None
                    },
                    "rv_friendly": station['rv_friendly'],
                    "amenities": station['amenities'],
                    "last_updated": station['last_updated']
                }
                for station in stations
            ],
            "total_stations": len(stations)
        }
        
    except Exception as e:
        logger.error(f"Fuel stations error: {e}")
        raise HTTPException(status_code=500, detail="Could not retrieve fuel stations")

@router.post("/maintenance")
async def log_maintenance(
    user_id: str,
    task: str,
    date: date,
    mileage: Optional[int] = None,
    cost: Optional[float] = None,
    notes: Optional[str] = None,
    next_due_date: Optional[date] = None,
    next_due_mileage: Optional[int] = None
):
    """Log maintenance activity"""
    try:
        db_service = await get_database_service()
        
        query = """
            INSERT INTO maintenance_records 
            (user_id, task, date, mileage, cost, notes, next_due_date, next_due_mileage, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'completed')
            RETURNING id
        """
        
        result = await db_service.execute_single(
            query, user_id, task, date, mileage, cost, notes, 
            next_due_date, next_due_mileage
        )
        
        if not result:
            raise HTTPException(status_code=400, detail="Failed to log maintenance")
        
        return {
            "id": result['id'],
            "status": "success",
            "message": f"Logged maintenance: {task}"
        }
        
    except Exception as e:
        logger.error(f"Maintenance logging error: {e}")
        raise HTTPException(status_code=500, detail="Could not log maintenance")

@router.get("/maintenance/{user_id}")
async def get_maintenance_schedule(user_id: str):
    """Get maintenance schedule and history"""
    try:
        db_service = await get_database_service()
        
        query = """
            SELECT task, date, mileage, next_due_date, next_due_mileage, 
                   cost, notes, status, created_at
            FROM maintenance_records 
            WHERE user_id = $1 
            ORDER BY date DESC
        """
        
        records = await db_service.execute_query(query, user_id)
        
        # Separate overdue, upcoming, and completed
        current_date = date.today()
        overdue = []
        upcoming = []
        completed = []
        
        for record in records:
            if record['next_due_date'] and record['next_due_date'] < current_date:
                overdue.append(record)
            elif record['next_due_date'] and record['next_due_date'] <= current_date.replace(day=current_date.day + 30):
                upcoming.append(record)
            else:
                completed.append(record)
        
        return MaintenanceScheduleResponse(
            user_id=user_id,
            overdue_count=len(overdue),
            upcoming_count=len(upcoming),
            overdue_items=[
                {
                    "task": item['task'],
                    "due_date": item['next_due_date'],
                    "due_mileage": item['next_due_mileage'],
                    "last_completed": item['date']
                }
                for item in overdue
            ],
            upcoming_items=[
                {
                    "task": item['task'],
                    "due_date": item['next_due_date'],
                    "due_mileage": item['next_due_mileage'],
                    "last_completed": item['date']
                }
                for item in upcoming
            ],
            recent_maintenance=[
                {
                    "task": item['task'],
                    "date": item['date'],
                    "mileage": item['mileage'],
                    "cost": float(item['cost']) if item['cost'] else None,
                    "notes": item['notes']
                }
                for item in completed[:10]
            ]
        )
        
    except Exception as e:
        logger.error(f"Maintenance schedule error: {e}")
        raise HTTPException(status_code=500, detail="Could not retrieve maintenance schedule")

@router.post("/trips")
async def create_trip_plan(request: TripPlanRequest):
    """Create a new trip plan"""
    try:
        # This would create a comprehensive trip plan
        # For now, return a basic response
        return TripResponse(
            id=f"trip_{datetime.utcnow().timestamp()}",
            user_id=request.user_id,
            name=request.name,
            description=request.description,
            start_date=request.start_date,
            end_date=request.end_date,
            status="planned",
            estimated_distance=0,
            estimated_duration_days=0,
            created_at=datetime.utcnow()
        )
        
    except Exception as e:
        logger.error(f"Trip creation error: {e}")
        raise HTTPException(status_code=500, detail="Could not create trip plan")


@router.post("/itinerary", response_model=ItineraryResponse)
async def generate_itinerary(request: ItineraryRequest):
    """Generate a simple daily itinerary using Mapbox services"""
    try:
        token = os.getenv("MAPBOX_API_KEY") or os.getenv("MAPBOX_TOKEN")
        if not token:
            raise HTTPException(status_code=500, detail="Mapbox token not configured")

        async with httpx.AsyncClient(timeout=15) as client:
            async def geocode(place: str) -> tuple[float, float]:
                url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{place}.json"
                resp = await client.get(url, params={"access_token": token, "limit": 1})
                resp.raise_for_status()
                feature = resp.json()["features"][0]
                lon, lat = feature["center"]
                return lat, lon

            start_lat, start_lon = await geocode(request.start)
            end_lat, end_lon = await geocode(request.end)

            days: list[ItineraryDay] = []
            current_lat, current_lon = start_lat, start_lon

            for i in range(request.duration_days):
                iso_url = (
                    f"https://api.mapbox.com/isochrone/v1/mapbox/driving/{current_lon},{current_lat}"
                )
                iso_params = {
                    "contours_minutes": 60,
                    "polygons": "true",
                    "access_token": token,
                }
                try:
                    iso_resp = await client.get(iso_url, params=iso_params)
                    iso_resp.raise_for_status()
                except Exception as e:
                    logger.warning(f"Isochrone request failed: {e}")
                    iso_resp = None

                stops: list[ItineraryStop] = []
                for interest in request.interests:
                    geo_url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{interest}.json"
                    geo_params = {
                        "access_token": token,
                        "proximity": f"{current_lon},{current_lat}",
                        "limit": 3,
                    }
                    try:
                        geo_resp = await client.get(geo_url, params=geo_params)
                        geo_resp.raise_for_status()
                        for feat in geo_resp.json().get("features", []):
                            lon, lat = feat["center"]
                            stops.append(
                                ItineraryStop(
                                    name=feat.get("text", "Unknown"),
                                    latitude=lat,
                                    longitude=lon,
                                    address=feat.get("place_name"),
                                    interest=interest,
                                )
                            )
                    except Exception as e:
                        logger.warning(f"Geocoding failed for {interest}: {e}")

                days.append(ItineraryDay(day=i + 1, stops=stops))

            return ItineraryResponse(start=request.start, end=request.end, days=days)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Itinerary generation error: {e}")
        raise HTTPException(status_code=500, detail="Could not generate itinerary")
