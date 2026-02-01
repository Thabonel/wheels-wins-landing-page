"""
Trip Management API Endpoints

Provides REST API endpoints for managing user trips including:
- Creating, updating, deleting trips
- Loading trip data
- Trip sharing and privacy controls
- Integration with PAM trip planning workflow
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from uuid import UUID

from app.integrations.supabase import get_supabase_client
from app.api.deps import verify_supabase_jwt_token
from app.services.pam.tools.utils import validate_uuid, safe_db_insert, safe_db_update, safe_db_delete


router = APIRouter(prefix="/api/v1/trips", tags=["Trips"])


class TripRouteData(BaseModel):
    """Route data structure for trip planning"""
    waypoints: List[dict] = Field(default_factory=list, description="List of waypoints")
    route: Optional[dict] = None
    profile: Optional[str] = "driving"
    distance: Optional[float] = None
    duration: Optional[float] = None


class TripCreateRequest(BaseModel):
    """Request model for creating a new trip"""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: str = Field(default="planning", pattern="^(planning|active|completed|cancelled)$")
    trip_type: str = Field(default="road_trip", pattern="^(road_trip|camping|rv_travel|business|vacation)$")
    total_budget: Optional[float] = Field(None, ge=0)
    privacy_level: str = Field(default="private", pattern="^(private|friends|public)$")
    route_data: Optional[TripRouteData] = None
    metadata: dict = Field(default_factory=dict)


class TripUpdateRequest(BaseModel):
    """Request model for updating an existing trip"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(planning|active|completed|cancelled)$")
    trip_type: Optional[str] = Field(None, pattern="^(road_trip|camping|rv_travel|business|vacation)$")
    total_budget: Optional[float] = Field(None, ge=0)
    privacy_level: Optional[str] = Field(None, pattern="^(private|friends|public)$")
    route_data: Optional[TripRouteData] = None
    metadata: Optional[dict] = None


class TripResponse(BaseModel):
    """Response model for trip data"""
    id: str
    user_id: str
    title: str
    description: Optional[str]
    start_date: Optional[str]
    end_date: Optional[str]
    status: str
    trip_type: str
    total_budget: Optional[float]
    spent_budget: Optional[float]
    privacy_level: str
    metadata: dict
    created_at: str
    updated_at: str


@router.post("", response_model=TripResponse)
async def create_trip(
    trip_data: TripCreateRequest,
    user_data: dict = Depends(verify_supabase_jwt_token)
) -> TripResponse:
    """Create a new trip for the user"""
    try:
        user_id = user_data["user_id"]
        validate_uuid(user_id, "user_id")

        # Prepare trip data for database
        db_data = {
            "user_id": user_id,
            "title": trip_data.title,
            "description": trip_data.description,
            "start_date": trip_data.start_date,
            "end_date": trip_data.end_date,
            "status": trip_data.status,
            "trip_type": trip_data.trip_type,
            "total_budget": trip_data.total_budget,
            "privacy_level": trip_data.privacy_level,
            "metadata": {
                **trip_data.metadata,
                "route_data": trip_data.route_data.dict() if trip_data.route_data else None,
            }
        }

        # Remove None values
        db_data = {k: v for k, v in db_data.items() if v is not None}

        # Insert into database
        trip = await safe_db_insert("user_trips", db_data, user_id)

        if not trip:
            raise HTTPException(status_code=500, detail="Failed to create trip")

        return TripResponse(**trip)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("", response_model=List[TripResponse])
async def get_user_trips(
    user_data: dict = Depends(verify_supabase_jwt_token)
) -> List[TripResponse]:
    """Get all trips for the current user"""
    try:
        user_id = user_data["user_id"]
        validate_uuid(user_id, "user_id")

        supabase = get_supabase_client()

        result = supabase.table("user_trips") \
            .select("*") \
            .eq("user_id", user_id) \
            .order("updated_at", desc=True) \
            .execute()

        if result.data is None:
            return []

        return [TripResponse(**trip) for trip in result.data]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch trips: {str(e)}")


