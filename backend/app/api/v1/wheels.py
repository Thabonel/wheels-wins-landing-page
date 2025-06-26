
from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID

from app.api.deps import (
    get_current_user, get_db_connection, get_cache_connection,
    get_pam_orchestrator, apply_rate_limit, PaginationParams
)
from app.models.schemas.wheels import (
    TripPlanRequest, TripResponse, TripUpdateRequest,
    FuelLogCreateRequest, MaintenanceCreateRequest, MaintenanceUpdateRequest,
    MaintenanceScheduleResponse, FuelEfficiencyResponse,
    RouteRequest, RouteResponse, LocationSearchRequest, LocationSearchResponse
)
from app.models.domain.wheels import Trip, TripStatus, FuelLog, MaintenanceItem
from app.core.logging import setup_logging

router = APIRouter()
logger = setup_logging()

@router.post("/trips/plan", response_model=TripResponse)
async def plan_trip(
    request: TripPlanRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db_connection),
    _rate_limit = Depends(apply_rate_limit("wheels_plan_trip"))
):
    """Plan a complete trip with route, stops, and attractions"""
    try:
        user_id = current_user["id"]
        
        # Create trip record
        trip_data = {
            "id": str(UUID()),
            "user_id": user_id,
            "name": request.name,
            "description": request.description,
            "status": TripStatus.PLANNED,
            "start_date": request.start_date,
            "end_date": request.end_date,
            "budget": request.budget,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Insert trip into database
        result = await db.from_("trips").insert(trip_data).execute()
        
        if result.error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create trip"
            )
        
        # TODO: Integrate with route planning service
        estimated_costs = {
            "fuel": 0.0,
            "accommodation": 0.0,
            "food": 0.0,
            "activities": 0.0
        }
        
        route_summary = {
            "total_distance": 0.0,
            "estimated_time": 0.0,
            "waypoints": []
        }
        
        return TripResponse(
            trip=Trip(**trip_data),
            estimated_costs=estimated_costs,
            route_summary=route_summary
        )
        
    except Exception as e:
        logger.error(f"Error planning trip: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error planning trip"
        )

@router.get("/trips", response_model=List[Trip])
async def get_user_trips(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db_connection),
    status_filter: Optional[TripStatus] = Query(None),
    pagination: PaginationParams = Depends()
):
    """Get user's trips with optional filtering"""
    try:
        user_id = current_user["id"]
        
        query = db.from_("trips").select("*").eq("user_id", user_id)
        
        if status_filter:
            query = query.eq("status", status_filter.value)
            
        query = query.order("created_at", desc=True)
        
        if pagination.limit:
            query = query.limit(pagination.limit)
        if pagination.offset:
            query = query.offset(pagination.offset)
            
        result = await query.execute()
        
        if result.error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch trips"
            )
            
        return [Trip(**trip) for trip in result.data]
        
    except Exception as e:
        logger.error(f"Error fetching trips: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching trips"
        )

@router.get("/trips/{trip_id}", response_model=Trip)
async def get_trip(
    trip_id: UUID,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db_connection)
):
    """Get specific trip by ID"""
    try:
        user_id = current_user["id"]
        
        result = await db.from_("trips").select("*").eq("id", str(trip_id)).eq("user_id", user_id).single().execute()
        
        if result.error or not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Trip not found"
            )
            
        return Trip(**result.data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching trip: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching trip"
        )

@router.put("/trips/{trip_id}", response_model=Trip)
async def update_trip(
    trip_id: UUID,
    request: TripUpdateRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db_connection)
):
    """Update trip details"""
    try:
        user_id = current_user["id"]
        
        # Check if trip exists and belongs to user
        existing = await db.from_("trips").select("*").eq("id", str(trip_id)).eq("user_id", user_id).single().execute()
        
        if existing.error or not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Trip not found"
            )
        
        # Prepare update data
        update_data = {"updated_at": datetime.utcnow()}
        
        if request.name is not None:
            update_data["name"] = request.name
        if request.description is not None:
            update_data["description"] = request.description
        if request.status is not None:
            update_data["status"] = request.status.value
        if request.end_date is not None:
            update_data["end_date"] = request.end_date
        if request.budget is not None:
            update_data["budget"] = request.budget
        if request.actual_cost is not None:
            update_data["actual_cost"] = request.actual_cost
            
        result = await db.from_("trips").update(update_data).eq("id", str(trip_id)).execute()
        
        if result.error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update trip"
            )
            
        # Fetch updated trip
        updated = await db.from_("trips").select("*").eq("id", str(trip_id)).single().execute()
        
        return Trip(**updated.data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating trip: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating trip"
        )

@router.delete("/trips/{trip_id}")
async def delete_trip(
    trip_id: UUID,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db_connection)
):
    """Delete a trip"""
    try:
        user_id = current_user["id"]
        
        # Check if trip exists and belongs to user
        existing = await db.from_("trips").select("id").eq("id", str(trip_id)).eq("user_id", user_id).single().execute()
        
        if existing.error or not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Trip not found"
            )
        
        result = await db.from_("trips").delete().eq("id", str(trip_id)).execute()
        
        if result.error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete trip"
            )
            
        return {"message": "Trip deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting trip: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting trip"
        )

