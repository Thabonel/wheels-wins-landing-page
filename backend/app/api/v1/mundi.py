"""
Mundi AI Integration API
Provides endpoints for querying Mundi's geospatial AI capabilities
"""

import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
import httpx

from app.api.deps import get_current_user, CurrentUser
from app.core.config import settings
from app.core.exceptions import PAMError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mundi", tags=["Mundi Integration"])


class MundiQueryRequest(BaseModel):
    """Request model for Mundi AI queries"""
    prompt: str = Field(..., description="The geospatial query for Mundi AI")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context for the query")


class MundiQueryResponse(BaseModel):
    """Response model for Mundi AI queries"""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class MundiService:
    """Service for interacting with Mundi AI"""
    
    def __init__(self):
        # Get Mundi URL from environment or use placeholder
        self.mundi_url = getattr(settings, 'MUNDI_URL', 'https://your-mundi-url.onrender.com')
        self.timeout = 30.0  # 30 second timeout for AI queries
    
    async def query_mundi(self, prompt: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Send a query to Mundi AI
        
        Args:
            prompt: The geospatial query
            context: Additional context for the query
            
        Returns:
            Dict containing Mundi's response
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                payload = {
                    "prompt": prompt,
                    "context": context or {}
                }
                
                response = await client.post(
                    f"{self.mundi_url}/api/ai",
                    json=payload,
                    headers={
                        "Content-Type": "application/json",
                        # Add authentication if required by Mundi
                    }
                )
                
                response.raise_for_status()
                return response.json()
                
        except httpx.TimeoutException:
            logger.error(f"Timeout querying Mundi AI: {prompt}")
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Mundi AI query timed out"
            )
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error from Mundi AI: {e.response.status_code} - {e.response.text}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Mundi AI error: {e.response.text}"
            )
        except Exception as e:
            logger.error(f"Unexpected error querying Mundi AI: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to query Mundi AI: {str(e)}"
            )


# Initialize service
mundi_service = MundiService()


@router.post("/query", response_model=MundiQueryResponse)
async def query_mundi_ai(
    request: MundiQueryRequest,
    current_user: CurrentUser = Depends(get_current_user)
) -> MundiQueryResponse:
    """
    Query Mundi AI for geospatial insights
    
    This endpoint allows authenticated users to send queries to Mundi AI
    for geospatial analysis, map-based questions, and location intelligence.
    """
    try:
        logger.info(f"User {current_user.user_id} querying Mundi with: {request.prompt[:100]}...")
        
        # Add user context to the query
        enhanced_context = {
            "user_id": current_user.user_id,
            "user_role": current_user.role,
            **(request.context or {})
        }
        
        # Query Mundi AI
        result = await mundi_service.query_mundi(
            prompt=request.prompt,
            context=enhanced_context
        )
        
        logger.info(f"Mundi query successful for user {current_user.user_id}")
        
        return MundiQueryResponse(
            success=True,
            data=result
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in Mundi query: {str(e)}")
        return MundiQueryResponse(
            success=False,
            error=str(e)
        )


@router.get("/status")
async def check_mundi_status(
    current_user: CurrentUser = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Check if Mundi AI service is available
    """
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{mundi_service.mundi_url}/health")
            
            return {
                "available": response.status_code == 200,
                "mundi_url": mundi_service.mundi_url,
                "status_code": response.status_code
            }
    except Exception as e:
        return {
            "available": False,
            "mundi_url": mundi_service.mundi_url,
            "error": str(e)
        }