@router.get("/{trip_id}", response_model=TripResponse)
async def get_trip(
    trip_id: str,
    user_data: dict = Depends(verify_supabase_jwt_token)
) -> TripResponse:
    """Get a specific trip by ID"""
    try:
        user_id = user_data["user_id"]
        validate_uuid(user_id, "user_id")
        validate_uuid(trip_id, "trip_id")

        supabase = get_supabase_client()

        result = supabase.table("user_trips") \
            .select("*") \
            .eq("id", trip_id) \
            .eq("user_id", user_id) \
            .single() \
            .execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Trip not found")

        return TripResponse(**result.data)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch trip: {str(e)}")


@router.put("/{trip_id}", response_model=TripResponse)
async def update_trip(
    trip_id: str,
    trip_data: TripUpdateRequest,
    user_data: dict = Depends(verify_supabase_jwt_token)
) -> TripResponse:
    """Update an existing trip"""
    try:
        user_id = user_data["user_id"]
        validate_uuid(user_id, "user_id")
        validate_uuid(trip_id, "trip_id")

        # Build update data from request
        update_data = {}
        if trip_data.title is not None:
            update_data["title"] = trip_data.title
        if trip_data.description is not None:
            update_data["description"] = trip_data.description
        if trip_data.start_date is not None:
            update_data["start_date"] = trip_data.start_date
        if trip_data.end_date is not None:
            update_data["end_date"] = trip_data.end_date
        if trip_data.status is not None:
            update_data["status"] = trip_data.status
        if trip_data.trip_type is not None:
            update_data["trip_type"] = trip_data.trip_type
        if trip_data.total_budget is not None:
            update_data["total_budget"] = trip_data.total_budget
        if trip_data.privacy_level is not None:
            update_data["privacy_level"] = trip_data.privacy_level
        if trip_data.metadata is not None:
            # Merge with existing metadata if route_data is provided
            if trip_data.route_data:
                update_data["metadata"] = {
                    **trip_data.metadata,
                    "route_data": trip_data.route_data.dict()
                }
            else:
                update_data["metadata"] = trip_data.metadata
        elif trip_data.route_data is not None:
            # Get existing metadata first
            supabase = get_supabase_client()
            existing_result = supabase.table("user_trips") \
                .select("metadata") \
                .eq("id", trip_id) \
                .eq("user_id", user_id) \
                .single() \
                .execute()

            if existing_result.data:
                existing_metadata = existing_result.data.get("metadata", {})
                update_data["metadata"] = {
                    **existing_metadata,
                    "route_data": trip_data.route_data.dict()
                }

        if not update_data:
            raise HTTPException(status_code=400, detail="No data provided for update")

        # Update in database
        trip = await safe_db_update("user_trips", trip_id, update_data, user_id)

        if not trip:
            raise HTTPException(status_code=404, detail="Trip not found")

        return TripResponse(**trip)

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update trip: {str(e)}")


@router.delete("/{trip_id}")
async def delete_trip(
    trip_id: str,
    user_data: dict = Depends(verify_supabase_jwt_token)
):
    """Delete a trip"""
    try:
        user_id = user_data["user_id"]
        validate_uuid(user_id, "user_id")
        validate_uuid(trip_id, "trip_id")

        await safe_db_delete("user_trips", trip_id, user_id)

        return {"message": "Trip deleted successfully"}

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete trip: {str(e)}")


@router.get("/{trip_id}/compatible-with-pam")
async def check_pam_compatibility(
    trip_id: str,
    user_data: dict = Depends(verify_supabase_jwt_token)
):
    """Check if trip is compatible with PAM editing workflow"""
    try:
        user_id = user_data["user_id"]
        validate_uuid(user_id, "user_id")
        validate_uuid(trip_id, "trip_id")

        supabase = get_supabase_client()

        result = supabase.table("user_trips") \
            .select("metadata") \
            .eq("id", trip_id) \
            .eq("user_id", user_id) \
            .single() \
            .execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Trip not found")

        metadata = result.data.get("metadata", {})
        route_data = metadata.get("route_data", {})

        compatibility = {
            "is_compatible": True,
            "created_by_pam": metadata.get("created_by") == "pam_ai",
            "has_route_data": bool(route_data),
            "has_waypoints": len(route_data.get("waypoints", [])) > 0,
            "required_fields_present": {
                "title": True,  # Always required
                "route_geometry": "route" in route_data,
                "waypoints": len(route_data.get("waypoints", [])) >= 2,
            }
        }

        # Check if any required fields are missing
        compatibility["is_compatible"] = all(compatibility["required_fields_present"].values())

        return compatibility

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check compatibility: {str(e)}")