@router.post("/fuel-log", response_model=FuelLog)
async def log_fuel_purchase(
    request: FuelLogCreateRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db_connection),
    _rate_limit = Depends(apply_rate_limit("wheels_fuel_log"))
):
    """Log a fuel purchase and update efficiency tracking"""
    try:
        user_id = current_user["id"]
        
        fuel_data = {
            "id": str(UUID()),
            "user_id": user_id,
            "date": request.date,
            "fuel_type": request.fuel_type,
            "gallons": request.gallons,
            "price_per_gallon": request.price_per_gallon,
            "total_cost": request.gallons * request.price_per_gallon,
            "odometer_reading": request.odometer_reading,
            "notes": request.notes,
            "receipt_url": request.receipt_url,
            "created_at": datetime.utcnow()
        }
        
        # Create location data
        location_data = {
            "name": request.location_name,
            "latitude": request.latitude,
            "longitude": request.longitude,
            "location_type": "fuel_station"
        }
        
        fuel_data["location"] = location_data
        
        result = await db.from_("fuel_logs").insert(fuel_data).execute()
        
        if result.error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to log fuel purchase"
            )
            
        return FuelLog(**fuel_data)
        
    except Exception as e:
        logger.error(f"Error logging fuel: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error logging fuel purchase"
        )

@router.get("/fuel-log", response_model=List[FuelLog])
async def get_fuel_history(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db_connection),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    pagination: PaginationParams = Depends()
):
    """Get fuel purchase history"""
    try:
        user_id = current_user["id"]
        
        query = db.from_("fuel_logs").select("*").eq("user_id", user_id)
        
        if start_date:
            query = query.gte("date", start_date)
        if end_date:
            query = query.lte("date", end_date)
            
        query = query.order("date", desc=True)
        
        if pagination.limit:
            query = query.limit(pagination.limit)
        if pagination.offset:
            query = query.offset(pagination.offset)
            
        result = await query.execute()
        
        if result.error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch fuel history"
            )
            
        return [FuelLog(**log) for log in result.data]
        
    except Exception as e:
        logger.error(f"Error fetching fuel history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching fuel history"
        )

@router.post("/maintenance", response_model=MaintenanceItem)
async def log_maintenance(
    request: MaintenanceCreateRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db_connection),
    _rate_limit = Depends(apply_rate_limit("wheels_maintenance"))
):
    """Log maintenance activity"""
    try:
        user_id = current_user["id"]
        
        maintenance_data = {
            "id": str(UUID()),
            "user_id": user_id,
            "vehicle_component": request.vehicle_component,
            "task_description": request.task_description,
            "status": "scheduled",
            "scheduled_date": request.scheduled_date,
            "cost": request.cost,
            "service_provider": request.service_provider,
            "notes": request.notes,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await db.from_("maintenance_items").insert(maintenance_data).execute()
        
        if result.error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to log maintenance"
            )
            
        return MaintenanceItem(**maintenance_data)
        
    except Exception as e:
        logger.error(f"Error logging maintenance: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error logging maintenance"
        )

@router.get("/maintenance/due", response_model=MaintenanceScheduleResponse)
async def get_due_maintenance(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db_connection)
):
    """Get due and upcoming maintenance items"""
    try:
        user_id = current_user["id"]
        
        # Get upcoming maintenance (due within 30 days)
        upcoming_query = db.from_("maintenance_items").select("*").eq("user_id", user_id).eq("status", "scheduled").lte("scheduled_date", datetime.now().date() + timedelta(days=30))
        upcoming_result = await upcoming_query.execute()
        
        # Get overdue maintenance
        overdue_query = db.from_("maintenance_items").select("*").eq("user_id", user_id).eq("status", "overdue")
        overdue_result = await overdue_query.execute()
        
        # Get recently completed maintenance (last 30 days)
        completed_query = db.from_("maintenance_items").select("*").eq("user_id", user_id).eq("status", "completed").gte("completed_date", datetime.now().date() - timedelta(days=30))
        completed_result = await completed_query.execute()
        
        upcoming = [MaintenanceItem(**item) for item in upcoming_result.data] if upcoming_result.data else []
        overdue = [MaintenanceItem(**item) for item in overdue_result.data] if overdue_result.data else []
        completed_recent = [MaintenanceItem(**item) for item in completed_result.data] if completed_result.data else []
        
        alerts = []
        if overdue:
            alerts.append(f"{len(overdue)} overdue maintenance items")
        if len([item for item in upcoming if item.scheduled_date and item.scheduled_date <= datetime.now().date() + timedelta(days=7)]) > 0:
            alerts.append("Maintenance due within 7 days")
            
        return MaintenanceScheduleResponse(
            upcoming=upcoming,
            overdue=overdue,
            completed_recent=completed_recent,
            alerts=alerts
        )
        
    except Exception as e:
        logger.error(f"Error checking maintenance: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error checking maintenance schedule"
        )
