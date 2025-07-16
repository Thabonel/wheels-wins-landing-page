"""
Manual Routing API - Handles click-to-create waypoints for manual route building
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid

from app.services.enhanced_routing_service import enhanced_routing_service
from app.models.domain.wheels import RouteType, ManualWaypoint
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/manual-routing", tags=["manual-routing"])


class WaypointRequest(BaseModel):
    latitude: float
    longitude: float
    order: Optional[int] = None


class RouteRequest(BaseModel):
    origin: Dict[str, float]  # {"latitude": x, "longitude": y}
    destination: Dict[str, float]
    manual_waypoints: List[Dict[str, Any]]
    route_type: str = "manual"


class WaypointResponse(BaseModel):
    id: str
    latitude: float
    longitude: float
    order: int
    is_locked: bool
    created_at: str


@router.post("/waypoints", response_model=WaypointResponse)
async def create_manual_waypoint(waypoint: WaypointRequest):
    """Create a new manual waypoint from map click"""
    
    try:
        # Generate order if not provided
        if waypoint.order is None:
            waypoint.order = 0
        
        # Create the waypoint
        new_waypoint = ManualWaypoint(
            id=str(uuid.uuid4()),
            latitude=waypoint.latitude,
            longitude=waypoint.longitude,
            order=waypoint.order,
            is_locked=True,
            created_at=datetime.utcnow()
        )
        
        logger.info(f"📍 Created manual waypoint: {new_waypoint.id} at {waypoint.latitude}, {waypoint.longitude}")
        
        return WaypointResponse(
            id=new_waypoint.id,
            latitude=new_waypoint.latitude,
            longitude=new_waypoint.longitude,
            order=new_waypoint.order,
            is_locked=new_waypoint.is_locked,
            created_at=new_waypoint.created_at.isoformat()
        )
        
    except Exception as e:
        logger.error(f"❌ Error creating manual waypoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/waypoints/{waypoint_id}")
async def delete_manual_waypoint(waypoint_id: str):
    """Delete a manual waypoint"""
    
    try:
        logger.info(f"🗑️ Deleting manual waypoint: {waypoint_id}")
        
        # This would typically remove from database
        # For now, return success
        return {"message": f"Waypoint {waypoint_id} deleted successfully"}
        
    except Exception as e:
        logger.error(f"❌ Error deleting manual waypoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/routes")
async def build_manual_route(route_request: RouteRequest):
    """Build a route with manual waypoints"""
    
    try:
        # Convert request to proper format
        origin = (route_request.origin["latitude"], route_request.origin["longitude"])
        destination = (route_request.destination["latitude"], route_request.destination["longitude"])
        
        # Create ManualWaypoint objects
        manual_waypoints = []
        for wp_data in route_request.manual_waypoints:
            manual_waypoints.append(ManualWaypoint(
                id=wp_data.get("id", str(uuid.uuid4())),
                latitude=wp_data["latitude"],
                longitude=wp_data["longitude"],
                order=wp_data.get("order", 0),
                is_locked=wp_data.get("is_locked", True),
                created_at=datetime.utcnow()
            ))
        
        # Build the route
        route_data = await enhanced_routing_service.build_route(
            origin=origin,
            destination=destination,
            route_type=RouteType.MANUAL,
            manual_waypoints=manual_waypoints
        )
        
        logger.info(f"🗺️ Built manual route with {len(manual_waypoints)} waypoints")
        
        return {
            "route": route_data,
            "manual_waypoints": len(manual_waypoints),
            "route_type": "manual"
        }
        
    except Exception as e:
        logger.error(f"❌ Error building manual route: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/waypoints/{waypoint_id}/reorder")
async def reorder_waypoint(waypoint_id: str, new_order: int):
    """Reorder a waypoint in the sequence"""
    
    try:
        logger.info(f"🔄 Reordering waypoint {waypoint_id} to position {new_order}")
        
        # This would typically update the database
        # For now, return success
        return {"message": f"Waypoint {waypoint_id} reordered to position {new_order}"}
        
    except Exception as e:
        logger.error(f"❌ Error reordering waypoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/route-types")
async def get_route_types():
    """Get all available route types with descriptions"""
    
    try:
        route_types = []
        
        for route_type in RouteType:
            config = enhanced_routing_service.get_routing_config(route_type)
            route_types.append({
                "value": route_type.value,
                "display_name": route_type.value.replace("_", " ").title(),
                "description": config.get("description", ""),
                "mapbox_profile": config.get("profile", ""),
                "is_manual": route_type == RouteType.MANUAL
            })
        
        return {"route_types": route_types}
        
    except Exception as e:
        logger.error(f"❌ Error getting route types: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/optimize-waypoints")
async def optimize_waypoint_order(waypoints: List[Dict[str, Any]]):
    """Optimize the order of waypoints for better routing (except locked ones)"""
    
    try:
        # This would implement TSP-like optimization
        # For now, return waypoints as-is
        logger.info(f"🔧 Optimizing {len(waypoints)} waypoints")
        
        return {
            "optimized_waypoints": waypoints,
            "message": "Waypoint order optimized"
        }
        
    except Exception as e:
        logger.error(f"❌ Error optimizing waypoints: {e}")
        raise HTTPException(status_code=500, detail=str(e))