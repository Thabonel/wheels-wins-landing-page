"""
Site-Agnostic Data Extraction API Router

Provides endpoints for:
- Universal data extraction from any URL
- Pattern cache management
- Extraction analytics
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, Dict, Any, List
from datetime import datetime

from app.api.deps import get_current_user, CurrentUser

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/extraction", tags=["Site-Agnostic Extraction"])


# Request/Response Models
class ExtractionRequest(BaseModel):
    """Request model for data extraction"""
    url: HttpUrl = Field(..., description="URL to extract data from")
    intent: Optional[str] = Field(
        None,
        description="Natural language description of what to extract (e.g., 'get the price', 'find campground amenities')"
    )
    expected_type: Optional[str] = Field(
        None,
        description="Expected page type for optimized extraction",
        enum=["product", "campground", "business", "article", "comparison", "listing"]
    )
    output_format: str = Field(
        "json",
        description="Output format for extracted data",
        enum=["json", "markdown", "natural_language"]
    )
    priority_fields: Optional[List[str]] = Field(
        None,
        description="List of fields to prioritize in extraction"
    )
    use_cache: bool = Field(
        True,
        description="Whether to use cached results if available"
    )


class ExtractedData(BaseModel):
    """Extracted data response"""
    url: str
    page_type: str
    confidence: float
    data: Dict[str, Any]
    formatted_output: Optional[str] = None


class ExtractionResponse(BaseModel):
    """Response model for data extraction"""
    success: bool
    url: str
    page_type: Optional[str] = None
    confidence: Optional[float] = None
    data: Optional[Dict[str, Any]] = None
    formatted_output: Optional[str] = None
    errors: Optional[List[Dict[str, Any]]] = None
    metadata: Optional[Dict[str, Any]] = None


class BatchExtractionRequest(BaseModel):
    """Request for batch extraction"""
    urls: List[HttpUrl] = Field(..., min_length=1, max_length=10)
    intent: Optional[str] = None
    output_format: str = Field("json", enum=["json", "markdown", "natural_language"])


class BatchExtractionResponse(BaseModel):
    """Response for batch extraction"""
    job_id: str
    status: str
    total_urls: int
    completed: int = 0
    results: Optional[List[ExtractionResponse]] = None


class PatternStats(BaseModel):
    """Pattern cache statistics"""
    domain: str
    page_type: str
    success_rate: float
    total_uses: int
    last_used: datetime


@router.post("/extract", response_model=ExtractionResponse)
async def extract_data(
    request: ExtractionRequest,
    current_user: CurrentUser = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Extract structured data from any website.

    This endpoint uses AI-powered extraction to automatically:
    - Detect the page type (product, campground, business, etc.)
    - Extract relevant structured data
    - Format the output as requested

    The extraction system uses pattern caching for improved performance
    on previously visited sites.

    Args:
        request: Extraction request with URL and optional parameters
        current_user: Authenticated user

    Returns:
        Extracted data with confidence score and metadata

    Example:
        ```json
        {
            "url": "https://www.amazon.com/dp/B0BCR7TJ4T",
            "intent": "get the price and reviews",
            "output_format": "natural_language"
        }
        ```
    """
    user_id = str(current_user.user_id)
    url = str(request.url)

    logger.info(f"Extraction request for {url} from user {user_id}")

    try:
        from app.services.extraction import SiteAgnosticExtractor

        extractor = SiteAgnosticExtractor()

        result = await extractor.extract(
            url=url,
            intent=request.intent,
            expected_type=request.expected_type,
            output_format=request.output_format,
            priority_fields=request.priority_fields,
            use_cache=request.use_cache
        )

        return {
            "success": result.success,
            "url": url,
            "page_type": result.page_type,
            "confidence": result.confidence,
            "data": result.data,
            "formatted_output": getattr(result, "formatted_output", None),
            "errors": result.errors if hasattr(result, "errors") else None,
            "metadata": result.metadata if hasattr(result, "metadata") else None
        }

    except ImportError as e:
        logger.error(f"Extraction service not available: {e}")
        raise HTTPException(
            status_code=503,
            detail="Extraction service is not available. Please try again later."
        )
    except Exception as e:
        logger.error(f"Extraction error for {url}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Extraction failed: {str(e)}"
        )


