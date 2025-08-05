"""
National Parks API
Endpoints for managing national parks data and fetching from Wikipedia
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging

from app.core.auth import get_current_user_optional
from app.services.database import get_database_service
from app.services.images import fetch_national_parks_for_country, ImageService
from app.models.domain.auth import User
from app.core.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/national-parks", tags=["national-parks"])
settings = get_settings()


@router.get("/")
async def get_national_parks(
    country: Optional[str] = Query(None, description="Filter by country"),
    state: Optional[str] = Query(None, description="Filter by state/province"),
    rv_accessible: Optional[bool] = Query(None, description="Filter by RV accessibility"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db = Depends(get_database_service)
):
    """Get national parks with optional filters"""
    try:
        # Build query
        query = "SELECT * FROM national_parks WHERE 1=1"
        params = []
        
        if country:
            query += " AND country = %s"
            params.append(country)
        
        if state:
            query += " AND state_province = %s"
            params.append(state)
        
        if rv_accessible is not None:
            query += " AND rv_accessible = %s"
            params.append(rv_accessible)
        
        query += " ORDER BY name LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        parks = await db.fetch_all(query, params)
        
        # Get total count
        count_query = "SELECT COUNT(*) as total FROM national_parks WHERE 1=1"
        count_params = []
        
        if country:
            count_query += " AND country = %s"
            count_params.append(country)
        
        if state:
            count_query += " AND state_province = %s"
            count_params.append(state)
        
        if rv_accessible is not None:
            count_query += " AND rv_accessible = %s"
            count_params.append(rv_accessible)
        
        count_result = await db.fetch_one(count_query, count_params)
        total = count_result['total'] if count_result else 0
        
        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "data": parks
        }
        
    except Exception as e:
        logger.error(f"Error fetching national parks: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch national parks")


@router.get("/nearby")
async def get_nearby_national_parks(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    radius_km: int = Query(100, ge=1, le=500, description="Search radius in kilometers"),
    db = Depends(get_database_service)
):
    """Find national parks near a given location"""
    try:
        query = """
        SELECT * FROM find_nearby_national_parks(%s, %s, %s)
        """
        
        parks = await db.fetch_all(query, [lat, lng, radius_km])
        
        return {
            "location": {"lat": lat, "lng": lng},
            "radius_km": radius_km,
            "count": len(parks),
            "parks": parks
        }
        
    except Exception as e:
        logger.error(f"Error finding nearby parks: {e}")
        raise HTTPException(status_code=500, detail="Failed to find nearby parks")


@router.get("/{park_id}")
async def get_national_park(
    park_id: str,
    db = Depends(get_database_service)
):
    """Get detailed information about a specific national park"""
    try:
        park = await db.fetch_one(
            "SELECT * FROM national_parks WHERE id = %s",
            [park_id]
        )
        
        if not park:
            raise HTTPException(status_code=404, detail="National park not found")
        
        return park
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching park details: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch park details")


@router.post("/populate/{country}")
async def populate_national_parks(
    country: str,
    background_tasks: BackgroundTasks,
    limit: int = Query(50, ge=1, le=100),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Populate national parks data from Wikipedia for a specific country"""
    
    # Check if user is admin (optional - you can remove this check)
    if current_user and hasattr(current_user, 'user_role') and current_user.user_role != 'admin':
        raise HTTPException(status_code=403, detail="Only admins can populate park data")
    
    # Add background task to fetch and save parks
    background_tasks.add_task(
        fetch_and_save_national_parks,
        country,
        limit
    )
    
    return {
        "message": f"Started fetching national parks for {country}",
        "status": "processing",
        "limit": limit
    }


