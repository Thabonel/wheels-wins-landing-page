"""
Camping locations and crowd-sourced updates API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from uuid import UUID

from app.core.auth import get_current_user
from app.core.database import get_supabase_client
from app.models.schemas.user import User

router = APIRouter()


class CrowdSourcedUpdate(BaseModel):
    camping_location_id: UUID
    crowd_level: Optional[str] = None
    availability_status: Optional[str] = None
    conditions: Optional[str] = None
    photos: Optional[List[str]] = None


class BudgetPreferences(BaseModel):
    daily_camping_budget: float
    alert_threshold: float = 0.8
    preferred_amenities: Optional[dict] = None
    avoid_paid_camping: bool = False


class CampingLocationResponse(BaseModel):
    id: UUID
    name: str
    type: str
    latitude: float
    longitude: float
    is_free: bool
    price_per_night: Optional[float]
    crowd_level: Optional[str]
    last_crowd_update: Optional[datetime]
    amenities: Optional[dict]
    alternative_sites: Optional[List[UUID]]


@router.post("/camping/crowd-update")
async def submit_crowd_update(
    update: CrowdSourcedUpdate,
    current_user: User = Depends(get_current_user)
):
    """Submit a crowd-sourced update for a camping location"""
    supabase = get_supabase_client()
    
    try:
        # Insert the update
        update_data = {
            "camping_location_id": str(update.camping_location_id),
            "user_id": current_user.id,
            "crowd_level": update.crowd_level,
            "availability_status": update.availability_status,
            "conditions": update.conditions,
            "photos": update.photos,
            "created_at": datetime.utcnow().isoformat()
        }
        
        result = supabase.table("camping_site_updates").insert(update_data).execute()
        
        if result.data:
            # Update the main camping_locations table with latest crowd info
            if update.crowd_level:
                supabase.table("camping_locations").update({
                    "crowd_level": update.crowd_level,
                    "last_crowd_update": datetime.utcnow().isoformat()
                }).eq("id", str(update.camping_location_id)).execute()
                
            return {"message": "Update submitted successfully", "update_id": result.data[0]["id"]}
        else:
            raise HTTPException(status_code=400, detail="Failed to submit update")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/camping/free-alternatives")
async def get_free_camping_alternatives(
    latitude: float = Query(..., description="Center latitude"),
    longitude: float = Query(..., description="Center longitude"),
    radius_miles: float = Query(50, description="Search radius in miles"),
    limit: int = Query(10, description="Maximum results")
):
    """Find free camping alternatives near a location"""
    supabase = get_supabase_client()
    
    # Convert miles to meters for PostGIS
    radius_meters = radius_miles * 1609.34
    
    try:
        # Use raw SQL for geographic query
        query = f"""
        SELECT 
            id, name, type, latitude, longitude, 
            address, amenities, crowd_level,
            ST_Distance(
                ST_MakePoint(longitude, latitude)::geography,
                ST_MakePoint({longitude}, {latitude})::geography
            ) / 1609.34 as distance_miles
        FROM camping_locations
        WHERE is_free = true
        AND ST_DWithin(
            ST_MakePoint(longitude, latitude)::geography,
            ST_MakePoint({longitude}, {latitude})::geography,
            {radius_meters}
        )
        ORDER BY distance_miles
        LIMIT {limit}
        """
        
        result = supabase.rpc("execute_sql", {"query": query}).execute()
        
        return result.data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/camping/pain-points/{region}")
async def get_regional_pain_points(
    region: str,
    country: Optional[str] = None
):
    """Get pain points for a specific region"""
    supabase = get_supabase_client()
    
    try:
        query = supabase.table("regional_pain_points").select("*").eq("region", region)
        
        if country:
            query = query.eq("country", country)
            
        result = query.execute()
        
        return result.data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/users/budget-preferences")
async def update_budget_preferences(
    preferences: BudgetPreferences,
    current_user: User = Depends(get_current_user)
):
    """Update user's camping budget preferences"""
    supabase = get_supabase_client()
    
    try:
        pref_data = {
            "user_id": current_user.id,
            "daily_camping_budget": preferences.daily_camping_budget,
            "alert_threshold": preferences.alert_threshold,
            "preferred_amenities": preferences.preferred_amenities,
            "avoid_paid_camping": preferences.avoid_paid_camping,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Upsert preferences
        result = supabase.table("user_budget_preferences").upsert(
            pref_data, 
            on_conflict="user_id"
        ).execute()
        
        return {"message": "Budget preferences updated", "preferences": result.data[0]}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/users/budget-preferences")
async def get_budget_preferences(
    current_user: User = Depends(get_current_user)
):
    """Get user's camping budget preferences"""
    supabase = get_supabase_client()
    
    try:
        result = supabase.table("user_budget_preferences").select("*").eq(
            "user_id", current_user.id
        ).single().execute()
        
        return result.data
        
    except Exception as e:
        # Return default preferences if none exist
        return {
            "daily_camping_budget": None,
            "alert_threshold": 0.8,
            "preferred_amenities": {},
            "avoid_paid_camping": False
        }


@router.get("/camping/overcrowding-forecast")
async def get_overcrowding_forecast(
    region: str,
    start_date: datetime,
    end_date: datetime
):
    """Get overcrowding forecast for a region based on historical data and events"""
    supabase = get_supabase_client()
    
    try:
        # Check for school holidays, events, and historical patterns
        # This is a simplified example - real implementation would use:
        # 1. Historical crowd data
        # 2. School holiday calendars
        # 3. Local event calendars
        # 4. Weather patterns
        
        # Get pain points for the region
        pain_points = supabase.table("regional_pain_points").select("*").eq(
            "region", region
        ).eq("challenge_type", "overcrowding").execute()
        
        # Get recent crowd updates for the region
        # (Would need to join with camping_locations to filter by region)
        
        forecast = {
            "region": region,
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "crowd_forecast": "medium",  # Would be calculated
            "factors": [],
            "recommendations": []
        }
        
        # Add factors and recommendations based on pain points
        if pain_points.data:
            for point in pain_points.data:
                forecast["factors"].append(point["description"])
                if point.get("mitigation_tips"):
                    forecast["recommendations"].extend(point["mitigation_tips"].get("tips", []))
                    
        return forecast
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))