@router.post("/extract/batch", response_model=BatchExtractionResponse)
async def extract_batch(
    request: BatchExtractionRequest,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Start batch extraction for multiple URLs.

    This endpoint queues multiple URLs for extraction and returns immediately
    with a job ID. Use the `/extract/batch/{job_id}` endpoint to check status.

    Limited to 10 URLs per request.

    Args:
        request: Batch extraction request with list of URLs
        background_tasks: FastAPI background tasks
        current_user: Authenticated user

    Returns:
        Job ID and initial status
    """
    import uuid

    user_id = str(current_user.user_id)
    job_id = str(uuid.uuid4())
    urls = [str(url) for url in request.urls]

    logger.info(f"Batch extraction started: {job_id} with {len(urls)} URLs for user {user_id}")

    # TODO: Implement actual background processing with job storage
    # For now, return immediately with job ID

    return {
        "job_id": job_id,
        "status": "queued",
        "total_urls": len(urls),
        "completed": 0,
        "results": None
    }


@router.get("/extract/batch/{job_id}", response_model=BatchExtractionResponse)
async def get_batch_status(
    job_id: str,
    current_user: CurrentUser = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get status of a batch extraction job.

    Args:
        job_id: The job ID returned from batch extraction
        current_user: Authenticated user

    Returns:
        Current status and any completed results
    """
    # TODO: Implement job status lookup from storage
    raise HTTPException(
        status_code=404,
        detail=f"Job {job_id} not found or expired"
    )


@router.get("/patterns")
async def list_patterns(
    domain: Optional[str] = None,
    min_success_rate: float = 0.8,
    limit: int = 50,
    current_user: CurrentUser = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    List cached extraction patterns.

    Patterns are learned from successful extractions and reused for
    faster processing on similar pages.

    Args:
        domain: Filter by domain (optional)
        min_success_rate: Minimum success rate filter (default 0.8)
        limit: Maximum patterns to return
        current_user: Authenticated user

    Returns:
        List of pattern statistics
    """
    try:
        from app.services.extraction import PatternCache

        cache = PatternCache()
        patterns = await cache.list_patterns(
            domain=domain,
            min_success_rate=min_success_rate,
            limit=limit
        )

        return {
            "patterns": patterns,
            "total": len(patterns)
        }

    except ImportError:
        return {"patterns": [], "total": 0, "message": "Pattern cache not available"}
    except Exception as e:
        logger.error(f"Error listing patterns: {e}")
        return {"patterns": [], "total": 0, "error": str(e)}


@router.delete("/patterns/{domain}")
async def invalidate_patterns(
    domain: str,
    current_user: CurrentUser = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Invalidate cached patterns for a domain.

    Use this when a website has changed and cached patterns are no longer working.

    Args:
        domain: Domain to invalidate patterns for
        current_user: Authenticated user

    Returns:
        Status message
    """
    try:
        from app.services.extraction import PatternCache

        cache = PatternCache()
        await cache.invalidate_domain(domain)

        return {
            "status": "invalidated",
            "domain": domain,
            "message": f"All patterns for {domain} have been invalidated"
        }

    except Exception as e:
        logger.error(f"Error invalidating patterns for {domain}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to invalidate patterns: {str(e)}"
        )


@router.get("/health")
async def extraction_health():
    """
    Health check for extraction service.

    Returns:
        Service health status
    """
    try:
        from app.services.extraction import SiteAgnosticExtractor

        # Check if extractor can be instantiated
        extractor = SiteAgnosticExtractor()

        return {
            "status": "healthy",
            "service": "Site-Agnostic Extraction",
            "version": "1.0.0"
        }

    except ImportError:
        return {
            "status": "unavailable",
            "service": "Site-Agnostic Extraction",
            "message": "Service dependencies not installed"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "Site-Agnostic Extraction",
            "error": str(e)
        }


@router.get("/supported-types")
async def get_supported_types():
    """
    Get list of supported page types for extraction.

    Returns:
        List of page types with descriptions
    """
    return {
        "supported_types": [
            {
                "type": "product",
                "description": "E-commerce product pages (Amazon, Walmart, etc.)",
                "fields": ["name", "price", "description", "features", "rating", "availability"]
            },
            {
                "type": "campground",
                "description": "Campground and RV park listings",
                "fields": ["name", "location", "pricing", "amenities", "site_types", "availability"]
            },
            {
                "type": "business",
                "description": "Business directory listings (Yelp, Google Maps, etc.)",
                "fields": ["name", "address", "hours", "contact", "services", "rating"]
            },
            {
                "type": "article",
                "description": "News articles, blog posts, and informational content",
                "fields": ["title", "author", "date", "content", "summary"]
            },
            {
                "type": "comparison",
                "description": "Product comparison tables and review sites",
                "fields": ["items", "attributes", "recommendations"]
            },
            {
                "type": "listing",
                "description": "Search results and category listings",
                "fields": ["items", "pagination", "filters"]
            }
        ]
    }