async def fetch_and_save_national_parks(country: str, limit: int):
    """Background task to fetch and save national parks data"""
    try:
        logger.info(f"Starting to fetch national parks for {country}")
        
        # Fetch parks data from Wikipedia
        parks_data = await fetch_national_parks_for_country(country, limit=limit)
        
        # Get database service
        db = get_database_service()
        
        # Save each park to database
        saved_count = 0
        for park_data in parks_data:
            try:
                # Check if park already exists
                existing = await db.fetch_one(
                    "SELECT id FROM national_parks WHERE name = %s AND country = %s",
                    [park_data['name'], park_data['country']]
                )
                
                if existing:
                    # Update existing park
                    park_id = existing['id']
                    await db.execute(
                        """
                        UPDATE national_parks 
                        SET description = %s, wikipedia_url = %s, wikipedia_extract = %s,
                            primary_image_url = %s, thumbnail_url = %s, image_gallery = %s,
                            latitude = %s, longitude = %s, location_point = ST_MakePoint(%s, %s)::geography,
                            main_features = %s, activities = %s, wildlife = %s,
                            data_source = %s, last_updated = %s
                        WHERE id = %s
                        """,
                        [
                            park_data.get('description'),
                            park_data.get('wikipedia_url'),
                            park_data.get('wikipedia_extract'),
                            park_data.get('primary_image_url'),
                            park_data.get('thumbnail_url'),
                            park_data.get('image_gallery'),
                            park_data.get('latitude'),
                            park_data.get('longitude'),
                            park_data.get('longitude'),
                            park_data.get('latitude'),
                            park_data.get('main_features'),
                            park_data.get('activities'),
                            park_data.get('wildlife'),
                            park_data.get('data_source'),
                            park_data.get('last_updated'),
                            park_id
                        ]
                    )
                else:
                    # Insert new park
                    location_point = None
                    if park_data.get('latitude') and park_data.get('longitude'):
                        location_point = f"POINT({park_data['longitude']} {park_data['latitude']})"
                    
                    await db.execute(
                        """
                        INSERT INTO national_parks (
                            name, country, state_province, description,
                            wikipedia_url, wikipedia_extract, wikipedia_page_id,
                            primary_image_url, thumbnail_url, image_gallery,
                            latitude, longitude, location_point,
                            main_features, activities, wildlife,
                            area_sq_km, established_date, visitor_count_annual,
                            data_source, last_updated
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                            %s, %s, ST_GeomFromText(%s, 4326)::geography,
                            %s, %s, %s, %s, %s, %s, %s, %s
                        )
                        """,
                        [
                            park_data.get('name'),
                            park_data.get('country'),
                            park_data.get('state_province'),
                            park_data.get('description'),
                            park_data.get('wikipedia_url'),
                            park_data.get('wikipedia_extract'),
                            park_data.get('wikipedia_page_id'),
                            park_data.get('primary_image_url'),
                            park_data.get('thumbnail_url'),
                            park_data.get('image_gallery'),
                            park_data.get('latitude'),
                            park_data.get('longitude'),
                            location_point,
                            park_data.get('main_features'),
                            park_data.get('activities'),
                            park_data.get('wildlife'),
                            park_data.get('area_sq_km'),
                            park_data.get('established_date'),
                            park_data.get('visitor_count_annual'),
                            park_data.get('data_source'),
                            park_data.get('last_updated')
                        ]
                    )
                
                saved_count += 1
                
            except Exception as e:
                logger.error(f"Error saving park {park_data.get('name')}: {e}")
                continue
        
        logger.info(f"Successfully saved {saved_count} national parks for {country}")
        
    except Exception as e:
        logger.error(f"Error in fetch_and_save_national_parks: {e}")


@router.post("/update-images")
async def update_trip_template_images(
    background_tasks: BackgroundTasks,
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Update all trip templates with appropriate images"""
    
    # Add background task to update images
    background_tasks.add_task(update_all_template_images)
    
    return {
        "message": "Started updating trip template images",
        "status": "processing"
    }


async def update_all_template_images():
    """Background task to update images for all trip templates"""
    try:
        db = get_database_service()
        
        # Get all templates that need images
        templates = await db.fetch_all(
            """
            SELECT id, name, description, template_data, category, tags
            FROM trip_templates
            WHERE image_url IS NULL OR image_url = ''
            """
        )
        
        logger.info(f"Found {len(templates)} templates needing images")
        
        async with ImageService() as image_service:
            updated_count = 0
            
            for template in templates:
                try:
                    # Prepare template data for image service
                    template_data = template['template_data'] or {}
                    template_data['name'] = template['name']
                    template_data['category'] = template['category']
                    template_data['tags'] = template['tags']
                    
                    # Update images
                    success = await image_service.update_trip_template_images(
                        template['id'],
                        template_data
                    )
                    
                    if success:
                        updated_count += 1
                    
                    # Small delay to avoid overwhelming external APIs
                    await asyncio.sleep(1)
                    
                except Exception as e:
                    logger.error(f"Error updating template {template['id']}: {e}")
                    continue
        
        logger.info(f"Successfully updated images for {updated_count} templates")
        
    except Exception as e:
        logger.error(f"Error in update_all_template_images: {e}")


# Import asyncio for background tasks
import asyncio