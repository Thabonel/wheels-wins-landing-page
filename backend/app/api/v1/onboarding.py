from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.core.database import get_db_connection
from app.core.security import get_current_user_id
import asyncio
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

class OnboardingRequest(BaseModel):
    user_id: str
    email: EmailStr
    region: Optional[str] = None
    ask_full_name: Optional[str] = None
    ask_nickname: Optional[str] = None
    ask_email: Optional[str] = None
    ask_region: Optional[str] = None
    ask_travel_style: Optional[str] = None
    ask_vehicle_type: Optional[str] = None
    ask_vehicle_make_model_year: Optional[str] = None
    ask_fuel_type: Optional[str] = None
    ask_towing: Optional[str] = None
    ask_second_vehicle: Optional[str] = None
    ask_drive_limit: Optional[str] = None
    ask_camp_types: Optional[str] = None
    ask_accessibility: Optional[str] = None
    ask_pets: Optional[str] = None

class OnboardingResponse(BaseModel):
    success: bool
    message: str
    user_id: str

@router.post("/onboarding", response_model=OnboardingResponse)
async def create_onboarding_response(
    request: OnboardingRequest
):
    """
    Store user onboarding responses in the database
    """
    try:
        logger.info(f"Processing onboarding request for user: {request.user_id}")
        
        # Get database connection
        conn = await get_db_connection()
        
        # Insert onboarding data
        query = """
            INSERT INTO onboarding_responses (
                user_id, full_name, nickname, email, region, travel_style,
                vehicle_type, vehicle_make_model_year, fuel_type, towing,
                second_vehicle, drive_limit, camp_types, accessibility, pets,
                created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
            ON CONFLICT (user_id) DO UPDATE SET
                full_name = EXCLUDED.full_name,
                nickname = EXCLUDED.nickname,
                email = EXCLUDED.email,
                region = EXCLUDED.region,
                travel_style = EXCLUDED.travel_style,
                vehicle_type = EXCLUDED.vehicle_type,
                vehicle_make_model_year = EXCLUDED.vehicle_make_model_year,
                fuel_type = EXCLUDED.fuel_type,
                towing = EXCLUDED.towing,
                second_vehicle = EXCLUDED.second_vehicle,
                drive_limit = EXCLUDED.drive_limit,
                camp_types = EXCLUDED.camp_types,
                accessibility = EXCLUDED.accessibility,
                pets = EXCLUDED.pets,
                updated_at = NOW()
            RETURNING user_id
        """
        
        result = await conn.fetchrow(
            query,
            request.user_id,
            request.ask_full_name,
            request.ask_nickname,
            request.ask_email or request.email,
            request.ask_region or request.region,
            request.ask_travel_style,
            request.ask_vehicle_type,
            request.ask_vehicle_make_model_year,
            request.ask_fuel_type,
            request.ask_towing,
            request.ask_second_vehicle,
            request.ask_drive_limit,
            request.ask_camp_types,
            request.ask_accessibility,
            request.ask_pets
        )
        
        if result:
            logger.info(f"Successfully stored onboarding data for user: {result['user_id']}")
            return OnboardingResponse(
                success=True,
                message="Onboarding data saved successfully",
                user_id=str(result['user_id'])
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save onboarding data"
            )
            
    except Exception as e:
        logger.error(f"Error processing onboarding request: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/onboarding/{user_id}")
async def get_onboarding_response(user_id: str):
    """
    Retrieve user onboarding responses
    """
    try:
        conn = await get_db_connection()
        
        query = """
            SELECT * FROM onboarding_responses
            WHERE user_id = $1
        """
        
        result = await conn.fetchrow(query, user_id)
        
        if result:
            return dict(result)
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Onboarding data not found"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving onboarding data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )