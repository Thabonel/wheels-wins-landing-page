"""
Community Contributions API

REST endpoints for community tip submission and retrieval.

Created: January 12, 2025
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID

from app.core.auth import get_current_user
from app.services.pam.tools.community import (
    submit_community_tip,
    get_user_tips,
    get_user_contribution_stats,
    get_community_stats,
    search_community_tips
)

router = APIRouter()
logger = logging.getLogger(__name__)

# ============================================================================
# Request/Response Models
# ============================================================================

class TipSubmissionRequest(BaseModel):
    title: str = Field(..., min_length=5, max_length=200, description="Short title for the tip")
    content: str = Field(..., min_length=20, max_length=2000, description="Full tip content")
    category: str = Field(..., description="Category (camping, gas_savings, etc.)")
    location_name: Optional[str] = Field(None, max_length=200, description="Optional location name")
    location_lat: Optional[float] = Field(None, ge=-90, le=90, description="Optional latitude")
    location_lng: Optional[float] = Field(None, ge=-180, le=180, description="Optional longitude")
    tags: Optional[List[str]] = Field(None, description="Optional searchable tags")

class TipResponse(BaseModel):
    id: UUID
    title: str
    content: str
    category: str
    location: Optional[str]
    use_count: int
    view_count: int
    helpful_count: int
    is_featured: bool
    created_at: str
    last_used_at: Optional[str]

class ContributionStatsResponse(BaseModel):
    tips_shared: int
    people_helped: int
    total_tip_uses: int
    reputation_level: int
    badges: List[dict]

class CommunityStatsResponse(BaseModel):
    total_tips: int
    total_contributors: int
    total_people_helped: int
    total_tip_uses: int

class SearchTipsRequest(BaseModel):
    query: str = Field(..., min_length=2, description="Search query")
    category: Optional[str] = Field(None, description="Optional category filter")
    limit: int = Field(5, ge=1, le=20, description="Max number of results")

# ============================================================================
# Endpoints
# ============================================================================

@router.post("/tips/submit")
async def submit_tip(
    request: TipSubmissionRequest,
    user = Depends(get_current_user)
):
    """
    Submit a new community tip.

    The tip will be added to PAM's knowledge base and can help other travelers.
    """
    try:
        result = await submit_community_tip(
            user_id=user.id,
            title=request.title,
            content=request.content,
            category=request.category,
            location_name=request.location_name,
            location_lat=request.location_lat,
            location_lng=request.location_lng,
            tags=request.tags
        )

        if result["success"]:
            return {
                "success": True,
                "message": result["message"],
                "tip": result["tip"]
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Failed to submit tip")
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting tip: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while submitting your tip"
        )


@router.get("/tips/my-tips")
async def get_my_tips(
    limit: int = 20,
    user = Depends(get_current_user)
):
    """
    Get all tips submitted by the current user.
    """
    try:
        result = await get_user_tips(
            user_id=user.id,
            limit=limit
        )

        if result["success"]:
            return {
                "success": True,
                "tips": result["tips"],
                "count": result["count"]
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("error", "Failed to fetch tips")
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user tips: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching your tips"
        )


@router.get("/tips/my-stats")
async def get_my_contribution_stats(
    user = Depends(get_current_user)
):
    """
    Get contribution statistics for the current user.
    """
    try:
        result = await get_user_contribution_stats(user.id)

        if result["success"]:
            return {
                "success": True,
                "stats": result["stats"]
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("error", "Failed to fetch stats")
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching contribution stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching your stats"
        )


@router.get("/community/stats")
async def get_aggregate_community_stats():
    """
    Get aggregate community statistics (public, no auth required).
    Used for homepage community impact display.
    """
    try:
        result = await get_community_stats()

        if result["success"]:
            return {
                "success": True,
                "stats": result["stats"]
            }
        else:
            # Return zeros on error (graceful degradation)
            return {
                "success": True,
                "stats": {
                    "total_tips": 0,
                    "total_contributors": 0,
                    "total_people_helped": 0,
                    "total_tip_uses": 0
                }
            }

    except Exception as e:
        logger.error(f"Error fetching community stats: {str(e)}")
        # Return zeros on error (graceful degradation)
        return {
            "success": True,
            "stats": {
                "total_tips": 0,
                "total_contributors": 0,
                "total_people_helped": 0,
                "total_tip_uses": 0
            }
        }


@router.post("/tips/search")
async def search_tips(
    request: SearchTipsRequest,
    user = Depends(get_current_user)
):
    """
    Search community tips (for users to browse tips directly).
    """
    try:
        result = await search_community_tips(
            user_id=user.id,
            query=request.query,
            category=request.category,
            limit=request.limit
        )

        if result["success"]:
            return {
                "success": True,
                "tips": result["tips"],
                "count": result["count"]
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("error", "Failed to search tips")
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching tips: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while searching tips"
        )
